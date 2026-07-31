/**
 * Append essential reference seed (settings, courses, branches) to schema.sql
 * and verify schema applies on an empty database.
 */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const br = path.join(__dirname, '../backend');
require(path.join(br, 'node_modules/dotenv')).config({ path: path.join(br, '.env') });

const schemaPath = path.join(__dirname, '../database/schema.sql');

const env = { ...process.env };
if (process.env.DB_PASSWORD) env.PGPASSWORD = process.env.DB_PASSWORD;

const pgDumpCandidates = [
  process.env.PG_DUMP,
  'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
  'pg_dump',
].filter(Boolean);
const psqlCandidates = [
  process.env.PSQL,
  'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe',
  'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
  'psql',
].filter(Boolean);

function findBin(cands) {
  for (const c of cands) {
    if (c === 'pg_dump' || c === 'psql' || fs.existsSync(c)) return c;
  }
  return null;
}

const pgDump = findBin(pgDumpCandidates);
const psql = findBin(psqlCandidates);
if (!pgDump || !psql) {
  console.error('pg_dump/psql not found');
  process.exit(1);
}

function dbArgs(database) {
  if (process.env.DATABASE_URL) {
    // Replace db name in URL if needed — for dump use as-is; for fresh use constructed
    return ['--dbname', process.env.DATABASE_URL];
  }
  return [
    '-h', process.env.DB_HOST || '127.0.0.1',
    '-p', process.env.DB_PORT || '5432',
    '-U', process.env.DB_USER || 'postgres',
    '-d', database || process.env.DB_NAME || 'kolkata_bike_training',
  ];
}

function run(bin, args, opts = {}) {
  const r = spawnSync(bin, args, { env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || 'command failed').slice(0, 2000));
  }
  return r.stdout;
}

// 1) Dump essential seed data
const dumpArgs = [
  '--data-only',
  '--no-owner',
  '--no-privileges',
  '--column-inserts',
  '--table=public.settings',
  '--table=public.courses',
  '--table=public.branches',
  '--table=public.vehicles',
  ...dbArgs(),
];
const seedSql = run(pgDump, dumpArgs);
const seedBlock = `

-- =============================================================================
-- Essential reference seed (settings, courses, branches, vehicles)
-- =============================================================================
SET search_path TO public;
SET session_replication_role = replica;
${seedSql}
SET session_replication_role = DEFAULT;
UPDATE public.settings SET updated_by = NULL WHERE updated_by IS NOT NULL;
`;

let schema = fs.readFileSync(schemaPath, 'utf8');
// Remove previous seed append if re-running
schema = schema.replace(/\n-- =============================================================================\n-- Essential reference seed[\s\S]*$/m, '');
// Soften SET transaction_timeout for PG < 17
schema = schema.replace(/^SET transaction_timeout = 0;\n/m, '');
// Avoid dropping extensions on empty DBs that share cluster roles oddly
schema = schema.replace(/^DROP EXTENSION IF EXISTS "uuid-ossp";\n/m, '-- DROP EXTENSION IF EXISTS "uuid-ossp";\n');
fs.writeFileSync(schemaPath, schema + seedBlock);
console.log('Appended seed data to schema.sql');

// 2) Recreate verification database
const adminDb = process.env.DB_NAME || 'kolkata_bike_training';
const freshDb = 'kolkata_bike_training_schema_test';
const user = process.env.DB_USER || 'postgres';
const host = process.env.DB_HOST || '127.0.0.1';
const port = process.env.DB_PORT || '5432';

function adminArgs(sql) {
  return ['-h', host, '-p', port, '-U', user, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', sql];
}

try {
  run(psql, adminArgs(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${freshDb}' AND pid <> pg_backend_pid();`));
} catch (_) { /* ignore */ }
run(psql, adminArgs(`DROP DATABASE IF EXISTS ${freshDb};`));
run(psql, adminArgs(`CREATE DATABASE ${freshDb};`));
console.log('Created', freshDb);

const apply = spawnSync(
  psql,
  ['-h', host, '-p', port, '-U', user, '-d', freshDb, '-v', 'ON_ERROR_STOP=1', '-f', schemaPath],
  { env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
);
if (apply.status !== 0) {
  console.error('SCHEMA APPLY FAILED');
  console.error(apply.stderr || apply.stdout);
  process.exit(1);
}
console.log('schema.sql applied successfully');

const checks = run(psql, [
  '-h', host, '-p', port, '-U', user, '-d', freshDb, '-t', '-A', '-c',
  `SELECT json_build_object(
     'tables', (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'),
     'fkeys', (SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY' AND table_schema='public'),
     'indexes', (SELECT count(*) FROM pg_indexes WHERE schemaname='public'),
     'settings', (SELECT count(*) FROM settings),
     'courses', (SELECT count(*) FROM courses),
     'branches', (SELECT count(*) FROM branches),
     'vehicles', (SELECT count(*) FROM vehicles)
   );`
]);
console.log('VERIFY', checks.trim());

// cleanup test db
run(psql, adminArgs(`DROP DATABASE IF EXISTS ${freshDb};`));
console.log('Dropped test database', freshDb);
