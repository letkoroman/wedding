import { Router } from 'express';
import { sql } from '../db/client.js';

const router = Router();

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

router.get('/', async (req, res) => {
  const rows = await sql`SELECT * FROM blocks ORDER BY poradi ASC, created_at ASC`;
  res.json(rows.map(toBlock));
});

router.post('/', async (req, res) => {
  const { nazev, barva = '#8B7355', casZacatku = null, casKonce = null } = req.body;
  const [row] = await sql`
    INSERT INTO blocks (nazev, barva, cas_zacatku, cas_konce)
    VALUES (${nazev}, ${barva}, ${casZacatku}, ${casKonce})
    RETURNING *
  `;
  res.status(201).json(toBlock(row));
});

router.put('/:id', async (req, res) => {
  const { nazev, barva, casZacatku = null, casKonce = null } = req.body;
  const [row] = await sql`
    UPDATE blocks SET nazev=${nazev}, barva=${barva}, cas_zacatku=${casZacatku}, cas_konce=${casKonce}
    WHERE id=${req.params.id} RETURNING *
  `;
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(toBlock(row));
});

router.delete('/:id', async (req, res) => {
  await sql`UPDATE agenda_items SET block_id=NULL WHERE block_id=${req.params.id}`;
  await sql`DELETE FROM blocks WHERE id=${req.params.id}`;
  res.status(204).end();
});

export default router;
