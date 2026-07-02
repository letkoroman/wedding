# Blocks Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give "blocks" (program sections like "Obřad a ceremonie") their own manually-configured start/end time, auto-expand that range when contained activities overflow it (with a dismissable inline notice), make block create/edit/delete UI consistent with activity management, and make blocks visually louder on the Program timeline. Assigning an activity to a block via a dropdown is already fully implemented and only needs a regression check.

**Architecture:** Blocks already exist end-to-end (Postgres table, Express CRUD routes, `BlockForm` modal, orphan-reassignment on delete, dropdown assignment in `AgendaForm`) — but a `Block` currently has no time fields at all, and the timeline's "expand to fit activities" behavior is only true today because there's no fixed range to expand *from*. This plan adds `cas_zacatku`/`cas_konce` columns to `blocks` via a new migration, threads them through the route and `BlockForm`, and adds a pure `computeBlockRange()` function (the one piece of real business logic here, and the only thing in this plan that gets an automated test — via Node's built-in `node:test`, since the repo has no test framework and this logic is simple enough not to need one). The timeline's `.block-group` wrapper changes from `display: contents` to a real box so it can carry the spec's left color bar + tinted background across the whole block section (header + activities), per the "enhance the current list view" scope decision (no Gantt bar-chart rewrite).

**Tech Stack:** Express 4 + `pg` (raw SQL, no ORM) on the server; React 19 + plain CSS on the client; Node's built-in `node:test` for the one pure-logic unit test (zero new dependencies, matches the project's existing "no extra libraries" convention).

**Design decisions locked in before coding:**
1. **New columns are nullable, no backfill.** Existing blocks in the live DB have no time data. `cas_zacatku`/`cas_konce` are added as plain nullable `TEXT` columns (same format as `agenda_items.cas_zacatku`, `"HH:MM"`). `computeBlockRange()` treats a `null` manual time as "no intent set — use the activities' own range," which is exactly today's behavior, so pre-existing blocks keep working unchanged until someone edits them to add times.
2. **Gap-row calculation between timeline groups is untouched.** `OverallTimeline.jsx`'s existing "X min volno" gap rows are based on actual activity start/end times, not the block's configured intent. Task 5 (auto-expand) only changes what's *displayed* in the block header and the notice banner — it does not change gap-row math. Scope stays inside "enhance the current list view."
3. **"Add block" button styling.** The spec (§6) asks for a button "consistent with Přidat aktivitu." The companion UI-polish plan turns "Přidat aktivitu" into the one prominent FAB-style action; having "+ Blok" match that exact treatment would create competing primary CTAs. "Consistent" is read here as *same button family/shape* (pill, same corner radius, same modal-opening interaction) — "+ Blok" stays `.btn-outline`, already true today, so no change needed for that specific line; this plan's Task 4 focuses on the actual gap: the block *list* (chips) not matching the activity list's edit/delete icon pattern.
4. **Dismissal is session-only (component state), not persisted.** The spec says "dismissable," not "permanently dismissed across reloads." A `useState` per `BlockHeader` instance is sufficient; no new DB column or localStorage needed. If the *same* activity keeps causing the same overflow, dismissing hides it; if a *different* activity later causes a new overflow, the notice reappears (keyed by which activity names are currently causing the expansion).
5. **Block assignment dropdown (spec §8) is already built** (`AgendaForm.jsx:116-130`). This plan's only obligation there is a regression check after `BlockForm`/`blocks` API shape changes (Task 6).

---

### Task 1: Database migration — add time fields to `blocks`

**Files:**
- Create: `server/db/migrate-v9.js`

- [ ] **Step 1: Write the migration script**

Model this on the existing `server/db/migrate-v6.js` (which added `blocks` itself) and `server/db/migrate-v8.js` (most recent, simplest pattern). Create `server/db/migrate-v9.js`:

```js
import '../load-env.js';
import { sql } from './client.js';

await sql.query(`
  ALTER TABLE blocks
  ADD COLUMN IF NOT EXISTS cas_zacatku TEXT,
  ADD COLUMN IF NOT EXISTS cas_konce TEXT
`);

console.log('Migration v9 OK');
process.exit(0);
```

- [ ] **Step 2: Run the migration against the configured database**

This modifies the schema of the live database referenced by `DATABASE_URL` (per `server/.env` / `.env.example` — a Supabase Postgres instance). Confirm the correct `DATABASE_URL` is set in `server/.env` before running (dev/staging vs. production), then run:

```bash
node server/db/migrate-v9.js
```

Expected output: `Migration v9 OK`

- [ ] **Step 3: Verify the columns exist**

Run a quick check (adjust connection details to match your local `psql`/DB client setup, or use any Postgres GUI pointed at `DATABASE_URL`):

```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'blocks';
```

Expected: `cas_zacatku` and `cas_konce` both present with `data_type = 'text'`, nullable.

- [ ] **Step 4: Commit**

```bash
git add server/db/migrate-v9.js
git commit -m "feat: add cas_zacatku/cas_konce columns to blocks table"
```

---

### Task 2: Server route — thread time fields through `blocks.js`

**Files:**
- Modify: `server/routes/blocks.js`

- [ ] **Step 1: Update `toBlock()` to include the new fields**

Replace lines 6-8:

```js
function toBlock(row) {
  return { id: row.id, nazev: row.nazev, barva: row.barva, poradi: row.poradi };
}
```

with:

```js
function toBlock(row) {
  return {
    id: row.id,
    nazev: row.nazev,
    barva: row.barva,
    poradi: row.poradi,
    casZacatku: row.cas_zacatku || null,
    casKonce: row.cas_konce || null
  };
}
```

- [ ] **Step 2: Accept the fields on create**

Replace lines 15-19:

```js
router.post('/', async (req, res) => {
  const { nazev, barva = '#8B7355' } = req.body;
  const [row] = await sql`INSERT INTO blocks (nazev, barva) VALUES (${nazev}, ${barva}) RETURNING *`;
  res.status(201).json(toBlock(row));
});
```

with:

```js
router.post('/', async (req, res) => {
  const { nazev, barva = '#8B7355', casZacatku = null, casKonce = null } = req.body;
  const [row] = await sql`
    INSERT INTO blocks (nazev, barva, cas_zacatku, cas_konce)
    VALUES (${nazev}, ${barva}, ${casZacatku}, ${casKonce})
    RETURNING *
  `;
  res.status(201).json(toBlock(row));
});
```

- [ ] **Step 3: Accept the fields on update**

Replace lines 21-28:

```js
router.put('/:id', async (req, res) => {
  const { nazev, barva } = req.body;
  const [row] = await sql`
    UPDATE blocks SET nazev=${nazev}, barva=${barva} WHERE id=${req.params.id} RETURNING *
  `;
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(toBlock(row));
});
```

with:

```js
router.put('/:id', async (req, res) => {
  const { nazev, barva, casZacatku = null, casKonce = null } = req.body;
  const [row] = await sql`
    UPDATE blocks SET nazev=${nazev}, barva=${barva}, cas_zacatku=${casZacatku}, cas_konce=${casKonce}
    WHERE id=${req.params.id} RETURNING *
  `;
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(toBlock(row));
});
```

- [ ] **Step 4: Manually verify with the running server**

Start the server (`npm run dev -w server`, or the combined root `npm run dev`) and exercise the endpoint directly:

```bash
curl -X POST http://localhost:3001/api/blocks -H "Content-Type: application/json" -d "{\"nazev\":\"Test blok\",\"barva\":\"#D4AF37\",\"casZacatku\":\"10:00\",\"casKonce\":\"14:00\"}"
```

(Adjust the port to whatever `server/server.js` actually listens on.) Expected: JSON response includes `"casZacatku":"10:00","casKonce":"14:00"`. Then `GET /api/blocks` and confirm the new block is listed with both fields. Delete the test block via `DELETE /api/blocks/:id` (or leave it — Task 6's UI can be used to clean it up later) to avoid leaving test data behind.

- [ ] **Step 5: Commit**

```bash
git add server/routes/blocks.js
git commit -m "feat: accept and return block start/end time fields in blocks API"
```

---

### Task 3: `computeBlockRange` pure function + unit tests

**Files:**
- Create: `client/src/components/agenda/blockRange.js`
- Test: `client/src/components/agenda/blockRange.test.js`

This is the one piece of real logic in this plan (auto-expand math), and it's a pure function — a genuine TDD candidate even without a test framework, since Node ships `node:test`/`node:assert` built in.

- [ ] **Step 1: Write the failing tests**

Create `client/src/components/agenda/blockRange.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBlockRange } from './blockRange.js';

test('uses the manual range when no activity overflows it', () => {
  const block = { id: 'b1', casZacatku: '10:00', casKonce: '14:00' };
  const items = [{ nazev: 'Focení', casZacatku: '10:30', casKonce: '11:00' }];
  const result = computeBlockRange(block, items);
  assert.equal(result.startLabel, '10:00');
  assert.equal(result.endLabel, '14:00');
  assert.equal(result.isExpanded, false);
  assert.deepEqual(result.expandedByNames, []);
});

test('expands the start when an activity starts earlier than the manual start', () => {
  const block = { id: 'b1', casZacatku: '10:00', casKonce: '14:00' };
  const items = [{ nazev: 'Příprava', casZacatku: '09:15', casKonce: '09:45' }];
  const result = computeBlockRange(block, items);
  assert.equal(result.startLabel, '09:15');
  assert.equal(result.endLabel, '14:00');
  assert.equal(result.isExpanded, true);
  assert.deepEqual(result.expandedByNames, ['Příprava']);
});

test('expands the end when an activity ends later than the manual end', () => {
  const block = { id: 'b1', casZacatku: '10:00', casKonce: '14:00' };
  const items = [{ nazev: 'Přípitek', casZacatku: '13:30', casKonce: '14:45' }];
  const result = computeBlockRange(block, items);
  assert.equal(result.startLabel, '10:00');
  assert.equal(result.endLabel, '14:45');
  assert.equal(result.isExpanded, true);
  assert.deepEqual(result.expandedByNames, ['Přípitek']);
});

test('expands both ends and names both causing activities', () => {
  const block = { id: 'b1', casZacatku: '10:00', casKonce: '14:00' };
  const items = [
    { nazev: 'Příprava', casZacatku: '09:00', casKonce: '09:30' },
    { nazev: 'Přípitek', casZacatku: '13:30', casKonce: '15:00' }
  ];
  const result = computeBlockRange(block, items);
  assert.equal(result.startLabel, '09:00');
  assert.equal(result.endLabel, '15:00');
  assert.equal(result.isExpanded, true);
  assert.deepEqual(result.expandedByNames, ['Příprava', 'Přípitek']);
});

test('falls back to the activities range when the block has no manual time set', () => {
  const block = { id: 'b1', casZacatku: null, casKonce: null };
  const items = [
    { nazev: 'Obřad', casZacatku: '11:00', casKonce: '11:30' },
    { nazev: 'Gratulace', casZacatku: '11:30', casKonce: '12:00' }
  ];
  const result = computeBlockRange(block, items);
  assert.equal(result.startLabel, '11:00');
  assert.equal(result.endLabel, '12:00');
  assert.equal(result.isExpanded, false);
});

test('does not report expansion when an activity exactly matches the manual bounds', () => {
  const block = { id: 'b1', casZacatku: '10:00', casKonce: '14:00' };
  const items = [{ nazev: 'Oběd', casZacatku: '10:00', casKonce: '14:00' }];
  const result = computeBlockRange(block, items);
  assert.equal(result.isExpanded, false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test client/src/components/agenda/blockRange.test.js`
Expected: FAIL — `Cannot find module './blockRange.js'` (the module doesn't exist yet).

- [ ] **Step 3: Implement `computeBlockRange`**

Create `client/src/components/agenda/blockRange.js`:

```js
import { toMinutes, minutesToLabel } from './timeUtils.js';

// items must be non-empty; each item needs nazev/casZacatku/casKonce (already-enriched agenda items).
export function computeBlockRange(block, items) {
  const manualStart = block.casZacatku ? toMinutes(block.casZacatku) : null;
  const manualEnd = block.casKonce ? toMinutes(block.casKonce) : null;

  let earliest = items[0];
  let latest = items[0];
  for (const item of items) {
    if (toMinutes(item.casZacatku) < toMinutes(earliest.casZacatku)) earliest = item;
    if (toMinutes(item.casKonce) > toMinutes(latest.casKonce)) latest = item;
  }
  const earliestStart = toMinutes(earliest.casZacatku);
  const latestEnd = toMinutes(latest.casKonce);

  const effectiveStart = manualStart === null ? earliestStart : Math.min(manualStart, earliestStart);
  const effectiveEnd = manualEnd === null ? latestEnd : Math.max(manualEnd, latestEnd);

  const expandedStart = manualStart !== null && earliestStart < manualStart;
  const expandedEnd = manualEnd !== null && latestEnd > manualEnd;

  const expandedByNames = [];
  if (expandedStart) expandedByNames.push(earliest.nazev);
  if (expandedEnd && latest.nazev !== earliest.nazev) expandedByNames.push(latest.nazev);
  else if (expandedEnd) expandedByNames.push(latest.nazev);

  return {
    startMin: effectiveStart,
    endMin: effectiveEnd,
    startLabel: minutesToLabel(effectiveStart),
    endLabel: minutesToLabel(effectiveEnd),
    isExpanded: expandedStart || expandedEnd,
    expandedByNames
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test client/src/components/agenda/blockRange.test.js`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/agenda/blockRange.js client/src/components/agenda/blockRange.test.js
git commit -m "feat: add computeBlockRange pure function with unit tests"
```

---

### Task 4: `BlockForm.jsx` — add start/end time fields

**Files:**
- Modify: `client/src/components/agenda/BlockForm.jsx`

Reuses the `TIME_OPTIONS`/`.time-field-pair`/`.time-stepper` pattern already established in `AgendaForm.jsx` for visual and interaction consistency with activity time entry (spec §6: block editing must be consistent with activity editing).

- [ ] **Step 1: Rewrite `BlockForm.jsx` with time fields**

Replace the full contents of `client/src/components/agenda/BlockForm.jsx`:

```jsx
import { useState } from 'react';
import { TIME_OPTIONS } from './timeUtils.js';

const COLOR_PRESETS = ['#D4AF37', '#9b7de0', '#5a9a5a', '#c46a6a', '#e07070', '#4a90d9', '#6fa8c9', '#8B7355'];

export default function BlockForm({ block, onSave, onClose }) {
  const isEdit = Boolean(block);
  const [nazev, setNazev] = useState(block?.nazev || '');
  const [barva, setBarva] = useState(block?.barva || COLOR_PRESETS[0]);
  const [casZacatku, setCasZacatku] = useState(block?.casZacatku || '10:00');
  const [casKonce, setCasKonce] = useState(block?.casKonce || '14:00');

  function step(field, dir) {
    const current = field === 'casZacatku' ? casZacatku : casKonce;
    const idx = TIME_OPTIONS.indexOf(current);
    const nextIdx = (idx + dir + TIME_OPTIONS.length) % TIME_OPTIONS.length;
    const next = TIME_OPTIONS[nextIdx];
    if (field === 'casZacatku') setCasZacatku(next); else setCasKonce(next);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!nazev.trim()) return;
    onSave({ nazev: nazev.trim(), barva, casZacatku, casKonce });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? 'Upravit blok' : 'Nový blok programu'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="block-nazev">Název bloku</label>
            <input
              id="block-nazev"
              type="text"
              value={nazev}
              onChange={(e) => setNazev(e.target.value)}
              placeholder="např. Obřad a ceremonie"
              required
              autoFocus
            />
          </div>
          <div className="form-row">
            <label>Barva bloku</label>
            <div className="swatch-row">
              {COLOR_PRESETS.map((col) => (
                <button
                  key={col}
                  type="button"
                  className={`swatch${barva === col ? ' selected' : ''}`}
                  style={{ background: col }}
                  aria-label={`Zvolit barvu ${col}`}
                  onClick={() => setBarva(col)}
                />
              ))}
              <input
                type="color"
                value={barva}
                onChange={(e) => setBarva(e.target.value)}
                aria-label="Vlastní barva"
                style={{ width: 32, height: 26, padding: 1, border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer' }}
              />
            </div>
            <div
              className="block-preview-chip"
              style={{ borderColor: barva, background: barva + '1c', color: barva }}
            >
              {nazev || 'Náhled bloku'}
            </div>
          </div>
          <div className="form-row">
            <label>Čas bloku (24h formát)</label>
            <div className="time-field-pair">
              <div className="time-field">
                <span className="time-field-label">Začátek</span>
                <div className="time-stepper">
                  <button type="button" className="stepper-btn" aria-label="O 15 minut dříve" onClick={() => step('casZacatku', -1)}>−</button>
                  <select value={casZacatku} onChange={(e) => setCasZacatku(e.target.value)}>
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button type="button" className="stepper-btn" aria-label="O 15 minut později" onClick={() => step('casZacatku', 1)}>+</button>
                </div>
              </div>
              <div className="time-field">
                <span className="time-field-label">Konec</span>
                <div className="time-stepper">
                  <button type="button" className="stepper-btn" aria-label="O 15 minut dříve" onClick={() => step('casKonce', -1)}>−</button>
                  <select value={casKonce} onChange={(e) => setCasKonce(e.target.value)}>
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button type="button" className="stepper-btn" aria-label="O 15 minut později" onClick={() => step('casKonce', 1)}>+</button>
                </div>
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Zrušit</button>
            <button type="submit" className="btn">{isEdit ? 'Uložit změny' : 'Vytvořit blok'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

Notes on this rewrite vs. the original:
- `COLOR_PRESETS` had `#c46a6a` listed twice (a duplicate) in the original — fixed to 8 distinct colors by replacing the second occurrence with `#6fa8c9` (already used as a preset in `CategoryForm.jsx`, keeping the two palettes closer to unified).
- No auto-linking between start/end (unlike `AgendaForm`'s duration-preserving behavior) — block start/end are independent manual "intent" values, not a duration-derived pair.

- [ ] **Step 2: Verify in the browser**

Open the Program tab, click "+ Blok", confirm the modal shows name, color swatches, and two independent time steppers defaulting to 10:00–14:00. Create a block, confirm it round-trips (reopen its edit modal via the chip and see the same times). Edit an existing block's times and confirm the update persists after a page reload.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/agenda/BlockForm.jsx
git commit -m "feat: add start/end time fields to block create/edit form"
```

---

### Task 5: Timeline visual tuning — color bar, tint, separator, auto-expand notice

**Files:**
- Create: `client/src/components/agenda/BlockHeader.jsx`
- Modify: `client/src/components/agenda/OverallTimeline.jsx`
- Modify: `client/src/components/agenda/AgendaTimeline.css`
- Modify: `client/src/styles/variables.css` (if Task 1 of the UI-polish plan hasn't already run — see note below)

**Note on ordering with the companion plan:** the UI-polish plan's Task 1 adds `--color-warning`/`--color-warning-bg`/`--color-warning-border` to `variables.css`. If that plan has already run, skip Step 1 below (the variables already exist). If this plan runs first/independently, do Step 1.

- [ ] **Step 1: Ensure warning color tokens exist in `variables.css`**

Check `client/src/styles/variables.css` for `--color-warning`. If absent, add after `--color-danger: #b3493f;`:

```css
  --color-danger: #b3493f;
  --color-warning: #b3812f;
  --color-warning-bg: #fdf3d9;
  --color-warning-border: #e8d9a8;
```

- [ ] **Step 2: Create `BlockHeader.jsx`**

Create `client/src/components/agenda/BlockHeader.jsx`:

```jsx
import { useState } from 'react';
import { computeBlockRange } from './blockRange.js';

export default function BlockHeader({ block, items }) {
  const range = computeBlockRange(block, items);
  const dismissKey = range.expandedByNames.join(',');
  const [dismissedKey, setDismissedKey] = useState(null);
  const showNotice = range.isExpanded && dismissedKey !== dismissKey;

  return (
    <>
      <div className="block-header">
        <span className="bh-name">{block.nazev}</span>
        <span className={`bh-time${range.isExpanded ? ' bh-time-adjusted' : ''}`}>
          {range.isExpanded && <span aria-hidden="true">⚠️ </span>}
          {range.startLabel} – {range.endLabel}
        </span>
      </div>
      {showNotice && (
        <div className="block-time-notice">
          <span>
            Čas bloku byl automaticky upraven — aktivita „{range.expandedByNames[0]}" přesahuje původní rozsah.
          </span>
          <button type="button" aria-label="Skrýt upozornění" onClick={() => setDismissedKey(dismissKey)}>✕</button>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Wire `BlockHeader` into `OverallTimeline.jsx` and expose raw items per group**

In `client/src/components/agenda/OverallTimeline.jsx`, replace the `buildGroupedAgenda` return (lines 67-73):

```js
  return runs.map((run) => {
    const block = run.blockId ? blocks.find((b) => b.id === run.blockId) : null;
    const minStart = run.items[0].startMin;
    const maxEnd = Math.max(...run.items.map((i) => i.endMin));
    return { block, sections: buildClusters(run.items), minStart, maxEnd };
  });
```

with:

```js
  return runs.map((run) => {
    const block = run.blockId ? blocks.find((b) => b.id === run.blockId) : null;
    const minStart = run.items[0].startMin;
    const maxEnd = Math.max(...run.items.map((i) => i.endMin));
    return { block, items: run.items, sections: buildClusters(run.items), minStart, maxEnd };
  });
```

Add the import at the top (after line 2):

```js
import { toMinutes, minutesToLabel, fmtDuration } from './timeUtils.js';
import { deriveColors } from './colors.js';
import BlockHeader from './BlockHeader.jsx';
```

Replace the group render block (lines 82-116):

```jsx
      {groups.map((group, gIdx) => {
        const gap = lastEnd >= 0 ? group.minStart - lastEnd : 0;
        lastEnd = group.maxEnd;
        return (
          <div key={gIdx} className="block-group">
            {gap >= 30 && <GapRow minutes={gap} />}
            {group.block && (
              <div
                className="block-header"
                style={{ borderLeftColor: group.block.barva, background: group.block.barva + '10' }}
              >
                <span className="bh-name" style={{ color: group.block.barva }}>{group.block.nazev}</span>
                <span className="bh-time">{minutesToLabel(group.minStart)} – {minutesToLabel(group.maxEnd)}</span>
              </div>
            )}
            {group.sections.map((section, sIdx) => {
              const intraGap = sIdx > 0 ? section.startMin - group.sections[sIdx - 1].endMin : 0;
              return (
                <div key={sIdx}>
                  {intraGap >= 15 && <GapRow minutes={intraGap} compact />}
                  <AgendaSection
                    section={section}
                    categories={categories}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onUnschedule={onUnschedule}
                    inBlock={!!group.block}
                    isLast={sIdx === group.sections.length - 1 && gIdx === groups.length - 1}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
```

with:

```jsx
      {groups.map((group, gIdx) => {
        const gap = lastEnd >= 0 ? group.minStart - lastEnd : 0;
        lastEnd = group.maxEnd;
        const blockTint = group.block ? deriveColors(group.block.barva) : null;
        return (
          <div
            key={gIdx}
            className="block-group"
            style={blockTint ? { borderLeftColor: blockTint.border, background: blockTint.bg } : undefined}
          >
            {gap >= 30 && <GapRow minutes={gap} />}
            {group.block && <BlockHeader block={group.block} items={group.items} />}
            {group.sections.map((section, sIdx) => {
              const intraGap = sIdx > 0 ? section.startMin - group.sections[sIdx - 1].endMin : 0;
              return (
                <div key={sIdx}>
                  {intraGap >= 15 && <GapRow minutes={intraGap} compact />}
                  <AgendaSection
                    section={section}
                    categories={categories}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onUnschedule={onUnschedule}
                    inBlock={!!group.block}
                    isLast={sIdx === group.sections.length - 1 && gIdx === groups.length - 1}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
```

The `minutesToLabel` import stays in use elsewhere in the file (`GapRow`, `AgendaSection`), so the import line itself is unchanged — only the new `deriveColors`/`BlockHeader` imports are added.

- [ ] **Step 4: Restyle `.block-group`/`.block-header` in `AgendaTimeline.css`**

Replace:

```css
/* ─── Block group + block header ─── */
.block-group { display: contents; }
.block-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 18px 9px 14px; border-left: 4px solid; border-bottom: 1px solid var(--color-border);
}
.bh-name {
  font-family: var(--font-heading); font-size: 15px; font-weight: 700; letter-spacing: 0.2px;
}
.bh-time { font-size: 12px; color: var(--color-text-light); font-weight: 600; }

/* Slight indent for sections belonging to a block */
.agenda-section.in-block .as-time-col { background: #f7f4f0; }
```

with:

```css
/* ─── Block group + block header ─── */
.block-group {
  border-left: 4px solid transparent;
  transition: background 0.15s ease;
}
.block-group + .block-group {
  margin-top: 8px;
  border-top: 1px solid var(--color-border);
}
.block-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 18px 9px 14px; border-bottom: 1px solid var(--color-border);
}
.bh-name {
  font-family: var(--font-heading); font-size: 15px; font-weight: 700; letter-spacing: 0.2px;
}
.bh-time { font-size: 12px; color: var(--color-text-light); font-weight: 600; }
.bh-time-adjusted { color: var(--color-warning); font-weight: 700; }

/* ─── Auto-expand notice banner ─── */
.block-time-notice {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  background: var(--color-warning-bg); border-bottom: 1px solid var(--color-warning-border);
  color: var(--color-warning); padding: 6px 14px; font-size: 12px;
}
.block-time-notice button {
  border: none; background: transparent; color: inherit; cursor: pointer;
  font-size: 13px; line-height: 1; padding: 2px 4px; flex-shrink: 0;
}
.block-time-notice button:hover { opacity: 0.7; }
```

(The `.agenda-section.in-block .as-time-col` tint is removed — the whole `.block-group` now carries the tint via inline style, so the old per-row tint would double up on top of it.)

If the UI-polish plan's Task 2 has already run, the font-size/weight lines above (`.bh-name`, `.bh-time`) will already be token-based (`var(--text-body-size)` etc.) — apply this step's structural changes (border/background/margin/notice banner) on top of that version rather than reverting to raw px values.

- [ ] **Step 5: Verify in the browser**

Create a block with times 10:00–14:00, assign two activities to it: one from 09:30–09:45 (before) and one from 14:15–14:30 (after). Confirm:
- The block's left edge shows a solid 4px bar in the block's color running down through the header *and* all its activity rows (not just the header).
- The background across the whole block section (header + activities) has a light tint of the block color.
- The header's time reads "09:30 – 14:30" (expanded) with a ⚠️ next to it in the warning color.
- A dismissable yellow notice banner appears below the header naming both overflowing activities' presence (banner text names one at a time per the current implementation — confirm it reads sensibly), and clicking ✕ hides it.
- Reload the page — banner reappears (session-only dismissal, expected).
- Add a second block right after the first with its own activities; confirm an 8px gap + hairline separator appears between the two blocks, distinct from the thinner gap between two ungrouped activities.
- An activity with no block still renders with no colored left edge and no tint (transparent border, default background).

- [ ] **Step 6: Commit**

```bash
git add client/src/components/agenda/BlockHeader.jsx client/src/components/agenda/OverallTimeline.jsx client/src/components/agenda/AgendaTimeline.css client/src/styles/variables.css
git commit -m "feat: visually distinguish block sections on the timeline with auto-expand notice"
```

---

### Task 6: Block management UI — edit/delete icons consistent with activity rows

**Files:**
- Modify: `client/src/components/agenda/AgendaPage.jsx`
- Modify: `client/src/components/agenda/AgendaTimeline.css`

Today, block chips in `.mgmt-row` use a dotted-underline "click name to rename" affordance plus a generic `✕` remove button. Activity rows (`ActivityRow` in `OverallTimeline.jsx`) instead use a directly clickable row (no dotted underline needed — the whole row is the edit target) plus an explicit `🗑` trash icon that only appears on hover. This task brings block chips to the same explicit-icon pattern: a visible `✏️` edit icon and `🗑` trash icon, both always visible on the compact chip (chips are small and rarely hovered long enough for a hover-reveal to be discoverable, unlike full-width activity rows).

- [ ] **Step 1: Update the block chip markup**

In `client/src/components/agenda/AgendaPage.jsx`, replace lines 184-207:

```jsx
          {blocks.map((block) => (
            <span
              key={block.id}
              className="block-chip"
              style={{ borderColor: block.barva, background: block.barva + '18', color: block.barva }}
            >
              <button
                type="button"
                className="chip-label-btn"
                onClick={() => openEditBlock(block)}
                title="Přejmenovat blok"
              >
                {block.nazev}
              </button>
              <button
                type="button"
                className="chip-remove"
                aria-label={`Smazat blok ${block.nazev}`}
                onClick={() => handleDeleteBlock(block.id)}
              >
                ✕
              </button>
            </span>
          ))}
```

with:

```jsx
          {blocks.map((block) => (
            <span
              key={block.id}
              className="block-chip"
              style={{ borderColor: block.barva, background: block.barva + '18', color: block.barva }}
            >
              <span className="chip-name">{block.nazev}</span>
              <button
                type="button"
                className="chip-icon-btn"
                aria-label={`Upravit blok ${block.nazev}`}
                title="Upravit blok"
                onClick={() => openEditBlock(block)}
              >
                ✏️
              </button>
              <button
                type="button"
                className="chip-icon-btn chip-icon-btn-danger"
                aria-label={`Smazat blok ${block.nazev}`}
                title="Smazat blok"
                onClick={() => handleDeleteBlock(block.id)}
              >
                🗑
              </button>
            </span>
          ))}
```

- [ ] **Step 2: Restyle the chip in CSS**

In `client/src/components/agenda/AgendaTimeline.css`, replace:

```css
.block-chip .chip-remove, .chip-remove {
  border: none; background: rgba(0,0,0,0.08); color: inherit; width: 16px; height: 16px;
  border-radius: 50%; font-size: 10px; line-height: 1; cursor: pointer; margin-left: 2px;
  display: inline-flex; align-items: center; justify-content: center;
}
```

with:

```css
.chip-name { padding-right: 2px; }
.chip-icon-btn {
  border: none; background: rgba(0,0,0,0.08); color: inherit; width: 20px; height: 20px;
  border-radius: 50%; font-size: 10px; line-height: 1; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background 0.12s ease;
}
.chip-icon-btn:hover { background: rgba(0,0,0,0.16); }
.chip-icon-btn-danger:hover { background: var(--color-danger); }
```

And remove the now-unused `.chip-label-btn` rule block (added in Task 1 of the UI-polish plan or still in its original form if that plan hasn't run yet):

```css
/* ─── Block chip edit button ─── */
.chip-label-btn {
  border: none; background: transparent; color: inherit; font: inherit;
  font-weight: 700; font-size: 12px; cursor: pointer; padding: 0;
  text-decoration: underline dotted;
}
.chip-label-btn:hover { opacity: 0.75; }
```

(delete this whole block — no replacement, `.chip-name` above covers its layout role)

- [ ] **Step 3: Verify in the browser**

Open the Program tab with at least one block created. Confirm each block chip shows its name plus two small icon buttons (pencil, trash) always visible — not requiring hover to discover. Click the pencil: the same `BlockForm` modal used for creation opens pre-filled (name, color, times). Click the trash: the same `window.confirm` dialog used elsewhere fires, with the orphan-activity-count message if the block has activities assigned; confirm deleting it leaves those activities in the program with "no block" (no colored edge, no tint) rather than deleting them.

- [ ] **Step 4: Regression-check the block assignment dropdown (spec §8, already implemented)**

Open "+ Přidat aktivitu", confirm the "Blok programu (volitelné)" dropdown lists all current blocks by name and "— bez bloku —", and that saving an activity with a block selected correctly shows it grouped under that block's colored section on the timeline (per Task 5's visual treatment). No code change expected here — this step exists purely to confirm Tasks 1–5 didn't regress the pre-existing feature.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/agenda/AgendaPage.jsx client/src/components/agenda/AgendaTimeline.css
git commit -m "feat: replace block chip rename/remove affordance with edit/delete icon buttons"
```

---

### Task 7: Full end-to-end manual verification pass

**Files:** none (verification only)

- [ ] **Step 1: Desktop walkthrough**

Start the dev server (`npm run dev` from repo root). On a desktop-width browser window:
1. Create a block "Obřad a ceremonie" with color gold, 11:00–12:00.
2. Add an activity "Příchod hostů" 10:45–11:00 assigned to that block — confirm the block header expands to show "10:45 – 12:00" with the ⚠️ indicator and dismissable notice.
3. Add a second activity "Přípitek" 12:00–12:30 to the same block — confirm it expands further to "10:45 – 12:30" and the notice now references the currently-overflowing activity/activities.
4. Delete the block via the trash icon — confirm the `window.confirm` message mentions 2 activities remaining without a block, confirm after deletion both activities still appear on the timeline with no colored left edge.
5. Recreate a block, reassign both activities to it via editing each activity's "Blok programu" dropdown.

- [ ] **Step 2: Mobile walkthrough**

Resize to a 375px-wide viewport (or use browser device emulation):
1. Confirm the block header still renders as a colored bar above its activities (not squeezed or overlapping).
2. Confirm the FAB (from the companion UI-polish plan, if merged) doesn't cover the block delete/edit icons or the notice banner's dismiss button.
3. Confirm the notice banner text wraps legibly at narrow width instead of overflowing.

- [ ] **Step 3: Run the unit tests one more time as a final regression check**

Run: `node --test client/src/components/agenda/blockRange.test.js`
Expected: PASS — all 6 tests green.

- [ ] **Step 4: No commit for this task** — it's verification only. If any step above surfaces a bug, fix it as a small follow-up commit referencing which task's code it belongs to.

---

## Self-review notes (for the plan author, not a task)

- Spec §5 (data model + auto-expand logic + inline info message): Tasks 1–3, 5.
- Spec §6 (block CRUD consistent with activity CRUD): Tasks 4, 6 (create/edit modal already matched the activity pattern; the gap was the chip list's edit/delete affordance, now closed).
- Spec §7 (visual tuning: left bar, tint, separator, header time, warning indicator): Task 5.
- Spec §8 (assign activity to block via dropdown): already implemented pre-existing; verified in Task 6 Step 4 and Task 7.
- Spec §9 (mobile responsive check, ladí so štýlom appky): Task 7 Step 2; block header already renders as a stacked colored header above its activities on mobile by construction (flex column layout, no separate mobile-only markup needed) — verified, not rebuilt.
