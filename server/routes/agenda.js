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
    poznamka: row.poznamka,
    blockId: row.block_id || null
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
  const blockId = req.body.blockId || null;

  const [row] = await sql`
    INSERT INTO agenda_items (nazev, cas_zacatku, trvani, kategorie, cas_konce, misto, priorita, poznamka, block_id)
    VALUES (${nazev}, ${casZacatku}, ${trvani}, ${kategorie}, ${casKonce}, ${misto}, ${priorita}, ${poznamka}, ${blockId})
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
  const blockId = req.body.blockId !== undefined ? (req.body.blockId || null) : existing.block_id;

  const [row] = await sql`
    UPDATE agenda_items SET
      nazev = ${nazev},
      cas_zacatku = ${casZacatku},
      trvani = ${trvani},
      kategorie = ${kategorie},
      cas_konce = ${casKonce},
      misto = ${misto},
      priorita = ${priorita},
      poznamka = ${poznamka},
      block_id = ${blockId}
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
