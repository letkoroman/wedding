import 'dotenv/config';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sql } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GUESTS = [
  { jmeno: 'Petr Novák', typ: 'jednotlivec', pocetDeti: 0, potvrzeni: 'potvrzeno', mustHave: true, poznamka: 'Svědek ženicha' },
  { jmeno: 'Jana a Karel Dvořákovi', typ: 'par', pocetDeti: 0, potvrzeni: 'potvrzeno', mustHave: false, poznamka: 'Potvrzeno telefonicky' },
  { jmeno: 'Rodina Horáková', typ: 'rodina', pocetDeti: 2, potvrzeni: 'potvrzeno', mustHave: false, poznamka: 'Přijedou autem' }
];

const AGENDA = [
  { nazev: 'Obřad', casZacatku: '14:00', trvani: 30, ikona: '⛪', poznamka: 'Na zámecké zahradě' },
  { nazev: 'Svatební hostina', casZacatku: '17:30', trvani: 120, ikona: '🍽️', poznamka: '' },
  { nazev: 'Přípitek', casZacatku: '16:45', trvani: 15, ikona: '🥂', poznamka: 'Před hostinou' }
];

const TASKS = [
  { nazev: 'Objednat svatební dort', prirazeno: 'Míša', termin: '2026-07-15', stav: 'probiha', priorita: 'vysoka', poznamka: 'Cukrárna U Anežky - objednáno' },
  { nazev: 'Vyzkoušet svatební šaty', prirazeno: 'Míša', termin: '2026-07-01', stav: 'probiha', priorita: 'stredni', poznamka: '' },
  { nazev: 'Zarezervovat hotel pro hosty', prirazeno: 'Roman', termin: null, stav: 'splneno', priorita: 'nizka', poznamka: 'Hotel Continental' }
];

async function run() {
  const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  const statements = schema.split(';').map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) {
    await sql.query(statement, []);
  }
  console.log('Tabulky vytvořeny.');

  for (const g of GUESTS) {
    await sql`
      INSERT INTO guests (jmeno, typ, pocet_deti, potvrzeni, must_have, poznamka, pocet_izieb, ubytovani_od, ubytovani_do)
      VALUES (${g.jmeno}, ${g.typ}, ${g.pocetDeti}, ${g.potvrzeni}, ${g.mustHave}, ${g.poznamka}, 0, NULL, NULL)
    `;
  }
  console.log(`Vloženo ${GUESTS.length} hostů.`);

  for (const a of AGENDA) {
    await sql`
      INSERT INTO agenda_items (nazev, cas_zacatku, trvani, ikona, poznamka)
      VALUES (${a.nazev}, ${a.casZacatku}, ${a.trvani}, ${a.ikona}, ${a.poznamka})
    `;
  }
  console.log(`Vloženo ${AGENDA.length} položek programu.`);

  for (const t of TASKS) {
    await sql`
      INSERT INTO tasks (nazev, prirazeno, termin, stav, priorita, poznamka)
      VALUES (${t.nazev}, ${t.prirazeno}, ${t.termin}, ${t.stav}, ${t.priorita}, ${t.poznamka})
    `;
  }
  console.log(`Vloženo ${TASKS.length} úkolů.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
