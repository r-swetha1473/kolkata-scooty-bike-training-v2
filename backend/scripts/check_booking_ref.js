require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? +process.env.DB_PORT : undefined,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});
(async () => {
  const f = await p.query(
    `SELECT n.nspname, p.proname
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname ILIKE '%booking_reference%'`
  );
  console.log('funcs', f.rows);
  const s = await p.query(
    `SELECT relname FROM pg_class WHERE relkind = 'S' AND relname ILIKE '%booking_reference%'`
  );
  console.log('seqs', s.rows);
  try {
    const r = await p.query('SELECT generate_booking_reference() AS ref');
    console.log('ref ok', r.rows[0]);
  } catch (e) {
    console.log('call err', e.code, e.message);
  }
  const col = await p.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='bookings' AND column_name='booking_reference'`
  );
  console.log('col', col.rows);
  await p.end();
})().catch(async (e) => {
  console.error(e);
  await p.end();
  process.exit(1);
});
