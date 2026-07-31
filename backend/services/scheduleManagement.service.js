const db = require('../db');
const availabilityService = require('../scheduling/availability.service');
const branchSchedule = require('../scheduling/branch-schedule.service');
const holidayService = require('../scheduling/holiday.service');
const exceptionsService = require('../scheduling/exceptions.service');
const capacityService = require('../scheduling/capacity.service');
const { invalidateCacheForBranch } = require('../scheduling/availability.service');

async function getBranchContext(branchId, dateString) {
  const branch = await branchSchedule.getBranch(null, branchId);
  if (!branch) {
    const err = new Error('Branch not found');
    err.status = 404;
    err.errorCode = 'BRANCH_NOT_FOUND';
    throw err;
  }

  const workingHours = await branchSchedule.getWorkingHours(null, branchId);
  const template = await branchSchedule.getSlotTemplate(null, branchId);
  const daySchedule = branchSchedule.getDaySchedule(workingHours, dateString);
  const defaultCapacity = await capacityService.resolveBranchDefaultCapacity(null, branchId);
  const vehicles = await capacityService.getBranchVehicles(null, branchId);
  const trainers = await db.query(
    `SELECT t.id, t.is_active, t.branch_id, p.full_name
     FROM trainers t
     JOIN profiles p ON t.user_id = p.id
     WHERE t.branch_id = $1
     ORDER BY p.full_name ASC`,
    [branchId]
  );
  const holidays = await db.query(
    `SELECT id, holiday_date, reason FROM branch_holidays
     WHERE branch_id = $1 AND holiday_date >= CURRENT_DATE
     ORDER BY holiday_date ASC LIMIT 30`,
    [branchId]
  );
  const exceptions = await exceptionsService.getExceptionsForDate(null, branchId, dateString);
  const closed = await holidayService.isDateClosed(null, branchId, dateString);

  return {
    branch: {
      id: branch.id,
      name: branch.name,
      slug: branch.slug,
      is_active: branch.is_active
    },
    working_hours: daySchedule,
    weekly_hours: workingHours,
    slot_duration_minutes: template?.duration_minutes || branch.slot_duration_minutes || 30,
    default_capacity: defaultCapacity,
    computed_capacity: vehicles.reduce((sum, v) => sum + (v.max_per_slot || 0), 0) || defaultCapacity,
    vehicles: vehicles.map((v) => ({
      id: v.id,
      name: v.name,
      max_per_slot: v.max_per_slot,
      operational_status: v.operational_status,
      is_active: v.is_active
    })),
    trainers: trainers.rows.map((t) => ({
      id: t.id,
      full_name: t.full_name,
      is_active: t.is_active
    })),
    holidays: holidays.rows,
    exceptions_count: exceptions.length,
    is_closed: closed.closed,
    closed_reason: closed.reason || null
  };
}

async function enrichTimelineSlots(slots, branchId) {
  const trainerIds = [...new Set(slots.map((s) => s.trainer_id).filter(Boolean))];
  let trainerMap = new Map();
  if (trainerIds.length) {
    const r = await db.query(
      `SELECT t.id, p.full_name
       FROM trainers t JOIN profiles p ON t.user_id = p.id
       WHERE t.id = ANY($1::uuid[])`,
      [trainerIds]
    );
    trainerMap = new Map(r.rows.map((row) => [row.id, row.full_name]));
  }

  return slots.map((slot) => ({
    ...slot,
    trainer_name: slot.trainer_id ? trainerMap.get(slot.trainer_id) || null : null,
    reason: slot.disabled_reason || slot.unavailable_reason || null
  }));
}

function applyTimelineFilters(slots, { vehicleId, trainerId, status, search }) {
  let filtered = [...slots];

  if (vehicleId) {
    filtered = filtered.filter((slot) =>
      (slot.vehicle_capacities || []).some((v) => v.vehicle_id === vehicleId)
    );
  }

  if (trainerId) {
    filtered = filtered.filter((slot) => slot.trainer_id === trainerId);
  }

  if (status) {
    filtered = filtered.filter((slot) => slot.status === status);
  }

  const term = String(search || '').trim().toLowerCase();
  if (term) {
    filtered = filtered.filter((slot) => {
      const time = `${slot.start_time} ${slot.end_time}`.toLowerCase();
      const trainer = String(slot.trainer_name || '').toLowerCase();
      const reason = String(slot.reason || '').toLowerCase();
      const vehicles = (slot.vehicle_capacities || [])
        .map((v) => v.vehicle_name)
        .join(' ')
        .toLowerCase();
      return time.includes(term) || trainer.includes(term) || reason.includes(term) || vehicles.includes(term);
    });
  }

  return filtered;
}

async function getAdminTimeline(params) {
  const { branchId, date, vehicleId, trainerId, status, search } = params;
  const started = Date.now();

  const [availability, branchContext] = await Promise.all([
    availabilityService.getAvailability({
      branchId,
      date,
      vehicleId: vehicleId || null,
      includeAll: true,
      persist: false,
      useCache: false
    }),
    getBranchContext(branchId, date)
  ]);

  const enriched = await enrichTimelineSlots(availability.slots || [], branchId);
  const filtered = applyTimelineFilters(enriched, { vehicleId, trainerId, status, search });

  return {
    slots: filtered,
    all_slots: enriched,
    meta: {
      ...availability.meta,
      branch_id: branchId,
      date,
      response_ms: Date.now() - started,
      filtered: filtered.length,
      total: enriched.length
    },
    branch_context: branchContext
  };
}

async function disableWindow({ branchId, date, startTime, endTime, reason, adminId }) {
  await db.query(
    `DELETE FROM schedule_exceptions
     WHERE branch_id = $1 AND exception_date = $2::date AND exception_type = 'disabled'
       AND start_time = $3::timestamptz AND end_time = $4::timestamptz`,
    [branchId, date, startTime, endTime]
  );
  const result = await db.query(
    `INSERT INTO schedule_exceptions
       (branch_id, exception_date, start_time, end_time, exception_type, reason)
     VALUES ($1, $2::date, $3::timestamptz, $4::timestamptz, 'disabled', $5)
     RETURNING *`,
    [branchId, date, startTime, endTime, reason || 'Disabled by admin']
  );
  invalidateCacheForBranch(branchId);
  return result.rows[0];
}

async function enableWindow({ branchId, date, startTime, endTime }) {
  const result = await db.query(
    `DELETE FROM schedule_exceptions
     WHERE branch_id = $1
       AND exception_date = $2::date
       AND exception_type = 'disabled'
       AND start_time = $3::timestamptz
       AND end_time = $4::timestamptz
     RETURNING id`,
    [branchId, date, startTime, endTime]
  );
  if (!result.rows.length) {
    const persisted = await db.query(
      `UPDATE slots SET status = 'available', updated_at = NOW()
       WHERE branch_id = $1 AND start_time = $2::timestamptz AND end_time = $3::timestamptz
       RETURNING id`,
      [branchId, startTime, endTime]
    );
    if (!persisted.rows.length) {
      const err = new Error('No disable rule found for this window');
      err.status = 404;
      err.errorCode = 'EXCEPTION_NOT_FOUND';
      throw err;
    }
  }
  invalidateCacheForBranch(branchId);
  return { enabled: true };
}

async function setCapacityOverride({
  branchId,
  date,
  startTime,
  endTime,
  capacity,
  vehicleId = null,
  reason = null
}) {
  await db.query(
    `DELETE FROM schedule_exceptions
     WHERE branch_id = $1 AND exception_date = $2::date AND exception_type = 'capacity_override'
       AND start_time = $3::timestamptz AND end_time = $4::timestamptz
       AND (($5::uuid IS NULL AND vehicle_id IS NULL) OR vehicle_id = $5::uuid)`,
    [branchId, date, startTime, endTime, vehicleId]
  );
  const result = await db.query(
    `INSERT INTO schedule_exceptions
       (branch_id, exception_date, start_time, end_time, exception_type, capacity_override, vehicle_id, reason)
     VALUES ($1, $2::date, $3::timestamptz, $4::timestamptz, 'capacity_override', $5, $6, $7)
     RETURNING *`,
    [branchId, date, startTime, endTime, capacity, vehicleId, reason]
  );
  invalidateCacheForBranch(branchId);
  return result.rows[0];
}

async function assignTrainer({ branchId, date, startTime, endTime, trainerId }) {
  if (trainerId) {
    const trainerCheck = await db.query(
      `SELECT id FROM trainers WHERE id = $1 AND branch_id = $2 AND is_active = true`,
      [trainerId, branchId]
    );
    if (!trainerCheck.rows.length) {
      const err = new Error('Trainer not found or inactive for this branch');
      err.status = 400;
      err.errorCode = 'INVALID_TRAINER';
      throw err;
    }
  }

  let slot = await db.query(
    `SELECT id FROM slots WHERE branch_id = $1 AND start_time = $2::timestamptz LIMIT 1`,
    [branchId, startTime]
  );

  if (!slot.rows.length) {
    const windows = await availabilityService.getAvailability({
      branchId,
      date,
      includeAll: true,
      persist: true,
      useCache: false
    });
    const match = (windows.slots || []).find(
      (w) => new Date(w.start_time).toISOString() === new Date(startTime).toISOString()
    );
    if (!match) {
      const err = new Error('Schedule window not found');
      err.status = 404;
      err.errorCode = 'WINDOW_NOT_FOUND';
      throw err;
    }
    const slotId = match.id || match.slot_id;
    if (slotId) {
      slot = { rows: [{ id: slotId }] };
    } else {
      const err = new Error('Unable to materialize slot for trainer assignment');
      err.status = 500;
      err.errorCode = 'SLOT_MATERIALIZE_FAILED';
      throw err;
    }
  }

  const updated = await db.query(
    `UPDATE slots SET trainer_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [trainerId || null, slot.rows[0].id]
  );
  invalidateCacheForBranch(branchId);
  return updated.rows[0];
}

async function updateWindowNotes({ branchId, date, startTime, endTime, reason }) {
  const updated = await db.query(
    `UPDATE schedule_exceptions
     SET reason = $5, updated_at = NOW()
     WHERE branch_id = $1 AND exception_date = $2::date
       AND start_time = $3::timestamptz AND end_time = $4::timestamptz
     RETURNING *`,
    [branchId, date, startTime, endTime, reason]
  );
  if (!updated.rows.length) {
    const err = new Error('No schedule exception found for this window');
    err.status = 404;
    err.errorCode = 'EXCEPTION_NOT_FOUND';
    throw err;
  }
  invalidateCacheForBranch(branchId);
  return updated.rows[0];
}

async function bulkDisableWindows({ branchId, date, windows, reason }) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const created = [];
    for (const window of windows) {
      await client.query(
        `DELETE FROM schedule_exceptions
         WHERE branch_id = $1 AND exception_date = $2::date AND exception_type = 'disabled'
           AND start_time = $3::timestamptz AND end_time = $4::timestamptz`,
        [branchId, date, window.start_time, window.end_time]
      );
      const r = await client.query(
        `INSERT INTO schedule_exceptions
           (branch_id, exception_date, start_time, end_time, exception_type, reason)
         VALUES ($1, $2::date, $3::timestamptz, $4::timestamptz, 'disabled', $5)
         RETURNING *`,
        [branchId, date, window.start_time, window.end_time, reason || 'Bulk disabled by admin']
      );
      if (r.rows[0]) created.push(r.rows[0]);
    }
    await client.query('COMMIT');
    invalidateCacheForBranch(branchId);
    return { disabled: created.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function timelineToCsv(slots) {
  const header = [
    'Time Start',
    'Time End',
    'Status',
    'Capacity',
    'Booked',
    'Remaining',
    'Trainer',
    'Vehicles',
    'Reason'
  ];
  const rows = slots.map((slot) => {
    const vehicles = (slot.vehicle_capacities || [])
      .map((v) => `${v.vehicle_name}:${v.booked}/${v.capacity}`)
      .join('; ');
    return [
      slot.start_time,
      slot.end_time,
      slot.status,
      slot.capacity,
      slot.booked_count,
      slot.remaining_capacity,
      slot.trainer_name || '',
      vehicles,
      slot.reason || ''
    ];
  });
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

module.exports = {
  getBranchContext,
  getAdminTimeline,
  disableWindow,
  enableWindow,
  setCapacityOverride,
  assignTrainer,
  updateWindowNotes,
  bulkDisableWindows,
  timelineToCsv
};
