/**
 * Per-slot vehicle capacity overrides.
 * SLOT_VEHICLE_OVERRIDES_ENABLED defaults on. Set to 0/false/off to restore
 * the previous behaviour (global max_per_slot overwrite, ignore is_enabled).
 */

const db = require('../db');

function invalidateBranchCache(branchId) {
  if (!branchId) return;
  // Lazy require: availability.service loads capacity, which loads this module.
  const { invalidateCacheForBranch } = require('../scheduling/availability.service');
  invalidateCacheForBranch(branchId);
}

function isSlotVehicleOverridesEnabled() {
  const raw = process.env.SLOT_VEHICLE_OVERRIDES_ENABLED;
  if (raw == null || String(raw).trim() === '') return true;
  return !['0', 'false', 'off', 'no'].includes(String(raw).trim().toLowerCase());
}

/** Bookable seats for one vehicle on one slot. Disabled override => 0. */
function effectiveBookableCapacity(row, vehicleMaxPerSlot, overridesEnabled = isSlotVehicleOverridesEnabled()) {
  const fallback = Math.max(0, Number(vehicleMaxPerSlot) || 0);
  if (!row) return fallback;
  if (overridesEnabled && row.is_enabled === false) return 0;
  const stored = Number(row.capacity);
  return Number.isFinite(stored) ? stored : fallback;
}

/** Capacity value a sync may write. Manual rows keep their stored capacity. */
function nextCapacityAfterSync(row, vehicleMaxPerSlot, overridesEnabled = isSlotVehicleOverridesEnabled()) {
  const next = Math.max(0, Number(vehicleMaxPerSlot) || 0);
  if (!overridesEnabled) return next;
  if (row && row.is_manual_override === true) return Number(row.capacity);
  return next;
}

/**
 * Whether a capacity row should remain after a prune of inactive / wrong-branch vehicles.
 * Manual overrides and per-slot disables are kept when overrides are enabled.
 */
function rowSurvivesPrune(row, { vehicleActive, sameBranch, overridesEnabled = isSlotVehicleOverridesEnabled() }) {
  if (vehicleActive && sameBranch) return true;
  if (!overridesEnabled) return false;
  if (!row) return false;
  if (row.is_manual_override === true || row.is_enabled === false) return true;
  return false;
}

function sqlEffectiveVehicleCapacity(slotRef, vehicleRef, maxRef) {
  if (!isSlotVehicleOverridesEnabled()) {
    return `COALESCE((SELECT svc.capacity FROM slot_vehicle_capacity svc WHERE svc.slot_id = ${slotRef} AND svc.vehicle_id = ${vehicleRef}), ${maxRef})`;
  }
  return `COALESCE((SELECT CASE WHEN svc.is_enabled = false THEN 0 ELSE svc.capacity END FROM slot_vehicle_capacity svc WHERE svc.slot_id = ${slotRef} AND svc.vehicle_id = ${vehicleRef}), ${maxRef})`;
}

function sqlDisplayedVehicleCapacity(alias = 'svc') {
  if (!isSlotVehicleOverridesEnabled()) return `${alias}.capacity`;
  return `CASE WHEN COALESCE(${alias}.is_enabled, true) = false THEN 0 ELSE ${alias}.capacity END`;
}

/** JSON fields for slot list queries. Omits override columns when the feature flag is off. */
function sqlVehicleCapacityJsonFields(alias = 'svc') {
  if (!isSlotVehicleOverridesEnabled()) {
    return `'capacity', ${alias}.capacity`;
  }
  return `'capacity', CASE WHEN COALESCE(${alias}.is_enabled, true) = false THEN 0 ELSE ${alias}.capacity END, 'is_enabled', COALESCE(${alias}.is_enabled, true), 'configured_capacity', ${alias}.capacity, 'is_manual_override', COALESCE(${alias}.is_manual_override, false)`;
}

async function query(client, sql, params) {
  if (client) return client.query(sql, params);
  return db.query(sql, params);
}

async function recomputeSlotCapacity(slotId, client = null) {
  if (!isSlotVehicleOverridesEnabled()) return null;
  const result = await query(
    client,
    `
    UPDATE slots s
    SET capacity = GREATEST(
          s.booked_count,
          COALESCE((
            SELECT SUM(svc.capacity)::int
            FROM slot_vehicle_capacity svc
            WHERE svc.slot_id = s.id AND svc.is_enabled = true
          ), 0),
          1
        ),
        capacity_exceeded = (
          s.booked_count > COALESCE((
            SELECT SUM(svc.capacity)::int
            FROM slot_vehicle_capacity svc
            WHERE svc.slot_id = s.id AND svc.is_enabled = true
          ), 0)
        ),
        updated_at = NOW(),
        status = CASE
          WHEN s.status IN ('cancelled', 'completed', 'disabled') THEN s.status
          WHEN COALESCE((
            SELECT SUM(svc.capacity)::int
            FROM slot_vehicle_capacity svc
            WHERE svc.slot_id = s.id AND svc.is_enabled = true
          ), 0) <= 0
            OR s.booked_count >= COALESCE((
              SELECT SUM(svc.capacity)::int
              FROM slot_vehicle_capacity svc
              WHERE svc.slot_id = s.id AND svc.is_enabled = true
            ), 0)
            THEN 'full'
          ELSE 'available'
        END
    WHERE s.id = $1
    RETURNING id, branch_id, capacity, booked_count, status, capacity_exceeded
    `,
    [slotId]
  );
  return result.rows[0] || null;
}

async function countActiveBookings(slotId, vehicleId, client = null) {
  const result = await query(
    client,
    `SELECT COUNT(*)::int AS count
     FROM bookings
     WHERE slot_id = $1 AND vehicle_id = $2 AND status NOT IN ('cancelled')`,
    [slotId, vehicleId]
  );
  return parseInt(result.rows[0]?.count || 0, 10);
}

/**
 * Set per-slot enablement and/or capacity. Marks the row as a manual override.
 * Does not delete or alter existing bookings.
 */
async function setSlotVehicleSetting({ slotId, vehicleId, capacity, isEnabled, client = null }) {
  const slot = await query(client, `SELECT id, branch_id FROM slots WHERE id = $1`, [slotId]);
  if (!slot.rows[0]) {
    const error = new Error('Slot not found');
    error.status = 404;
    error.errorCode = 'SLOT_NOT_FOUND';
    throw error;
  }

  const vehicle = await query(
    client,
    `SELECT id, name, max_per_slot, branch_id, is_active FROM vehicles WHERE id = $1`,
    [vehicleId]
  );
  if (!vehicle.rows[0]) {
    const error = new Error('Vehicle not found');
    error.status = 404;
    error.errorCode = 'VEHICLE_NOT_FOUND';
    throw error;
  }
  if (String(vehicle.rows[0].branch_id) !== String(slot.rows[0].branch_id)) {
    const error = new Error('Vehicle does not belong to this slot branch');
    error.status = 400;
    error.errorCode = 'BRANCH_VEHICLE_MISMATCH';
    throw error;
  }

  const existing = await query(
    client,
    `SELECT capacity, is_enabled FROM slot_vehicle_capacity WHERE slot_id = $1 AND vehicle_id = $2`,
    [slotId, vehicleId]
  );
  const current = existing.rows[0];

  let nextCapacity = current ? parseInt(current.capacity, 10) : parseInt(vehicle.rows[0].max_per_slot, 10);
  if (capacity !== undefined && capacity !== null && capacity !== '') {
    nextCapacity = parseInt(capacity, 10);
    if (!Number.isFinite(nextCapacity) || nextCapacity < 1) {
      const error = new Error('capacity must be at least 1. Disable the vehicle for this slot instead of setting 0.');
      error.status = 400;
      error.errorCode = 'INVALID_CAPACITY';
      throw error;
    }
  }

  let nextEnabled = current ? current.is_enabled !== false : true;
  if (isEnabled !== undefined && isEnabled !== null) {
    nextEnabled = Boolean(isEnabled);
  }

  const affectedBookings = await countActiveBookings(slotId, vehicleId, client);

  if (current && nextCapacity < affectedBookings && nextEnabled) {
    const error = new Error(
      `Cannot reduce capacity below ${affectedBookings} existing booking(s) for this vehicle on this slot`
    );
    error.status = 400;
    error.errorCode = 'INVALID_CAPACITY';
    throw error;
  }

  await query(
    client,
    `
    INSERT INTO slot_vehicle_capacity (slot_id, vehicle_id, capacity, is_enabled, is_manual_override)
    VALUES ($1, $2, $3, $4, true)
    ON CONFLICT (slot_id, vehicle_id) DO UPDATE
      SET capacity = EXCLUDED.capacity,
          is_enabled = EXCLUDED.is_enabled,
          is_manual_override = true,
          updated_at = NOW()
    `,
    [slotId, vehicleId, nextCapacity, nextEnabled]
  );

  const slotRow = await recomputeSlotCapacity(slotId, client);
  invalidateBranchCache(slot.rows[0].branch_id);

  return {
    slot_id: slotId,
    vehicle_id: vehicleId,
    vehicle_name: vehicle.rows[0].name,
    capacity: nextCapacity,
    is_enabled: nextEnabled,
    is_manual_override: true,
    affected_bookings: affectedBookings,
    slot: slotRow
  };
}

/**
 * Clear manual flags on one slot, then let the normal sync copy max_per_slot
 * onto those rows and recompute that slot's seat total.
 */
async function resetSlotVehicleOverrides(slotId) {
  const slot = await db.query(`SELECT id, branch_id FROM slots WHERE id = $1`, [slotId]);
  if (!slot.rows[0]) {
    const error = new Error('Slot not found');
    error.status = 404;
    error.errorCode = 'SLOT_NOT_FOUND';
    throw error;
  }

  await db.query(
    `
    UPDATE slot_vehicle_capacity svc
    SET is_manual_override = false,
        is_enabled = true,
        capacity = v.max_per_slot,
        updated_at = NOW()
    FROM vehicles v
    WHERE svc.slot_id = $1
      AND svc.vehicle_id = v.id
    `,
    [slotId]
  );

  const { syncSlotVehicleCapacities } = require('./slotCapacity.service');
  await syncSlotVehicleCapacities([slotId]);
  const slotRow = await recomputeSlotCapacity(slotId);
  invalidateBranchCache(slot.rows[0].branch_id);
  return { slot_id: slotId, slot: slotRow };
}

async function listManualOverrideSlots(branchId) {
  const result = await db.query(
    `
    SELECT s.id,
           s.branch_id,
           s.start_time,
           s.end_time,
           s.slot_date,
           s.capacity,
           json_agg(
             json_build_object(
               'vehicle_id', v.id,
               'vehicle_name', v.name,
               'capacity', svc.capacity,
               'is_enabled', svc.is_enabled
             )
             ORDER BY v.name
           ) AS vehicles
    FROM slots s
    JOIN slot_vehicle_capacity svc
      ON svc.slot_id = s.id AND svc.is_manual_override = true
    JOIN vehicles v ON v.id = svc.vehicle_id
    WHERE ($1::uuid IS NULL OR s.branch_id = $1::uuid)
      AND COALESCE(s.slot_date, (s.start_time AT TIME ZONE 'Asia/Kolkata')::date)
          >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date
    GROUP BY s.id
    ORDER BY s.start_time ASC
    LIMIT 50
    `,
    [branchId || null]
  );
  return result.rows;
}

module.exports = {
  isSlotVehicleOverridesEnabled,
  effectiveBookableCapacity,
  nextCapacityAfterSync,
  rowSurvivesPrune,
  sqlEffectiveVehicleCapacity,
  sqlDisplayedVehicleCapacity,
  sqlVehicleCapacityJsonFields,
  recomputeSlotCapacity,
  countActiveBookings,
  setSlotVehicleSetting,
  resetSlotVehicleOverrides,
  listManualOverrideSlots
};
