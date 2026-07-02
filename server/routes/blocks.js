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
  const [existing] = await sql`SELECT * FROM blocks WHERE id = ${req.params.id}`;
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const nazev = req.body.nazev ?? existing.nazev;
  const barva = req.body.barva ?? existing.barva;
  const casZacatku = req.body.casZacatku !== undefined ? req.body.casZacatku : existing.cas_zacatku;
  const casKonce = req.body.casKonce !== undefined ? req.body.casKonce : existing.cas_konce;

  const [row] = await sql`
    UPDATE blocks SET nazev=${nazev}, barva=${barva}, cas_zacatku=${casZacatku}, cas_konce=${casKonce}
    WHERE id=${req.params.id} RETURNING *
  `;
  res.json(toBlock(row));
});

router.delete('/:id', async (req, res) => {
  await sql`UPDATE agenda_items SET block_id=NULL WHERE block_id=${req.params.id}`;
  await sql`DELETE FROM blocks WHERE id=${req.params.id}`;
  res.status(204).end();
});

export default router;
