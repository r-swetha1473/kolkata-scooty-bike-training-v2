const db = require('../db');
const { getDayOfWeek } = require('../utils/dateUtils');

async function getBranch(client, branchId) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const r = await q(
    `SELECT id, name, slug, is_active, working_days, opening_time, closing_time,
            slot_duration_minutes, default_slot_capacity
     FROM branches WHERE id = $1`,
    [branchId]
  );
  return r.rows[0] || null;
}

async function getWorkingHours(client, branchId) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const r = await q(
    `SELECT day_of_week, opens_at, closes_at, is_closed
     FROM branch_working_hours WHERE branch_id = $1 ORDER BY day_of_week`,
    [branchId]
  );
  if (r.rows.length) return r.rows;
  const branch = await getBranch(client, branchId);
  if (!branch) return [];
  const hours = [];
  for (let d = 0; d <= 6; d += 1) {
    const open = branch.working_days?.map(Number).includes(d);
    hours.push({
      day_of_week: d,
      opens_at: branch.opening_time || '07:00',
      closes_at: branch.closing_time || '21:00',
      is_closed: !open
    });
  }
  return hours;
}

async function getSlotTemplate(client, branchId) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const r = await q(
    `SELECT duration_minutes, is_active FROM slot_templates WHERE branch_id = $1`,
    [branchId]
  );
  if (r.rows[0]) return r.rows[0];
  const branch = await getBranch(client, branchId);
  return {
    duration_minutes: branch?.slot_duration_minutes || 30,
    is_active: true
  };
}

function getDaySchedule(workingHours, dateString) {
  const day = getDayOfWeek(dateString);
  return workingHours.find((h) => h.day_of_week === day) || null;
}

module.exports = {
  getBranch,
  getWorkingHours,
  getSlotTemplate,
  getDaySchedule
};
