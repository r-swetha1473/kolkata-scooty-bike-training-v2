const db = require('../db');
const config = require('../app.config');
const bookingRulesSvc = require('../services/bookingRules.service');
const branchSchedule = require('./branch-schedule.service');
const holidayService = require('./holiday.service');
const exceptionsService = require('./exceptions.service');
const capacityService = require('./capacity.service');
const slotEngine = require('./slot-engine');
const scheduleCache = require('./schedule-cache');

async function fetchPersistedSlotsMap(client, branchId, dateString) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const r = await q(
    `SELECT id, start_time, end_time, capacity, booked_count, status, trainer_id
     FROM slots
     WHERE branch_id = $1
       AND COALESCE(slot_date, (start_time AT TIME ZONE 'Asia/Kolkata')::date) = $2::date`,
    [branchId, dateString]
  );
  const map = new Map();
  for (const row of r.rows) {
    map.set(new Date(row.start_time).toISOString(), row);
  }
  return map;
}

async function fetchActiveTrainerId(client, branchId, dateString) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const r = await q(
    `SELECT t.id
     FROM trainers t
     WHERE t.is_active = true
       AND t.branch_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM trainer_leave tl
         WHERE tl.trainer_id = t.id AND tl.leave_date = $2::date
       )
     ORDER BY t.created_at ASC NULLS LAST
     LIMIT 1`,
    [branchId, dateString]
  );
  return r.rows[0]?.id || null;
}

async function materializeSlot(client, window, branchId, capacity, trainerId) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const existing = await q(
    `SELECT * FROM slots WHERE branch_id = $1 AND start_time = $2::timestamptz LIMIT 1`,
    [branchId, window.start_time]
  );
  if (existing.rows[0]) {
    const upd = await q(
      `UPDATE slots SET
         end_time = $2,
         capacity = GREATEST(booked_count, $3),
         trainer_id = COALESCE(trainer_id, $4),
         updated_at = NOW(),
         status = CASE
           WHEN status IN ('cancelled', 'completed', 'disabled') THEN status
           WHEN booked_count >= GREATEST(booked_count, $3) THEN 'full'
           ELSE 'available'
         END
       WHERE id = $1
       RETURNING *`,
      [existing.rows[0].id, window.end_time, capacity, trainerId]
    );
    return upd.rows[0];
  }
  const ins = await q(
    `INSERT INTO slots (
       branch_id, trainer_id, start_time, end_time, slot_date,
       capacity, booked_count, status, is_auto_generated, is_visible
     ) VALUES ($1,$2,$3,$4,$5,$6,0,'available',true,true)
     RETURNING *`,
    [branchId, trainerId, window.start_time, window.end_time, window.slot_date, capacity]
  );
  return ins.rows[0];
}

function isBookableWindow(window, options = {}) {
  const now = Date.now();
  const startMs = new Date(window.start_time).getTime();
  const rules = options.rules || bookingRulesSvc.getBookingRulesSync();
  const visibilityHours =
    options.visibilityHours != null ? Number(options.visibilityHours) : rules.bookingWindowHours;
  const minAdvance =
    options.minAdvanceHours != null ? Number(options.minAdvanceHours) : rules.minAdvanceHours;

  if (startMs <= now) return { ok: false, reason: 'Past slot' };

  const allowSameDay =
    options.allowSameDayBooking != null ? options.allowSameDayBooking : rules.allowSameDayBooking;
  if (allowSameDay === false) {
    const slotDate =
      window.slot_date ||
      new Date(window.start_time).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (slotDate === today) {
      return { ok: false, reason: 'Same-day booking not allowed' };
    }
  }

  if (minAdvance > 0 && startMs < now + minAdvance * 3600000) {
    return { ok: false, reason: 'Minimum advance booking not met' };
  }
  // Always evaluate booking window for the bookable flag (even when includeAll returns the row)
  if (startMs > now + visibilityHours * 3600000) {
    return { ok: false, reason: 'Outside booking window' };
  }
  if (window.remaining_capacity <= 0) return { ok: false, reason: 'Full' };
  if (window.status === 'disabled') return { ok: false, reason: window.disabled_reason || 'Disabled' };
  return { ok: true };
}

/**
 * Compute availability for one branch + date.
 * @param {{ branchId: string, date: string, vehicleId?: string, courseId?: string, includeAll?: boolean, persist?: boolean, useCache?: boolean }} params
 */
async function getAvailability(params) {
  const {
    branchId,
    date,
    vehicleId = null,
    includeAll = false,
    persist = true,
    useCache = true
  } = params;

  const mode = includeAll ? 'all' : 'bookable';
  if (useCache && !includeAll) {
    const cached = scheduleCache.get(branchId, date, vehicleId, mode);
    if (cached) return cached;
  }

  const rules = await bookingRulesSvc.getBookingRules();
  const visibilityHours = rules.bookingWindowHours;

  const branch = await branchSchedule.getBranch(null, branchId);
  if (!branch || !branch.is_active) {
    return { slots: [], meta: { reason: 'Branch inactive or not found' } };
  }

  const closed = await holidayService.isDateClosed(null, branchId, date);
  if (closed.closed && !rules.holidayBookingAllowed && !includeAll) {
    return { slots: [], meta: { reason: closed.reason || 'Closed' } };
  }

  const workingHours = await branchSchedule.getWorkingHours(null, branchId);
  const daySchedule = branchSchedule.getDaySchedule(workingHours, date);
  if (daySchedule?.is_closed) {
    return { slots: [], meta: { reason: 'Branch closed on this day' } };
  }

  const template = await branchSchedule.getSlotTemplate(null, branchId);
  const defaultCapacity = await capacityService.resolveBranchDefaultCapacity(null, branchId);
  const exceptions = await exceptionsService.getExceptionsForDate(null, branchId, date);
  const bookingMap = await capacityService.getBookingCountsBySlot(null, branchId, date);

  const windows = slotEngine.generateSlotWindows({
    dateString: date,
    daySchedule,
    durationMinutes: template.duration_minutes,
    slotCapacity: defaultCapacity
  });

  const trainerId = await fetchActiveTrainerId(null, branchId, date);
  const persistedSlots = await fetchPersistedSlotsMap(null, branchId, date);
  const results = [];

  for (const window of windows) {
    const windowKey = new Date(window.start_time).toISOString();
    const persistedRow = persistedSlots.get(windowKey);
    const disabled = exceptionsService.findDisabledException(exceptions, window.start_time, window.end_time);
    const { totalCapacity, vehicleCapacities, capacitySource } = await capacityService.computeCapacities(
      null,
      branchId,
      exceptions,
      window.start_time,
      window.end_time,
      { vehicleId }
    );

    const bookingEntry = bookingMap.get(window.start_time) || { vehicles: {}, total: 0 };
    const vehicleRows = vehicleCapacities.map((v) => {
      const booked = bookingEntry.vehicles[v.vehicle_id] || 0;
      const remaining = Math.max(0, v.capacity - booked);
      return { ...v, booked, remaining };
    });

    let bookedTotal = bookingEntry.total;
    if (vehicleId) {
      const row = vehicleRows.find((v) => v.vehicle_id === vehicleId);
      bookedTotal = row?.booked || 0;
    }

    const effectiveCapacity = vehicleId
      ? (vehicleRows.find((v) => v.vehicle_id === vehicleId)?.capacity || 0)
      : totalCapacity;
    const bookedForRemaining = persistedRow?.booked_count ?? bookedTotal;
    const remaining = Math.max(0, effectiveCapacity - bookedForRemaining);

    const enriched = {
      ...window,
      branch_id: branchId,
      capacity: effectiveCapacity,
      live_capacity: effectiveCapacity,
      booked_count: persistedRow?.booked_count ?? bookedTotal,
      remaining_capacity: remaining,
      capacity_source: capacitySource,
      vehicle_capacities: vehicleRows,
      trainer_id: persistedRow?.trainer_id || trainerId,
      status: disabled ? 'disabled' : remaining <= 0 ? 'full' : 'available',
      disabled_reason: disabled?.reason || null,
      is_virtual: true
    };

    if (persistedRow?.status === 'disabled') {
      enriched.status = 'disabled';
      enriched.disabled_reason = enriched.disabled_reason || 'Admin disabled';
    }

    if (persistedRow?.id) {
      enriched.id = persistedRow.id;
      enriched.slot_id = persistedRow.id;
      enriched.is_virtual = false;
    }

    const bookable = isBookableWindow(enriched, { includeAll, visibilityHours, rules });
    const outsideWindow = bookable.reason === 'Outside booking window';
    const isFull = bookable.reason === 'Full';

    if (!includeAll) {
      if (!bookable.ok) {
        if (outsideWindow && rules.showSlotsOutsideWindow) {
          // keep for display
        } else if (isFull && rules.showFullyBookedSlots) {
          // keep for display
        } else if (
          rules.slotVisibilityMode === 'disable_unavailable' ||
          rules.slotVisibilityMode === 'show_all_with_status'
        ) {
          // keep for display
        } else {
          continue;
        }
      }
    }

    if (persist && !persistedRow) {
      try {
        const persisted = await materializeSlot(null, window, branchId, totalCapacity, trainerId);
        enriched.id = persisted.id;
        enriched.is_virtual = false;
        enriched.slot_id = persisted.id;
        enriched.booked_count = persisted.booked_count ?? enriched.booked_count;
        if (persisted.status === 'disabled') {
          enriched.status = 'disabled';
          enriched.disabled_reason = enriched.disabled_reason || 'Admin disabled';
        }
      } catch (err) {
        // Unique trainer/time conflicts across branches — keep virtual window for display
        if (err.code !== '23505') throw err;
      }
    }

    if (includeAll || bookable.ok || rules.showSlotsOutsideWindow || rules.showFullyBookedSlots ||
        rules.slotVisibilityMode !== 'hide_unavailable') {
      results.push({
        ...enriched,
        bookable: bookable.ok,
        unavailable_reason: bookable.ok ? null : bookable.reason
      });
    }
  }

  const payload = {
    slots: results.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)),
    meta: {
      branch_id: branchId,
      date,
      engine: 'dynamic',
      generated: windows.length,
      returned: results.length
    }
  };

  if (useCache && !includeAll) {
    scheduleCache.set(branchId, date, vehicleId, mode, payload);
  }

  return payload;
}

function invalidateCacheForBranch(branchId) {
  scheduleCache.invalidateBranch(branchId);
}

module.exports = {
  getAvailability,
  materializeSlot,
  invalidateCacheForBranch,
  isBookableWindow
};
