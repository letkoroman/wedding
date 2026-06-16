# Vercel + Supabase Postgres Migration & Ubytování Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the wedding dashboard's storage from a local JSON file to Supabase Postgres, restructure the Express backend for Vercel serverless deployment with continuous deploy from `github.com/letkoroman/wedding`, and add the Ubytování (accommodation) feature (guest room/date needs + hotel reservation capacity tracking) directly on the new schema.

**Architecture:** The JSON-file backend (`server/utils/db.js` + `server/data/db.json`) is replaced by Supabase Postgres accessed via a small `pg` (node-postgres)-based `sql` tagged-template helper (`server/db/client.js`) connected through Supabase's Supavisor transaction-mode pooler, with `snake_case` columns mapped to the existing `camelCase` API shapes via small per-route mapper functions (`toGuest`, `toAgendaItem`, `toTask`, `toAccommodation`). The Express app is split into `server/app.js` (middleware + routes, no `.listen()`) so it can run both as the local dev server (`server/server.js`) and as a single Vercel serverless function (`api/index.js`), with root `vercel.json` wiring the static frontend build + `/api/*` rewrites. The Ubytování feature (three new guest fields + a new `accommodations` resource + a 4th nav tab with client-side capacity comparison) is built on this same schema as part of the migration, not on the old backend.

**Tech Stack:** React 18 + Vite (frontend, unchanged), Express 4 ESM (backend), `pg` (node-postgres, via Supabase's Supavisor pooler), `dotenv` (local env loading), npm workspaces, Vercel (static hosting + serverless function), Supabase Postgres.

---

## Prerequisite (controller action, before Task 1)

This plan requires a `DATABASE_URL` connection string for a Supabase Postgres database **before Task 1 can be implemented or tested**, because every later task verifies its work against a real database.

The user has an existing Supabase project (`fawfvmrgkfiyjakytvrl`, region `eu-west-1`). The controller has obtained the Supavisor transaction-mode pooler connection string (format: `postgresql://postgres.fawfvmrgkfiyjakytvrl:<password>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`, port 6543 — this is Supabase's recommended connection mode for serverless/Vercel) and has already written it to `.env` at the repo root, and added `.env` to `.gitignore`. Task 1 only needs to verify these exist — no further user interaction is needed for this step.

This same connection string will later be reused as the `DATABASE_URL` environment variable in the Vercel project (Task 14), per the spec's "same database for local dev and production" decision.

**No git worktree is used for this plan** — per durable user consent, all work happens directly on `main` in `c:\Users\Elitebook\Documents\Wedding`. All git commands must be scoped to `Documents/Wedding/...` paths (the repo root is `c:\Users\Elitebook`, the user's home directory).

---

### Task 1: Database setup — schema, client, env config, dependencies

**Files:**
- Create: `server/db/schema.sql`
- Create: `server/db/client.js`
- Verify: `.env.example` (already created by controller)
- Verify: `.env` (gitignored, already contains real `DATABASE_URL`, created by controller)
- Verify: `.gitignore` (already updated by controller)
- Modify: `server/package.json` (via `npm install`)
- Modify: `server/server.js`

- [ ] **Step 1: Install the new server dependencies**

Run from repo root (`c:\Users\Elitebook\Documents\Wedding`):

```bash
npm install pg dotenv -w server
```

Expected: `server/package.json` gains `pg` and `dotenv` under `dependencies`, and `node_modules` is updated (root-level `package-lock.json` changes too).

- [ ] **Step 2: Create `server/db/schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS guests (
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

CREATE TABLE IF NOT EXISTS agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev TEXT NOT NULL,
  cas_zacatku TEXT NOT NULL,
  trvani INTEGER NOT NULL,
  ikona TEXT NOT NULL,
  poznamka TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev TEXT NOT NULL,
  prirazeno TEXT NOT NULL DEFAULT '',
  termin DATE,
  stav TEXT NOT NULL,
  priorita TEXT NOT NULL,
  poznamka TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev TEXT NOT NULL,
  pocet_izieb INTEGER NOT NULL DEFAULT 0,
  termin_od DATE NOT NULL,
  termin_do DATE NOT NULL,
  poznamka TEXT NOT NULL DEFAULT ''
);
```

- [ ] **Step 3: Create `server/db/client.js`**

This wraps `pg`'s `Pool` in a small `sql` tagged-template helper with the same ergonomics as Neon's `sql` helper (`` await sql`SELECT ...` `` returns rows directly, `sql.query(text, params)` for raw DDL), so every later task that uses `` sql`...` `` or `sql.query(...)` works unchanged regardless of which Postgres provider is behind it.

It also overrides the `DATE` (OID 1082) type parser to return raw `"YYYY-MM-DD"` strings instead of JS `Date` objects (the default `pg` behavior parses `DATE` into JS `Date`, which would shift dates by a day depending on server timezone when serialized to JSON — raw strings avoid that entirely and match the existing API contract, e.g. `termin: "2026-07-15"`).

The connection uses Supabase's Supavisor transaction-mode pooler (port 6543 in `DATABASE_URL`), which is Supabase's recommended setup for serverless/Vercel — `ssl: { rejectUnauthorized: false }` is required because the pooler's certificate isn't in Node's default CA bundle.

```js
import pg from 'pg';

const { Pool, types } = pg;

types.setTypeParser(types.builtins.DATE, (value) => value);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function sql(strings, ...values) {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) {
    text += `$${i + 1}` + strings[i + 1];
  }
  const { rows } = await pool.query(text, values);
  return rows;
}

sql.query = async (text, params) => {
  const { rows } = await pool.query(text, params);
  return rows;
};
```

- [ ] **Step 4: Verify `.env.example`**

The controller already created `.env.example` at the repo root:

```
DATABASE_URL=postgresql://postgres.your-project-ref:your-password@aws-0-your-region.pooler.supabase.com:6543/postgres
```

Confirm it exists with this content (or create it if missing).

- [ ] **Step 5: Verify `.env` contains the real connection string**

The controller already created `.env` at the repo root with the real Supabase Supavisor connection string:

```
DATABASE_URL=postgresql://postgres.fawfvmrgkfiyjakytvrl:<password>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
```

Confirm this file exists and `DATABASE_URL` is set (do not print its contents — it contains a password). This file must NOT be committed (see Step 6).

- [ ] **Step 6: Verify `.env` is in `.gitignore`**

The controller already added `.env` to `.gitignore`. Confirm `.gitignore` contains:
```
node_modules/
dist/
.superpowers/
.env
```

- [ ] **Step 7: Add `dotenv` loading to `server/server.js`**

Current `server/server.js`:
```js
import express from 'express';
import guestsRouter from './routes/guests.js';
import agendaRouter from './routes/agenda.js';
import tasksRouter from './routes/tasks.js';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use('/api/guests', guestsRouter);
app.use('/api/agenda', agendaRouter);
app.use('/api/tasks', tasksRouter);

app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
```

Add `import 'dotenv/config';` as the very first line (before any other import), so `process.env.DATABASE_URL` is populated before `server/db/client.js` is evaluated:

```js
import 'dotenv/config';
import express from 'express';
import guestsRouter from './routes/guests.js';
import agendaRouter from './routes/agenda.js';
import tasksRouter from './routes/tasks.js';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use('/api/guests', guestsRouter);
app.use('/api/agenda', agendaRouter);
app.use('/api/tasks', tasksRouter);

app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
```

- [ ] **Step 8: Verify**

Run: `npm run dev -w server`

Expected: server starts and prints `Server běží na http://localhost:3001` with no errors (no DB query happens yet at this point, so a bad `DATABASE_URL` won't surface here — that's verified in Task 2). Stop the server after confirming it starts cleanly.

- [ ] **Step 9: Commit**

```bash
git add server/db/schema.sql server/db/client.js .env.example .gitignore server/package.json server/package-lock.json package-lock.json server/server.js
git commit -m "Add Supabase Postgres schema, client, and env config"
```

(Adjust the lockfile paths to whichever `package-lock.json` files `npm install` actually modified.)

---

### Task 2: Seed script — create tables and migrate seed data into Postgres

**Files:**
- Create: `server/db/seed.js`
- Delete: `server/data/db.json`

- [ ] **Step 1: Create `server/db/seed.js`**

This script runs `schema.sql` to create the four tables, then inserts the existing seed data (3 guests, 3 agenda items, 3 tasks — migrated from `server/data/db.json`; the new `accommodations` table starts empty).

```js
import 'dotenv/config';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sql } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GUESTS = [
  { jmeno: 'Petr Novák', typ: 'jednotlivec', pocetDeti: 0, potvrzeni: 'potvrzeno', mustHave: true, poznamka: 'Svědek ženicha' },
  { jmeno: 'Jana a Karel Dvořákovi', typ: 'par', pocetDeti: 0, potvrzeni: 'potvrzeno', mustHave: false, poznamka: 'Potvrzeno telefonicky' },
  { jmeno: 'Rodina Horáková', typ: 'rodina', pocetDeti: 2, potvrzeni: 'potvrzeno', mustHave: false, poznamka: 'Přijedou autem' }
];

const AGENDA = [
  { nazev: 'Obřad', casZacatku: '14:00', trvani: 30, ikona: '⛪', poznamka: 'Na zámecké zahradě' },
  { nazev: 'Svatební hostina', casZacatku: '17:30', trvani: 120, ikona: '🍽️', poznamka: '' },
  { nazev: 'Přípitek', casZacatku: '16:45', trvani: 15, ikona: '🥂', poznamka: 'Před hostinou' }
];

const TASKS = [
  { nazev: 'Objednat svatební dort', prirazeno: 'Míša', termin: '2026-07-15', stav: 'probiha', priorita: 'vysoka', poznamka: 'Cukrárna U Anežky - objednáno' },
  { nazev: 'Vyzkoušet svatební šaty', prirazeno: 'Míša', termin: '2026-07-01', stav: 'probiha', priorita: 'stredni', poznamka: '' },
  { nazev: 'Zarezervovat hotel pro hosty', prirazeno: 'Roman', termin: null, stav: 'splneno', priorita: 'nizka', poznamka: 'Hotel Continental' }
];

async function run() {
  const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  const statements = schema.split(';').map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) {
    await sql.query(statement, []);
  }
  console.log('Tabulky vytvořeny.');

  for (const g of GUESTS) {
    await sql`
      INSERT INTO guests (jmeno, typ, pocet_deti, potvrzeni, must_have, poznamka, pocet_izieb, ubytovani_od, ubytovani_do)
      VALUES (${g.jmeno}, ${g.typ}, ${g.pocetDeti}, ${g.potvrzeni}, ${g.mustHave}, ${g.poznamka}, 0, NULL, NULL)
    `;
  }
  console.log(`Vloženo ${GUESTS.length} hostů.`);

  for (const a of AGENDA) {
    await sql`
      INSERT INTO agenda_items (nazev, cas_zacatku, trvani, ikona, poznamka)
      VALUES (${a.nazev}, ${a.casZacatku}, ${a.trvani}, ${a.ikona}, ${a.poznamka})
    `;
  }
  console.log(`Vloženo ${AGENDA.length} položek programu.`);

  for (const t of TASKS) {
    await sql`
      INSERT INTO tasks (nazev, prirazeno, termin, stav, priorita, poznamka)
      VALUES (${t.nazev}, ${t.prirazeno}, ${t.termin}, ${t.stav}, ${t.priorita}, ${t.poznamka})
    `;
  }
  console.log(`Vloženo ${TASKS.length} úkolů.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

- [ ] **Step 2: Run the seed script**

Run from repo root: `node server/db/seed.js`

Expected output:
```
Tabulky vytvořeny.
Vloženo 3 hostů.
Vloženo 3 položek programu.
Vloženo 3 úkolů.
```

If this fails with a connection error, the `DATABASE_URL` in `.env` (Task 1, Step 5) is likely wrong — report `NEEDS_CONTEXT` to the controller with the error message rather than guessing.

This script is meant to run once. Running it again would duplicate the seed rows (the `CREATE TABLE IF NOT EXISTS` statements are safe to re-run, but the `INSERT`s are not idempotent) — this is acceptable per the spec's "no migration framework" scope.

- [ ] **Step 3: Remove the now-unused JSON seed data file**

```bash
git rm server/data/db.json
```

If `server/data` is now empty, it will simply not be tracked anymore (no need to explicitly remove the directory).

- [ ] **Step 4: Commit**

```bash
git add server/db/seed.js
git commit -m "Add Postgres seed script and remove JSON seed data"
```

---

### Task 3: Rewrite `server/routes/guests.js` for Postgres

**Files:**
- Modify: `server/routes/guests.js` (full rewrite)

- [ ] **Step 1: Replace the file contents**

This adds the three new accommodation fields (`pocetIzieb`, `ubytovaniOd`, `ubytovaniDo`) per the accommodation spec, alongside converting all CRUD to SQL.

```js
import { Router } from 'express';
import { sql } from '../db/client.js';

const router = Router();

function toGuest(row) {
  return {
    id: row.id,
    jmeno: row.jmeno,
    typ: row.typ,
    pocetDeti: row.pocet_deti,
    potvrzeni: row.potvrzeni,
    mustHave: row.must_have,
    poznamka: row.poznamka,
    pocetIzieb: row.pocet_izieb,
    ubytovaniOd: row.ubytovani_od,
    ubytovaniDo: row.ubytovani_do
  };
}

router.get('/', async (req, res) => {
  const rows = await sql`SELECT * FROM guests`;
  res.json(rows.map(toGuest));
});

router.post('/', async (req, res) => {
  const jmeno = req.body.jmeno || '';
  const typ = req.body.typ || 'jednotlivec';
  const pocetDeti = typ === 'rodina' ? Number(req.body.pocetDeti) || 0 : 0;
  const potvrzeni = req.body.potvrzeni || 'ceka';
  const mustHave = Boolean(req.body.mustHave);
  const poznamka = req.body.poznamka || '';
  const pocetIzieb = Number(req.body.pocetIzieb) || 0;
  const ubytovaniOd = pocetIzieb > 0 ? (req.body.ubytovaniOd || null) : null;
  const ubytovaniDo = pocetIzieb > 0 ? (req.body.ubytovaniDo || null) : null;

  const [row] = await sql`
    INSERT INTO guests (jmeno, typ, pocet_deti, potvrzeni, must_have, poznamka, pocet_izieb, ubytovani_od, ubytovani_do)
    VALUES (${jmeno}, ${typ}, ${pocetDeti}, ${potvrzeni}, ${mustHave}, ${poznamka}, ${pocetIzieb}, ${ubytovaniOd}, ${ubytovaniDo})
    RETURNING *
  `;
  res.status(201).json(toGuest(row));
});

router.put('/:id', async (req, res) => {
  const [existing] = await sql`SELECT * FROM guests WHERE id = ${req.params.id}`;
  if (!existing) {
    return res.status(404).json({ error: 'Host nenalezen' });
  }
  const typ = req.body.typ ?? existing.typ;
  const jmeno = req.body.jmeno ?? existing.jmeno;
  const pocetDeti = typ === 'rodina' ? Number(req.body.pocetDeti ?? existing.pocet_deti) || 0 : 0;
  const potvrzeni = req.body.potvrzeni ?? existing.potvrzeni;
  const mustHave = req.body.mustHave ?? existing.must_have;
  const poznamka = req.body.poznamka ?? existing.poznamka;
  const pocetIzieb = req.body.pocetIzieb !== undefined ? Number(req.body.pocetIzieb) || 0 : existing.pocet_izieb;
  const ubytovaniOd = pocetIzieb > 0 ? (req.body.ubytovaniOd ?? existing.ubytovani_od) : null;
  const ubytovaniDo = pocetIzieb > 0 ? (req.body.ubytovaniDo ?? existing.ubytovani_do) : null;

  const [row] = await sql`
    UPDATE guests SET
      jmeno = ${jmeno},
      typ = ${typ},
      pocet_deti = ${pocetDeti},
      potvrzeni = ${potvrzeni},
      must_have = ${mustHave},
      poznamka = ${poznamka},
      pocet_izieb = ${pocetIzieb},
      ubytovani_od = ${ubytovaniOd},
      ubytovani_do = ${ubytovaniDo}
    WHERE id = ${req.params.id}
    RETURNING *
  `;
  res.json(toGuest(row));
});

router.delete('/:id', async (req, res) => {
  const [row] = await sql`DELETE FROM guests WHERE id = ${req.params.id} RETURNING id`;
  if (!row) {
    return res.status(404).json({ error: 'Host nenalezen' });
  }
  res.status(204).end();
});

export default router;
```

- [ ] **Step 2: Verify with the dev server**

Run: `npm run dev -w server`

In another terminal, run:
```bash
curl http://localhost:3001/api/guests
```
Expected: a JSON array of 3 guests, each including `pocetIzieb: 0`, `ubytovaniOd: null`, `ubytovaniDo: null`.

Then test create/update/delete:
```bash
curl -X POST http://localhost:3001/api/guests -H "Content-Type: application/json" -d "{\"jmeno\":\"Test Host\",\"typ\":\"jednotlivec\",\"potvrzeni\":\"ceka\",\"pocetIzieb\":2,\"ubytovaniOd\":\"2026-08-20\",\"ubytovaniDo\":\"2026-08-23\"}"
```
Expected: `201` with the created guest, including `"pocetIzieb":2,"ubytovaniOd":"2026-08-20","ubytovaniDo":"2026-08-23"` — confirm dates come back as plain `"YYYY-MM-DD"` strings, not `"2026-08-20T00:00:00.000Z"`.

```bash
curl -X DELETE http://localhost:3001/api/guests/<id-from-create-response>
```
Expected: `204` with empty body.

```bash
curl http://localhost:3001/api/guests/does-not-exist -X PUT -H "Content-Type: application/json" -d "{\"jmeno\":\"x\"}"
```
Expected: `404` with `{"error":"Host nenalezen"}`.

Stop the server after verification.

- [ ] **Step 3: Commit**

```bash
git add server/routes/guests.js
git commit -m "Rewrite guests route for Postgres with accommodation fields"
```

---

### Task 4: Rewrite `server/routes/agenda.js` for Postgres

**Files:**
- Modify: `server/routes/agenda.js` (full rewrite)

- [ ] **Step 1: Replace the file contents**

```js
import { Router } from 'express';
import { sql } from '../db/client.js';

const router = Router();

function toAgendaItem(row) {
  return {
    id: row.id,
    nazev: row.nazev,
    casZacatku: row.cas_zacatku,
    trvani: row.trvani,
    ikona: row.ikona,
    poznamka: row.poznamka
  };
}

router.get('/', async (req, res) => {
  const rows = await sql`SELECT * FROM agenda_items`;
  res.json(rows.map(toAgendaItem));
});

router.post('/', async (req, res) => {
  const nazev = req.body.nazev || '';
  const casZacatku = req.body.casZacatku || '00:00';
  const trvani = Number(req.body.trvani) || 0;
  const ikona = req.body.ikona || '💍';
  const poznamka = req.body.poznamka || '';

  const [row] = await sql`
    INSERT INTO agenda_items (nazev, cas_zacatku, trvani, ikona, poznamka)
    VALUES (${nazev}, ${casZacatku}, ${trvani}, ${ikona}, ${poznamka})
    RETURNING *
  `;
  res.status(201).json(toAgendaItem(row));
});

router.put('/:id', async (req, res) => {
  const [existing] = await sql`SELECT * FROM agenda_items WHERE id = ${req.params.id}`;
  if (!existing) {
    return res.status(404).json({ error: 'Položka programu nenalezena' });
  }
  const nazev = req.body.nazev ?? existing.nazev;
  const casZacatku = req.body.casZacatku ?? existing.cas_zacatku;
  const trvani = req.body.trvani !== undefined ? Number(req.body.trvani) || 0 : existing.trvani;
  const ikona = req.body.ikona ?? existing.ikona;
  const poznamka = req.body.poznamka ?? existing.poznamka;

  const [row] = await sql`
    UPDATE agenda_items SET
      nazev = ${nazev},
      cas_zacatku = ${casZacatku},
      trvani = ${trvani},
      ikona = ${ikona},
      poznamka = ${poznamka}
    WHERE id = ${req.params.id}
    RETURNING *
  `;
  res.json(toAgendaItem(row));
});

router.delete('/:id', async (req, res) => {
  const [row] = await sql`DELETE FROM agenda_items WHERE id = ${req.params.id} RETURNING id`;
  if (!row) {
    return res.status(404).json({ error: 'Položka programu nenalezena' });
  }
  res.status(204).end();
});

export default router;
```

- [ ] **Step 2: Verify with the dev server**

Run: `npm run dev -w server`, then:

```bash
curl http://localhost:3001/api/agenda
```
Expected: JSON array of 3 agenda items (`Obřad`, `Svatební hostina`, `Přípitek`) with `casZacatku`, `trvani`, `ikona`, `poznamka` fields matching the original seed data.

```bash
curl -X POST http://localhost:3001/api/agenda -H "Content-Type: application/json" -d "{\"nazev\":\"Test\",\"casZacatku\":\"10:00\",\"trvani\":15,\"ikona\":\"🎵\",\"poznamka\":\"\"}"
```
Expected: `201` with the created item.

```bash
curl -X DELETE http://localhost:3001/api/agenda/<id-from-create-response>
```
Expected: `204`.

Stop the server after verification.

- [ ] **Step 3: Commit**

```bash
git add server/routes/agenda.js
git commit -m "Rewrite agenda route for Postgres"
```

---

### Task 5: Rewrite `server/routes/tasks.js` for Postgres

**Files:**
- Modify: `server/routes/tasks.js` (full rewrite)

- [ ] **Step 1: Replace the file contents**

```js
import { Router } from 'express';
import { sql } from '../db/client.js';

const router = Router();

function toTask(row) {
  return {
    id: row.id,
    nazev: row.nazev,
    prirazeno: row.prirazeno,
    termin: row.termin,
    stav: row.stav,
    priorita: row.priorita,
    poznamka: row.poznamka
  };
}

router.get('/', async (req, res) => {
  const rows = await sql`SELECT * FROM tasks`;
  res.json(rows.map(toTask));
});

router.post('/', async (req, res) => {
  const nazev = req.body.nazev || '';
  const prirazeno = req.body.prirazeno || '';
  const termin = req.body.termin || null;
  const stav = req.body.stav || 'nesplneno';
  const priorita = req.body.priorita || 'stredni';
  const poznamka = req.body.poznamka || '';

  const [row] = await sql`
    INSERT INTO tasks (nazev, prirazeno, termin, stav, priorita, poznamka)
    VALUES (${nazev}, ${prirazeno}, ${termin}, ${stav}, ${priorita}, ${poznamka})
    RETURNING *
  `;
  res.status(201).json(toTask(row));
});

router.put('/:id', async (req, res) => {
  const [existing] = await sql`SELECT * FROM tasks WHERE id = ${req.params.id}`;
  if (!existing) {
    return res.status(404).json({ error: 'Úkol nenalezen' });
  }
  const nazev = req.body.nazev ?? existing.nazev;
  const prirazeno = req.body.prirazeno ?? existing.prirazeno;
  const termin = req.body.termin !== undefined ? req.body.termin : existing.termin;
  const stav = req.body.stav ?? existing.stav;
  const priorita = req.body.priorita ?? existing.priorita;
  const poznamka = req.body.poznamka ?? existing.poznamka;

  const [row] = await sql`
    UPDATE tasks SET
      nazev = ${nazev},
      prirazeno = ${prirazeno},
      termin = ${termin},
      stav = ${stav},
      priorita = ${priorita},
      poznamka = ${poznamka}
    WHERE id = ${req.params.id}
    RETURNING *
  `;
  res.json(toTask(row));
});

router.delete('/:id', async (req, res) => {
  const [row] = await sql`DELETE FROM tasks WHERE id = ${req.params.id} RETURNING id`;
  if (!row) {
    return res.status(404).json({ error: 'Úkol nenalezen' });
  }
  res.status(204).end();
});

export default router;
```

- [ ] **Step 2: Verify with the dev server**

Run: `npm run dev -w server`, then:

```bash
curl http://localhost:3001/api/tasks
```
Expected: JSON array of 3 tasks, including `"termin":"2026-07-15"` (plain date string) for "Objednat svatební dort" and `"termin":null` for "Zarezervovat hotel pro hosty".

```bash
curl -X POST http://localhost:3001/api/tasks -H "Content-Type: application/json" -d "{\"nazev\":\"Test úkol\",\"prirazeno\":\"Roman\",\"termin\":\"2026-08-01\",\"stav\":\"nesplneno\",\"priorita\":\"nizka\",\"poznamka\":\"\"}"
```
Expected: `201` with `"termin":"2026-08-01"`.

```bash
curl -X DELETE http://localhost:3001/api/tasks/<id-from-create-response>
```
Expected: `204`.

Stop the server after verification.

- [ ] **Step 3: Commit**

```bash
git add server/routes/tasks.js
git commit -m "Rewrite tasks route for Postgres"
```

---

### Task 6: New `server/routes/accommodations.js` resource + remove old JSON utils

**Files:**
- Create: `server/routes/accommodations.js`
- Modify: `server/server.js`
- Delete: `server/utils/db.js`

- [ ] **Step 1: Create `server/routes/accommodations.js`**

```js
import { Router } from 'express';
import { sql } from '../db/client.js';

const router = Router();

function toAccommodation(row) {
  return {
    id: row.id,
    nazev: row.nazev,
    pocetIzieb: row.pocet_izieb,
    terminOd: row.termin_od,
    terminDo: row.termin_do,
    poznamka: row.poznamka
  };
}

router.get('/', async (req, res) => {
  const rows = await sql`SELECT * FROM accommodations`;
  res.json(rows.map(toAccommodation));
});

router.post('/', async (req, res) => {
  const nazev = req.body.nazev || '';
  const pocetIzieb = Number(req.body.pocetIzieb) || 0;
  const terminOd = req.body.terminOd;
  const terminDo = req.body.terminDo;
  const poznamka = req.body.poznamka || '';

  const [row] = await sql`
    INSERT INTO accommodations (nazev, pocet_izieb, termin_od, termin_do, poznamka)
    VALUES (${nazev}, ${pocetIzieb}, ${terminOd}, ${terminDo}, ${poznamka})
    RETURNING *
  `;
  res.status(201).json(toAccommodation(row));
});

router.put('/:id', async (req, res) => {
  const [existing] = await sql`SELECT * FROM accommodations WHERE id = ${req.params.id}`;
  if (!existing) {
    return res.status(404).json({ error: 'Rezervace nenalezena' });
  }
  const nazev = req.body.nazev ?? existing.nazev;
  const pocetIzieb = req.body.pocetIzieb !== undefined ? Number(req.body.pocetIzieb) || 0 : existing.pocet_izieb;
  const terminOd = req.body.terminOd ?? existing.termin_od;
  const terminDo = req.body.terminDo ?? existing.termin_do;
  const poznamka = req.body.poznamka ?? existing.poznamka;

  const [row] = await sql`
    UPDATE accommodations SET
      nazev = ${nazev},
      pocet_izieb = ${pocetIzieb},
      termin_od = ${terminOd},
      termin_do = ${terminDo},
      poznamka = ${poznamka}
    WHERE id = ${req.params.id}
    RETURNING *
  `;
  res.json(toAccommodation(row));
});

router.delete('/:id', async (req, res) => {
  const [row] = await sql`DELETE FROM accommodations WHERE id = ${req.params.id} RETURNING id`;
  if (!row) {
    return res.status(404).json({ error: 'Rezervace nenalezena' });
  }
  res.status(204).end();
});

export default router;
```

- [ ] **Step 2: Mount the new router in `server/server.js`**

Current `server/server.js` (after Task 1):
```js
import 'dotenv/config';
import express from 'express';
import guestsRouter from './routes/guests.js';
import agendaRouter from './routes/agenda.js';
import tasksRouter from './routes/tasks.js';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use('/api/guests', guestsRouter);
app.use('/api/agenda', agendaRouter);
app.use('/api/tasks', tasksRouter);

app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
```

New `server/server.js`:
```js
import 'dotenv/config';
import express from 'express';
import guestsRouter from './routes/guests.js';
import agendaRouter from './routes/agenda.js';
import tasksRouter from './routes/tasks.js';
import accommodationsRouter from './routes/accommodations.js';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use('/api/guests', guestsRouter);
app.use('/api/agenda', agendaRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/accommodations', accommodationsRouter);

app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
```

- [ ] **Step 3: Remove `server/utils/db.js`**

It's no longer imported by any route after Tasks 3–6.

```bash
git rm server/utils/db.js
```

- [ ] **Step 4: Verify with the dev server**

Run: `npm run dev -w server`, then:

```bash
curl http://localhost:3001/api/accommodations
```
Expected: `[]` (empty array — no seed data for this table).

```bash
curl -X POST http://localhost:3001/api/accommodations -H "Content-Type: application/json" -d "{\"nazev\":\"Hotel Continental\",\"pocetIzieb\":5,\"terminOd\":\"2026-08-21\",\"terminDo\":\"2026-08-23\",\"poznamka\":\"Blok pokojů pro hosty\"}"
```
Expected: `201` with the created reservation, `"terminOd":"2026-08-21"` and `"terminDo":"2026-08-23"` as plain date strings.

```bash
curl -X PUT http://localhost:3001/api/accommodations/<id> -H "Content-Type: application/json" -d "{\"pocetIzieb\":6}"
```
Expected: `200` with `"pocetIzieb":6` and the other fields unchanged.

```bash
curl -X DELETE http://localhost:3001/api/accommodations/<id>
```
Expected: `204`.

Stop the server after verification.

- [ ] **Step 5: Commit**

```bash
git add server/routes/accommodations.js server/server.js
git commit -m "Add accommodations resource and remove JSON storage utils"
```

---

### Task 7: Express app restructure for Vercel deployment

**Files:**
- Create: `server/app.js`
- Create: `api/index.js`
- Create: `vercel.json` (repo root)
- Modify: `server/server.js`
- Modify: `package.json` (repo root)

- [ ] **Step 1: Create `server/app.js`**

This is the configured Express app (middleware + routes) with no `.listen()` call, so it can be reused by both the local dev entry point and the Vercel serverless function.

```js
import express from 'express';
import guestsRouter from './routes/guests.js';
import agendaRouter from './routes/agenda.js';
import tasksRouter from './routes/tasks.js';
import accommodationsRouter from './routes/accommodations.js';

const app = express();

app.use(express.json());

app.use('/api/guests', guestsRouter);
app.use('/api/agenda', agendaRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/accommodations', accommodationsRouter);

export default app;
```

- [ ] **Step 2: Replace `server/server.js` with the local-dev entry point**

```js
import 'dotenv/config';
import app from './app.js';

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
```

- [ ] **Step 3: Add `"type": "module"` to the root `package.json`**

Current root `package.json`:
```json
{
  "name": "wedding-dashboard",
  "private": true,
  "version": "1.0.0",
  "workspaces": [
    "client",
    "server"
  ],
  "scripts": {
    "dev": "concurrently -k -n SERVER,CLIENT -c blue,green \"npm run dev -w server\" \"npm run dev -w client\""
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

New root `package.json`:
```json
{
  "name": "wedding-dashboard",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "workspaces": [
    "client",
    "server"
  ],
  "scripts": {
    "dev": "concurrently -k -n SERVER,CLIENT -c blue,green \"npm run dev -w server\" \"npm run dev -w client\""
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

This makes `api/index.js` (created next) be treated as an ES module, matching the `export ... from` syntax used by `server/app.js`.

- [ ] **Step 4: Create `api/index.js`**

```js
export { default } from '../server/app.js';
```

- [ ] **Step 5: Create `vercel.json` at the repo root**

```json
{
  "buildCommand": "npm run build -w client",
  "outputDirectory": "client/dist",
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/index" }]
}
```

- [ ] **Step 6: Verify local dev still works end-to-end**

Run from repo root: `npm run dev`

Expected: both `SERVER` (port 3001) and `CLIENT` (Vite dev server) start without errors.

Open the printed Vite URL in a browser and confirm:
- The "Hosté" tab loads and lists the 3 seeded guests.
- The "Program" tab loads and lists the 3 agenda items.
- The "Úkoly" tab loads and lists the 3 tasks.

Stop the dev server (Ctrl+C) after verification.

Note: `api/index.js` itself can only be fully exercised once deployed to Vercel (Task 14) — `vercel dev` is not part of this verification since it requires a separate Vercel CLI setup.

- [ ] **Step 7: Commit**

```bash
git add server/app.js server/server.js api/index.js vercel.json package.json
git commit -m "Restructure Express app for Vercel serverless deployment"
```

---

### Task 8: Frontend — `accommodationsApi` + `AccommodationForm`

**Files:**
- Modify: `client/src/api.js`
- Create: `client/src/components/accommodations/AccommodationForm.jsx`

- [ ] **Step 1: Add `accommodationsApi` to `client/src/api.js`**

Current `client/src/api.js`:
```js
const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Požadavek selhal: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const guestsApi = {
  list: () => request('/guests'),
  create: (data) => request('/guests', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/guests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/guests/${id}`, { method: 'DELETE' })
};

export const agendaApi = {
  list: () => request('/agenda'),
  create: (data) => request('/agenda', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/agenda/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/agenda/${id}`, { method: 'DELETE' })
};

export const tasksApi = {
  list: () => request('/tasks'),
  create: (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' })
};
```

Add at the end of the file:
```js

export const accommodationsApi = {
  list: () => request('/accommodations'),
  create: (data) => request('/accommodations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/accommodations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/accommodations/${id}`, { method: 'DELETE' })
};
```

- [ ] **Step 2: Create `client/src/components/accommodations/AccommodationForm.jsx`**

Modeled on `client/src/components/agenda/AgendaForm.jsx`'s modal/form-row pattern.

```jsx
import { useState } from 'react';

const EMPTY_RESERVATION = {
  nazev: '',
  pocetIzieb: 1,
  terminOd: '',
  terminDo: '',
  poznamka: ''
};

export default function AccommodationForm({ reservation, onSave, onClose }) {
  const [form, setForm] = useState(reservation ? { ...reservation } : { ...EMPTY_RESERVATION });

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{reservation ? 'Upravit rezervaci ubytování' : 'Přidat rezervaci ubytování'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="nazev">Název (hotel / místo)</label>
            <input
              id="nazev"
              type="text"
              value={form.nazev}
              onChange={(e) => update('nazev', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="pocetIzieb">Počet pokojů</label>
            <input
              id="pocetIzieb"
              type="number"
              min="0"
              step="1"
              value={form.pocetIzieb}
              onChange={(e) => update('pocetIzieb', Number(e.target.value))}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="terminOd">Termín od</label>
            <input
              id="terminOd"
              type="date"
              value={form.terminOd}
              onChange={(e) => update('terminOd', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="terminDo">Termín do</label>
            <input
              id="terminDo"
              type="date"
              value={form.terminDo}
              onChange={(e) => update('terminDo', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="poznamka">Poznámka</label>
            <textarea
              id="poznamka"
              rows={2}
              value={form.poznamka}
              onChange={(e) => update('poznamka', e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Zrušit</button>
            <button type="submit" className="btn">Uložit</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/api.js client/src/components/accommodations/AccommodationForm.jsx
git commit -m "Add accommodationsApi and AccommodationForm"
```

---

### Task 9: Frontend — `AccommodationList` with capacity badges

**Files:**
- Create: `client/src/components/accommodations/AccommodationList.jsx`
- Create: `client/src/components/accommodations/AccommodationList.css`

This component receives reservations that already have a computed `potrebujeme` field (added by `AccommodationsPage` in Task 10) and renders the "Potřebujeme" / "Máme rezervováno" / status badge per the accommodation spec.

- [ ] **Step 1: Create `client/src/components/accommodations/AccommodationList.jsx`**

```jsx
function formatShortDate(isoDate) {
  const [, month, day] = isoDate.split('-');
  return `${Number(day)}.${Number(month)}.`;
}

function roomsLabel(count) {
  if (count === 1) return 'pokoj';
  if (count >= 2 && count <= 4) return 'pokoje';
  return 'pokojů';
}

export default function AccommodationList({ reservations, onEdit, onDelete }) {
  if (reservations.length === 0) {
    return <p className="empty-state">Zatím žádné rezervace ubytování. Přidejte první rezervaci.</p>;
  }

  const sorted = [...reservations].sort((a, b) => a.terminOd.localeCompare(b.terminOd));

  return (
    <ul className="accommodation-list">
      {sorted.map((reservation) => {
        const chybi = reservation.potrebujeme - reservation.pocetIzieb;
        const ok = chybi <= 0;
        return (
          <li key={reservation.id} className="accommodation-row card">
            <div className="accommodation-main">
              <div className="accommodation-name">{reservation.nazev}</div>
              <div className="accommodation-meta">
                {formatShortDate(reservation.terminOd)}–{formatShortDate(reservation.terminDo)}
              </div>
              {reservation.poznamka && <div className="accommodation-note">{reservation.poznamka}</div>}
              <div className="accommodation-capacity">
                Potřebujeme: {reservation.potrebujeme} {roomsLabel(reservation.potrebujeme)} · Máme rezervováno: {reservation.pocetIzieb} {roomsLabel(reservation.pocetIzieb)}
              </div>
            </div>
            <div className="accommodation-side">
              <span className={`badge ${ok ? 'badge-confirmed' : 'badge-declined'}`}>
                {ok ? 'OK' : `Chybí ${chybi} ${roomsLabel(chybi)}`}
              </span>
              <div className="accommodation-actions">
                <button className="btn-icon" onClick={() => onEdit(reservation)} title="Upravit">✎</button>
                <button className="btn-icon" onClick={() => onDelete(reservation.id)} title="Smazat">🗑</button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: Create `client/src/components/accommodations/AccommodationList.css`**

Modeled on `client/src/components/guests/GuestList.css`.

```css
.accommodation-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.accommodation-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.accommodation-name {
  font-weight: 700;
  font-size: 16px;
}

.accommodation-meta {
  font-size: 13px;
  color: var(--color-text-light);
  margin-top: 2px;
}

.accommodation-note {
  font-size: 13px;
  color: var(--color-text-light);
  margin-top: 4px;
  font-style: italic;
}

.accommodation-capacity {
  font-size: 13px;
  margin-top: 8px;
}

.accommodation-side {
  display: flex;
  align-items: center;
  gap: 12px;
}

.accommodation-actions {
  display: flex;
  gap: 4px;
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/accommodations/AccommodationList.jsx client/src/components/accommodations/AccommodationList.css
git commit -m "Add AccommodationList with capacity badges"
```

---

### Task 10: Frontend — `AccommodationsPage` + Nav + App wiring

**Files:**
- Create: `client/src/components/accommodations/AccommodationsPage.jsx`
- Modify: `client/src/components/Nav.jsx`
- Modify: `client/src/App.jsx`

- [ ] **Step 1: Create `client/src/components/accommodations/AccommodationsPage.jsx`**

This fetches both `accommodationsApi.list()` and `guestsApi.list()`, and computes "potřebujeme" per reservation using the date-range overlap formula from the accommodation spec: `guest.ubytovaniOd <= reservation.terminDo AND guest.ubytovaniDo >= reservation.terminOd`, summing `pocetIzieb` over matching guests (guests with `pocetIzieb > 0` but no dates set are excluded).

```jsx
import { useEffect, useState } from 'react';
import { accommodationsApi, guestsApi } from '../../api.js';
import AccommodationList from './AccommodationList.jsx';
import AccommodationForm from './AccommodationForm.jsx';
import './AccommodationList.css';

function overlaps(guest, reservation) {
  return guest.ubytovaniOd <= reservation.terminDo && guest.ubytovaniDo >= reservation.terminOd;
}

function computePotrebujeme(reservation, guests) {
  return guests
    .filter((g) => g.pocetIzieb > 0 && g.ubytovaniOd && g.ubytovaniDo)
    .filter((g) => overlaps(g, reservation))
    .reduce((sum, g) => sum + g.pocetIzieb, 0);
}

export default function AccommodationsPage() {
  const [reservations, setReservations] = useState([]);
  const [guests, setGuests] = useState([]);
  const [editingReservation, setEditingReservation] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    accommodationsApi.list().then(setReservations);
    guestsApi.list().then(setGuests);
  }, []);

  async function handleSave(data) {
    if (editingReservation) {
      const updated = await accommodationsApi.update(editingReservation.id, data);
      setReservations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } else {
      const created = await accommodationsApi.create(data);
      setReservations((prev) => [...prev, created]);
    }
    setShowForm(false);
    setEditingReservation(null);
  }

  async function handleDelete(id) {
    await accommodationsApi.remove(id);
    setReservations((prev) => prev.filter((r) => r.id !== id));
  }

  function openEdit(reservation) {
    setEditingReservation(reservation);
    setShowForm(true);
  }

  function openAdd() {
    setEditingReservation(null);
    setShowForm(true);
  }

  const withCapacity = reservations.map((r) => ({
    ...r,
    potrebujeme: computePotrebujeme(r, guests)
  }));

  return (
    <div>
      <div className="page-header">
        <h2>Ubytování</h2>
        <button className="btn" onClick={openAdd}>+ Přidat rezervaci</button>
      </div>
      <AccommodationList reservations={withCapacity} onEdit={openEdit} onDelete={handleDelete} />
      {showForm && (
        <AccommodationForm
          reservation={editingReservation}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingReservation(null); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the "Ubytování" tab to `client/src/components/Nav.jsx`**

Current `client/src/components/Nav.jsx`:
```jsx
import './Nav.css';

const TABS = [
  { id: 'hoste', label: 'Hosté' },
  { id: 'program', label: 'Program' },
  { id: 'ukoly', label: 'Úkoly' }
];

export default function Nav({ active, onChange }) {
  return (
    <nav className="nav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`nav-tab ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
```

Change the `TABS` array to:
```jsx
const TABS = [
  { id: 'hoste', label: 'Hosté' },
  { id: 'program', label: 'Program' },
  { id: 'ukoly', label: 'Úkoly' },
  { id: 'ubytovani', label: 'Ubytování' }
];
```

(The rest of `Nav.jsx` is unchanged.)

- [ ] **Step 3: Wire up the new tab in `client/src/App.jsx`**

Current `client/src/App.jsx`:
```jsx
import { useState } from 'react';
import Hero from './components/Hero.jsx';
import Nav from './components/Nav.jsx';
import PhotoGallery from './components/PhotoGallery.jsx';
import GuestsPage from './components/guests/GuestsPage.jsx';
import AgendaPage from './components/agenda/AgendaPage.jsx';
import TasksPage from './components/tasks/TasksPage.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('hoste');

  return (
    <div className="app">
      <Hero />
      <Nav active={activeTab} onChange={setActiveTab} />
      <PhotoGallery />
      <main className="container section">
        {activeTab === 'hoste' && <GuestsPage />}
        {activeTab === 'program' && <AgendaPage />}
        {activeTab === 'ukoly' && <TasksPage />}
      </main>
    </div>
  );
}
```

New `client/src/App.jsx`:
```jsx
import { useState } from 'react';
import Hero from './components/Hero.jsx';
import Nav from './components/Nav.jsx';
import PhotoGallery from './components/PhotoGallery.jsx';
import GuestsPage from './components/guests/GuestsPage.jsx';
import AgendaPage from './components/agenda/AgendaPage.jsx';
import TasksPage from './components/tasks/TasksPage.jsx';
import AccommodationsPage from './components/accommodations/AccommodationsPage.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('hoste');

  return (
    <div className="app">
      <Hero />
      <Nav active={activeTab} onChange={setActiveTab} />
      <PhotoGallery />
      <main className="container section">
        {activeTab === 'hoste' && <GuestsPage />}
        {activeTab === 'program' && <AgendaPage />}
        {activeTab === 'ukoly' && <TasksPage />}
        {activeTab === 'ubytovani' && <AccommodationsPage />}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Verify in the browser**

Run `npm run dev` from repo root, open the Vite URL, and confirm:
- A 4th tab "Ubytování" appears and is clickable.
- The Ubytování tab shows the empty state "Zatím žádné rezervace ubytování. Přidejte první rezervaci."
- Clicking "+ Přidat rezervaci" opens a modal with Název, Počet pokojů, Termín od, Termín do, Poznámka fields.
- Filling it in (e.g. "Hotel Continental", 5 rooms, 2026-08-21 to 2026-08-23) and saving shows a new card with "Potřebujeme: 0 pokojů · Máme rezervováno: 5 pokojů" and a green "OK" badge (no guests have accommodation dates yet at this point).
- Edit (✎) and delete (🗑) on the card work.

Stop the dev server after verification.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/accommodations/AccommodationsPage.jsx client/src/components/Nav.jsx client/src/App.jsx
git commit -m "Add Ubytování tab with capacity comparison"
```

---

### Task 11: Frontend — `GuestForm` počet pokojů + conditional date fields

**Files:**
- Modify: `client/src/components/guests/GuestForm.jsx` (full rewrite)

- [ ] **Step 1: Replace the file contents**

Adds a "Počet pokojů" number input (always visible) and "Ubytování od"/"Ubytování do" date inputs shown only when `pocetIzieb > 0` — mirroring the existing `form.typ === 'rodina'` conditional pattern for `pocetDeti`. When `pocetIzieb` is set back to `0`, the dates are cleared client-side; on submit, empty date strings are converted to `null` to match the API contract.

```jsx
import { useState } from 'react';

const EMPTY_GUEST = {
  jmeno: '',
  typ: 'jednotlivec',
  pocetDeti: 0,
  potvrzeni: 'ceka',
  mustHave: false,
  poznamka: '',
  pocetIzieb: 0,
  ubytovaniOd: '',
  ubytovaniDo: ''
};

export default function GuestForm({ guest, onSave, onClose }) {
  const [form, setForm] = useState(
    guest
      ? { ...guest, ubytovaniOd: guest.ubytovaniOd || '', ubytovaniDo: guest.ubytovaniDo || '' }
      : { ...EMPTY_GUEST }
  );

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updatePocetIzieb(value) {
    setForm((prev) => ({
      ...prev,
      pocetIzieb: value,
      ubytovaniOd: value > 0 ? prev.ubytovaniOd : '',
      ubytovaniDo: value > 0 ? prev.ubytovaniDo : ''
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      ...form,
      ubytovaniOd: form.ubytovaniOd || null,
      ubytovaniDo: form.ubytovaniDo || null
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{guest ? 'Upravit hosta' : 'Přidat hosta'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="jmeno">Jméno</label>
            <input
              id="jmeno"
              type="text"
              value={form.jmeno}
              onChange={(e) => update('jmeno', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="typ">Typ</label>
            <select id="typ" value={form.typ} onChange={(e) => update('typ', e.target.value)}>
              <option value="jednotlivec">Jednotlivec</option>
              <option value="par">Pár</option>
              <option value="rodina">Rodina</option>
            </select>
          </div>
          {form.typ === 'rodina' && (
            <div className="form-row">
              <label htmlFor="pocetDeti">Počet dětí</label>
              <select
                id="pocetDeti"
                value={form.pocetDeti}
                onChange={(e) => update('pocetDeti', Number(e.target.value))}
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
          )}
          <div className="form-row">
            <label htmlFor="potvrzeni">Potvrzení účasti</label>
            <select id="potvrzeni" value={form.potvrzeni} onChange={(e) => update('potvrzeni', e.target.value)}>
              <option value="ceka">Čeká na odpověď</option>
              <option value="potvrzeno">Potvrzeno</option>
              <option value="nepride">Nepřijde</option>
            </select>
          </div>
          <div className="form-row form-row-checkbox">
            <label>
              <input
                type="checkbox"
                checked={form.mustHave}
                onChange={(e) => update('mustHave', e.target.checked)}
              />
              Must-have host
            </label>
          </div>
          <div className="form-row">
            <label htmlFor="pocetIzieb">Počet pokojů</label>
            <input
              id="pocetIzieb"
              type="number"
              min="0"
              step="1"
              value={form.pocetIzieb}
              onChange={(e) => updatePocetIzieb(Number(e.target.value))}
            />
          </div>
          {form.pocetIzieb > 0 && (
            <>
              <div className="form-row">
                <label htmlFor="ubytovaniOd">Ubytování od</label>
                <input
                  id="ubytovaniOd"
                  type="date"
                  value={form.ubytovaniOd}
                  onChange={(e) => update('ubytovaniOd', e.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="ubytovaniDo">Ubytování do</label>
                <input
                  id="ubytovaniDo"
                  type="date"
                  value={form.ubytovaniDo}
                  onChange={(e) => update('ubytovaniDo', e.target.value)}
                  required
                />
              </div>
            </>
          )}
          <div className="form-row">
            <label htmlFor="poznamka">Poznámka</label>
            <textarea
              id="poznamka"
              rows={2}
              value={form.poznamka}
              onChange={(e) => update('poznamka', e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Zrušit</button>
            <button type="submit" className="btn">Uložit</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in the browser**

Run `npm run dev`, open the "Hosté" tab, and:
- Click "+ Přidat hosta" — confirm "Počet pokojů" defaults to `0` and no date fields are shown.
- Set "Počet pokojů" to `2` — confirm "Ubytování od" and "Ubytování do" date inputs appear, both required.
- Fill in dates (e.g. 2026-08-20 to 2026-08-23), save — confirm the guest is created successfully.
- Edit that guest, set "Počet pokojů" back to `0` — confirm the date fields disappear, save — confirm the guest's dates are cleared (re-open edit to check they're empty).

Stop the dev server after verification.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/guests/GuestForm.jsx
git commit -m "Add accommodation fields to GuestForm"
```

---

### Task 12: Frontend — `GuestList` accommodation badge

**Files:**
- Modify: `client/src/components/guests/GuestList.jsx` (full rewrite)
- Modify: `client/src/components/guests/GuestList.css`

- [ ] **Step 1: Replace `client/src/components/guests/GuestList.jsx`**

Adds a "🛏️ N pokoje (od–do)" badge under `.guest-note` when `guest.pocetIzieb > 0`, per the accommodation spec.

```jsx
const TYPE_LABELS = {
  jednotlivec: 'Jednotlivec',
  par: 'Pár',
  rodina: 'Rodina'
};

const STATUS_LABELS = {
  ceka: 'Čeká na odpověď',
  potvrzeno: 'Potvrzeno',
  nepride: 'Nepřijde'
};

const STATUS_BADGE_CLASS = {
  ceka: 'badge-waiting',
  potvrzeno: 'badge-confirmed',
  nepride: 'badge-declined'
};

function childrenLabel(count) {
  if (count === 1) return '1 dítě';
  if (count >= 2 && count <= 4) return `${count} děti`;
  return `${count} dětí`;
}

function roomsLabel(count) {
  if (count === 1) return 'pokoj';
  if (count >= 2 && count <= 4) return 'pokoje';
  return 'pokojů';
}

function formatShortDate(isoDate) {
  const [, month, day] = isoDate.split('-');
  return `${Number(day)}.${Number(month)}.`;
}

export default function GuestList({ guests, onEdit, onDelete }) {
  if (guests.length === 0) {
    return <p className="empty-state">Žádní hosté v tomto výběru.</p>;
  }

  return (
    <ul className="guest-list">
      {guests.map((guest) => (
        <li key={guest.id} className="guest-row card">
          <div className="guest-main">
            <div className="guest-name">
              {guest.jmeno}
              {guest.mustHave && <span className="guest-star" title="Must-have">★</span>}
            </div>
            <div className="guest-meta">
              {TYPE_LABELS[guest.typ]}
              {guest.typ === 'rodina' && guest.pocetDeti > 0 && ` · ${childrenLabel(guest.pocetDeti)}`}
            </div>
            {guest.poznamka && <div className="guest-note">{guest.poznamka}</div>}
            {guest.pocetIzieb > 0 && (
              <div className="guest-accommodation-badge">
                🛏️ {guest.pocetIzieb} {roomsLabel(guest.pocetIzieb)} ({formatShortDate(guest.ubytovaniOd)}–{formatShortDate(guest.ubytovaniDo)})
              </div>
            )}
          </div>
          <div className="guest-side">
            <span className={`badge ${STATUS_BADGE_CLASS[guest.potvrzeni]}`}>
              {STATUS_LABELS[guest.potvrzeni]}
            </span>
            <div className="guest-actions">
              <button className="btn-icon" onClick={() => onEdit(guest)} title="Upravit">✎</button>
              <button className="btn-icon" onClick={() => onDelete(guest.id)} title="Smazat">🗑</button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Add the badge style to `client/src/components/guests/GuestList.css`**

Append to the end of the file:
```css

.guest-accommodation-badge {
  font-size: 13px;
  color: var(--color-text-light);
  margin-top: 4px;
}
```

- [ ] **Step 3: Verify in the browser**

Run `npm run dev`, open the "Hosté" tab, and confirm the guest you gave rooms+dates to in Task 11 now shows a "🛏️ 2 pokoje (20.8.–23.8.)" badge under its note. Guests with `pocetIzieb = 0` show no badge.

Stop the dev server after verification.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/guests/GuestList.jsx client/src/components/guests/GuestList.css
git commit -m "Show accommodation badge on guest list"
```

---

### Task 13: Point the GitHub remote at the new Wedding repo and push

**Files:** none (git configuration only)

- [ ] **Step 1: Check the current remote**

```bash
git -C "c:\Users\Elitebook" remote -v
```

Expected: `origin` currently points at an unrelated `agile-battleships` repo (confirmed in a prior session to contain none of this project's files).

- [ ] **Step 2: Point `origin` at the new Wedding repo**

```bash
git -C "c:\Users\Elitebook" remote set-url origin https://github.com/letkoroman/wedding.git
```

- [ ] **Step 3: Push `main`**

```bash
git -C "c:\Users\Elitebook" push -u origin main
```

Expected: all commits from Tasks 1–12 (plus prior history) are pushed to `https://github.com/letkoroman/wedding`.

- [ ] **Step 4: Verify**

```bash
git -C "c:\Users\Elitebook" remote -v
git -C "c:\Users\Elitebook" log --oneline -1
```

Confirm `origin` now points at `letkoroman/wedding` and the pushed branch's latest commit matches the local `main` HEAD. Open `https://github.com/letkoroman/wedding` in a browser and confirm the files are visible (this is the only step in this task that needs browser interaction).

No commit needed for this task (no file changes).

---

### Task 14: Vercel project + Supabase connection + redeploy (manual setup)

**Files:** none (Vercel/Supabase dashboard configuration)

This task is primarily browser-based steps for the user/controller, since it requires interaction with the Vercel and Supabase dashboards using the user's accounts.

- [ ] **Step 1: Import the GitHub repo into Vercel**

On vercel.com: "Add New Project" → import `letkoroman/wedding` from GitHub. Vercel should auto-detect the `vercel.json` (build command `npm run build -w client`, output directory `client/dist`). Click "Deploy".

Expected: the first deploy succeeds and serves the static frontend. API calls (`/api/guests` etc.) will fail at this point — `DATABASE_URL` isn't set in this environment yet.

- [ ] **Step 2: Add `DATABASE_URL` to the Vercel project's environment variables**

In the Vercel project's Settings → Environment Variables, add:
- Key: `DATABASE_URL`
- Value: the same Supabase Supavisor pooler connection string used in the local `.env` (Task 1, Step 5)
- Environments: Production, Preview, and Development (all three, so `vercel dev` and preview deploys also work)

- [ ] **Step 3: Redeploy**

Trigger a redeploy from the Vercel dashboard ("Redeploy" on the latest deployment), or push an empty commit:

```bash
git -C "c:\Users\Elitebook" commit --allow-empty -m "Trigger redeploy with DATABASE_URL"
git -C "c:\Users\Elitebook" push
```

- [ ] **Step 4: Verify the live deployment**

Open the deployed Vercel URL in a browser and confirm:
- The Hero/Nav/PhotoGallery render.
- "Hosté" tab loads the 3 seeded guests (plus any test guests created during local verification).
- "Program", "Úkoly", and "Ubytování" tabs all load their data from the same Supabase database.
- Creating/editing/deleting a guest, agenda item, task, or accommodation reservation on the live site persists (refresh the page to confirm).

If `/api/*` requests 404 on the live deployment, the `vercel.json` rewrite destination may need adjusting — try changing `"destination": "/api/index"` to `"destination": "/api"` in `vercel.json`, commit, and push to trigger a redeploy.

- [ ] **Step 5: Confirm continuous deployment**

Make a trivial change locally (e.g. a comment or wording tweak), commit, and push to `main`. Confirm a new deployment automatically starts on Vercel and the live URL updates once it completes.

No commit needed beyond the trivial verification change in Step 5 (if made).

---

## Out of scope (carried over from both specs)

- Authentication / access control
- Database migration framework beyond `schema.sql` + `seed.js`
- Separate dev/prod database branches
- Automated test suite (manual/browser verification only)
- Validation that `ubytovaniOd <= ubytovaniDo` / `terminOd <= terminDo` beyond HTML date input behavior
- Cross-reservation totals or stored guest-to-reservation assignments
