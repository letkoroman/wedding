import '../load-env.js';
import { sql } from './client.js';

await sql.query(`
  ALTER TABLE agenda_items
    ADD COLUMN IF NOT EXISTS kategorie TEXT NOT NULL DEFAULT 'ceremonie',
    ADD COLUMN IF NOT EXISTS cas_konce TEXT
`);

await sql.query(`
  UPDATE agenda_items
  SET cas_konce = to_char(
    (CAST(cas_zacatku AS TIME) + (trvani || ' minutes')::INTERVAL)::TIME,
    'HH24:MI'
  )
  WHERE cas_konce IS NULL AND trvani IS NOT NULL AND trvani > 0
`);

console.log('Migration v4 OK');
process.exit(0);
