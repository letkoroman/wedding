# Program (Agenda) Redesign – Design Spec

**Date:** 2026-06-30
**Goal:** Replace the simple text-list Program tab with a visual,
interactive dashboard (overall timeline with parallel columns for
overlapping activities, plus a per-category linear view), backed by
user-creatable categories and an unscheduled-ideas "lavička" (bench)
with drag-to-reorder and drag-to-schedule. Remove Hosté and Ubytování
from the nav (no longer needed). Program has priority; Úkoly gets only
a light UX look (see "Úkoly" section).

This spec was validated through three rounds of an approved static
HTML mockup (`mockup-program.html`, not committed) before being
written up here. It captures the decisions made during that process.

## Part A — Categories become a real resource

Today `client/src/components/agenda/categories.js` is a hardcoded
object with 4 fixed categories. Categories must become user-extensible
(add custom categories with name/icon/color) while keeping the 4
defaults un-deletable.

### New table: `categories`

```sql
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  accent TEXT NOT NULL,       -- hex color, e.g. '#D4AF37'
  fixed BOOLEAN NOT NULL DEFAULT false,
  poradi INTEGER NOT NULL DEFAULT 0
);
```

Seeded with the 4 existing categories (`fixed = true`):
ceremonie 🎊 `#D4AF37`, sport ⚽ `#5a9a5a`, zabava 🎉 `#9b7de0`,
jidlo 🍽️ `#e09040`.

`bg`/`text` shades are **derived client-side** from `accent` (same
`mix()` helper proven in the mockup) rather than stored — one source
of truth per category, consistent everywhere it's rendered.

### REST: `/api/categories`

- `GET /api/categories` — list, ordered by `poradi`
- `POST /api/categories` — create custom (`label`, `icon`, `accent`);
  server assigns `key` (slugified label + short suffix for
  uniqueness) and `fixed = false`
- `DELETE /api/categories/:key` — only allowed when `fixed = false`
  **and** no `agenda_items` row references this key; otherwise `409`
  with a message the client surfaces via the existing alert pattern

No FK constraint (matches this codebase's existing style of
unenforced TEXT linkage, e.g. `tasks.prirazeno`) — `agenda_items.kategorie`
stays a plain TEXT column.

## Part B — Agenda items: optional time = "lavička" idea

Rather than a separate ideas table, an "idea" is simply an
`agenda_items` row with no time set yet. This reuses 100% of the
existing CRUD/route pattern and matches how `AgendaTimeline` already
filters `casZacatku && casKonce` before rendering — unscheduled rows
are naturally invisible to the timeline views without extra logic.

### Schema changes (`migrate-v5.js`)

```sql
ALTER TABLE agenda_items
  ALTER COLUMN cas_zacatku DROP NOT NULL,
  ALTER COLUMN trvani DROP NOT NULL,
  ALTER COLUMN ikona DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS misto TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS priorita INTEGER NOT NULL DEFAULT 0;
```

- `misto` — new optional location field (was missing entirely).
- `priorita` — used only to order lavička cards within their category
  group; irrelevant once an item is scheduled. Drag-reorder in the
  lavička writes new `priorita` values (simple sequential integers
  per affected category) via existing `PUT` calls.
- `ikona` (per-activity custom icon) is no longer set by the new form
  — the icon shown is always the activity's category icon. The
  column is kept (existing rows, no migration of data) but the API's
  existing `ikona || '💍'` fallback means it's harmless to stop
  sending it; it's simply dropped from the new `AgendaForm` UI.
- `cas_konce` was already nullable (added in migrate-v4).

### `GET /api/agenda` response shape (unchanged keys, new ones added)

```ts
{
  id, nazev,
  casZacatku: string | null,
  casKonce: string | null,
  trvani: number | null,
  kategorie: string,
  misto: string,
  priorita: number,
  poznamka: string
}
```

A row is "scheduled" (appears in the timeline views) when
`casZacatku && casKonce` are both set; otherwise it's a lavička idea.

### Route logic changes (`server/routes/agenda.js`)

- `POST`/`PUT`: `casZacatku`/`casKonce` become optional; when either
  is missing, `trvani` is not computed (stored `null`). Add `misto`
  and `priorita` passthrough (default `''` / `0`).
- No new endpoint needed for "promote idea to schedule" — the client
  just calls the existing `PUT /api/agenda/:id` with the idea's id
  plus the chosen `casZacatku`/`casKonce`.

## Part C — Frontend: `AgendaPage` rewrite

`client/src/components/agenda/` is restructured:

- `categories.js` deleted; replaced by `categoriesApi` (in `api.js`,
  same pattern as the other resources) and a `useCategories`-style
  fetch in `AgendaPage`, passed down as props (no context needed at
  this app's size).
- `AgendaTimeline.jsx` / `AgendaVisualTimeline.jsx` / `AgendaItem.jsx`
  are replaced by the mockup's structure, ported from vanilla JS to
  React components:
  - `ProgramToggle` — segmented control "Celkový program" / "Podle
    kategorie".
  - `CategoryLegend` — chips + "+ Nová kategorie" button +
    delete-custom-category (✕, confirms via the same 409 message if
    in use).
  - `OverallTimeline` — desktop: absolute-positioned parallel-column
    blocks (port of `layoutOverall`). Mobile (`<680px`, via a resize
    listener / `matchMedia`): clustered accordion view (port of
    `clusterOverall` + collapsible groups). Each block/row shows
    category label + name + time (+ location when space allows) and
    a 🗑 delete button with `window.confirm`.
  - `CategoryLinearView` — pill filter (Vše + each category) + single
    column chronological cards (port of `renderLinearList`), with
    🗑 delete.
  - `IdeaBench` (lavička) — sidebar (desktop, `grid-template-columns:
    1fr 300px`, sticky, matching the existing
    `.agenda-program-layout` pattern already in `AgendaTimeline.css`)
    that collapses to a full-width section below the program on
    narrow screens. Items grouped into static per-category sections
    (only categories with ≥1 idea shown); drag-and-drop reorder
    within a section (HTML5 DnD, scoped so a card can only be
    dropped within its own category's list); each card has "Zařadit
    →" (opens `AgendaForm` pre-filled with the idea's category and
    its time fields visible/required) and a 🗑 delete
    (`window.confirm`) button. Dragging a card onto either timeline
    view also opens the pre-filled "Zařadit" flow.
  - `AgendaForm` — rewritten: název, kategorie `<select>` (built from
    fetched categories, with a live colored preview chip), čas
    začátku/konce as two `<select>` dropdowns of `"HH:MM"` in 15-min
    steps (no native `<input type="time">`, avoiding the AM/PM locale
    risk) with `±15 min` stepper buttons, auto-syncing čas konce when
    čas začátku changes (keeps duration constant), computed
    read-only duration display, místo, popis. A mode toggle ("Naplánovat
    s časem" vs. "Přidat jako nápad bez termínu") controls whether
    the time fields are required — this replaces the mockup's two
    separate entry buttons with one form, since it's now a real
    create/edit form (edit becomes available again, same as the old
    `AgendaForm`, for both scheduled items and ideas).
  - `CategoryForm` — modal: name input, icon picker (emoji grid,
    same `ICON_CHOICES` list as the mockup), color (8 preset swatches
    + native `<input type="color">`), live preview chip. `POST
    /api/categories` on submit.

All new components live under `client/src/components/agenda/`,
styling in `AgendaTimeline.css` (extended, not replaced, to keep
`.card`/`.btn`/`.modal` conventions from `global.css`).

**Page width:** stays at the existing app-wide `.container { max-width:
960px }` from `global.css` — not widened to the mockup's 1200px. The
mockup was a standalone page with nothing to compare against; the
real app's 960px already comfortably fits a `1fr 300px` sidebar grid
(this is the same width the old `.agenda-program-layout` already used
successfully). Can revisit after real-device testing if it feels
cramped.

## Part D — Personalization photo

No change needed here. `Hero.jsx` already renders a full-bleed wedding
photo background with "Míša & Roman" + the countdown above the nav, on
every tab — including Program. The mockup's photo banner only existed
because the mockup was a bare standalone file with no site chrome to
inherit; in the real app the existing global Hero already satisfies
this requirement. Adding a second, smaller photo block directly under
it on the Program tab specifically would be redundant, not additive.

## Part E — Remove Hosté / Ubytování from navigation

`Nav.jsx`: remove the `hoste` and `ubytovani` entries from `TABS`.
`App.jsx`: remove the corresponding tab-content branches and imports
(`GuestsPage`, `AccommodationsPage`). Default `activeTab` changes from
`'hoste'` to `'program'`. Component files (`GuestsPage.jsx`,
`AccommodationsPage.jsx`, etc.) and their routes/tables are left in
place, just unmounted/unrouted, per earlier confirmation in this
conversation — no deletion of working code or data.

## Úkoly (lower priority)

Per the original request, only look at this *after* Program is done,
and propose UX improvements before changing anything — no changes
included in this spec/plan.

## Out of scope

- No migration of existing `agenda_items.ikona` data — old rows keep
  whatever icon they have stored; it's just no longer shown (category
  icon is used instead) or editable.
- No server-side validation beyond the 409-on-delete-in-use category
  guard — same light-validation style as the rest of this app.
- No touch-friendly (mobile) drag-and-drop library — HTML5 DnD only
  (mouse). On mobile, the "Zařadit →" button is the only way to move
  a lavička idea into the schedule, matching the mockup's documented
  limitation.
- No cross-category dragging of lavička ideas (changing an idea's
  category is done by editing it, once `AgendaForm` edit mode is
  reintroduced in Part C).
