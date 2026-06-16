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
