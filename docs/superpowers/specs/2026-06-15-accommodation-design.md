# Ubytování (Accommodation) – Design Spec

**Date:** 2026-06-15
**Goal:** Track how many rooms each guest needs (and when), and compare that
against the rooms actually reserved at one or more accommodations (hotels).

This feature is built directly on top of the Postgres schema introduced by
the Vercel deployment migration (see
`2026-06-15-vercel-deployment-design.md`) — it is implemented as part of that
same migration, not on the old JSON-file backend.

## Part A — Guest model extension

Three new fields are added to the `Guest` model:

```ts
{
  // ...existing fields...
  pocetIzieb: number,        // rooms needed, default 0 (0 = no accommodation needed)
  ubytovaniOd: string | null,  // "YYYY-MM-DD", date accommodation is needed from
  ubytovaniDo: string | null,  // "YYYY-MM-DD", date accommodation is needed until
}
```

**`GuestForm`:** add a "Počet pokojů" number input (default 0). The
"Ubytování od" / "Ubytování do" date inputs are shown only when
`pocetIzieb > 0` — mirrors the existing pattern where "počet dětí" is shown
only for `typ === 'rodina'`. When `pocetIzieb` is set back to 0, the dates are
cleared.

**`GuestList`:** rows where `pocetIzieb > 0` show a small badge, e.g.
"🛏️ 2 pokoje (20.8.–23.8.)".

## Part B — New "Ubytování" tab

A fourth nav tab is added: Hosté | Program | Úkoly | **Ubytování**.

### New resource: `accommodations`

```ts
{
  id: string,
  nazev: string,       // hotel/location name
  pocetIzieb: number,   // rooms reserved
  terminOd: string,     // "YYYY-MM-DD"
  terminDo: string,     // "YYYY-MM-DD"
  poznamka: string
}
```

Standard REST CRUD at `/api/accommodations`, same pattern as `/api/agenda`
and `/api/tasks`:
- `GET /api/accommodations` — list all
- `POST /api/accommodations` — create (server assigns `id`)
- `PUT /api/accommodations/:id` — update
- `DELETE /api/accommodations/:id` — delete

### `AccommodationsPage`

- `AccommodationForm` modal: název, počet pokojů, termín od (date), termín do
  (date), poznámka — add/edit, same modal pattern as `AgendaForm`/`TaskForm`.
- `AccommodationList`: one card/row per reservation, sorted by `terminOd`.
  Each card shows:
  - název, termín (od–do), poznámka, edit/delete actions
  - **Potřebujeme**: computed value (see below)
  - **Máme rezervováno**: `pocetIzieb` from the reservation
  - Status badge: green "OK" if `máme >= potřebujeme`, red
    "Chybí N pokojů" (where `N = potřebujeme - máme`) otherwise

### Capacity computation (client-side)

`AccommodationsPage` fetches both `guestsApi.getAll()` and
`accommodationsApi.getAll()`. For each accommodation reservation, "potřebujeme"
is the sum of `pocetIzieb` over all guests where:

- `guest.pocetIzieb > 0`, and
- the guest's date range overlaps the reservation's date range:
  `guest.ubytovaniOd <= reservation.terminDo AND guest.ubytovaniDo >= reservation.terminOd`
  (inclusive overlap; guests with no dates set are excluded from this
  computation even if `pocetIzieb > 0`)

This mirrors how `TaskProgressBar` derives its percentage client-side from
fetched data — no new backend aggregation logic is needed.

## Out of scope

- No validation that `ubytovaniOd <= ubytovaniDo` or `terminOd <= terminDo`
  beyond basic HTML date input behavior
- No overall cross-reservation total (the per-reservation comparison is the
  primary view)
- No guest-to-reservation assignment — the comparison is computed, not stored
