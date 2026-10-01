/**
 * Read-only report of rows that could become candidates.
 * Writes nothing. Review the JSON before any real backfill.
 *
 *   node scripts/candidates_backfill_dry_run.js
 */

const db = require('../db');
const { groupByMobile } = require('../services/candidateBackfill');

async function main() {
  const offline = await db.query(
    `SELECT id, phone, offline_customer_name AS name
     FROM bookings
     WHERE booking_source = 'OFFLINE'`
  );
  const enrollments = await db.query(
    `SELECT e.id, p.phone, p.full_name AS name
     FROM course_enrollments e
     JOIN profiles p ON p.id = e.user_id`
  );
  const report = {
    generated_at: new Date().toISOString(),
    wrote_rows: false,
    offline_bookings: groupByMobile(offline.rows.map((row) => ({ ...row, source: 'offline_booking' }))),
    course_enrollments: groupByMobile(enrollments.rows.map((row) => ({ ...row, source: 'course_enrollment' })))
  };
  console.log(JSON.stringify(report, null, 2));
  await db.pool.end();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
