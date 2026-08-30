/**
 * Apply database/ensure_booking_idempotency.sql
 * Usage: cd backend && node scripts/apply_booking_idempotency.js
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../db');

async function main() {
  const sqlPath = path.join(__dirname, '..', '..', 'database', 'ensure_booking_idempotency.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await db.query(sql);
  const check = await db.query(`SELECT to_regclass('public.booking_idempotency_keys') AS table_name`);
  console.log('Migration applied. table:', check.rows[0].table_name);
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
