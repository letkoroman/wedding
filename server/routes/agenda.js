import { Router } from 'express';
import { sql } from '../db/client.js';

const router = Router();

function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function addMins(timeStr, minutes) {
  const total = toMinutes(timeStr) + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${Math.floor(wrapped / 60).toString().padStart(2, '0')}:${(wrapped % 60).toString().padStart(2, '0')}`;
}

function computeTrvani(casZacatku, casKonce) {
  if (!casZacatku || !casKonce) return 0;
  let diff = toMinutes(casKonce) - toMinutes(casZacatku);
  if (diff < 0) diff += 1440;
  return diff;
}

function toAgendaItem(row) {
  const casKonce = row.cas_konce || addMins(row.cas_zacatku, row.trvani || 0);
  return {
    id: row.id,
    nazev: row.nazev,
    casZacatku: row.cas_zacatku,
    casKonce,
    trvani: row.trvani,
    kategorie: row.kategorie || 'ceremonie',
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
  const casKonce = req.body.casKonce || null;
  const trvani = casKonce ? computeTrvani(casZacatku, casKonce) : (Number(req.body.trvani) || 0);
  const kategorie = req.body.kategorie || 'ceremonie';
  const ikona = req.body.ikona || '💍';
  const poznamka = req.body.poznamka || '';

  const [row] = await sql`
    INSERT INTO agenda_items (nazev, cas_zacatku, trvani, kategorie, cas_konce, ikona, poznamka)
    VALUES (${nazev}, ${casZacatku}, ${trvani}, ${kategorie}, ${casKonce}, ${ikona}, ${poznamka})
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
  const casKonce = req.body.casKonce !== undefined ? req.body.casKonce : existing.cas_konce;
  const trvani = casKonce ? computeTrvani(casZacatku, casKonce) : (req.body.trvani !== undefined ? Number(req.body.trvani) || 0 : existing.trvani);
  const kategorie = req.body.kategorie ?? (existing.kategorie || 'ceremonie');
  const ikona = req.body.ikona ?? existing.ikona;
  const poznamka = req.body.poznamka ?? existing.poznamka;

  const [row] = await sql`
    UPDATE agenda_items SET
      nazev = ${nazev},
      cas_zacatku = ${casZacatku},
      trvani = ${trvani},
      kategorie = ${kategorie},
      cas_konce = ${casKonce},
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
