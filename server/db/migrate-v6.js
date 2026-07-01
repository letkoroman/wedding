import '../load-env.js';
import { sql } from './client.js';

await sql.query(`
  CREATE TABLE IF NOT EXISTS blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nazev TEXT NOT NULL,
    barva TEXT NOT NULL DEFAULT '#8B7355',
    poradi INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

await sql.query(`
  ALTER TABLE agenda_items
  ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES blocks(id) ON DELETE SET NULL
`);

console.log('Migration v6 OK');
process.exit(0);
