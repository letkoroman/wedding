# Wedding Dashboard – Design Spec

**Date:** 2026-06-11
**Couple:** Míša & Roman
**Wedding date:** 22. 8. 2026

## Overview

A single-page dashboard web app for planning the wedding, covering guest
management, the wedding-day agenda, and a shared task list. Czech UI
throughout, romantic/elegant visual style, all data persisted to a local JSON
file.

## Tech stack & project structure

- React + Vite frontend, Node.js + Express backend
- JSON file storage at `server/data/db.json` (auto-created with
  `{ "guests": [], "agenda": [], "tasks": [] }` if missing)
- Single repo, root `package.json` runs both via `concurrently`
- Vite dev server proxies `/api/*` to `http://localhost:3001`

```
/
├── package.json (root – "dev" script runs concurrently)
├── server/
│   ├── server.js
│   ├── routes/
│   │   ├── guests.js
│   │   ├── agenda.js
│   │   └── tasks.js
│   ├── utils/db.js          (read/write helpers for db.json)
│   └── data/db.json
└── client/
    ├── index.html
    ├── vite.config.js       (proxy /api -> :3001)
    └── src/
        ├── main.jsx, App.jsx
        ├── api.js            (fetch helpers for all 3 resources)
        ├── styles/
        │   ├── variables.css (palette, fonts as CSS custom properties)
        │   └── global.css
        ├── components/
        │   ├── Hero.jsx
        │   ├── Nav.jsx
        │   ├── PhotoGallery.jsx
        │   ├── guests/
        │   │   ├── GuestSummaryCard.jsx
        │   │   ├── GuestList.jsx
        │   │   ├── GuestForm.jsx (modal, add/edit)
        │   │   └── GuestFilter.jsx
        │   ├── agenda/
        │   │   ├── AgendaTimeline.jsx
        │   │   ├── AgendaItem.jsx
        │   │   └── AgendaForm.jsx (modal, add/edit)
        │   └── tasks/
        │       ├── TaskList.jsx
        │       ├── TaskForm.jsx (modal, add/edit)
        │       ├── TaskProgressBar.jsx
        │       └── TaskFilter.jsx
        └── public/images/photo1.jpg..photo4.jpg
```

Photos currently live at `photos/photo1.jpeg`..`photo4.jpeg` in the project
root. They'll be copied into `client/public/images/` and renamed to
`photoN.jpg` (extension rename only — content stays JPEG, which browsers
serve fine).

## Design system

- **Colors** (CSS custom properties):
  - Ivory (background): `#FAF6F0`
  - Dusty rose (primary accent): `#D8A7B1`
  - Sage green (secondary accent): `#9CAF88`
  - Gold (highlights): `#D4AF37`
- **Fonts**: "Playfair Display" (headings, Google Fonts) + "Lato" (body)
- **Styling**: plain CSS with custom properties, one stylesheet per
  component/feature area, no CSS framework

## Layout

1. **Hero** — full-bleed `photo1.jpg` background with dark overlay,
   "Míša & Roman" in Playfair Display, wedding date "22. 8. 2026", and a
   countdown box showing **days only** ("X dní do svatby")
2. **Nav** — sticky pill-style tabs: Hosté | Program | Úkoly (dusty rose
   active state)
3. **Photo gallery strip** — `photo2.jpg`, `photo3.jpg`, `photo4.jpg` shown
   side by side between hero and tab content
4. **Tab content area** — renders the active feature (Hosté / Program /
   Úkoly)

## Data models (`server/data/db.json`)

```json
{
  "guests": [],
  "agenda": [],
  "tasks": []
}
```

### Guest

```ts
{
  id: string,
  jmeno: string,
  typ: 'jednotlivec' | 'par' | 'rodina',
  pocetDeti: number,       // 0-3, only meaningful when typ === 'rodina'
  potvrzeni: 'ceka' | 'potvrzeno' | 'nepride',
  mustHave: boolean,
  poznamka: string
}
```

Adult count per entry (used for summary calculations):
- `jednotlivec` → 1
- `par` → 2
- `rodina` → 2 (+ `pocetDeti` children, tracked separately)

### Agenda item

```ts
{
  id: string,
  nazev: string,
  casZacatku: string,   // "HH:MM"
  trvani: number,        // minutes
  ikona: string,          // one of: 💍 🥂 🍽️ 💃 📸 🎵 🚗 ⛪ 🌸 🎂
  poznamka: string
}
```

End time is computed in the UI from `casZacatku + trvani`, not stored.
Agenda items are sorted by `casZacatku` for display.

### Task

```ts
{
  id: string,
  nazev: string,
  prirazeno: string,
  termin: string | null,   // "YYYY-MM-DD"
  stav: 'nesplneno' | 'probiha' | 'splneno',
  priorita: 'nizka' | 'stredni' | 'vysoka',
  poznamka: string
}
```

## API

Standard REST, identical pattern for all three resources:

- `GET /api/guests` / `GET /api/agenda` / `GET /api/tasks` — list all
- `POST /api/guests` / `.../agenda` / `.../tasks` — create (server assigns
  `id`)
- `PUT /api/guests/:id` / `.../agenda/:id` / `.../tasks/:id` — update
- `DELETE /api/guests/:id` / `.../agenda/:id` / `.../tasks/:id` — delete

All backed by shared read/write helpers in `server/utils/db.js` operating on
`db.json`.

## Feature: Hosté (Guest Management)

**Summary card** (always visible, computed from entries where
`potvrzeni === 'potvrzeno'` unless noted):
- Celkem potvrzených hostů (sum of adult counts)
- z toho Must-have hostů (sum of adult counts where `mustHave === true`)
- Celkem dětí (sum of `pocetDeti`)
- Čekající na odpověď (count of entries where `potvrzeni === 'ceka'`)

**Guest list view**:
- Filter tabs: všichni / potvrzeni / must-have / čekající
- Each row: jméno, typ, dětí (if rodina), stav potvrzení (badge), must-have
  marker, poznámka, edit/delete actions
- Add/edit via modal form (`GuestForm`): jméno, typ (radio/select — showing
  "počet dětí" field only when typ === 'rodina'), potvrzení, must-have
  checkbox, poznámka

## Feature: Program (Wedding Day Agenda)

- `AgendaForm` modal: název, čas začátku (time input), trvání (number,
  minutes), ikona (select from preset emoji list), poznámka
- `AgendaTimeline`: vertical timeline, sorted by `casZacatku`; left column
  shows start–end time (end computed as start + duration), right column
  shows a card with icon, název, poznámka, and edit/delete actions

## Feature: Úkoly (Task List)

- `TaskForm` modal: název, přiřazeno, termín (optional date), stav, priorita,
  poznámka
- `TaskProgressBar`: % of tasks with `stav === 'splneno'`
- View toggle: grouped by `stav` (three columns/sections: Nesplněno /
  Probíhá / Splněno) OR sorted list by `termin` / `priorita`
- Filter by `prirazeno` (free-text match)
- Inline status change (e.g. dropdown or quick-toggle on each row), edit and
  delete via modal/inline

## Out of scope / assumptions

- No authentication — single shared dashboard, trusted local/family use
- No image upload — the 4 photos are static assets bundled with the app
- No data validation beyond basic required-field checks on forms
- No automated tests required for this initial build (manual verification via
  `run` skill)
