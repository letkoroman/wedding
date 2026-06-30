import '../load-env.js';
import { sql } from './client.js';

await sql.query(`
  ALTER TABLE agenda_items
    ALTER COLUMN cas_zacatku DROP NOT NULL,
    ALTER COLUMN trvani DROP NOT NULL,
    ALTER COLUMN ikona DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS misto TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS priorita INTEGER NOT NULL DEFAULT 0
`);

await sql.query(`
  CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    icon TEXT NOT NULL,
    accent TEXT NOT NULL,
    fixed BOOLEAN NOT NULL DEFAULT false,
    poradi INTEGER NOT NULL DEFAULT 0
  )
`);

const DEFAULTS = [
  { key: 'ceremonie', label: 'Ceremonie', icon: '🎊', accent: '#D4AF37', poradi: 1 },
  { key: 'sport',     label: 'Sport',     icon: '⚽', accent: '#5a9a5a', poradi: 2 },
  { key: 'zabava',    label: 'Zábava',    icon: '🎉', accent: '#9b7de0', poradi: 3 },
  { key: 'jidlo',     label: 'Jídlo',     icon: '🍽️', accent: '#e09040', poradi: 4 }
];

for (const cat of DEFAULTS) {
  // eslint-disable-next-line no-await-in-loop
  await sql`
    INSERT INTO categories (key, label, icon, accent, fixed, poradi)
    VALUES (${cat.key}, ${cat.label}, ${cat.icon}, ${cat.accent}, true, ${cat.poradi})
    ON CONFLICT (key) DO NOTHING
  `;
}

console.log('Migration v5 OK');
process.exit(0);
