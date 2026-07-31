/**
 * Dump live PostgreSQL schema (+ essential settings seed) into database/schema.sql
 * Run: node scripts/export_baseline_schema.js
 */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const br = path.join(__dirname, '../backend');
require(path.join(br, 'node_modules/dotenv')).config({ path: path.join(br, '.env') });

const outDir = path.join(__dirname, '../database');
const outFile = path.join(outDir, 'schema.sql');
fs.mkdirSync(outDir, { recursive: true });

const env = { ...process.env };
const args = [
  '--schema-only',
  '--no-owner',
  '--no-privileges',
  '--clean',
  '--if-exists',
];

if (process.env.DATABASE_URL) {
  args.push('--dbname', process.env.DATABASE_URL);
} else {
  args.push(
    '-h', process.env.DB_HOST || '127.0.0.1',
    '-p', process.env.DB_PORT || '5432',
    '-U', process.env.DB_USER || 'postgres',
    '-d', process.env.DB_NAME || 'kolkata_bike_training'
  );
  if (process.env.DB_PASSWORD) env.PGPASSWORD = process.env.DB_PASSWORD;
}

const candidates = [
  process.env.PG_DUMP,
  'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
  'pg_dump',
].filter(Boolean);

let dumpBin = null;
for (const c of candidates) {
  if (c === 'pg_dump' || fs.existsSync(c)) {
    dumpBin = c;
    break;
  }
}
if (!dumpBin) {
  console.error('pg_dump not found');
  process.exit(1);
}

const result = spawnSync(dumpBin, args, { env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status || 1);
}

const header = `-- =============================================================================
-- Kolkata Scooty Bike Training — complete baseline schema
-- Generated: ${new Date().toISOString().slice(0, 10)}
--
-- Fresh install:
--   1. CREATE DATABASE kolkata_bike_training;
--   2. psql -U postgres -d kolkata_bike_training -f database/schema.sql
--
-- This file replaces incremental supabase/migrations for greenfield setups.
-- =============================================================================

`;

let body = result.stdout
  // Drop noisy SET statements that break on some hosts
  .replace(/^\\restrict.*$/gm, '')
  .replace(/^\\unrestrict.*$/gm, '');

fs.writeFileSync(outFile, header + body, 'utf8');
console.log('Wrote', outFile, `(${Math.round(fs.statSync(outFile).size / 1024)} KB)`);
