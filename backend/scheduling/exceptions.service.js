const db = require('../db');

async function getExceptionsForDate(client, branchId, dateString) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const r = await q(
    `SELECT id, exception_date, start_time, end_time, exception_type,
            capacity_override, vehicle_id, reason
     FROM schedule_exceptions
     WHERE branch_id = $1 AND exception_date = $2::date`,
    [branchId, dateString]
  );
  return r.rows;
}

function findExceptionForWindow(exceptions, startTimeIso, endTimeIso) {
  const startMs = new Date(startTimeIso).getTime();
  const endMs = new Date(endTimeIso).getTime();
  return exceptions.find((ex) => {
    if (!ex.start_time) return false;
    const exStart = new Date(ex.start_time).getTime();
    const exEnd = ex.end_time ? new Date(ex.end_time).getTime() : exStart + 60000;
    return startMs >= exStart && startMs < exEnd;
  });
}

function findDisabledException(exceptions, startTimeIso, endTimeIso) {
  const match = findExceptionForWindow(exceptions, startTimeIso, endTimeIso);
  if (match?.exception_type === 'disabled') return match;
  return null;
}

function findCapacityOverride(exceptions, startTimeIso, endTimeIso, vehicleId = null) {
  const match = findExceptionForWindow(exceptions, startTimeIso, endTimeIso);
  if (match?.exception_type === 'capacity_override') {
    if (match.vehicle_id && vehicleId && match.vehicle_id !== vehicleId) return null;
    return match.capacity_override;
  }
  return null;
}

module.exports = {
  getExceptionsForDate,
  findDisabledException,
  findCapacityOverride,
  findExceptionForWindow
};
