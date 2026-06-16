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
