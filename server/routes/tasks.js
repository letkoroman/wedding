import { Router } from 'express';
import { sql } from '../db/client.js';

const router = Router();

function toTask(row) {
  return {
    id: row.id,
    nazev: row.nazev,
    prirazeno: row.prirazeno,
    termin: row.termin,
    stav: row.stav,
    priorita: row.priorita,
    poznamka: row.poznamka
  };
}

router.get('/', async (req, res) => {
  const rows = await sql`SELECT * FROM tasks`;
  res.json(rows.map(toTask));
});

router.post('/', async (req, res) => {
  const nazev = req.body.nazev || '';
  const prirazeno = req.body.prirazeno || '';
  const termin = req.body.termin || null;
  const stav = req.body.stav || 'nesplneno';
  const priorita = req.body.priorita || 'stredni';
  const poznamka = req.body.poznamka || '';

  const [row] = await sql`
    INSERT INTO tasks (nazev, prirazeno, termin, stav, priorita, poznamka)
    VALUES (${nazev}, ${prirazeno}, ${termin}, ${stav}, ${priorita}, ${poznamka})
    RETURNING *
  `;
  res.status(201).json(toTask(row));
});

router.put('/:id', async (req, res) => {
  const [existing] = await sql`SELECT * FROM tasks WHERE id = ${req.params.id}`;
  if (!existing) {
    return res.status(404).json({ error: 'Úkol nenalezen' });
  }
  const nazev = req.body.nazev ?? existing.nazev;
  const prirazeno = req.body.prirazeno ?? existing.prirazeno;
  const termin = req.body.termin !== undefined ? req.body.termin : existing.termin;
  const stav = req.body.stav ?? existing.stav;
  const priorita = req.body.priorita ?? existing.priorita;
  const poznamka = req.body.poznamka ?? existing.poznamka;

  const [row] = await sql`
    UPDATE tasks SET
      nazev = ${nazev},
      prirazeno = ${prirazeno},
      termin = ${termin},
      stav = ${stav},
      priorita = ${priorita},
      poznamka = ${poznamka}
    WHERE id = ${req.params.id}
    RETURNING *
  `;
  res.json(toTask(row));
});

router.delete('/:id', async (req, res) => {
  const [row] = await sql`DELETE FROM tasks WHERE id = ${req.params.id} RETURNING id`;
  if (!row) {
    return res.status(404).json({ error: 'Úkol nenalezen' });
  }
  res.status(204).end();
});

export default router;
