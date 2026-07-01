import '../load-env.js';
import { sql } from './client.js';

await sql.query(`
  ALTER TABLE guests
    ADD COLUMN IF NOT EXISTS pocet_dospelych INTEGER NOT NULL DEFAULT 1
`);

console.log('Migration v3 OK');
process.exit(0);
