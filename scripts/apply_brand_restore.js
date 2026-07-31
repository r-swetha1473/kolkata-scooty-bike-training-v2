const path = require('path');
const fs = require('fs');
const backendRoot = path.join(__dirname, '../backend');
require(path.join(backendRoot, 'node_modules/dotenv')).config({ path: path.join(backendRoot, '.env') });
const { Pool } = require(path.join(backendRoot, 'node_modules/pg'));

const sqlPath = path.join(__dirname, '../supabase/migrations/20260727220000_restore_kolkata_scooty_brand.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

(async () => {
  try {
    await pool.query(sql);
    const r = await pool.query(
      `SELECT key, value FROM settings WHERE key IN ('site_name','about_text','footer_copyright') ORDER BY key`
    );
    console.log(JSON.stringify(r.rows, null, 2));
    const b = await pool.query(`SELECT name, slug FROM branches ORDER BY name LIMIT 10`);
    console.log('branches', JSON.stringify(b.rows));
  } catch (e) {
    console.error('ERR', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
