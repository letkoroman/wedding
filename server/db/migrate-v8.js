import '../load-env.js';
import { sql } from './client.js';

// Allow agenda_items.kategorie to be NULL so deleting a category
// can unassign its activities instead of blocking deletion.
await sql.query(`ALTER TABLE agenda_items ALTER COLUMN kategorie DROP NOT NULL`);

console.log('Migration v8 OK');
process.exit(0);
