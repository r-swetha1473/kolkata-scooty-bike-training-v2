/**
 * Schema drift verification for Sprint 1 critical columns.
 * Usage: node backend/scripts/verify_sprint1_schema.js
 * Exits non-zero if required columns/constraints are missing.
 */

const db = require('../db');

async function columnExists(table, column) {
  const r = await db.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return r.rows.length > 0;
}

async function main() {
  const checks = [
    ['bookings', 'branch_id'],
    ['bookings', 'booking_reference'],
    ['vehicles', 'branch_id'],
    ['slots', 'branch_id'],
    ['trainers', 'branch_id'],
    ['sub_admin_permissions', 'module']
  ];

  const missing = [];
  for (const [table, column] of checks) {
    if (!(await columnExists(table, column))) {
      missing.push(`${table}.${column}`);
    }
  }

  const moduleCheck = await db.query(`
    SELECT pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'sub_admin_permissions' AND con.contype = 'c'
  `);
  const defs = moduleCheck.rows.map((r) => r.def || '').join(' ');
  if (!defs.includes('branches') || !defs.includes('payments')) {
    missing.push('sub_admin_permissions.module CHECK missing branches/payments');
  }

  if (missing.length) {
    console.error('[verify_sprint1_schema] FAIL — missing:');
    missing.forEach((m) => console.error('  -', m));
    console.error('Apply supabase/migrations/20260727120000_sprint1_schema_align.sql (and prior migrations).');
    process.exit(1);
  }

  console.log('[verify_sprint1_schema] OK — critical columns present');
  process.exit(0);
}

main()
  .catch((err) => {
    console.error('[verify_sprint1_schema] error:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await db.pool?.end?.();
    } catch (_) {
      /* ignore */
    }
  });
