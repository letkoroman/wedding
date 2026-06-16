# Wedding Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-repo wedding dashboard (React + Vite frontend, Express + JSON-file backend) for Míša & Roman with Guest, Agenda and Task management, in Czech, with the romantic ivory/dusty-rose/sage/gold design system.

**Architecture:** npm workspaces monorepo (`client/`, `server/`). Express serves a REST API over `server/data/db.json` (auto-created). Vite dev server proxies `/api/*` to the Express server on port 3001. `npm run dev` at the root runs both via `concurrently`.

**Tech Stack:** React 18, Vite, Express 4, plain CSS with custom properties, npm workspaces, concurrently. No automated test framework (per spec, manual verification via the `run` skill).

**Spec:** `docs/superpowers/specs/2026-06-11-wedding-dashboard-design.md`

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json` (root)
- Create: `server/package.json`
- Create: `server/.gitkeep` directories (`server/routes`, `server/utils`, `server/data`)
- Create: `client/` (via Vite scaffold)
- Modify: `client/index.html`, `client/vite.config.js`
- Create: `client/public/images/photo1.jpg`..`photo4.jpg`
- Delete: `client/src/App.css`, `client/src/index.css`, `client/src/assets/react.svg`, `client/public/vite.svg`

- [ ] **Step 1: Create root `package.json`**

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

- [ ] **Step 2: Create `server/package.json`**

```json
{
  "name": "server",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "dev": "node server.js"
  },
  "dependencies": {
    "express": "^4.21.2"
  }
}
```

- [ ] **Step 3: Create server folder structure**

Run (Bash):
```bash
mkdir -p server/routes server/utils server/data
```

- [ ] **Step 4: Scaffold the Vite React client**

Run (Bash):
```bash
npx --yes create-vite@latest client --template react
```

Expected: creates `client/` with `package.json`, `index.html`, `src/`, `public/vite.svg`, etc.

- [ ] **Step 5: Remove unused scaffold files**

Run (Bash):
```bash
rm client/src/App.css client/src/index.css client/public/vite.svg
rm -rf client/src/assets
```

- [ ] **Step 6: Update `client/index.html`**

Replace the full file with:

```html
<!doctype html>
<html lang="cs">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
    <title>Míša &amp; Roman – Svatba 22. 8. 2026</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Update `client/vite.config.js`**

Replace the full file with:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

- [ ] **Step 8: Copy and rename the wedding photos**

Run (Bash):
```bash
mkdir -p client/public/images
cp photos/photo1.jpeg client/public/images/photo1.jpg
cp photos/photo2.jpeg client/public/images/photo2.jpg
cp photos/photo3.jpeg client/public/images/photo3.jpg
cp photos/photo4.jpeg client/public/images/photo4.jpg
```

- [ ] **Step 9: Install all workspace dependencies**

Run (Bash):
```bash
npm install
```

Expected: installs root, `client` and `server` dependencies (npm workspaces hoist into the root `node_modules`). No errors.

- [ ] **Step 10: Commit**

```bash
git add package.json server/package.json client .gitignore
git commit -m "Scaffold wedding dashboard monorepo (client + server)"
```

---

### Task 2: Backend – JSON DB utility

**Files:**
- Create: `server/utils/db.js`

- [ ] **Step 1: Create `server/utils/db.js`**

```js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const EMPTY_DB = { guests: [], agenda: [], tasks: [] };

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(EMPTY_DB, null, 2));
  }
}

export function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

export function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function generateId() {
  return randomUUID();
}
```

- [ ] **Step 2: Verify it creates the DB file**

Run (Bash):
```bash
cd server && node -e "import('./utils/db.js').then(db => console.log(db.readDb()))"
```

Expected output: `{ guests: [], agenda: [], tasks: [] }` and a new file `server/data/db.json` containing `{"guests": [], "agenda": [], "tasks": []}`.

- [ ] **Step 3: Commit**

```bash
git add server/utils/db.js server/data/db.json
git commit -m "Add JSON file DB utility with auto-create"
```

---

### Task 3: Backend – Guests API routes

**Files:**
- Create: `server/routes/guests.js`

- [ ] **Step 1: Create `server/routes/guests.js`**

```js
import { Router } from 'express';
import { readDb, writeDb, generateId } from '../utils/db.js';

const router = Router();

router.get('/', (req, res) => {
  const db = readDb();
  res.json(db.guests);
});

router.post('/', (req, res) => {
  const db = readDb();
  const guest = {
    id: generateId(),
    jmeno: req.body.jmeno || '',
    typ: req.body.typ || 'jednotlivec',
    pocetDeti: req.body.typ === 'rodina' ? Number(req.body.pocetDeti) || 0 : 0,
    potvrzeni: req.body.potvrzeni || 'ceka',
    mustHave: Boolean(req.body.mustHave),
    poznamka: req.body.poznamka || ''
  };
  db.guests.push(guest);
  writeDb(db);
  res.status(201).json(guest);
});

router.put('/:id', (req, res) => {
  const db = readDb();
  const index = db.guests.findIndex((g) => g.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Host nenalezen' });
  }
  const existing = db.guests[index];
  const typ = req.body.typ ?? existing.typ;
  const updated = {
    ...existing,
    jmeno: req.body.jmeno ?? existing.jmeno,
    typ,
    pocetDeti: typ === 'rodina' ? Number(req.body.pocetDeti ?? existing.pocetDeti) || 0 : 0,
    potvrzeni: req.body.potvrzeni ?? existing.potvrzeni,
    mustHave: req.body.mustHave ?? existing.mustHave,
    poznamka: req.body.poznamka ?? existing.poznamka
  };
  db.guests[index] = updated;
  writeDb(db);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = readDb();
  const index = db.guests.findIndex((g) => g.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Host nenalezen' });
  }
  db.guests.splice(index, 1);
  writeDb(db);
  res.status(204).end();
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/guests.js
git commit -m "Add guests REST routes"
```

---

### Task 4: Backend – Agenda API routes

**Files:**
- Create: `server/routes/agenda.js`

- [ ] **Step 1: Create `server/routes/agenda.js`**

```js
import { Router } from 'express';
import { readDb, writeDb, generateId } from '../utils/db.js';

const router = Router();

router.get('/', (req, res) => {
  const db = readDb();
  res.json(db.agenda);
});

router.post('/', (req, res) => {
  const db = readDb();
  const item = {
    id: generateId(),
    nazev: req.body.nazev || '',
    casZacatku: req.body.casZacatku || '00:00',
    trvani: Number(req.body.trvani) || 0,
    ikona: req.body.ikona || '💍',
    poznamka: req.body.poznamka || ''
  };
  db.agenda.push(item);
  writeDb(db);
  res.status(201).json(item);
});

router.put('/:id', (req, res) => {
  const db = readDb();
  const index = db.agenda.findIndex((a) => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Položka programu nenalezena' });
  }
  const existing = db.agenda[index];
  const updated = {
    ...existing,
    nazev: req.body.nazev ?? existing.nazev,
    casZacatku: req.body.casZacatku ?? existing.casZacatku,
    trvani: req.body.trvani !== undefined ? Number(req.body.trvani) || 0 : existing.trvani,
    ikona: req.body.ikona ?? existing.ikona,
    poznamka: req.body.poznamka ?? existing.poznamka
  };
  db.agenda[index] = updated;
  writeDb(db);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = readDb();
  const index = db.agenda.findIndex((a) => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Položka programu nenalezena' });
  }
  db.agenda.splice(index, 1);
  writeDb(db);
  res.status(204).end();
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/agenda.js
git commit -m "Add agenda REST routes"
```

---

### Task 5: Backend – Tasks API routes

**Files:**
- Create: `server/routes/tasks.js`

- [ ] **Step 1: Create `server/routes/tasks.js`**

```js
import { Router } from 'express';
import { readDb, writeDb, generateId } from '../utils/db.js';

const router = Router();

router.get('/', (req, res) => {
  const db = readDb();
  res.json(db.tasks);
});

router.post('/', (req, res) => {
  const db = readDb();
  const task = {
    id: generateId(),
    nazev: req.body.nazev || '',
    prirazeno: req.body.prirazeno || '',
    termin: req.body.termin || null,
    stav: req.body.stav || 'nesplneno',
    priorita: req.body.priorita || 'stredni',
    poznamka: req.body.poznamka || ''
  };
  db.tasks.push(task);
  writeDb(db);
  res.status(201).json(task);
});

router.put('/:id', (req, res) => {
  const db = readDb();
  const index = db.tasks.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Úkol nenalezen' });
  }
  const existing = db.tasks[index];
  const updated = {
    ...existing,
    nazev: req.body.nazev ?? existing.nazev,
    prirazeno: req.body.prirazeno ?? existing.prirazeno,
    termin: req.body.termin !== undefined ? req.body.termin : existing.termin,
    stav: req.body.stav ?? existing.stav,
    priorita: req.body.priorita ?? existing.priorita,
    poznamka: req.body.poznamka ?? existing.poznamka
  };
  db.tasks[index] = updated;
  writeDb(db);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = readDb();
  const index = db.tasks.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Úkol nenalezen' });
  }
  db.tasks.splice(index, 1);
  writeDb(db);
  res.status(204).end();
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/tasks.js
git commit -m "Add tasks REST routes"
```

---

### Task 6: Backend – server entry point + manual API verification

**Files:**
- Create: `server/server.js`

- [ ] **Step 1: Create `server/server.js`**

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

- [ ] **Step 2: Start the server**

Run (Bash, background):
```bash
npm run dev -w server
```

Expected: prints `Server běží na http://localhost:3001`.

- [ ] **Step 3: Verify CRUD with curl**

Run (Bash):
```bash
curl -s -X POST http://localhost:3001/api/guests -H "Content-Type: application/json" -d '{"jmeno":"Test Host","typ":"jednotlivec","potvrzeni":"potvrzeno","mustHave":true}'
curl -s http://localhost:3001/api/guests
```

Expected: POST returns the created guest with a generated `id`; GET returns an array containing that guest. Repeat similarly for `/api/agenda` (`{"nazev":"Test","casZacatku":"12:00","trvani":30}`) and `/api/tasks` (`{"nazev":"Test úkol","prirazeno":"Míša"}`) to confirm all three resources work, then delete the test entries via `curl -X DELETE http://localhost:3001/api/guests/<id>` (and the equivalents) so the demo data starts clean for Task 13.

- [ ] **Step 4: Stop the server**

Stop the background `npm run dev -w server` process.

- [ ] **Step 5: Commit**

```bash
git add server/server.js
git commit -m "Add Express server entry point wiring all API routes"
```

---

### Task 7: Frontend – design system (fonts, colors, shared CSS)

**Files:**
- Create: `client/src/styles/variables.css`
- Create: `client/src/styles/global.css`
- Modify: `client/src/main.jsx`

- [ ] **Step 1: Create `client/src/styles/variables.css`**

```css
:root {
  --color-ivory: #FAF6F0;
  --color-rose: #D8A7B1;
  --color-sage: #9CAF88;
  --color-gold: #D4AF37;
  --color-text: #4a3f3a;
  --color-text-light: #7a6a5e;
  --color-border: #eee2d8;

  --font-heading: 'Playfair Display', serif;
  --font-body: 'Lato', sans-serif;

  --radius: 12px;
  --shadow: 0 2px 12px rgba(74, 63, 58, 0.08);
}
```

- [ ] **Step 2: Create `client/src/styles/global.css`**

```css
* {
  box-sizing: border-box;
}

html, body, #root {
  margin: 0;
  padding: 0;
  min-height: 100%;
}

body {
  font-family: var(--font-body);
  background: var(--color-ivory);
  color: var(--color-text);
}

h1, h2, h3, h4 {
  font-family: var(--font-heading);
  margin: 0 0 0.5em;
  color: var(--color-text);
}

button {
  font-family: var(--font-body);
  cursor: pointer;
}

.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
}

.section {
  padding: 40px 0;
}

.card {
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px;
}

.btn {
  border: none;
  border-radius: 999px;
  padding: 10px 24px;
  font-weight: 700;
  letter-spacing: 0.5px;
  background: var(--color-rose);
  color: #fff;
  transition: opacity 0.15s ease;
}

.btn:hover {
  opacity: 0.85;
}

.btn-secondary {
  background: var(--color-sage);
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-icon {
  background: transparent;
  border: none;
  font-size: 18px;
  padding: 4px 8px;
  color: var(--color-text-light);
}

.btn-icon:hover {
  color: var(--color-text);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(74, 63, 58, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal {
  background: var(--color-ivory);
  border-radius: var(--radius);
  padding: 28px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.form-row label {
  font-weight: 700;
  font-size: 14px;
}

.form-row input,
.form-row select,
.form-row textarea {
  font-family: var(--font-body);
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
}

.form-row-checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 400;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.badge-waiting {
  background: #f0e6da;
  color: #9b8366;
}

.badge-confirmed {
  background: #e3ecdd;
  color: #5c7a4d;
}

.badge-declined {
  background: #f5dede;
  color: #a35a5a;
}

.filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 16px 0;
}

.filter-btn {
  border: 1px solid var(--color-border);
  background: #fff;
  border-radius: 999px;
  padding: 6px 16px;
  font-size: 13px;
  color: var(--color-text-light);
}

.filter-btn.active {
  background: var(--color-rose);
  border-color: var(--color-rose);
  color: #fff;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.empty-state {
  color: var(--color-text-light);
  font-style: italic;
  text-align: center;
  padding: 20px 0;
}
```

- [ ] **Step 3: Update `client/src/main.jsx`**

Replace the full file with:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/variables.css'
import './styles/global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 4: Commit**

```bash
git add client/src/styles client/src/main.jsx
git commit -m "Add wedding design system (colors, fonts, shared CSS)"
```

---

### Task 8: Frontend – API client helpers

**Files:**
- Create: `client/src/api.js`

- [ ] **Step 1: Create `client/src/api.js`**

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

- [ ] **Step 2: Commit**

```bash
git add client/src/api.js
git commit -m "Add frontend API client helpers"
```

---

### Task 9: Frontend – App shell (Hero, Nav, PhotoGallery, App.jsx)

**Files:**
- Create: `client/src/components/Hero.jsx`
- Create: `client/src/components/Hero.css`
- Create: `client/src/components/Nav.jsx`
- Create: `client/src/components/Nav.css`
- Create: `client/src/components/PhotoGallery.jsx`
- Create: `client/src/components/PhotoGallery.css`
- Modify: `client/src/App.jsx`

- [ ] **Step 1: Create `client/src/components/Hero.jsx`**

```jsx
import { useMemo } from 'react';
import './Hero.css';

function getDaysUntilWedding() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const wedding = new Date(2026, 7, 22); // 22. 8. 2026 (month is 0-indexed)
  wedding.setHours(0, 0, 0, 0);
  const diffMs = wedding - today;
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

export default function Hero() {
  const days = useMemo(() => getDaysUntilWedding(), []);

  return (
    <header className="hero">
      <div className="hero-content">
        <h1 className="hero-title">Míša <span>&amp;</span> Roman</h1>
        <p className="hero-date">22. 8. 2026</p>
        <div className="hero-countdown">
          <span className="hero-countdown-number">{days}</span>
          <span className="hero-countdown-label">dní do svatby</span>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create `client/src/components/Hero.css`**

```css
.hero {
  position: relative;
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(rgba(60, 40, 40, 0.35), rgba(60, 40, 40, 0.55)), url('/images/photo1.jpg') center 30% / cover no-repeat;
  background-attachment: fixed;
  color: var(--color-ivory);
  text-align: center;
}

.hero-content {
  position: relative;
  z-index: 1;
  padding: 40px 20px;
}

.hero-title {
  font-size: clamp(40px, 8vw, 64px);
  letter-spacing: 2px;
  color: var(--color-ivory);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  margin-bottom: 12px;
}

.hero-title span {
  color: var(--color-rose);
}

.hero-date {
  font-size: 16px;
  letter-spacing: 6px;
  text-transform: uppercase;
  opacity: 0.9;
  margin-bottom: 28px;
}

.hero-countdown {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  background: rgba(250, 246, 240, 0.15);
  border: 1px solid rgba(250, 246, 240, 0.4);
  border-radius: var(--radius);
  padding: 16px 40px;
  backdrop-filter: blur(2px);
}

.hero-countdown-number {
  font-family: var(--font-heading);
  font-size: 42px;
  font-weight: 700;
  color: var(--color-gold);
  line-height: 1;
}

.hero-countdown-label {
  font-size: 13px;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-top: 6px;
}

@media (max-width: 600px) {
  .hero {
    background-attachment: scroll;
  }
}
```

- [ ] **Step 3: Create `client/src/components/Nav.jsx`**

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

- [ ] **Step 4: Create `client/src/components/Nav.css`**

```css
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: center;
  gap: 8px;
  background: var(--color-ivory);
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border);
}

.nav-tab {
  border: none;
  background: transparent;
  border-radius: 999px;
  padding: 10px 28px;
  font-family: var(--font-body);
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--color-text-light);
}

.nav-tab.active {
  background: var(--color-rose);
  color: #fff;
}
```

- [ ] **Step 5: Create `client/src/components/PhotoGallery.jsx`**

```jsx
import './PhotoGallery.css';

const PHOTOS = [
  { src: '/images/photo2.jpg', alt: 'Míša a Roman na kole u moře při západu slunce' },
  { src: '/images/photo3.jpg', alt: 'Míša a Roman před sochou Krista Vykupitele v Riu de Janeiru' },
  { src: '/images/photo4.jpg', alt: 'Míša a Roman před mostem 25 de Abril v Lisabonu' }
];

export default function PhotoGallery() {
  return (
    <div className="gallery">
      {PHOTOS.map((photo) => (
        <img key={photo.src} src={photo.src} alt={photo.alt} className="gallery-photo" />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create `client/src/components/PhotoGallery.css`**

```css
.gallery {
  display: flex;
  gap: 4px;
}

.gallery-photo {
  width: 33.3333%;
  height: 220px;
  object-fit: cover;
  display: block;
}

@media (max-width: 700px) {
  .gallery {
    flex-direction: column;
  }
  .gallery-photo {
    width: 100%;
    height: 160px;
  }
}
```

- [ ] **Step 7: Replace `client/src/App.jsx`**

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

Note: this imports `GuestsPage`, `AgendaPage`, `TasksPage` which don't exist yet — they're created in Tasks 10-12. The app won't compile until then, which is expected; don't run the dev server yet.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/Hero.jsx client/src/components/Hero.css client/src/components/Nav.jsx client/src/components/Nav.css client/src/components/PhotoGallery.jsx client/src/components/PhotoGallery.css client/src/App.jsx
git commit -m "Add app shell: hero, nav and photo gallery"
```

---

### Task 10: Frontend – Hosté (Guests) feature

**Files:**
- Create: `client/src/components/guests/GuestSummaryCard.jsx`
- Create: `client/src/components/guests/GuestSummaryCard.css`
- Create: `client/src/components/guests/GuestFilter.jsx`
- Create: `client/src/components/guests/GuestList.jsx`
- Create: `client/src/components/guests/GuestList.css`
- Create: `client/src/components/guests/GuestForm.jsx`
- Create: `client/src/components/guests/GuestsPage.jsx`

- [ ] **Step 1: Create `client/src/components/guests/GuestSummaryCard.jsx`**

```jsx
import './GuestSummaryCard.css';

function adultsFor(guest) {
  return guest.typ === 'jednotlivec' ? 1 : 2;
}

export default function GuestSummaryCard({ guests }) {
  const confirmed = guests.filter((g) => g.potvrzeni === 'potvrzeno');
  const totalAdults = confirmed.reduce((sum, g) => sum + adultsFor(g), 0);
  const mustHaveAdults = confirmed
    .filter((g) => g.mustHave)
    .reduce((sum, g) => sum + adultsFor(g), 0);
  const totalChildren = confirmed.reduce((sum, g) => sum + (g.typ === 'rodina' ? g.pocetDeti : 0), 0);
  const waiting = guests.filter((g) => g.potvrzeni === 'ceka').length;

  const stats = [
    { label: 'Potvrzení hosté', value: totalAdults },
    { label: 'z toho Must-have', value: mustHaveAdults },
    { label: 'Děti', value: totalChildren },
    { label: 'Čeká na odpověď', value: waiting }
  ];

  return (
    <div className="card summary-card">
      {stats.map((stat) => (
        <div key={stat.label} className="summary-stat">
          <div className="summary-value">{stat.value}</div>
          <div className="summary-label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `client/src/components/guests/GuestSummaryCard.css`**

```css
.summary-card {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  justify-content: space-around;
  margin-bottom: 24px;
}

.summary-stat {
  text-align: center;
  min-width: 110px;
}

.summary-value {
  font-family: var(--font-heading);
  font-size: 36px;
  font-weight: 700;
  color: var(--color-rose);
}

.summary-label {
  font-size: 13px;
  color: var(--color-text-light);
  margin-top: 4px;
}
```

- [ ] **Step 3: Create `client/src/components/guests/GuestFilter.jsx`**

```jsx
const FILTERS = [
  { id: 'vsichni', label: 'Všichni' },
  { id: 'potvrzeni', label: 'Potvrzení' },
  { id: 'must-have', label: 'Must-have' },
  { id: 'cekajici', label: 'Čekající' }
];

export default function GuestFilter({ active, onChange }) {
  return (
    <div className="filters">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          className={`filter-btn ${active === f.id ? 'active' : ''}`}
          onClick={() => onChange(f.id)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `client/src/components/guests/GuestList.jsx`**

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

- [ ] **Step 5: Create `client/src/components/guests/GuestList.css`**

```css
.guest-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.guest-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.guest-name {
  font-weight: 700;
  font-size: 16px;
}

.guest-star {
  color: var(--color-gold);
  margin-left: 6px;
}

.guest-meta {
  font-size: 13px;
  color: var(--color-text-light);
  margin-top: 2px;
}

.guest-note {
  font-size: 13px;
  color: var(--color-text-light);
  margin-top: 4px;
  font-style: italic;
}

.guest-side {
  display: flex;
  align-items: center;
  gap: 12px;
}

.guest-actions {
  display: flex;
  gap: 4px;
}
```

- [ ] **Step 6: Create `client/src/components/guests/GuestForm.jsx`**

```jsx
import { useState } from 'react';

const EMPTY_GUEST = {
  jmeno: '',
  typ: 'jednotlivec',
  pocetDeti: 0,
  potvrzeni: 'ceka',
  mustHave: false,
  poznamka: ''
};

export default function GuestForm({ guest, onSave, onClose }) {
  const [form, setForm] = useState(guest ? { ...guest } : { ...EMPTY_GUEST });

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

- [ ] **Step 7: Create `client/src/components/guests/GuestsPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { guestsApi } from '../../api.js';
import GuestSummaryCard from './GuestSummaryCard.jsx';
import GuestFilter from './GuestFilter.jsx';
import GuestList from './GuestList.jsx';
import GuestForm from './GuestForm.jsx';
import './GuestList.css';

export default function GuestsPage() {
  const [guests, setGuests] = useState([]);
  const [filter, setFilter] = useState('vsichni');
  const [editingGuest, setEditingGuest] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    guestsApi.list().then(setGuests);
  }, []);

  const filtered = guests.filter((g) => {
    if (filter === 'potvrzeni') return g.potvrzeni === 'potvrzeno';
    if (filter === 'must-have') return g.mustHave;
    if (filter === 'cekajici') return g.potvrzeni === 'ceka';
    return true;
  });

  async function handleSave(data) {
    if (editingGuest) {
      const updated = await guestsApi.update(editingGuest.id, data);
      setGuests((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    } else {
      const created = await guestsApi.create(data);
      setGuests((prev) => [...prev, created]);
    }
    setShowForm(false);
    setEditingGuest(null);
  }

  async function handleDelete(id) {
    await guestsApi.remove(id);
    setGuests((prev) => prev.filter((g) => g.id !== id));
  }

  function openEdit(guest) {
    setEditingGuest(guest);
    setShowForm(true);
  }

  function openAdd() {
    setEditingGuest(null);
    setShowForm(true);
  }

  return (
    <div>
      <GuestSummaryCard guests={guests} />
      <div className="page-header">
        <GuestFilter active={filter} onChange={setFilter} />
        <button className="btn" onClick={openAdd}>+ Přidat hosta</button>
      </div>
      <GuestList guests={filtered} onEdit={openEdit} onDelete={handleDelete} />
      {showForm && (
        <GuestForm
          guest={editingGuest}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingGuest(null); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add client/src/components/guests
git commit -m "Add guest management feature (Hoste)"
```

---

### Task 11: Frontend – Program (Agenda) feature

**Files:**
- Create: `client/src/components/agenda/AgendaForm.jsx`
- Create: `client/src/components/agenda/AgendaItem.jsx`
- Create: `client/src/components/agenda/AgendaTimeline.jsx`
- Create: `client/src/components/agenda/AgendaTimeline.css`
- Create: `client/src/components/agenda/AgendaPage.jsx`

- [ ] **Step 1: Create `client/src/components/agenda/AgendaForm.jsx`**

```jsx
import { useState } from 'react';

const ICONS = ['💍', '🥂', '🍽️', '💃', '📸', '🎵', '🚗', '⛪', '🌸', '🎂'];

const EMPTY_ITEM = {
  nazev: '',
  casZacatku: '12:00',
  trvani: 30,
  ikona: ICONS[0],
  poznamka: ''
};

export default function AgendaForm({ item, onSave, onClose }) {
  const [form, setForm] = useState(item ? { ...item } : { ...EMPTY_ITEM });

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
        <h3>{item ? 'Upravit položku programu' : 'Přidat položku programu'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="nazev">Název</label>
            <input
              id="nazev"
              type="text"
              value={form.nazev}
              onChange={(e) => update('nazev', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="casZacatku">Čas začátku</label>
            <input
              id="casZacatku"
              type="time"
              value={form.casZacatku}
              onChange={(e) => update('casZacatku', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="trvani">Trvání (minuty)</label>
            <input
              id="trvani"
              type="number"
              min="0"
              step="5"
              value={form.trvani}
              onChange={(e) => update('trvani', Number(e.target.value))}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="ikona">Ikona</label>
            <select id="ikona" value={form.ikona} onChange={(e) => update('ikona', e.target.value)}>
              {ICONS.map((icon) => (
                <option key={icon} value={icon}>{icon}</option>
              ))}
            </select>
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

- [ ] **Step 2: Create `client/src/components/agenda/AgendaItem.jsx`**

```jsx
function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const hh = Math.floor(wrapped / 60).toString().padStart(2, '0');
  const mm = (wrapped % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function AgendaItem({ item, onEdit, onDelete }) {
  const endTime = addMinutes(item.casZacatku, item.trvani);

  return (
    <div className="agenda-item">
      <div className="agenda-time">
        <div className="agenda-time-start">{item.casZacatku}</div>
        <div className="agenda-time-end">{endTime}</div>
      </div>
      <div className="agenda-card card">
        <div className="agenda-card-header">
          <span className="agenda-icon">{item.ikona}</span>
          <span className="agenda-name">{item.nazev}</span>
          <div className="agenda-actions">
            <button className="btn-icon" onClick={() => onEdit(item)} title="Upravit">✎</button>
            <button className="btn-icon" onClick={() => onDelete(item.id)} title="Smazat">🗑</button>
          </div>
        </div>
        {item.poznamka && <p className="agenda-note">{item.poznamka}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `client/src/components/agenda/AgendaTimeline.jsx`**

```jsx
import AgendaItem from './AgendaItem.jsx';

export default function AgendaTimeline({ items, onEdit, onDelete }) {
  if (items.length === 0) {
    return <p className="empty-state">Zatím žádný program. Přidejte první položku.</p>;
  }

  const sorted = [...items].sort((a, b) => a.casZacatku.localeCompare(b.casZacatku));

  return (
    <div className="agenda-timeline">
      {sorted.map((item) => (
        <AgendaItem key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `client/src/components/agenda/AgendaTimeline.css`**

```css
.agenda-timeline {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.agenda-item {
  display: flex;
  gap: 16px;
}

.agenda-time {
  flex: 0 0 70px;
  text-align: right;
  padding-top: 18px;
  font-family: var(--font-heading);
  position: relative;
}

.agenda-time::after {
  content: '';
  position: absolute;
  top: 24px;
  right: -9px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-rose);
}

.agenda-time-start {
  font-weight: 700;
  font-size: 16px;
  color: var(--color-text);
}

.agenda-time-end {
  font-size: 12px;
  color: var(--color-text-light);
}

.agenda-card {
  flex: 1;
  margin: 8px 0 8px 16px;
  border-left: 2px solid var(--color-border);
  border-radius: 0 var(--radius) var(--radius) 0;
}

.agenda-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.agenda-icon {
  font-size: 22px;
}

.agenda-name {
  font-weight: 700;
  flex: 1;
}

.agenda-actions {
  display: flex;
  gap: 4px;
}

.agenda-note {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--color-text-light);
  font-style: italic;
}
```

- [ ] **Step 5: Create `client/src/components/agenda/AgendaPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { agendaApi } from '../../api.js';
import AgendaTimeline from './AgendaTimeline.jsx';
import AgendaForm from './AgendaForm.jsx';
import './AgendaTimeline.css';

export default function AgendaPage() {
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    agendaApi.list().then(setItems);
  }, []);

  async function handleSave(data) {
    if (editingItem) {
      const updated = await agendaApi.update(editingItem.id, data);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } else {
      const created = await agendaApi.create(data);
      setItems((prev) => [...prev, created]);
    }
    setShowForm(false);
    setEditingItem(null);
  }

  async function handleDelete(id) {
    await agendaApi.remove(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function openEdit(item) {
    setEditingItem(item);
    setShowForm(true);
  }

  function openAdd() {
    setEditingItem(null);
    setShowForm(true);
  }

  return (
    <div>
      <div className="page-header">
        <h2>Program svatebního dne</h2>
        <button className="btn" onClick={openAdd}>+ Přidat položku</button>
      </div>
      <AgendaTimeline items={items} onEdit={openEdit} onDelete={handleDelete} />
      {showForm && (
        <AgendaForm
          item={editingItem}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/components/agenda
git commit -m "Add wedding day agenda feature (Program)"
```

---

### Task 12: Frontend – Úkoly (Tasks) feature

**Files:**
- Create: `client/src/components/tasks/TaskProgressBar.jsx`
- Create: `client/src/components/tasks/TaskFilter.jsx`
- Create: `client/src/components/tasks/TaskList.jsx`
- Create: `client/src/components/tasks/TaskList.css`
- Create: `client/src/components/tasks/TaskForm.jsx`
- Create: `client/src/components/tasks/TasksPage.jsx`

- [ ] **Step 1: Create `client/src/components/tasks/TaskProgressBar.jsx`**

```jsx
export default function TaskProgressBar({ tasks }) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.stav === 'splneno').length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="progress-wrap card">
      <div className="progress-label">
        Splněno {done} z {total} úkolů ({percent}%)
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `client/src/components/tasks/TaskFilter.jsx`**

```jsx
export default function TaskFilter({ assignee, onAssigneeChange, view, onViewChange }) {
  return (
    <div className="task-filters">
      <input
        type="text"
        placeholder="Filtrovat podle osoby..."
        value={assignee}
        onChange={(e) => onAssigneeChange(e.target.value)}
        className="task-assignee-filter"
      />
      <div className="filters">
        <button
          className={`filter-btn ${view === 'stav' ? 'active' : ''}`}
          onClick={() => onViewChange('stav')}
        >
          Podle stavu
        </button>
        <button
          className={`filter-btn ${view === 'termin' ? 'active' : ''}`}
          onClick={() => onViewChange('termin')}
        >
          Podle termínu
        </button>
        <button
          className={`filter-btn ${view === 'priorita' ? 'active' : ''}`}
          onClick={() => onViewChange('priorita')}
        >
          Podle priority
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `client/src/components/tasks/TaskList.jsx`**

```jsx
const STATUS_LABELS = {
  nesplneno: 'Nesplněno',
  probiha: 'Probíhá',
  splneno: 'Splněno'
};

const STATUS_ORDER = ['nesplneno', 'probiha', 'splneno'];

const PRIORITY_LABELS = {
  nizka: 'Nízká',
  stredni: 'Střední',
  vysoka: 'Vysoká'
};

const PRIORITY_ORDER = { vysoka: 0, stredni: 1, nizka: 2 };

const PRIORITY_CLASS = {
  nizka: 'priority-low',
  stredni: 'priority-medium',
  vysoka: 'priority-high'
};

function TaskRow({ task, onEdit, onDelete, onStatusChange }) {
  return (
    <li className="task-row card">
      <div className="task-main">
        <div className="task-name">{task.nazev}</div>
        <div className="task-meta">
          {task.prirazeno && <span>{task.prirazeno}</span>}
          {task.termin && <span>termín {task.termin}</span>}
          <span className={`priority-badge ${PRIORITY_CLASS[task.priorita]}`}>
            {PRIORITY_LABELS[task.priorita]}
          </span>
        </div>
        {task.poznamka && <div className="task-note">{task.poznamka}</div>}
      </div>
      <div className="task-side">
        <select
          value={task.stav}
          onChange={(e) => onStatusChange(task, e.target.value)}
          className="task-status-select"
        >
          <option value="nesplneno">Nesplněno</option>
          <option value="probiha">Probíhá</option>
          <option value="splneno">Splněno</option>
        </select>
        <div className="task-actions">
          <button className="btn-icon" onClick={() => onEdit(task)} title="Upravit">✎</button>
          <button className="btn-icon" onClick={() => onDelete(task.id)} title="Smazat">🗑</button>
        </div>
      </div>
    </li>
  );
}

export default function TaskList({ tasks, view, onEdit, onDelete, onStatusChange }) {
  if (tasks.length === 0) {
    return <p className="empty-state">Žádné úkoly v tomto výběru.</p>;
  }

  if (view === 'termin') {
    const sorted = [...tasks].sort((a, b) => {
      if (!a.termin) return 1;
      if (!b.termin) return -1;
      return a.termin.localeCompare(b.termin);
    });
    return (
      <ul className="task-list">
        {sorted.map((task) => (
          <TaskRow key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
        ))}
      </ul>
    );
  }

  if (view === 'priorita') {
    const sorted = [...tasks].sort((a, b) => PRIORITY_ORDER[a.priorita] - PRIORITY_ORDER[b.priorita]);
    return (
      <ul className="task-list">
        {sorted.map((task) => (
          <TaskRow key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
        ))}
      </ul>
    );
  }

  return (
    <div className="task-groups">
      {STATUS_ORDER.map((status) => {
        const group = tasks.filter((t) => t.stav === status);
        if (group.length === 0) return null;
        return (
          <div key={status} className="task-group">
            <h3>{STATUS_LABELS[status]}</h3>
            <ul className="task-list">
              {group.map((task) => (
                <TaskRow key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create `client/src/components/tasks/TaskList.css`**

```css
.progress-wrap {
  margin-bottom: 16px;
}

.progress-label {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 8px;
}

.progress-bar {
  height: 10px;
  background: var(--color-border);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-sage);
  transition: width 0.3s ease;
}

.task-filters {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.task-assignee-filter {
  font-family: var(--font-body);
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  max-width: 280px;
}

.task-groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.task-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.task-name {
  font-weight: 700;
  font-size: 16px;
}

.task-meta {
  font-size: 13px;
  color: var(--color-text-light);
  margin-top: 2px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.task-note {
  font-size: 13px;
  color: var(--color-text-light);
  margin-top: 4px;
  font-style: italic;
}

.task-side {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-status-select {
  font-family: var(--font-body);
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 13px;
}

.task-actions {
  display: flex;
  gap: 4px;
}

.priority-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.priority-low {
  background: #e3ecdd;
  color: #5c7a4d;
}

.priority-medium {
  background: #f0e6da;
  color: #9b8366;
}

.priority-high {
  background: #f5dede;
  color: #a35a5a;
}
```

- [ ] **Step 5: Create `client/src/components/tasks/TaskForm.jsx`**

```jsx
import { useState } from 'react';

const EMPTY_TASK = {
  nazev: '',
  prirazeno: '',
  termin: '',
  stav: 'nesplneno',
  priorita: 'stredni',
  poznamka: ''
};

export default function TaskForm({ task, onSave, onClose }) {
  const [form, setForm] = useState(task ? { ...task, termin: task.termin || '' } : { ...EMPTY_TASK });

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ ...form, termin: form.termin || null });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{task ? 'Upravit úkol' : 'Přidat úkol'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="nazev">Název úkolu</label>
            <input
              id="nazev"
              type="text"
              value={form.nazev}
              onChange={(e) => update('nazev', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="prirazeno">Přiřazeno</label>
            <input
              id="prirazeno"
              type="text"
              value={form.prirazeno}
              onChange={(e) => update('prirazeno', e.target.value)}
            />
          </div>
          <div className="form-row">
            <label htmlFor="termin">Termín</label>
            <input
              id="termin"
              type="date"
              value={form.termin}
              onChange={(e) => update('termin', e.target.value)}
            />
          </div>
          <div className="form-row">
            <label htmlFor="stav">Stav</label>
            <select id="stav" value={form.stav} onChange={(e) => update('stav', e.target.value)}>
              <option value="nesplneno">Nesplněno</option>
              <option value="probiha">Probíhá</option>
              <option value="splneno">Splněno</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="priorita">Priorita</label>
            <select id="priorita" value={form.priorita} onChange={(e) => update('priorita', e.target.value)}>
              <option value="nizka">Nízká</option>
              <option value="stredni">Střední</option>
              <option value="vysoka">Vysoká</option>
            </select>
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

- [ ] **Step 6: Create `client/src/components/tasks/TasksPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { tasksApi } from '../../api.js';
import TaskProgressBar from './TaskProgressBar.jsx';
import TaskFilter from './TaskFilter.jsx';
import TaskList from './TaskList.jsx';
import TaskForm from './TaskForm.jsx';
import './TaskList.css';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [view, setView] = useState('stav');
  const [editingTask, setEditingTask] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    tasksApi.list().then(setTasks);
  }, []);

  const filtered = tasks.filter((t) =>
    t.prirazeno.toLowerCase().includes(assigneeFilter.toLowerCase())
  );

  async function handleSave(data) {
    if (editingTask) {
      const updated = await tasksApi.update(editingTask.id, data);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const created = await tasksApi.create(data);
      setTasks((prev) => [...prev, created]);
    }
    setShowForm(false);
    setEditingTask(null);
  }

  async function handleDelete(id) {
    await tasksApi.remove(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleStatusChange(task, stav) {
    const updated = await tasksApi.update(task.id, { ...task, stav });
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function openEdit(task) {
    setEditingTask(task);
    setShowForm(true);
  }

  function openAdd() {
    setEditingTask(null);
    setShowForm(true);
  }

  return (
    <div>
      <TaskProgressBar tasks={tasks} />
      <div className="page-header">
        <TaskFilter
          assignee={assigneeFilter}
          onAssigneeChange={setAssigneeFilter}
          view={view}
          onViewChange={setView}
        />
        <button className="btn" onClick={openAdd}>+ Přidat úkol</button>
      </div>
      <TaskList
        tasks={filtered}
        view={view}
        onEdit={openEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />
      {showForm && (
        <TaskForm
          task={editingTask}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingTask(null); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add client/src/components/tasks
git commit -m "Add task list feature (Ukoly)"
```

---

### Task 13: Full integration check

**Files:** none (verification only)

- [ ] **Step 1: Start the full stack**

Use the `run` skill (or manually run `npm run dev` from the project root) to start both the Express server (port 3001) and the Vite dev server (port 5173).

- [ ] **Step 2: Open the app and verify the shell**

Open `http://localhost:5173`. Verify:
- Hero shows "Míša & Roman", "22. 8. 2026", and a days-until-wedding count, with `photo1.jpg` as the background
- Nav shows three tabs: Hosté, Program, Úkoly
- Photo gallery strip below the nav shows `photo2.jpg`, `photo3.jpg`, `photo4.jpg`

- [ ] **Step 3: Verify Hosté tab**

- Add a guest of each type (jednotlivec, pár, rodina with 2 children), one marked must-have and `potvrzeno`, one left as `ceka`
- Confirm the summary card numbers update correctly (adults, must-have, children, waiting)
- Test each filter (všichni / potvrzeni / must-have / čekající)
- Edit a guest and delete a guest, confirm changes persist after a page refresh (i.e. they were written to `server/data/db.json`)

- [ ] **Step 4: Verify Program tab**

- Add 2-3 agenda items with different start times, out of order
- Confirm they render sorted by time with correct computed end times
- Edit and delete an item, confirm changes persist after refresh

- [ ] **Step 5: Verify Úkoly tab**

- Add a few tasks with different statuses, priorities, assignees and due dates
- Confirm the progress bar percentage matches the number of `splneno` tasks
- Toggle between "Podle stavu" (grouped), "Podle termínu" and "Podle priority" views
- Change a task's status inline via the dropdown
- Filter by assignee
- Edit and delete a task, confirm changes persist after refresh

- [ ] **Step 6: Clean up demo data**

Remove any test entries created during verification (via the UI) so `server/data/db.json` starts empty for real use, or leave realistic seed data if the user prefers — confirm with the user which they want.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "Complete wedding dashboard MVP"
```

---
