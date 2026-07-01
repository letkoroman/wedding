import '../load-env.js';
import { sql } from './client.js';

// Shift Jídlo accent from orange (#e09040) to terracotta (#c46a6a)
// — clearly distinct from Ceremonie amber (#D4AF37)
await sql.query(`UPDATE categories SET accent = '#c46a6a' WHERE key = 'jidlo'`);

console.log('Migration v7 OK');
process.exit(0);
