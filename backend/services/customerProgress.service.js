/**
 * Customer course progress — classes purchased, completed, attendance %, upcoming class.
 */

const db = require('../db');

function parseClassCount(course) {
  if (course?.class_count != null && Number(course.class_count) > 0) {
    return Number(course.class_count);
  }
  const label = String(course?.duration_label || '');
  const match = label.match(/(\d+)\s*[- ]?class/i);
  if (match) return parseInt(match[1], 10);
  return 15;
}

function deriveCourseStatus(enrollment, classesPurchased, classesCompleted) {
  if (enrollment?.course_status === 'cancelled') return 'cancelled';
  if (enrollment?.course_status === 'completed' || classesCompleted >= classesPurchased) {
    return 'completed';
  }
  if (classesCompleted <= 0) return 'not_started';
  return 'in_progress';
}

function deriveCertificateStatus(enrollment, courseStatus) {
  if (enrollment?.certificate_status === 'issued') return 'issued';
  if (courseStatus === 'completed') return 'pending';
  return enrollment?.certificate_status || 'pending';
}

async function syncEnrollmentFromBookings(client, userId, courseId, branchId) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const attended = await q(
    `SELECT COUNT(*) FILTER (WHERE b.attendance_status = 'ATTENDED')::int AS count,
            MAX(s.start_time) FILTER (WHERE b.attendance_status = 'ATTENDED') AS last_class,
            MIN(s.start_time) FILTER (
              WHERE b.attendance_status IN ('SCHEDULED', 'ATTENDED')
                AND s.start_time > NOW()
                AND b.status IN ('confirmed', 'pending', 'pending_payment')
            ) AS next_class
     FROM bookings b
     JOIN slots s ON s.id = b.slot_id
     WHERE b.user_id = $1 AND b.course_id = $2
       AND ($3::uuid IS NULL OR b.branch_id IS NOT DISTINCT FROM $3)
       AND b.status NOT IN ('cancelled')`,
    [userId, courseId, branchId || null]
  );
  const classesCompleted = attended.rows[0]?.count || 0;
  await q(
    `UPDATE course_enrollments SET
       classes_completed = $4,
       last_class_at = $5,
       next_class_at = $6,
       course_status = CASE
         WHEN course_status = 'cancelled' THEN 'cancelled'
         WHEN $4 >= classes_purchased THEN 'completed'
         WHEN $4 > 0 THEN 'in_progress'
         ELSE course_status
       END,
       certificate_status = CASE
         WHEN $4 >= classes_purchased THEN 'pending'
         ELSE certificate_status
       END,
       updated_at = NOW()
     WHERE user_id = $1 AND course_id = $2 AND ($3::uuid IS NULL OR branch_id = $3)`,
    [userId, courseId, branchId || null, classesCompleted, attended.rows[0]?.last_class, attended.rows[0]?.next_class]
  );
  return classesCompleted;
}

async function getProgressForUser(userId) {
  const enrollments = await db.query(
    `SELECT ce.*,
            c.name AS course_name, c.slug AS course_slug, c.duration_label,
            c.class_count AS course_class_count,
            b.name AS branch_name, b.slug AS branch_slug,
            tp.full_name AS trainer_name
     FROM course_enrollments ce
     JOIN courses c ON c.id = ce.course_id
     LEFT JOIN branches b ON b.id = ce.branch_id
     LEFT JOIN trainers t ON t.id = ce.trainer_id
     LEFT JOIN profiles tp ON t.user_id = tp.id
     WHERE ce.user_id = $1
     ORDER BY ce.updated_at DESC`,
    [userId]
  );

  if (enrollments.rows.length === 0) {
    return buildProgressFromBookingsOnly(userId);
  }

  const items = [];
  for (const row of enrollments.rows) {
    await syncEnrollmentFromBookings(null, userId, row.course_id, row.branch_id);
  }

  const refreshed = await db.query(
    `SELECT ce.*,
            c.name AS course_name, c.slug AS course_slug, c.duration_label,
            c.class_count AS course_class_count,
            b.name AS branch_name,
            tp.full_name AS trainer_name
     FROM course_enrollments ce
     JOIN courses c ON c.id = ce.course_id
     LEFT JOIN branches b ON b.id = ce.branch_id
     LEFT JOIN trainers t ON t.id = ce.trainer_id
     LEFT JOIN profiles tp ON t.user_id = tp.id
     WHERE ce.user_id = $1
     ORDER BY ce.updated_at DESC`,
    [userId]
  );

  for (const row of refreshed.rows) {
    const classesPurchased = row.classes_purchased || parseClassCount(row);
    const classesCompleted = row.classes_completed || 0;
    const classesRemaining = Math.max(0, classesPurchased - classesCompleted);
    const attendancePercent =
      classesPurchased > 0 ? Math.round((classesCompleted / classesPurchased) * 100) : 0;
    const courseStatus = deriveCourseStatus(row, classesPurchased, classesCompleted);

    items.push({
      enrollment_id: row.id,
      course: row.course_name,
      course_slug: row.course_slug,
      branch: row.branch_name,
      trainer: row.trainer_name || 'To be assigned',
      classes_purchased: classesPurchased,
      classes_completed: classesCompleted,
      classes_remaining: classesRemaining,
      attendance_percent: attendancePercent,
      last_class_date: row.last_class_at,
      next_class_date: row.next_class_at,
      course_status: courseStatus,
      payment_status: row.payment_status,
      certificate_status: deriveCertificateStatus(row, courseStatus)
    });
  }

  return { enrollments: items, source: 'course_enrollments' };
}

async function buildProgressFromBookingsOnly(userId) {
  const r = await db.query(
    `SELECT c.id AS course_id, c.name AS course_name, c.slug, c.duration_label, c.class_count,
            b.name AS branch_name, tp.full_name AS trainer_name,
            COUNT(*) FILTER (WHERE bk.attendance_status = 'ATTENDED')::int AS attended,
            MAX(s.start_time) FILTER (WHERE bk.attendance_status = 'ATTENDED') AS last_class,
            MIN(s.start_time) FILTER (
              WHERE bk.attendance_status = 'SCHEDULED' AND s.start_time > NOW()
                AND bk.status IN ('confirmed', 'pending_payment', 'pending')
            ) AS next_class,
            MAX(pay.status) AS payment_status
     FROM bookings bk
     JOIN courses c ON c.id = bk.course_id
     LEFT JOIN branches b ON b.id = bk.branch_id
     LEFT JOIN trainers t ON t.id = bk.trainer_id
     LEFT JOIN profiles tp ON t.user_id = tp.id
     LEFT JOIN slots s ON s.id = bk.slot_id
     LEFT JOIN payments pay ON pay.booking_id = bk.id
     WHERE bk.user_id = $1 AND bk.status NOT IN ('cancelled')
     GROUP BY c.id, c.name, c.slug, c.duration_label, c.class_count, b.name, tp.full_name`,
    [userId]
  );

  const items = r.rows.map((row) => {
    const classesPurchased = parseClassCount(row);
    const classesCompleted = row.attended || 0;
    const classesRemaining = Math.max(0, classesPurchased - classesCompleted);
    return {
      course: row.course_name,
      course_slug: row.slug,
      branch: row.branch_name,
      trainer: row.trainer_name || 'To be assigned',
      classes_purchased: classesPurchased,
      classes_completed: classesCompleted,
      classes_remaining: classesRemaining,
      attendance_percent:
        classesPurchased > 0 ? Math.round((classesCompleted / classesPurchased) * 100) : 0,
      last_class_date: row.last_class,
      next_class_date: row.next_class,
      course_status: classesCompleted >= classesPurchased ? 'completed' : classesCompleted > 0 ? 'in_progress' : 'not_started',
      payment_status: row.payment_status === 'verified' ? 'approved' : row.payment_status || 'pending',
      certificate_status: classesCompleted >= classesPurchased ? 'pending' : 'not_applicable'
    };
  });

  return { enrollments: items, source: 'bookings_fallback' };
}

async function upsertEnrollmentFromBooking(client, booking, paymentStatus = null) {
  if (!booking?.user_id || !booking?.course_id) return;
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const course = await q(`SELECT class_count, duration_label FROM courses WHERE id = $1`, [booking.course_id]);
  const classesPurchased = parseClassCount(course.rows[0] || {});

  await q(
    `INSERT INTO course_enrollments (
       user_id, course_id, branch_id, trainer_id, classes_purchased, payment_status, course_status
     ) VALUES ($1,$2,$3,$4,$5,$6,'in_progress')
     ON CONFLICT (user_id, course_id, branch_id) DO UPDATE SET
       trainer_id = COALESCE(EXCLUDED.trainer_id, course_enrollments.trainer_id),
       payment_status = COALESCE($6, course_enrollments.payment_status),
       updated_at = NOW()`,
    [
      booking.user_id,
      booking.course_id,
      booking.branch_id,
      booking.trainer_id,
      classesPurchased,
      paymentStatus
    ]
  );
  await syncEnrollmentFromBookings(client, booking.user_id, booking.course_id, booking.branch_id);
}

module.exports = {
  getProgressForUser,
  syncEnrollmentFromBookings,
  upsertEnrollmentFromBooking,
  parseClassCount
};
