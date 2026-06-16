# Vercel Deployment – Design Spec

**Date:** 2026-06-15
**Goal:** Make the wedding dashboard deployable to a public Vercel URL, with
every `git push` automatically propagating changes to that live link.

## Overview

The app currently runs as a local npm-workspaces monorepo: a Vite/React
frontend and an Express backend that persists data to a local JSON file
(`server/data/db.json`). Vercel's serverless functions have an ephemeral,
read-only filesystem, so the JSON-file storage cannot survive there. This
spec covers:

1. Replacing JSON-file storage with Supabase Postgres (relational tables).
2. Restructuring the Express backend to run as a single Vercel serverless
   function, without changing its public API contract.
3. Configuring the repo/Vercel project so that pushing to `main` on
   `https://github.com/letkoroman/wedding` automatically builds and deploys
   both frontend and backend.

The frontend (`client/src`) requires **no changes** — every component keeps
calling the same `/api/guests`, `/api/agenda`, `/api/tasks` endpoints with
the same request/response JSON shapes.

## Architecture

- **Frontend:** Vite production build (`client/dist`) served by Vercel as
  static assets.
- **Backend:** Express app exported as a single Vercel serverless function.
  - `server/app.js` – the configured Express app (middleware + routes),
    no `.listen()` call.
  - `server/server.js` – local-dev entry point: imports `app.js` and calls
    `app.listen(3001, ...)`. Used by `npm run dev` (unchanged).
  - `api/index.js` (new, repo root) – `export { default } from '../server/app.js'`,
    the entry point Vercel deploys as a Function.
- **Database:** Supabase Postgres (existing account), connected via
  Supavisor's transaction-mode pooler (port 6543) for serverless
  compatibility. Same database used for local dev and production (no
  migration framework, no per-environment branching — out of scope for this
  small project).
- **Local dev:** `npm run dev` behavior is unchanged (still runs server +
  client via `concurrently`), except the server now reads `DATABASE_URL`
  from a local `.env` file (gitignored) instead of touching `db.json`.
- **Deployment trigger:** New GitHub repo `https://github.com/letkoroman/wedding`.
  `origin` for this local repo (currently pointing at an unrelated
  `agile-battleships` repo — confirmed nothing else depends on that) is
  updated to point here. Vercel project is connected to this GitHub repo;
  every push to `main` triggers an automatic build + deploy.

## Database schema

Four tables replace the three top-level arrays in `db.json`, plus a new
`accommodations` table for the Ubytování feature (see
`2026-06-15-accommodation-design.md`). Column names are `snake_case`; API
responses keep the existing `camelCase` field names via small mapper
functions in each route file.

```sql
-- server/db/schema.sql
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jmeno TEXT NOT NULL,
  typ TEXT NOT NULL,
  pocet_deti INTEGER NOT NULL DEFAULT 0,
  potvrzeni TEXT NOT NULL,
  must_have BOOLEAN NOT NULL DEFAULT false,
  poznamka TEXT NOT NULL DEFAULT '',
  pocet_izieb INTEGER NOT NULL DEFAULT 0,
  ubytovani_od DATE,
  ubytovani_do DATE
);

CREATE TABLE agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev TEXT NOT NULL,
  cas_zacatku TEXT NOT NULL,
  trvani INTEGER NOT NULL,
  ikona TEXT NOT NULL,
  poznamka TEXT NOT NULL DEFAULT ''
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev TEXT NOT NULL,
  prirazeno TEXT NOT NULL DEFAULT '',
  termin DATE,
  stav TEXT NOT NULL,
  priorita TEXT NOT NULL,
  poznamka TEXT NOT NULL DEFAULT ''
);

CREATE TABLE accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev TEXT NOT NULL,
  pocet_izieb INTEGER NOT NULL DEFAULT 0,
  termin_od DATE NOT NULL,
  termin_do DATE NOT NULL,
  poznamka TEXT NOT NULL DEFAULT ''
);
```

`id` generation moves from `crypto.randomUUID()` (in `server/utils/db.js`) to
Postgres's `gen_random_uuid()` default.

## Data access layer

- `server/db/client.js` – exports a `sql` tagged-template helper built on
  `pg` (node-postgres)'s `Pool`, connected to Supabase's Supavisor
  transaction-mode pooler (port 6543). The wrapper mirrors the ergonomics of
  Neon's `sql` helper (`` sql`...` `` returns rows directly, plus
  `sql.query(text, params)` for raw DDL) while Supavisor handles connection
  reuse across serverless invocations.
- `server/db/seed.js` – one-time script: runs `schema.sql` to create the
  tables, then reads the current `server/data/db.json` and `INSERT`s its
  `guests`, `agenda`, and `tasks` arrays as seed rows (existing guests get
  `pocet_izieb = 0` and `null` accommodation dates, since `db.json` predates
  those fields). The new `accommodations` table starts empty — no seed data
  for it. Run manually once against the Supabase database during setup.

## API routes

`server/routes/guests.js`, `agenda.js`, `tasks.js` are rewritten to issue SQL
queries instead of array operations on an in-memory object. The
request/response contracts for `agenda` and `tasks` are unchanged; `guests`
gains the three new fields described in
`2026-06-15-accommodation-design.md` (`pocetIzieb`, `ubytovaniOd`,
`ubytovaniDo`). A new `server/routes/accommodations.js` is added for the
`accommodations` resource, following the same pattern. All four resources
share this contract:

- `GET /api/<resource>` → array of records (camelCase fields, same shape as
  today)
- `POST /api/<resource>` → inserts a row, returns the created record with a
  server-generated `id`
- `PUT /api/<resource>/:id` → updates the row, returns the updated record (404
  if not found)
- `DELETE /api/<resource>/:id` → deletes the row, returns 204 (404 if not
  found)

Each route file includes small `toGuest(row)` / `toAgendaItem(row)` /
`toTask(row)` mapper functions converting `snake_case` DB columns to the
existing `camelCase` API field names (e.g. `pocet_deti` → `pocetDeti`,
`must_have` → `mustHave`, `cas_zacatku` → `casZacatku`).

## File changes summary

**New:**
- `server/app.js`
- `server/db/client.js`
- `server/db/schema.sql`
- `server/db/seed.js`
- `server/routes/accommodations.js`
- `api/index.js`
- `vercel.json` (repo root)
- `.env.example` (documents `DATABASE_URL`)
- `client/src/components/accommodations/` — `AccommodationForm.jsx`,
  `AccommodationList.jsx` (+ `.css`), `AccommodationsPage.jsx`
- `client/src/api.js` — add `accommodationsApi`

**Modified:**
- `server/server.js` — now just imports `app.js` and calls `.listen()`
- `server/routes/guests.js`, `agenda.js`, `tasks.js` — SQL-based CRUD;
  `guests.js` also handles the three new accommodation-related fields
- `server/package.json` — add `pg`, `dotenv`
- `.gitignore` — add `.env`
- `client/src/components/Nav.jsx` — add "Ubytování" tab
- `client/src/App.jsx` — wire up the new tab/page
- `client/src/components/guests/GuestForm.jsx` — add "počet pokojů" +
  conditional date range fields
- `client/src/components/guests/GuestList.jsx` (+ `.css`) — show
  accommodation badge when `pocetIzieb > 0`

**Removed:**
- `server/utils/db.js`
- `server/data/db.json` (its contents are migrated into `seed.js`'s seed
  data before removal)

## `vercel.json`

```json
{
  "buildCommand": "npm run build -w client",
  "outputDirectory": "client/dist",
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/index" }]
}
```

## Deployment / setup workflow

1. **Git remote** — update `origin` to
   `https://github.com/letkoroman/wedding.git`, push `main`.
2. **Vercel project** — import `letkoroman/wedding` from GitHub on
   vercel.com ("Add New Project"). First deploy succeeds for the frontend;
   API calls fail until the database is connected.
3. **Supabase database** — add `DATABASE_URL` (the Supavisor transaction-mode
   pooler connection string, from Project Settings → Database → Connection
   string) as an environment variable in the Vercel project's settings
   (Production, Preview, and Development).
4. **Local `.env`** — copy the same connection string into a local `.env`
   (gitignored) so `npm run dev` can reach the same Supabase database.
5. **Seed the database** — run `node server/db/seed.js` once (locally, using
   the `.env` connection string) to create tables and load existing seed
   data (3 guests, 3 agenda items, 3 tasks).
6. **Redeploy** — trigger a redeploy on Vercel (push or dashboard "Redeploy")
   so the running function picks up the new `DATABASE_URL` env var.
7. **Ongoing** — every future `git push` to `main` automatically rebuilds and
   redeploys to the same Vercel URL.

Steps 2–4 and 6 require browser interaction with Vercel/GitHub (the user's
accounts); steps 1, 5, and all code changes are done via the CLI/editor.

## Out of scope

- Authentication / access control (unchanged from MVP — trusted shared use)
- Database migration framework (one-off `schema.sql` + `seed.js` is
  sufficient for this project's size)
- Separate dev/prod database branches (single Supabase database used everywhere)
- Automated tests beyond manual/integration verification (consistent with
  the original MVP spec)
