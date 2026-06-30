# Program Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Program tab's text-list with a visual dashboard (overall parallel-column timeline + per-category linear view), backed by user-creatable categories and an unscheduled-ideas "lavička" sidebar with drag-to-reorder/drag-to-schedule; remove Hosté/Ubytování from the nav.

**Architecture:** Postgres gets one new `categories` table and a relaxed `agenda_items` schema (time fields become optional — an "idea" is just an agenda item with no time yet, reusing the existing CRUD route). The client gets a set of small, focused components under `client/src/components/agenda/` replacing the old list-based ones, plus two new shared util modules (`timeUtils.js`, `colors.js`, `layout.js`) ported directly from the algorithms already validated in the approved `mockup-program.html`.

**Tech Stack:** Express + `pg` (raw SQL, no ORM), React 19 (no React Router — tab state in `App.jsx`), Vite, plain CSS (no framework). No test runner is configured in this repo (confirmed: no Jest/Vitest, no `*.test.*` files anywhere) — verification steps below use `curl` against the running API and `npm run build -w client` as a compile-check, consistent with how every prior round in this codebase was verified.

**Spec:** `docs/superpowers/specs/2026-06-30-program-redesign-design.md`

---

## Task 1: Database migration — categories table + optional agenda times

**Files:**
- Create: `server/db/migrate-v5.js`

- [ ] **Step 1: Write the migration script**

```js
import '../load-env.js';
import { sql } from './client.js';

await sql.query(`
  ALTER TABLE agenda_items
    ALTER COLUMN cas_zacatku DROP NOT NULL,
    ALTER COLUMN trvani DROP NOT NULL,
    ALTER COLUMN ikona DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS misto TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS priorita INTEGER NOT NULL DEFAULT 0
`);

await sql.query(`
  CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    icon TEXT NOT NULL,
    accent TEXT NOT NULL,
    fixed BOOLEAN NOT NULL DEFAULT false,
    poradi INTEGER NOT NULL DEFAULT 0
  )
`);

const DEFAULTS = [
  { key: 'ceremonie', label: 'Ceremonie', icon: '🎊', accent: '#D4AF37', poradi: 1 },
  { key: 'sport',     label: 'Sport',     icon: '⚽', accent: '#5a9a5a', poradi: 2 },
  { key: 'zabava',    label: 'Zábava',    icon: '🎉', accent: '#9b7de0', poradi: 3 },
  { key: 'jidlo',     label: 'Jídlo',     icon: '🍽️', accent: '#e09040', poradi: 4 }
];

for (const cat of DEFAULTS) {
  // eslint-disable-next-line no-await-in-loop
  await sql`
    INSERT INTO categories (key, label, icon, accent, fixed, poradi)
    VALUES (${cat.key}, ${cat.label}, ${cat.icon}, ${cat.accent}, true, ${cat.poradi})
    ON CONFLICT (key) DO NOTHING
  `;
}

console.log('Migration v5 OK');
process.exit(0);
```

Note: `server/db/schema.sql` is intentionally **not** updated — this
codebase's existing convention (see `migrate-v3.js`, `migrate-v4.js`)
is that `schema.sql` reflects only the original base schema, and
migrations are the source of truth for the live DB. Don't "fix" this
inconsistency as part of this task — it's pre-existing and out of
scope.

- [ ] **Step 2: Run the migration against the real DB**

Run: `node server/db/migrate-v5.js`
Expected output: `Migration v5 OK`

- [ ] **Step 3: Verify the schema change**

Run:
```bash
node -e "
import('./server/load-env.js').then(() => import('./server/db/client.js')).then(async ({ sql }) => {
  const cats = await sql\`SELECT key, label, fixed FROM categories ORDER BY poradi\`;
  console.log(cats);
  const cols = await sql\`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'agenda_items' AND column_name IN ('cas_zacatku','trvani','ikona','misto','priorita')\`;
  console.log(cols);
  process.exit(0);
});
"
```
Expected: 4 categories listed (ceremonie/sport/zabava/jidlo, all
`fixed: true`), and `cas_zacatku`/`trvani`/`ikona` show
`is_nullable: 'YES'`, `misto`/`priorita` are present.

- [ ] **Step 4: Commit**

```bash
git add server/db/migrate-v5.js
git commit -m "feat: add categories table and relax agenda_items time constraints"
```

---

## Task 2: Backend — categories REST route

**Files:**
- Create: `server/routes/categories.js`
- Modify: `server/app.js`

- [ ] **Step 1: Write the route**

```js
import { Router } from 'express';
import { sql } from '../db/client.js';

const router = Router();

function slugify(label) {
  return label
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'kategorie';
}

function toCategory(row) {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    icon: row.icon,
    accent: row.accent,
    fixed: row.fixed,
    poradi: row.poradi
  };
}

router.get('/', async (req, res) => {
  const rows = await sql`SELECT * FROM categories ORDER BY poradi ASC`;
  res.json(rows.map(toCategory));
});

router.post('/', async (req, res) => {
  const label = req.body.label || '';
  const icon = req.body.icon || '🎉';
  const accent = req.body.accent || '#9b7de0';

  const base = slugify(label);
  let key = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while ((await sql`SELECT 1 FROM categories WHERE key = ${key}`).length > 0) {
    key = `${base}-${++suffix}`;
  }

  const [{ max }] = await sql`SELECT COALESCE(MAX(poradi), 0) AS max FROM categories`;

  const [row] = await sql`
    INSERT INTO categories (key, label, icon, accent, fixed, poradi)
    VALUES (${key}, ${label}, ${icon}, ${accent}, false, ${max + 1})
    RETURNING *
  `;
  res.status(201).json(toCategory(row));
});

router.delete('/:key', async (req, res) => {
  const [existing] = await sql`SELECT * FROM categories WHERE key = ${req.params.key}`;
  if (!existing) {
    return res.status(404).json({ error: 'Kategorie nenalezena' });
  }
  if (existing.fixed) {
    return res.status(409).json({ error: 'Výchozí kategorii nelze smazat' });
  }
  const [{ count }] = await sql`SELECT COUNT(*) AS count FROM agenda_items WHERE kategorie = ${req.params.key}`;
  if (Number(count) > 0) {
    return res.status(409).json({ error: 'Kategorie je použita u aktivit, nejprve je přesuňte nebo smažte' });
  }
  await sql`DELETE FROM categories WHERE key = ${req.params.key}`;
  res.status(204).end();
});

export default router;
```

- [ ] **Step 2: Register the route**

In `server/app.js`, add the import and registration:

```js
import express from 'express';
import guestsRouter from './routes/guests.js';
import agendaRouter from './routes/agenda.js';
import tasksRouter from './routes/tasks.js';
import accommodationsRouter from './routes/accommodations.js';
import categoriesRouter from './routes/categories.js';

const app = express();

app.use(express.json());

app.use('/api/guests', guestsRouter);
app.use('/api/agenda', agendaRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/accommodations', accommodationsRouter);
app.use('/api/categories', categoriesRouter);

export default app;
```

- [ ] **Step 3: Start the server and verify with curl**

Run: `npm run dev -w server` (leave running in background)

Then in another terminal:
```bash
curl -s http://localhost:3001/api/categories
```
(Check `server/server.js` for the actual port if different from 3001.)
Expected: a JSON array of 4 categories (ceremonie, sport, zabava, jidlo).

```bash
curl -s -X POST http://localhost:3001/api/categories \
  -H "Content-Type: application/json" \
  -d '{"label":"Test kategorie","icon":"🔥","accent":"#c97064"}'
```
Expected: `201` with a JSON object, `"key":"test-kategorie"`, `"fixed":false`.

```bash
curl -s -X DELETE http://localhost:3001/api/categories/test-kategorie -i
```
Expected: `204 No Content`. Then re-run the GET — the test category is gone.

```bash
curl -s -X DELETE http://localhost:3001/api/categories/ceremonie -i
```
Expected: `409`, `{"error":"Výchozí kategorii nelze smazat"}`.

- [ ] **Step 4: Commit**

```bash
git add server/routes/categories.js server/app.js
git commit -m "feat: add categories CRUD API"
```

---

## Task 3: Backend — agenda route supports optional time, misto, priorita

**Files:**
- Modify: `server/routes/agenda.js` (full rewrite)

- [ ] **Step 1: Replace the file contents**

```js
import { Router } from 'express';
import { sql } from '../db/client.js';

const router = Router();

function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function computeTrvani(casZacatku, casKonce) {
  if (!casZacatku || !casKonce) return null;
  let diff = toMinutes(casKonce) - toMinutes(casZacatku);
  if (diff < 0) diff += 1440;
  return diff;
}

function toAgendaItem(row) {
  return {
    id: row.id,
    nazev: row.nazev,
    casZacatku: row.cas_zacatku,
    casKonce: row.cas_konce,
    trvani: row.trvani,
    kategorie: row.kategorie || 'ceremonie',
    misto: row.misto || '',
    priorita: row.priorita,
    poznamka: row.poznamka
  };
}

router.get('/', async (req, res) => {
  const rows = await sql`SELECT * FROM agenda_items`;
  res.json(rows.map(toAgendaItem));
});

router.post('/', async (req, res) => {
  const nazev = req.body.nazev || '';
  const casZacatku = req.body.casZacatku || null;
  const casKonce = req.body.casKonce || null;
  const trvani = computeTrvani(casZacatku, casKonce);
  const kategorie = req.body.kategorie || 'ceremonie';
  const misto = req.body.misto || '';
  const priorita = Number(req.body.priorita) || 0;
  const poznamka = req.body.poznamka || '';

  const [row] = await sql`
    INSERT INTO agenda_items (nazev, cas_zacatku, trvani, kategorie, cas_konce, misto, priorita, poznamka)
    VALUES (${nazev}, ${casZacatku}, ${trvani}, ${kategorie}, ${casKonce}, ${misto}, ${priorita}, ${poznamka})
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
  const casZacatku = req.body.casZacatku !== undefined ? req.body.casZacatku : existing.cas_zacatku;
  const casKonce = req.body.casKonce !== undefined ? req.body.casKonce : existing.cas_konce;
  const trvani = computeTrvani(casZacatku, casKonce);
  const kategorie = req.body.kategorie ?? (existing.kategorie || 'ceremonie');
  const misto = req.body.misto ?? (existing.misto || '');
  const priorita = req.body.priorita !== undefined ? Number(req.body.priorita) || 0 : existing.priorita;
  const poznamka = req.body.poznamka ?? existing.poznamka;

  const [row] = await sql`
    UPDATE agenda_items SET
      nazev = ${nazev},
      cas_zacatku = ${casZacatku},
      trvani = ${trvani},
      kategorie = ${kategorie},
      cas_konce = ${casKonce},
      misto = ${misto},
      priorita = ${priorita},
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

- [ ] **Step 2: Verify with curl (server still running from Task 2)**

Create a scheduled item:
```bash
curl -s -X POST http://localhost:3001/api/agenda \
  -H "Content-Type: application/json" \
  -d '{"nazev":"Test obrad","kategorie":"ceremonie","casZacatku":"10:00","casKonce":"11:00","misto":"Zahrada"}'
```
Expected: `201`, response includes `"trvani":60`, `"misto":"Zahrada"`.

Create an idea (no time):
```bash
curl -s -X POST http://localhost:3001/api/agenda \
  -H "Content-Type: application/json" \
  -d '{"nazev":"Test napad","kategorie":"sport"}'
```
Expected: `201`, `"casZacatku":null`, `"casKonce":null`, `"trvani":null`.

```bash
curl -s http://localhost:3001/api/agenda
```
Expected: both test rows present. Delete both via `DELETE
/api/agenda/:id` (use the `id` values from the responses above) to
clean up before moving on — the real seed data comes later.

- [ ] **Step 3: Commit**

```bash
git add server/routes/agenda.js
git commit -m "feat: agenda route supports optional time, misto, priorita"
```

---

## Task 4: Frontend — categoriesApi

**Files:**
- Modify: `client/src/api.js`

- [ ] **Step 1: Add the categoriesApi export**

Add to the end of `client/src/api.js`:

```js
export const categoriesApi = {
  list: () => request('/categories'),
  create: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  remove: (key) => request(`/categories/${key}`, { method: 'DELETE' })
};
```

- [ ] **Step 2: Verify**

Run: `npm run build -w client`
Expected: build succeeds (no syntax errors introduced).

- [ ] **Step 3: Commit**

```bash
git add client/src/api.js
git commit -m "feat: add categoriesApi client"
```

---

## Task 5: Frontend — shared time/color/layout utilities

**Files:**
- Create: `client/src/components/agenda/timeUtils.js`
- Create: `client/src/components/agenda/colors.js`
- Create: `client/src/components/agenda/layout.js`

- [ ] **Step 1: Write `timeUtils.js`**

```js
export function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToLabel(m) {
  m = ((m % 1440) + 1440) % 1440;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function fmtDuration(start, end) {
  if (!start || !end) return null;
  let diff = toMinutes(end) - toMinutes(start);
  if (diff < 0) diff += 1440;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
})();
```

- [ ] **Step 2: Write `colors.js`**

```js
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const num = parseInt(hex, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b]
    .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0'))
    .join('');
}

function mix(hex, target, amount) {
  const c = hexToRgb(hex);
  return rgbToHex(
    c.r + (target.r - c.r) * amount,
    c.g + (target.g - c.g) * amount,
    c.b + (target.b - c.b) * amount
  );
}

export function deriveColors(accent) {
  return {
    bg: mix(accent, { r: 255, g: 255, b: 255 }, 0.87),
    text: mix(accent, { r: 0, g: 0, b: 0 }, 0.45),
    border: accent
  };
}
```

- [ ] **Step 3: Write `layout.js`**

```js
import { toMinutes } from './timeUtils.js';

export function layoutOverall(items) {
  const withMin = items
    .map((i) => ({ ...i, startMin: toMinutes(i.casZacatku), endMin: toMinutes(i.casKonce) }))
    .sort((a, b) => a.startMin - b.startMin);

  const columnEnds = [];
  const withCols = withMin.map((item) => {
    let col = columnEnds.findIndex((end) => end <= item.startMin);
    if (col === -1) { col = columnEnds.length; columnEnds.push(0); }
    columnEnds[col] = item.endMin;
    return { ...item, col };
  });

  return withCols.map((item) => {
    const concurrent = withCols.filter((o) => o.startMin < item.endMin && o.endMin > item.startMin);
    const maxCols = Math.max(...concurrent.map((o) => o.col + 1));
    return { ...item, maxCols };
  });
}

export function clusterOverall(laidItems) {
  const sorted = [...laidItems].sort((a, b) => a.startMin - b.startMin);
  const clusters = [];
  let current = null;
  for (const item of sorted) {
    if (!current || item.startMin >= current.maxEnd) {
      current = { items: [item], minStart: item.startMin, maxEnd: item.endMin };
      clusters.push(current);
    } else {
      current.items.push(item);
      current.maxEnd = Math.max(current.maxEnd, item.endMin);
    }
  }
  return clusters;
}
```

- [ ] **Step 4: Verify**

Run: `npm run build -w client`
Expected: build succeeds (these modules aren't imported anywhere yet, so this just checks for syntax errors).

- [ ] **Step 5: Commit**

```bash
git add client/src/components/agenda/timeUtils.js client/src/components/agenda/colors.js client/src/components/agenda/layout.js
git commit -m "feat: add shared time/color/layout utilities for agenda redesign"
```

---

## Task 6: Frontend — ProgramToggle and CategoryLegend

**Files:**
- Create: `client/src/components/agenda/ProgramToggle.jsx`
- Create: `client/src/components/agenda/CategoryLegend.jsx`

- [ ] **Step 1: Write `ProgramToggle.jsx`**

```jsx
const VIEWS = [
  { key: 'overall', label: 'Celkový program' },
  { key: 'category', label: 'Podle kategorie' }
];

export default function ProgramToggle({ view, onChange }) {
  return (
    <div className="seg-control" role="tablist">
      {VIEWS.map((v) => (
        <button
          key={v.key}
          className={`seg-btn ${view === v.key ? 'active' : ''}`}
          onClick={() => onChange(v.key)}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `CategoryLegend.jsx`**

```jsx
import { deriveColors } from './colors.js';

export default function CategoryLegend({ categories, onDelete }) {
  return (
    <div className="legend-row">
      {categories.map((cat) => {
        const c = deriveColors(cat.accent);
        return (
          <span
            key={cat.key}
            className="legend-chip"
            style={{ background: c.bg, color: c.text, borderColor: c.border }}
          >
            <span className="dot" style={{ background: c.border }} />
            {cat.icon} {cat.label}
            {!cat.fixed && (
              <button
                type="button"
                className="chip-remove"
                title="Smazat kategorii"
                onClick={() => onDelete(cat.key)}
              >
                ✕
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run build -w client`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/agenda/ProgramToggle.jsx client/src/components/agenda/CategoryLegend.jsx
git commit -m "feat: add ProgramToggle and CategoryLegend components"
```

---

## Task 7: Frontend — CategoryForm (modal to create a custom category)

**Files:**
- Create: `client/src/components/agenda/CategoryForm.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useState } from 'react';
import { deriveColors } from './colors.js';

const ICON_CHOICES = ['🎊', '🥂', '💃', '📸', '🎵', '🚗', '⛪', '🌸', '🎂', '⚽', '🏐', '🎯', '🔥', '🌅', '🎆', '🧁', '🍹', '🎮'];
const COLOR_CHOICES = ['#D4AF37', '#5a9a5a', '#9b7de0', '#e09040', '#D8A7B1', '#6fa8c9', '#c97064', '#7a6a5e'];

export default function CategoryForm({ onSave, onClose }) {
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState(ICON_CHOICES[0]);
  const [accent, setAccent] = useState(COLOR_CHOICES[0]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!label.trim()) return;
    onSave({ label: label.trim(), icon, accent });
  }

  const preview = deriveColors(accent);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Nová kategorie</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="catNazev">Název kategorie</label>
            <input
              id="catNazev"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              placeholder="např. After párty"
            />
          </div>
          <div className="form-row">
            <label>Ikona</label>
            <div className="icon-grid">
              {ICON_CHOICES.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={opt === icon ? 'selected' : ''}
                  onClick={() => setIcon(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <label>Barva</label>
            <div className="swatch-row">
              {COLOR_CHOICES.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`swatch ${opt === accent ? 'selected' : ''}`}
                  style={{ background: opt }}
                  onClick={() => setAccent(opt)}
                />
              ))}
            </div>
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              style={{ marginTop: 8, width: 60, height: 30, padding: 2 }}
            />
          </div>
          <div
            className="cat-preview-chip"
            style={{ background: preview.bg, color: preview.text, borderColor: preview.border }}
          >
            {icon} {label.trim() || 'Náhled'}
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Zrušit</button>
            <button type="submit" className="btn">Přidat kategorii</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build -w client`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/agenda/CategoryForm.jsx
git commit -m "feat: add CategoryForm component"
```

---

## Task 8: Frontend — OverallTimeline (desktop parallel columns + mobile clusters)

**Files:**
- Create: `client/src/components/agenda/OverallTimeline.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useEffect, useState } from 'react';
import { layoutOverall, clusterOverall } from './layout.js';
import { minutesToLabel } from './timeUtils.js';
import { deriveColors } from './colors.js';

const PX_PER_MIN = 1.7;
const MIN_BLOCK_PX = 46;

function getCategory(categories, key) {
  return categories.find((c) => c.key === key) || categories[0] || { icon: '', label: key, accent: '#999' };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 680px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 680px)');
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function OverallTimeline({ items, categories, onDelete, onEdit }) {
  const isMobile = useIsMobile();

  if (items.length === 0) {
    return <p className="empty-state">Zatím žádné naplánované aktivity.</p>;
  }

  const laid = layoutOverall(items);

  if (isMobile) {
    return <MobileClusters laid={laid} categories={categories} onDelete={onDelete} onEdit={onEdit} />;
  }
  return <DesktopTimeline laid={laid} categories={categories} onDelete={onDelete} onEdit={onEdit} />;
}

function DesktopTimeline({ laid, categories, onDelete, onEdit }) {
  const axisStart = Math.floor(Math.min(...laid.map((i) => i.startMin)) / 60) * 60;
  const axisEnd = Math.ceil(Math.max(...laid.map((i) => i.endMin)) / 60) * 60;
  const totalHeight = (axisEnd - axisStart) * PX_PER_MIN;
  const hourLabels = [];
  for (let m = axisStart; m <= axisEnd; m += 60) hourLabels.push(m);

  return (
    <div className="timeline-card">
      <div className="timeline" style={{ height: totalHeight + 24 }}>
        {hourLabels.map((m) => (
          <div key={m} className="hour-line" style={{ top: (m - axisStart) * PX_PER_MIN }}>
            <span className="hour-label">{minutesToLabel(m)}</span>
          </div>
        ))}
        <div className="blocks-layer">
          {laid.map((item) => {
            const cat = getCategory(categories, item.kategorie);
            const c = deriveColors(cat.accent);
            const top = (item.startMin - axisStart) * PX_PER_MIN;
            const height = Math.max(MIN_BLOCK_PX, (item.endMin - item.startMin) * PX_PER_MIN);
            const leftPct = (item.col / item.maxCols) * 100;
            const widthPct = (1 / item.maxCols) * 100;
            return (
              <div
                key={item.id}
                className="block"
                style={{
                  top,
                  height,
                  left: `calc(${leftPct}% + 2px)`,
                  width: `calc(${widthPct}% - 4px)`,
                  background: c.bg,
                  borderLeftColor: c.border,
                  color: c.text
                }}
                title={`${item.nazev} (${item.casZacatku}–${item.casKonce})${item.misto ? ' · ' + item.misto : ''}`}
                onClick={() => onEdit(item)}
              >
                <button
                  type="button"
                  className="block-delete"
                  title="Smazat aktivitu"
                  onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                >
                  🗑
                </button>
                <span className="b-cat">{cat.icon} {cat.label}</span>
                <span className="b-name">{item.nazev}</span>
                <span className="b-time">{item.casZacatku}–{item.casKonce}</span>
                {item.misto && height > 70 && <span className="b-loc">📍 {item.misto}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniRow({ item, categories, showTime, onDelete, onEdit }) {
  const cat = getCategory(categories, item.kategorie);
  const c = deriveColors(cat.accent);
  return (
    <div
      className="cluster-mini"
      style={{ background: c.bg, borderLeftColor: c.border, color: c.text }}
      onClick={() => onEdit(item)}
    >
      <div className="cm-body">
        <span className="cm-cat">{cat.icon} {cat.label}</span>
        <span className="cm-name">{item.nazev}{item.misto ? ` · 📍 ${item.misto}` : ''}</span>
      </div>
      {showTime && <span className="cm-time">{item.casZacatku}–{item.casKonce}</span>}
      <button
        type="button"
        className="cm-delete"
        title="Smazat aktivitu"
        onClick={(e) => { e.stopPropagation(); onDelete(item); }}
      >
        🗑
      </button>
    </div>
  );
}

function MobileClusters({ laid, categories, onDelete, onEdit }) {
  const clusters = clusterOverall(laid);
  return (
    <div className="mobile-clusters">
      {clusters.map((cluster, idx) => (
        <ClusterCard
          key={idx}
          cluster={cluster}
          isSingle={cluster.items.length === 1}
          categories={categories}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

function ClusterCard({ cluster, isSingle, categories, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const involvedIcons = [...new Set(cluster.items.map((i) => getCategory(categories, i.kategorie).icon))].join(' ');

  return (
    <div className={`cluster-card ${isSingle ? 'single' : ''} ${expanded ? 'expanded' : ''}`}>
      <div className="cluster-summary" onClick={() => !isSingle && setExpanded((e) => !e)}>
        <span className="cs-time">{minutesToLabel(cluster.minStart)}–{minutesToLabel(cluster.maxEnd)}</span>
        <span className="cs-icons">{involvedIcons}</span>
        {!isSingle && (
          <>
            <span className="cs-count">{cluster.items.length} aktivity souběžně</span>
            <span className="cs-caret">▾</span>
          </>
        )}
      </div>
      {isSingle ? (
        <MiniRow item={cluster.items[0]} categories={categories} showTime={false} onDelete={onDelete} onEdit={onEdit} />
      ) : (
        <div className="cluster-items">
          {[...cluster.items].sort((a, b) => a.startMin - b.startMin).map((item) => (
            <MiniRow key={item.id} item={item} categories={categories} showTime onDelete={onDelete} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build -w client`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/agenda/OverallTimeline.jsx
git commit -m "feat: add OverallTimeline component (desktop columns + mobile clusters)"
```

---

## Task 9: Frontend — CategoryLinearView

**Files:**
- Create: `client/src/components/agenda/CategoryLinearView.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useState } from 'react';
import { deriveColors } from './colors.js';
import { fmtDuration } from './timeUtils.js';

function getCategory(categories, key) {
  return categories.find((c) => c.key === key) || categories[0] || { icon: '', label: key, accent: '#999' };
}

export default function CategoryLinearView({ items, categories, onDelete, onEdit }) {
  const [filter, setFilter] = useState('vse');

  const list = items
    .filter((i) => filter === 'vse' || i.kategorie === filter)
    .slice()
    .sort((a, b) => a.casZacatku.localeCompare(b.casZacatku));

  return (
    <div>
      <div className="pill-row">
        <button
          className={`pill ${filter === 'vse' ? 'active' : ''}`}
          style={filter === 'vse' ? { background: '#4a3f3a' } : undefined}
          onClick={() => setFilter('vse')}
        >
          Vše
        </button>
        {categories.map((cat) => (
          <button
            key={cat.key}
            className={`pill ${filter === cat.key ? 'active' : ''}`}
            style={filter === cat.key ? { background: cat.accent } : undefined}
            onClick={() => setFilter(cat.key)}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="empty-state">Žádné aktivity v této kategorii.</p>
      ) : (
        <div className="linear-list">
          {list.map((item) => {
            const cat = getCategory(categories, item.kategorie);
            const c = deriveColors(cat.accent);
            return (
              <div key={item.id} className="linear-item">
                <div className="linear-time">
                  <div className="linear-time-start">{item.casZacatku}</div>
                  <div className="linear-time-end">{item.casKonce}</div>
                </div>
                <div className="linear-card" style={{ borderLeftColor: c.border }} onClick={() => onEdit(item)}>
                  <div className="linear-card-header">
                    <span className="lc-icon">{cat.icon}</span>
                    <span className="lc-name">{item.nazev}</span>
                    <span className="cat-badge" style={{ background: c.bg, color: c.text, borderColor: c.border }}>
                      {cat.icon} {cat.label}
                    </span>
                    <button
                      type="button"
                      className="lc-delete"
                      title="Smazat aktivitu"
                      onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                    >
                      🗑
                    </button>
                  </div>
                  <p className="lc-meta">
                    {fmtDuration(item.casZacatku, item.casKonce)}
                    {item.misto ? <> · <span className="lc-loc">{item.misto}</span></> : null}
                  </p>
                  {item.poznamka && <p className="lc-desc">{item.poznamka}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build -w client`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/agenda/CategoryLinearView.jsx
git commit -m "feat: add CategoryLinearView component"
```

---

## Task 10: Frontend — IdeaBench (lavička, grouped by category, drag-and-drop)

**Files:**
- Create: `client/src/components/agenda/IdeaBench.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useState } from 'react';
import { deriveColors } from './colors.js';

function groupByCategory(ideas) {
  const groups = {};
  ideas.forEach((item) => {
    (groups[item.kategorie] = groups[item.kategorie] || []).push(item);
  });
  return groups;
}

export default function IdeaBench({ ideas, categories, onAssign, onDelete, onEdit, onReorderPreview, onReorderCommit }) {
  if (ideas.length === 0) {
    return (
      <aside className="bench-section">
        <div className="bench-header"><h3>🗂️ Lavička nápadů</h3></div>
        <p className="bench-empty">Lavička je prázdná — nápady bez termínu se objeví zde.</p>
      </aside>
    );
  }

  const groups = groupByCategory(ideas);

  return (
    <aside className="bench-section">
      <div className="bench-header"><h3>🗂️ Lavička nápadů</h3></div>
      <p className="bench-hint">
        Nápady bez termínu, roztříděné podle kategorie a seřazené podle priority.
        Přetáhni nahoru do programu, nebo klikni na „Zařadit". Pořadí uvnitř kategorie změníš přetažením.
      </p>
      <div className="bench-groups">
        {categories
          .filter((cat) => groups[cat.key]?.length)
          .map((cat) => (
            <BenchGroup
              key={cat.key}
              category={cat}
              items={groups[cat.key].slice().sort((a, b) => a.priorita - b.priorita)}
              onAssign={onAssign}
              onDelete={onDelete}
              onEdit={onEdit}
              onReorderPreview={onReorderPreview}
              onReorderCommit={onReorderCommit}
            />
          ))}
      </div>
    </aside>
  );
}

function BenchGroup({ category, items, onAssign, onDelete, onEdit, onReorderPreview, onReorderCommit }) {
  const [draggingId, setDraggingId] = useState(null);
  const c = deriveColors(category.accent);

  function handleDragOver(e, overId) {
    e.preventDefault();
    if (!draggingId || draggingId === overId) return;
    const fromIndex = items.findIndex((i) => i.id === draggingId);
    const toIndex = items.findIndex((i) => i.id === overId);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onReorderPreview(reordered.map((item, idx) => ({ ...item, priorita: idx })));
  }

  return (
    <div className="bench-group">
      <div className="bench-group-title" style={{ color: c.border }}>
        <span className="dot" style={{ background: c.border }} />
        {category.icon} {category.label}
      </div>
      <div className="bench-list">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={`bench-card ${draggingId === item.id ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => { setDraggingId(item.id); e.dataTransfer.setData('text/plain', item.id); }}
            onDragOver={(e) => handleDragOver(e, item.id)}
            onDragEnd={() => { setDraggingId(null); onReorderCommit(items); }}
          >
            <div className="bench-card-top" onClick={() => onEdit(item)}>
              <span className="bc-handle">⠿</span>
              <span className="bc-priority">{idx + 1}.</span>
              <span className="bc-name">
                {item.nazev}
                {item.misto && <span className="bc-loc"> · 📍 {item.misto}</span>}
              </span>
            </div>
            <div className="bench-card-actions">
              <button type="button" className="bc-assign" onClick={() => onAssign(item)}>Zařadit →</button>
              <button type="button" className="bc-remove" title="Smazat nápad" onClick={() => onDelete(item)}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build -w client`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/agenda/IdeaBench.jsx
git commit -m "feat: add IdeaBench component with per-category drag-to-reorder"
```

---

## Task 11: Frontend — AgendaForm rewrite

**Files:**
- Modify: `client/src/components/agenda/AgendaForm.jsx` (full rewrite)

- [ ] **Step 1: Replace the file contents**

```jsx
import { useEffect, useState } from 'react';
import { TIME_OPTIONS, toMinutes, minutesToLabel, fmtDuration } from './timeUtils.js';
import { deriveColors } from './colors.js';

function buildEmptyForm(categories, presetIdea) {
  return {
    nazev: presetIdea?.nazev || '',
    kategorie: presetIdea?.kategorie || categories[0]?.key || '',
    misto: presetIdea?.misto || '',
    popis: presetIdea?.poznamka || '',
    casZacatku: '10:00',
    casKonce: '11:00'
  };
}

export default function AgendaForm({ item, presetIdea, categories, onSave, onClose }) {
  const isEdit = Boolean(item);
  const hasTimeAlready = Boolean(item?.casZacatku && item?.casKonce);

  const [mode, setMode] = useState(presetIdea || hasTimeAlready || !isEdit ? 'schedule' : 'idea');
  const [form, setForm] = useState(() =>
    item
      ? {
          nazev: item.nazev,
          kategorie: item.kategorie,
          misto: item.misto || '',
          popis: item.poznamka || '',
          casZacatku: item.casZacatku || '10:00',
          casKonce: item.casKonce || '11:00'
        }
      : buildEmptyForm(categories, presetIdea)
  );
  const [durationMin, setDurationMin] = useState(60);

  useEffect(() => {
    if (form.casZacatku && form.casKonce) {
      let diff = toMinutes(form.casKonce) - toMinutes(form.casZacatku);
      if (diff < 0) diff += 1440;
      if (diff > 0) setDurationMin(diff);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleStartChange(value) {
    const newEnd = minutesToLabel(toMinutes(value) + durationMin);
    setForm((prev) => ({ ...prev, casZacatku: value, casKonce: newEnd }));
  }

  function handleEndChange(value) {
    let diff = toMinutes(value) - toMinutes(form.casZacatku);
    if (diff < 0) diff += 1440;
    if (diff > 0) setDurationMin(diff);
    update('casKonce', value);
  }

  function step(field, dir) {
    const current = form[field];
    const idx = TIME_OPTIONS.indexOf(current);
    const nextIdx = (idx + dir + TIME_OPTIONS.length) % TIME_OPTIONS.length;
    const next = TIME_OPTIONS[nextIdx];
    if (field === 'casZacatku') handleStartChange(next); else handleEndChange(next);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      nazev: form.nazev,
      kategorie: form.kategorie,
      misto: form.misto,
      poznamka: form.popis,
      casZacatku: mode === 'schedule' ? form.casZacatku : null,
      casKonce: mode === 'schedule' ? form.casKonce : null
    });
  }

  const selectedCat = categories.find((c) => c.key === form.kategorie) || categories[0];
  const catColors = selectedCat ? deriveColors(selectedCat.accent) : null;
  const duration = mode === 'schedule' ? fmtDuration(form.casZacatku, form.casKonce) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? 'Upravit aktivitu' : 'Přidat aktivitu'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="nazev">Název</label>
            <input id="nazev" type="text" value={form.nazev} onChange={(e) => update('nazev', e.target.value)} required />
          </div>

          <div className="form-row">
            <label htmlFor="kategorie">Kategorie</label>
            <select id="kategorie" value={form.kategorie} onChange={(e) => update('kategorie', e.target.value)}>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
              ))}
            </select>
            {selectedCat && catColors && (
              <div
                className="cat-preview-chip"
                style={{ background: catColors.bg, color: catColors.text, borderColor: catColors.border }}
              >
                {selectedCat.icon} {selectedCat.label}
              </div>
            )}
          </div>

          <div className="form-row">
            <label>Termín</label>
            <div className="seg-control" style={{ margin: 0 }}>
              <button type="button" className={`seg-btn ${mode === 'schedule' ? 'active' : ''}`} onClick={() => setMode('schedule')}>
                Naplánovat s časem
              </button>
              <button type="button" className={`seg-btn ${mode === 'idea' ? 'active' : ''}`} onClick={() => setMode('idea')}>
                Nápad bez termínu
              </button>
            </div>
          </div>

          {mode === 'schedule' && (
            <>
              <div className="form-row">
                <label>Čas (24h formát)</label>
                <div className="time-field-pair">
                  <div className="time-field">
                    <span className="time-field-label">Začátek</span>
                    <div className="time-stepper">
                      <button type="button" className="stepper-btn" onClick={() => step('casZacatku', -1)}>−</button>
                      <select value={form.casZacatku} onChange={(e) => handleStartChange(e.target.value)}>
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button type="button" className="stepper-btn" onClick={() => step('casZacatku', 1)}>+</button>
                    </div>
                  </div>
                  <div className="time-field">
                    <span className="time-field-label">Konec</span>
                    <div className="time-stepper">
                      <button type="button" className="stepper-btn" onClick={() => step('casKonce', -1)}>−</button>
                      <select value={form.casKonce} onChange={(e) => handleEndChange(e.target.value)}>
                        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button type="button" className="stepper-btn" onClick={() => step('casKonce', 1)}>+</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="form-row">
                <label>Délka trvání</label>
                <div className="form-computed-value">{duration || 'Konec musí být po začátku'}</div>
              </div>
            </>
          )}

          <div className="form-row">
            <label htmlFor="misto">Místo konání (volitelné)</label>
            <input id="misto" type="text" value={form.misto} onChange={(e) => update('misto', e.target.value)} />
          </div>

          <div className="form-row">
            <label htmlFor="popis">Popis (volitelné)</label>
            <textarea id="popis" rows={2} value={form.popis} onChange={(e) => update('popis', e.target.value)} />
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

- [ ] **Step 2: Verify**

Run: `npm run build -w client`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/agenda/AgendaForm.jsx
git commit -m "feat: rewrite AgendaForm with category select, 24h dropdowns, idea mode"
```

---

## Task 12: Frontend — AgendaPage rewrite + remove old components + new CSS

This is the integration task: it deletes the now-unused old components,
rewrites `AgendaPage.jsx` to wire everything from Tasks 6–11 together,
and replaces `AgendaTimeline.css` with the mockup-derived styles. Done
as one task because the intermediate state (old files deleted but
`AgendaPage` not yet updated) would not build.

**Files:**
- Delete: `client/src/components/agenda/AgendaTimeline.jsx`
- Delete: `client/src/components/agenda/AgendaVisualTimeline.jsx`
- Delete: `client/src/components/agenda/AgendaItem.jsx`
- Delete: `client/src/components/agenda/categories.js`
- Modify: `client/src/components/agenda/AgendaPage.jsx` (full rewrite)
- Modify: `client/src/components/agenda/AgendaTimeline.css` (full rewrite)

- [ ] **Step 1: Delete the old files**

```bash
git rm client/src/components/agenda/AgendaTimeline.jsx client/src/components/agenda/AgendaVisualTimeline.jsx client/src/components/agenda/AgendaItem.jsx client/src/components/agenda/categories.js
```

- [ ] **Step 2: Replace `AgendaPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { agendaApi, categoriesApi } from '../../api.js';
import ProgramToggle from './ProgramToggle.jsx';
import CategoryLegend from './CategoryLegend.jsx';
import OverallTimeline from './OverallTimeline.jsx';
import CategoryLinearView from './CategoryLinearView.jsx';
import IdeaBench from './IdeaBench.jsx';
import AgendaForm from './AgendaForm.jsx';
import CategoryForm from './CategoryForm.jsx';
import './AgendaTimeline.css';

export default function AgendaPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [view, setView] = useState('overall');
  const [editingItem, setEditingItem] = useState(null);
  const [presetIdea, setPresetIdea] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);

  useEffect(() => {
    agendaApi.list().then(setItems);
    categoriesApi.list().then(setCategories);
  }, []);

  const scheduled = items.filter((i) => i.casZacatku && i.casKonce);
  const ideas = items.filter((i) => !i.casZacatku || !i.casKonce);

  async function handleSave(data) {
    if (editingItem) {
      const updated = await agendaApi.update(editingItem.id, data);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } else {
      const created = await agendaApi.create(data);
      setItems((prev) => [...prev, created]);
    }
    closeForm();
  }

  async function handleDelete(item) {
    if (!window.confirm(`Opravdu chcete smazat aktivitu „${item.nazev}“?`)) return;
    await agendaApi.remove(item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  function handleReorderPreview(reorderedGroup) {
    setItems((prev) => {
      const ids = new Set(reorderedGroup.map((i) => i.id));
      const others = prev.filter((i) => !ids.has(i.id));
      return [...others, ...reorderedGroup];
    });
  }

  async function handleReorderCommit(groupItems) {
    await Promise.all(groupItems.map((item) => agendaApi.update(item.id, item)));
  }

  async function handleCreateCategory(data) {
    const created = await categoriesApi.create(data);
    setCategories((prev) => [...prev, created]);
    setShowCategoryForm(false);
  }

  async function handleDeleteCategory(key) {
    try {
      await categoriesApi.remove(key);
      setCategories((prev) => prev.filter((c) => c.key !== key));
    } catch {
      alert('Nejprve přesuňte nebo smažte aktivity v této kategorii.');
    }
  }

  function openEdit(item) {
    setEditingItem(item);
    setPresetIdea(null);
    setShowForm(true);
  }

  function openAddSchedule() {
    setEditingItem(null);
    setPresetIdea(null);
    setShowForm(true);
  }

  function openAssignIdea(idea) {
    setEditingItem(idea);
    setPresetIdea(idea);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingItem(null);
    setPresetIdea(null);
  }

  function handleDropOnProgram(e) {
    e.preventDefault();
    setIsDropActive(false);
    const id = e.dataTransfer.getData('text/plain');
    const idea = ideas.find((i) => i.id === id);
    if (idea) openAssignIdea(idea);
  }

  return (
    <div>
      <div className="page-header">
        <h2>Program svatebního dne</h2>
        <div className="page-actions">
          <button className="btn" onClick={openAddSchedule}>+ Přidat aktivitu</button>
          <button className="btn btn-outline" onClick={() => setShowCategoryForm(true)}>+ Nová kategorie</button>
        </div>
      </div>

      <ProgramToggle view={view} onChange={setView} />
      <CategoryLegend categories={categories} onDelete={handleDeleteCategory} />

      <div className="page-layout">
        <div
          className={`page-main ${isDropActive ? 'drop-target-active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDropActive(true); }}
          onDragLeave={() => setIsDropActive(false)}
          onDrop={handleDropOnProgram}
        >
          {view === 'overall' ? (
            <OverallTimeline items={scheduled} categories={categories} onDelete={handleDelete} onEdit={openEdit} />
          ) : (
            <CategoryLinearView items={scheduled} categories={categories} onDelete={handleDelete} onEdit={openEdit} />
          )}
        </div>
        <IdeaBench
          ideas={ideas}
          categories={categories}
          onAssign={openAssignIdea}
          onDelete={handleDelete}
          onEdit={openEdit}
          onReorderPreview={handleReorderPreview}
          onReorderCommit={handleReorderCommit}
        />
      </div>

      {showForm && (
        <AgendaForm
          item={editingItem}
          presetIdea={presetIdea}
          categories={categories}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
      {showCategoryForm && (
        <CategoryForm onSave={handleCreateCategory} onClose={() => setShowCategoryForm(false)} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Replace `AgendaTimeline.css`**

```css
/* ─── Page actions ─── */
.page-actions { display: flex; flex-wrap: wrap; gap: 10px; }

/* ─── Segmented control ─── */
.seg-control {
  display: inline-flex; background: #fff; border: 1px solid var(--color-border);
  border-radius: 999px; padding: 4px; margin: 18px 0 16px; box-shadow: var(--shadow);
}
.seg-btn {
  border: none; background: transparent; font-family: var(--font-body); font-weight: 700;
  font-size: 14px; color: var(--color-text-light); padding: 9px 20px; border-radius: 999px;
  cursor: pointer; transition: background 0.15s ease, color 0.15s ease;
}
.seg-btn.active { background: var(--color-rose); color: #fff; }

/* ─── Legend ─── */
.legend-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 14px; }
.legend-chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px 5px 8px;
  border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid; position: relative;
}
.legend-chip .dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.legend-chip .chip-remove {
  border: none; background: rgba(0,0,0,0.08); color: inherit; width: 16px; height: 16px;
  border-radius: 50%; font-size: 10px; line-height: 1; cursor: pointer; margin-left: 2px;
}

/* ─── Two-column page layout ─── */
.page-layout { display: grid; grid-template-columns: 1fr 300px; gap: 24px; align-items: start; }
.page-main { min-width: 0; border-radius: var(--radius); transition: background 0.15s ease, outline 0.15s ease; }
.page-main.drop-target-active { background: #fdf3ee; outline: 2px dashed var(--color-rose); outline-offset: -2px; }

/* ─── Overall timeline (desktop, parallel columns) ─── */
.timeline-card { background: #fff; border-radius: var(--radius); box-shadow: var(--shadow); padding: 20px 20px 28px; }
.timeline { position: relative; padding-left: 56px; }
.hour-line { position: absolute; left: 0; right: 0; border-top: 1px dashed #ece4d8; }
.hour-line .hour-label {
  position: absolute; left: 0; top: -8px; width: 48px; text-align: right; padding-right: 8px;
  font-size: 12px; font-weight: 700; color: var(--color-text-light); background: #fff;
}
.blocks-layer { position: absolute; top: 0; left: 56px; right: 0; bottom: 0; }
.block {
  position: absolute; border-radius: 8px; border-left: 4px solid; padding: 6px 10px; overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08); cursor: pointer; transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.block:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.16); transform: translateY(-1px); z-index: 5; }
.block .b-cat { font-size: 9.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3px; opacity: 0.85; line-height: 1.2; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.block .b-name { font-weight: 900; font-size: 12.5px; line-height: 1.25; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.block .b-time { font-size: 11px; opacity: 0.8; font-weight: 700; display: block; }
.block .b-loc { font-size: 10.5px; opacity: 0.75; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.block-delete {
  position: absolute; top: 3px; right: 3px; width: 18px; height: 18px; border-radius: 50%;
  border: none; background: rgba(255,255,255,0.92); color: var(--color-danger, #b3493f); font-size: 10px;
  line-height: 1; cursor: pointer; opacity: 0; transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
  display: flex; align-items: center; justify-content: center;
}
.block:hover .block-delete { opacity: 1; }
.block-delete:hover { background: var(--color-danger, #b3493f); color: #fff; }

/* ─── Mobile clustered view ─── */
.mobile-clusters { display: flex; flex-direction: column; gap: 10px; }
.cluster-card { background: #fff; border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
.cluster-summary { display: flex; align-items: center; gap: 10px; padding: 12px 14px; cursor: pointer; background: #fff; }
.cluster-summary .cs-time { font-family: var(--font-heading); font-weight: 700; font-size: 14px; flex-shrink: 0; min-width: 92px; }
.cluster-summary .cs-icons { display: flex; gap: 3px; font-size: 14px; }
.cluster-summary .cs-count { margin-left: auto; font-size: 12px; font-weight: 700; color: var(--color-text-light); background: #f5f0ea; padding: 3px 10px; border-radius: 999px; }
.cluster-summary .cs-caret { font-size: 11px; color: var(--color-text-light); transition: transform 0.15s ease; }
.cluster-card.expanded .cs-caret { transform: rotate(180deg); }
.cluster-items { display: none; padding: 0 14px 12px; }
.cluster-card.expanded .cluster-items { display: flex; flex-direction: column; gap: 8px; }
.cluster-card.single .cluster-summary { cursor: default; }
.cluster-card.single .cs-caret { display: none; }
.cluster-mini { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; border-left: 4px solid; font-size: 12.5px; cursor: pointer; }
.cluster-mini .cm-body { flex: 1; min-width: 0; }
.cluster-mini .cm-cat { font-size: 9.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3px; opacity: 0.8; display: block; }
.cluster-mini .cm-name { font-weight: 900; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cluster-mini .cm-time { font-size: 11px; opacity: 0.8; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
.cluster-mini .cm-delete { border: none; background: rgba(255,255,255,0.6); color: var(--color-danger, #b3493f); opacity: 0.85; font-size: 12px; cursor: pointer; padding: 4px 6px; border-radius: 6px; flex-shrink: 0; }
.cluster-mini .cm-delete:hover { opacity: 1; background: var(--color-danger, #b3493f); color: #fff; }
.cluster-card.single .cluster-mini { margin: 0 14px 12px; }
.cluster-card.single .cluster-summary + .cluster-mini { margin-top: -2px; }

/* ─── Category filter pills ─── */
.pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.pill {
  border: 1px solid var(--color-border); background: #fff; border-radius: 999px; padding: 7px 16px;
  font-size: 13px; font-weight: 700; color: var(--color-text-light); cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
}
.pill.active { color: #fff; border-color: transparent; }

/* ─── Linear list ─── */
.linear-list { display: flex; flex-direction: column; gap: 0; }
.linear-item { display: flex; gap: 16px; }
.linear-time { flex: 0 0 64px; text-align: right; padding-top: 16px; font-family: var(--font-heading); }
.linear-time-start { font-weight: 900; font-size: 15px; }
.linear-time-end { font-size: 11px; color: var(--color-text-light); }
.linear-card { flex: 1; background: #fff; border-radius: var(--radius); box-shadow: var(--shadow); border-left: 4px solid; padding: 14px 16px; margin: 8px 0 8px 8px; cursor: pointer; }
.linear-card-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.linear-card .lc-icon { font-size: 20px; }
.linear-card .lc-name { font-weight: 900; flex: 1; min-width: 100px; }
.cat-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px solid; white-space: nowrap; }
.lc-delete { border: none; background: transparent; color: var(--color-danger, #b3493f); font-size: 16px; cursor: pointer; padding: 2px 6px; border-radius: 6px; flex-shrink: 0; }
.lc-delete:hover { background: var(--color-danger, #b3493f); color: #fff; }
.linear-card .lc-meta { margin: 8px 0 0; font-size: 12.5px; color: var(--color-text-light); }
.linear-card .lc-loc::before { content: '📍 '; }
.linear-card .lc-desc { margin: 6px 0 0; font-size: 13px; font-style: italic; color: var(--color-text-light); }

/* ─── Lavička (bench) ─── */
.bench-section { background: #fff; border-radius: var(--radius); box-shadow: var(--shadow); padding: 18px; position: sticky; top: 20px; }
.bench-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
.bench-header h3 { font-size: 17px; }
.bench-hint { font-size: 12px; color: var(--color-text-light); font-style: italic; margin: 0 0 14px; }
.bench-groups { display: flex; flex-direction: column; gap: 16px; }
.bench-group-title { display: flex; align-items: center; gap: 6px; font-weight: 900; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 6px; }
.bench-group-title .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.bench-list { display: flex; flex-direction: column; gap: 8px; }
.bench-card { display: flex; flex-direction: column; gap: 8px; background: var(--color-ivory); border-radius: 10px; border: 1px solid var(--color-border); padding: 10px 12px; cursor: grab; }
.bench-card.dragging { opacity: 0.4; }
.bench-card-top { display: flex; align-items: flex-start; gap: 8px; cursor: pointer; }
.bench-card .bc-handle { color: var(--color-text-light); font-size: 13px; flex-shrink: 0; }
.bench-card .bc-priority { font-family: var(--font-heading); font-weight: 700; color: var(--color-text-light); font-size: 12.5px; flex-shrink: 0; }
.bench-card .bc-name { font-weight: 700; flex: 1; min-width: 0; font-size: 13px; line-height: 1.3; }
.bench-card .bc-loc { font-size: 11px; color: var(--color-text-light); }
.bench-card-actions { display: flex; gap: 6px; }
.bench-card .bc-assign { flex: 1; border: 1px solid var(--color-border); background: #fff; border-radius: 999px; padding: 6px 10px; font-size: 11.5px; font-weight: 700; color: var(--color-text); cursor: pointer; white-space: nowrap; }
.bench-card .bc-assign:hover { background: var(--color-rose); color: #fff; border-color: var(--color-rose); }
.bench-card .bc-remove { border: none; background: transparent; color: var(--color-danger, #b3493f); font-size: 14px; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.bench-card .bc-remove:hover { background: var(--color-danger, #b3493f); color: #fff; }
.bench-empty { color: var(--color-text-light); font-style: italic; font-size: 13px; text-align: center; padding: 8px 0; }

/* ─── Form additions (time picker, category preview) ─── */
.form-row-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.time-field-pair { display: flex; gap: 14px; }
.time-field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.time-field-label { font-size: 11.5px; font-weight: 700; color: var(--color-text-light); }
.time-stepper { display: flex; align-items: stretch; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; background: #fff; }
.time-stepper select { border: none; flex: 1; text-align: center; font-weight: 700; font-size: 15px; background: transparent; padding: 8px 2px; }
.stepper-btn { border: none; background: #f5f0ea; color: var(--color-text); width: 32px; flex-shrink: 0; font-size: 16px; font-weight: 700; cursor: pointer; }
.stepper-btn:hover { background: var(--color-rose); color: #fff; }
.form-computed-value { padding: 8px 10px; background: #f5f0ea; border: 1px solid var(--color-border); border-radius: 8px; font-size: 13.5px; color: var(--color-text-light); font-style: italic; }
.cat-preview-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; font-size: 12.5px; font-weight: 700; border: 1px solid; margin-top: 6px; }
.swatch-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.swatch { width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; flex-shrink: 0; }
.swatch.selected { border-color: var(--color-text); }
.icon-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.icon-grid button { border: 1px solid var(--color-border); background: #fff; border-radius: 8px; font-size: 16px; padding: 5px 8px; cursor: pointer; }
.icon-grid button.selected { border-color: var(--color-rose); background: #fdf3ee; }

/* ─── Responsive ─── */
@media (max-width: 960px) {
  .page-layout { grid-template-columns: 1fr; }
  .bench-section { position: static; margin-top: 24px; }
}
@media (max-width: 680px) {
  .form-row-pair { grid-template-columns: 1fr; }
  .time-field-pair { flex-direction: column; }
}
```

Also add the danger color variable to `client/src/styles/variables.css`
so the `var(--color-danger, #b3493f)` fallbacks above resolve to a
named token instead of relying on the inline fallback:

```css
:root {
  --color-ivory: #FAF6F0;
  --color-rose: #D8A7B1;
  --color-sage: #9CAF88;
  --color-gold: #D4AF37;
  --color-text: #4a3f3a;
  --color-text-light: #7a6a5e;
  --color-border: #eee2d8;
  --color-danger: #b3493f;

  --font-heading: 'Playfair Display', serif;
  --font-body: 'Lato', sans-serif;

  --radius: 12px;
  --shadow: 0 2px 12px rgba(74, 63, 58, 0.08);
}
```

(Only the `--color-danger: #b3493f;` line is new — add it alongside the existing variables.)

- [ ] **Step 4: Verify the build**

Run: `npm run build -w client`
Expected: build succeeds with no errors about missing imports
(confirms the deleted files aren't referenced anywhere else — if the
build fails on a missing import, search for remaining references with
`grep -rn "AgendaItem\|AgendaVisualTimeline\|AgendaTimeline.jsx\|from './categories.js'" client/src` and fix them before continuing).

- [ ] **Step 5: Commit**

```bash
git add -A client/src/components/agenda client/src/styles/variables.css
git commit -m "feat: rewrite AgendaPage with overall/category views and idea bench"
```

---

## Task 13: Remove Hosté and Ubytování from navigation

**Files:**
- Modify: `client/src/components/Nav.jsx`
- Modify: `client/src/App.jsx`

- [ ] **Step 1: Update `Nav.jsx`**

```jsx
import './Nav.css';

const TABS = [
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

- [ ] **Step 2: Update `App.jsx`**

```jsx
import { useState } from 'react';
import Hero from './components/Hero.jsx';
import Nav from './components/Nav.jsx';
import PhotoGallery from './components/PhotoGallery.jsx';
import AgendaPage from './components/agenda/AgendaPage.jsx';
import TasksPage from './components/tasks/TasksPage.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('program');

  return (
    <div className="app">
      <Hero />
      <Nav active={activeTab} onChange={setActiveTab} />
      <PhotoGallery />
      <main className="container section">
        {activeTab === 'program' && <AgendaPage />}
        {activeTab === 'ukoly' && <TasksPage />}
      </main>
    </div>
  );
}
```

`GuestsPage.jsx`, `AccommodationsPage.jsx` and their related components
are **not** deleted — just unmounted, per the earlier decision in this
project to keep the code/data in place without further development.

- [ ] **Step 3: Verify**

Run: `npm run build -w client`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/Nav.jsx client/src/App.jsx
git commit -m "feat: remove Hoste and Ubytovani tabs from navigation"
```

---

## Task 14: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the full dev stack**

Run: `npm run dev` (from the repo root — runs server + client concurrently)

- [ ] **Step 2: Smoke-test the API one more time end-to-end**

```bash
curl -s http://localhost:3001/api/categories | head -c 300
curl -s http://localhost:3001/api/agenda | head -c 300
```
Expected: both return JSON arrays without errors.

- [ ] **Step 3: Browser walkthrough**

Open the client dev URL (Vite will print it, typically
`http://localhost:5173`) and verify:
1. Nav shows only "Program" and "Úkoly" (no Hosté/Ubytování).
2. Program tab loads on "Celkový program" by default, showing the
   parallel-column timeline with the existing seeded agenda items.
3. "+ Nová kategorie" creates a category that immediately appears in
   the legend and the AgendaForm's category dropdown.
4. "+ Přidat aktivitu" → fill name/category/time → saves and the new
   block appears in the correct position on the timeline.
5. Toggle to "Podle kategorie" → pill filter narrows the list
   correctly; toggle back to "Celkový program" → still works.
6. Add an activity in "Nápad bez termínu" mode → it appears in the
   lavička sidebar, grouped under the right category, NOT in either
   timeline view.
7. Drag a lavička card to reorder within its category section.
8. Click "Zařadit →" on a lavička card → form opens pre-filled →
   set a time → save → item disappears from lavička and appears in
   the timeline.
9. Click 🗑 on a scheduled block/card/lavička card → confirm dialog
   appears with the activity's name → confirming removes it.
10. Resize the browser below 680px width → "Celkový program" switches
    to the mobile clustered/accordion view; overlapping activities
    collapse into one expandable card.
11. Resize below 960px width → the lavička sidebar drops below the
    program instead of sitting beside it.

If a project-specific way of driving the app in a browser is available
(check for a `run` skill or similar before this task), use it instead
of manual instructions to actually exercise steps 3–11 and report
results — don't just claim success without observing it.

- [ ] **Step 4: Report results to the user**

Summarize what was checked and the outcome of each numbered item in
Step 3 — call out explicitly anything that wasn't actually verified
in a running browser versus what was inferred from code review.
