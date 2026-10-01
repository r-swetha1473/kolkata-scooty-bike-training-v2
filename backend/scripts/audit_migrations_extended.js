/**
 * Extended migration status: verify_migrations.js checks + additional production migrations.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

const CHECKS = [
  { migration: '20260406000000_profile_inactive_blocked.sql', name: 'profiles.inactive_blocked', sql: `SELECT 1 AS ok FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='inactive_blocked'` },
  {
    migration: '20260610120000_vehicles_type_legacy_default.sql',
    name: 'vehicles.type column default Scooty',
    sql: `SELECT 1 AS ok FROM information_schema.columns
          WHERE table_schema='public' AND table_name='vehicles' AND column_name='type'
            AND column_default IS NOT NULL AND column_default LIKE '%Scooty%'`
  },
  { migration: '20260610140000_slot_capacity_sum_limit.sql', name: 'slots capacity CHECK 1-100', sql: `SELECT 1 AS ok FROM pg_constraint WHERE conrelid='slots'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%capacity%' AND pg_get_constraintdef(oid) LIKE '%100%'` },
  { migration: '20260124000000_create_slot_vehicle_capacity.sql', name: 'slot_vehicle_capacity table', sql: `SELECT to_regclass('public.slot_vehicle_capacity') AS ok` },
  { migration: '20261001140000_slot_vehicle_capacity_overrides.sql', name: 'slot_vehicle_capacity.is_enabled', sql: `SELECT 1 AS ok FROM information_schema.columns WHERE table_schema='public' AND table_name='slot_vehicle_capacity' AND column_name='is_enabled'` },
  { migration: '20261001150000_drop_trainer_slot_unique_and_legacy_capacity.sql', name: 'slot+trainer unique index removed', sql: `SELECT 1 AS ok WHERE NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bookings_slot_trainer_active')` }
];

async function main() {
  console.log('Extended Migration Status\n');
  let pass = 0;
  let fail = 0;
  const pending = [];

  for (const c of CHECKS) {
    try {
      const r = await db.query(c.sql);
      const ok = r.rows.length > 0 && (r.rows[0].ok === 1 || r.rows[0].ok);
      if (ok) {
        console.log(`APPLIED  [${c.migration}] ${c.name}`);
        pass++;
      } else {
        console.log(`PENDING  [${c.migration}] ${c.name}`);
        pending.push(c);
        fail++;
      }
    } catch (e) {
      console.log(`PENDING  [${c.migration}] ${c.name} — ${e.message}`);
      pending.push(c);
      fail++;
    }
  }

  console.log(`\nExtended: ${pass} applied, ${fail} pending`);
  if (pending.length) {
    console.log('\nPending migrations:');
    pending.forEach((p) => console.log(`  - ${p.migration}: ${p.name}`));
  }

  await db.pool.end();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e.message);
  try { await db.pool.end(); } catch (_) {}
  process.exit(1);
});
