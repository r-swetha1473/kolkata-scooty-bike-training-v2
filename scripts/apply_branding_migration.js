const path = require('path');
const fs = require('fs');
const br = path.join(__dirname, '../backend');
require(path.join(br, 'node_modules/dotenv')).config({ path: path.join(br, '.env') });
const { Pool } = require(path.join(br, 'node_modules/pg'));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? +process.env.DB_PORT : undefined,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});
(async () => {
  const sql = fs.readFileSync(
    path.join(__dirname, '../supabase/migrations/20260727230000_production_branding_media.sql'),
    'utf8'
  );
  await pool.query(sql);
  const r = await pool.query(
    `select key, value from settings where key like 'social_%' or key in ('site_name','site_logo') order by key`
  );
  console.log(JSON.stringify(r.rows, null, 2));
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
