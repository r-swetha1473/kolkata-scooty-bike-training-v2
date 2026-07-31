const db = require('../db');

async function isHoliday(client, branchId, dateString) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const r = await q(
    `SELECT id, reason FROM branch_holidays
     WHERE branch_id = $1 AND holiday_date = $2::date LIMIT 1`,
    [branchId, dateString]
  );
  return r.rows[0] || null;
}

async function getClosedException(client, branchId, dateString) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const r = await q(
    `SELECT id, reason FROM schedule_exceptions
     WHERE branch_id = $1 AND exception_date = $2::date
       AND exception_type = 'closed'
       AND start_time IS NULL
     LIMIT 1`,
    [branchId, dateString]
  );
  return r.rows[0] || null;
}

async function isDateClosed(client, branchId, dateString) {
  const holiday = await isHoliday(client, branchId, dateString);
  if (holiday) return { closed: true, reason: holiday.reason || 'Holiday' };
  const closedEx = await getClosedException(client, branchId, dateString);
  if (closedEx) return { closed: true, reason: closedEx.reason || 'Closed' };
  return { closed: false };
}

module.exports = {
  isHoliday,
  getClosedException,
  isDateClosed
};
