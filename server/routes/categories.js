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
  if (!existing) return res.status(404).json({ error: 'Kategorie nenalezena' });
  if (existing.fixed) return res.status(409).json({ error: 'Výchozí kategorii nelze smazat' });
  // Unassign activities (they stay in the schedule as uncategorised)
  await sql`UPDATE agenda_items SET kategorie = NULL WHERE kategorie = ${req.params.key}`;
  await sql`DELETE FROM categories WHERE key = ${req.params.key}`;
  res.status(204).end();
});

export default router;
