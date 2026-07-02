import '../load-env.js';
import { sql } from './client.js';

await sql.query(`
  ALTER TABLE blocks
  ADD COLUMN IF NOT EXISTS cas_zacatku TEXT,
  ADD COLUMN IF NOT EXISTS cas_konce TEXT
`);

console.log('Migration v9 OK');
process.exit(0);
