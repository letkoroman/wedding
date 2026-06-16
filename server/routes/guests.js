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
    ubytovaniDo: row.ubytovani_do,
    maDite: row.ma_dite,
    vekDeti: row.vek_deti,
    potrebujeUbytovanie: row.potrebuje_ubytovanie,
    typIzby: row.typ_izby,
    pocetOsob: row.pocet_osob,
    rezervaciaId: row.rezervacia_id
  };
}

router.get('/', async (req, res) => {
  const rows = await sql`SELECT * FROM guests`;
  res.json(rows.map(toGuest));
});

router.post('/', async (req, res) => {
  const jmeno = req.body.jmeno || '';
  const typ = req.body.typ || 'jednotlivec';
  const pocetDeti = req.body.maDite ? Number(req.body.pocetDeti) || 0 : 0;
  const potvrzeni = req.body.potvrzeni || 'ceka';
  const mustHave = Boolean(req.body.mustHave);
  const poznamka = req.body.poznamka || '';
  const maDite = Boolean(req.body.maDite);
  const vekDeti = maDite ? (req.body.vekDeti || null) : null;
  const potrebujeUbytovanie = Boolean(req.body.potrebujeUbytovanie);
  const pocetIzieb = potrebujeUbytovanie ? Number(req.body.pocetIzieb) || 0 : 0;
  const ubytovaniOd = potrebujeUbytovanie ? (req.body.ubytovaniOd || null) : null;
  const ubytovaniDo = potrebujeUbytovanie ? (req.body.ubytovaniDo || null) : null;
  const typIzby = potrebujeUbytovanie ? (req.body.typIzby || null) : null;
  const pocetOsob = potrebujeUbytovanie ? Number(req.body.pocetOsob) || 1 : 1;
  const rezervaciaId = req.body.rezervaciaId || null;

  const [row] = await sql`
    INSERT INTO guests (jmeno, typ, pocet_deti, potvrzeni, must_have, poznamka,
      pocet_izieb, ubytovani_od, ubytovani_do,
      ma_dite, vek_deti, potrebuje_ubytovanie, typ_izby, pocet_osob, rezervacia_id)
    VALUES (${jmeno}, ${typ}, ${pocetDeti}, ${potvrzeni}, ${mustHave}, ${poznamka},
      ${pocetIzieb}, ${ubytovaniOd}, ${ubytovaniDo},
      ${maDite}, ${vekDeti}, ${potrebujeUbytovanie}, ${typIzby}, ${pocetOsob}, ${rezervaciaId})
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
  const potvrzeni = req.body.potvrzeni ?? existing.potvrzeni;
  const mustHave = req.body.mustHave ?? existing.must_have;
  const poznamka = req.body.poznamka ?? existing.poznamka;
  const maDite = req.body.maDite !== undefined ? Boolean(req.body.maDite) : existing.ma_dite;
  const pocetDeti = maDite ? (req.body.pocetDeti !== undefined ? Number(req.body.pocetDeti) || 0 : existing.pocet_deti) : 0;
  const vekDeti = maDite ? (req.body.vekDeti !== undefined ? req.body.vekDeti : existing.vek_deti) : null;
  const potrebujeUbytovanie = req.body.potrebujeUbytovanie !== undefined ? Boolean(req.body.potrebujeUbytovanie) : existing.potrebuje_ubytovanie;
  const pocetIzieb = potrebujeUbytovanie ? (req.body.pocetIzieb !== undefined ? Number(req.body.pocetIzieb) || 0 : existing.pocet_izieb) : 0;
  const ubytovaniOd = potrebujeUbytovanie ? (req.body.ubytovaniOd !== undefined ? req.body.ubytovaniOd : existing.ubytovani_od) : null;
  const ubytovaniDo = potrebujeUbytovanie ? (req.body.ubytovaniDo !== undefined ? req.body.ubytovaniDo : existing.ubytovani_do) : null;
  const typIzby = potrebujeUbytovanie ? (req.body.typIzby !== undefined ? req.body.typIzby : existing.typ_izby) : null;
  const pocetOsob = potrebujeUbytovanie ? (req.body.pocetOsob !== undefined ? Number(req.body.pocetOsob) || 1 : existing.pocet_osob) : 1;
  const rezervaciaId = req.body.rezervaciaId !== undefined ? (req.body.rezervaciaId || null) : existing.rezervacia_id;

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
      ubytovani_do = ${ubytovaniDo},
      ma_dite = ${maDite},
      vek_deti = ${vekDeti},
      potrebuje_ubytovanie = ${potrebujeUbytovanie},
      typ_izby = ${typIzby},
      pocet_osob = ${pocetOsob},
      rezervacia_id = ${rezervaciaId}
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
