import '../load-env.js';
import { sql } from './client.js';

await sql.query(`
  ALTER TABLE guests
    ADD COLUMN IF NOT EXISTS ma_dite BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS vek_deti TEXT,
    ADD COLUMN IF NOT EXISTS potrebuje_ubytovanie BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS typ_izby TEXT,
    ADD COLUMN IF NOT EXISTS pocet_osob INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS rezervacia_id UUID REFERENCES accommodations(id) ON DELETE SET NULL
`);

console.log('Migration v2 OK');
process.exit(0);
