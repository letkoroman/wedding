import { Router } from 'express';
import { sql } from '../db/client.js';

const router = Router();

function toGuest(row) {
  return {
    id: row.id,
    jmeno: row.jmeno,
    typ: row.typ,
    pocetDeti: row.pocet_deti,
    potvrzeni: row.potvrzeni,
    mustHave: row.must_have,
    poznamka: row.poznamka,
    pocetIzieb: row.pocet_izieb,
    ubytovaniOd: row.ubytovani_od,
    ubytovaniDo: row.ubytovani_do
  };
}

router.get('/', async (req, res) => {
  const rows = await sql`SELECT * FROM guests`;
  res.json(rows.map(toGuest));
});

router.post('/', async (req, res) => {
  const jmeno = req.body.jmeno || '';
  const typ = req.body.typ || 'jednotlivec';
  const pocetDeti = typ === 'rodina' ? Number(req.body.pocetDeti) || 0 : 0;
  const potvrzeni = req.body.potvrzeni || 'ceka';
  const mustHave = Boolean(req.body.mustHave);
  const poznamka = req.body.poznamka || '';
  const pocetIzieb = Number(req.body.pocetIzieb) || 0;
  const ubytovaniOd = pocetIzieb > 0 ? (req.body.ubytovaniOd || null) : null;
  const ubytovaniDo = pocetIzieb > 0 ? (req.body.ubytovaniDo || null) : null;

  const [row] = await sql`
    INSERT INTO guests (jmeno, typ, pocet_deti, potvrzeni, must_have, poznamka, pocet_izieb, ubytovani_od, ubytovani_do)
    VALUES (${jmeno}, ${typ}, ${pocetDeti}, ${potvrzeni}, ${mustHave}, ${poznamka}, ${pocetIzieb}, ${ubytovaniOd}, ${ubytovaniDo})
    RETURNING *
  `;
  res.status(201).json(toGuest(row));
});

router.put('/:id', async (req, res) => {
  const [existing] = await sql`SELECT * FROM guests WHERE id = ${req.params.id}`;
  if (!existing) {
    return res.status(404).json({ error: 'Host nenalezen' });
  }
  const typ = req.body.typ ?? existing.typ;
  const jmeno = req.body.jmeno ?? existing.jmeno;
  const pocetDeti = typ === 'rodina' ? Number(req.body.pocetDeti ?? existing.pocet_deti) || 0 : 0;
  const potvrzeni = req.body.potvrzeni ?? existing.potvrzeni;
  const mustHave = req.body.mustHave ?? existing.must_have;
  const poznamka = req.body.poznamka ?? existing.poznamka;
  const pocetIzieb = req.body.pocetIzieb !== undefined ? Number(req.body.pocetIzieb) || 0 : existing.pocet_izieb;
  const ubytovaniOd = pocetIzieb > 0 ? (req.body.ubytovaniOd ?? existing.ubytovani_od) : null;
  const ubytovaniDo = pocetIzieb > 0 ? (req.body.ubytovaniDo ?? existing.ubytovani_do) : null;

  const [row] = await sql`
    UPDATE guests SET
      jmeno = ${jmeno},
      typ = ${typ},
      pocet_deti = ${pocetDeti},
      potvrzeni = ${potvrzeni},
      must_have = ${mustHave},
      poznamka = ${poznamka},
      pocet_izieb = ${pocetIzieb},
      ubytovani_od = ${ubytovaniOd},
      ubytovani_do = ${ubytovaniDo}
    WHERE id = ${req.params.id}
    RETURNING *
  `;
  res.json(toGuest(row));
});

router.delete('/:id', async (req, res) => {
  const [row] = await sql`DELETE FROM guests WHERE id = ${req.params.id} RETURNING id`;
  if (!row) {
    return res.status(404).json({ error: 'Host nenalezen' });
  }
  res.status(204).end();
});

export default router;
