/**
 * Apply database/schema.sql using DATABASE_URL from backend/.env.
 * Statement-by-statement; ignores greenfield-safe DROP TRIGGER misses.
 * Does not print connection secrets.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function withPort(urlStr, port) {
  const u = new URL(urlStr.replace(/^postgresql:/, 'postgres:'));
  u.port = String(port);
  return u.toString().replace(/^postgres:/, 'postgresql:');
}

function scrubSql(raw) {
  let sql = raw.replace(/\r\n/g, '\n');
  sql = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('\\'))
    .join('\n');
  sql = sql.replace(/^SET transaction_timeout = 0;\s*$/gm, '-- stripped transaction_timeout');
  return sql;
}

function splitStatements(sql) {
  const stmts = [];
  let cur = '';
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag = null; // e.g. '$$' or '$tag$'

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) {
        cur += dollarTag;
        i += dollarTag.length - 1;
        dollarTag = null;
      } else {
        cur += ch;
      }
      continue;
    }

    if (inLineComment) {
      cur += ch;
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      cur += ch;
      if (ch === '*' && next === '/') {
        cur += '/';
        i++;
        inBlockComment = false;
      }
      continue;
    }
    if (inSingle) {
      cur += ch;
      if (ch === "'" && next === "'") {
        cur += "'";
        i++;
        continue;
      }
      if (ch === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      cur += ch;
      if (ch === '"') inDouble = false;
      continue;
    }

    if (ch === '-' && next === '-') {
      cur += ch;
      inLineComment = true;
      continue;
    }
    if (ch === '/' && next === '*') {
      cur += ch;
      inBlockComment = true;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      cur += ch;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      cur += ch;
      continue;
    }
    if (ch === '$') {
      const m = sql.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (m) {
        dollarTag = m[0];
        cur += dollarTag;
        i += dollarTag.length - 1;
        continue;
      }
    }
    if (ch === ';') {
      const t = cur.trim();
      if (t) stmts.push(t);
      cur = '';
      continue;
    }
    cur += ch;
  }
  const t = cur.trim();
  if (t) stmts.push(t);
  return stmts;
}

function isIgnorable(stmt, err) {
  const s = stmt.replace(/\s+/g, ' ').trim().toUpperCase();
  const msg = String(err.message || '');
  if (err.code === '42P01' && s.startsWith('DROP TRIGGER')) return true;
  if (err.code === '42704' && s.startsWith('DROP TRIGGER')) return true;
  // COMMENT ON EXTENSION often requires superuser on managed Postgres
  if (s.startsWith('COMMENT ON EXTENSION') && (err.code === '42501' || /must be owner|permission denied/i.test(msg))) {
    return true;
  }
  return false;
}

async function main() {
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  const sql = scrubSql(fs.readFileSync(schemaPath, 'utf8'));
  const stmts = splitStatements(sql);
  console.log('STATEMENT_COUNT', stmts.length);

  const base = process.env.DATABASE_URL;
  let client = new Client({
    connectionString: withPort(base, 5432),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });
  try {
    await client.connect();
    console.log('APPLY_MODE=session');
  } catch (e) {
    try {
      await client.end();
    } catch (_) {}
    client = new Client({
      connectionString: base,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 30000,
    });
    await client.connect();
    console.log('APPLY_MODE=transaction');
  }

  let ok = 0;
  let skipped = 0;
  try {
    for (let i = 0; i < stmts.length; i++) {
      const s = stmts[i];
      try {
        await client.query(s);
        ok++;
      } catch (e) {
        if (isIgnorable(s, e)) {
          skipped++;
          continue;
        }
        const preview = s.replace(/\s+/g, ' ').slice(0, 180);
        console.error('FAIL_AT', i + 1, 'of', stmts.length);
        console.error('CODE', e.code || '');
        console.error('MSG', String(e.message).slice(0, 400));
        console.error('STMT', preview);
        process.exitCode = 1;
        return;
      }
      if ((i + 1) % 150 === 0) console.log('PROGRESS', i + 1, '/', stmts.length);
    }
    console.log('SCHEMA_APPLIED=true', 'ok=' + ok, 'skipped=' + skipped);
  } finally {
    await client.end();
  }

  const v = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await v.connect();
  try {
    const r = await v.query(
      "select tablename from pg_tables where schemaname = 'public' order by 1"
    );
    console.log('TABLE_COUNT', r.rows.length);
    for (const t of [
      'profiles',
      'bookings',
      'slots',
      'courses',
      'branches',
      'payments',
      'settings',
    ]) {
      console.log('HAS_' + t.toUpperCase(), r.rows.some((x) => x.tablename === t));
    }
    const counts = await v.query(
      `select
        (select count(*)::int from branches) as branches,
        (select count(*)::int from courses) as courses,
        (select count(*)::int from vehicles) as vehicles,
        (select count(*)::int from settings) as settings`
    );
    console.log('SEED_COUNTS', counts.rows[0]);
  } finally {
    await v.end();
  }
}

main().catch((e) => {
  console.error('FATAL', String(e.message).slice(0, 400));
  process.exit(1);
});
