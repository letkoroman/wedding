import pg from 'pg';

const { Pool, types } = pg;

types.setTypeParser(types.builtins.DATE, (value) => value);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function sql(strings, ...values) {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) {
    text += `$${i + 1}` + strings[i + 1];
  }
  const { rows } = await pool.query(text, values);
  return rows;
}

sql.query = async (text, params) => {
  const { rows } = await pool.query(text, params);
  return rows;
};
