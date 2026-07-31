const db = require('../db');

function computeTrainerStatus(isActive, onLeaveToday) {
  if (!isActive) return 'inactive';
  if (onLeaveToday) return 'on_leave';
  return 'active';
}

async function listLeaveDates(trainerId) {
  const result = await db.query(
    `SELECT id, leave_date, reason, created_at
     FROM trainer_leave
     WHERE trainer_id = $1
     ORDER BY leave_date ASC`,
    [trainerId]
  );
  return result.rows;
}

async function addLeaveDate(trainerId, leaveDate, reason = null) {
  const trainerCheck = await db.query(
    'SELECT id, is_active FROM trainers WHERE id = $1',
    [trainerId]
  );
  if (!trainerCheck.rows.length) {
    const err = new Error('Trainer not found');
    err.status = 404;
    err.errorCode = 'TRAINER_NOT_FOUND';
    throw err;
  }
  if (!trainerCheck.rows[0].is_active) {
    const err = new Error('Cannot mark leave for an inactive trainer');
    err.status = 400;
    err.errorCode = 'TRAINER_INACTIVE';
    throw err;
  }

  const result = await db.query(
    `INSERT INTO trainer_leave (trainer_id, leave_date, reason)
     VALUES ($1, $2::date, $3)
     ON CONFLICT (trainer_id, leave_date) DO UPDATE SET reason = EXCLUDED.reason
     RETURNING id, trainer_id, leave_date, reason, created_at`,
    [trainerId, leaveDate, reason || null]
  );
  return result.rows[0];
}

async function removeLeaveDate(trainerId, leaveDate) {
  const result = await db.query(
    `DELETE FROM trainer_leave
     WHERE trainer_id = $1 AND leave_date = $2::date
     RETURNING id, trainer_id, leave_date, reason`,
    [trainerId, leaveDate]
  );
  if (!result.rows.length) {
    const err = new Error('Leave date not found');
    err.status = 404;
    err.errorCode = 'LEAVE_NOT_FOUND';
    throw err;
  }
  return result.rows[0];
}

async function isTrainerOnLeave(trainerId, dateString) {
  const result = await db.query(
    `SELECT 1 FROM trainer_leave
     WHERE trainer_id = $1 AND leave_date = $2::date
     LIMIT 1`,
    [trainerId, dateString]
  );
  return result.rows.length > 0;
}

module.exports = {
  computeTrainerStatus,
  listLeaveDates,
  addLeaveDate,
  removeLeaveDate,
  isTrainerOnLeave
};
