const db = require('../db');
const slotCapacityService = require('../services/slotCapacity.service');
const exceptionsService = require('./exceptions.service');

async function getBranchVehicles(client, branchId, { vehicleId = null, vehicleType = null } = {}) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  let sql = `
    SELECT id, name, max_per_slot, is_active, branch_id, operational_status, vehicle_type
    FROM vehicles
    WHERE branch_id = $1 AND is_active = true AND operational_status = 'active'
  `;
  const params = [branchId];
  if (vehicleId) {
    params.push(vehicleId);
    sql += ` AND id = $${params.length}`;
  }
  if (vehicleType) {
    params.push(vehicleType);
    sql += ` AND COALESCE(vehicle_type, name) ILIKE $${params.length}`;
  }
  sql += ' ORDER BY name';
  const r = await q(sql, params);
  return r.rows;
}

async function resolveBranchDefaultCapacity(client, branchId) {
  return slotCapacityService.resolveSlotCapacity(client, branchId);
}

/**
 * Capacity priority: manual exception override → vehicle sum → branch default.
 */
async function computeCapacities(client, branchId, exceptions, startTimeIso, endTimeIso, options = {}) {
  const vehicles = await getBranchVehicles(client, branchId, options);
  const override = exceptionsService.findCapacityOverride(
    exceptions,
    startTimeIso,
    endTimeIso,
    options.vehicleId || null
  );

  const vehicleCapacities = vehicles.map((v) => ({
    vehicle_id: v.id,
    vehicle_name: v.name,
    capacity: v.max_per_slot,
    vehicle_type: v.vehicle_type
  }));

  let totalCapacity = vehicleCapacities.reduce((sum, v) => sum + (v.capacity || 0), 0);
  if (totalCapacity <= 0) {
    totalCapacity = await resolveBranchDefaultCapacity(client, branchId);
  }

  if (override != null) {
    totalCapacity = override;
  }

  return { totalCapacity, vehicleCapacities, capacitySource: override != null ? 'override' : 'vehicles' };
}

async function getBookingCountsBySlot(client, branchId, dateString) {
  const q = client ? client.query.bind(client) : db.query.bind(db);
  const r = await q(
    `SELECT s.id AS slot_id, s.start_time, s.end_time,
            b.vehicle_id, COUNT(*)::int AS booked
     FROM slots s
     LEFT JOIN bookings b ON b.slot_id = s.id AND b.status NOT IN ('cancelled')
     WHERE s.branch_id = $1
       AND COALESCE(s.slot_date, (s.start_time AT TIME ZONE 'Asia/Kolkata')::date) = $2::date
     GROUP BY s.id, s.start_time, s.end_time, b.vehicle_id`,
    [branchId, dateString]
  );

  const byStart = new Map();
  for (const row of r.rows) {
    const key = new Date(row.start_time).toISOString();
    if (!byStart.has(key)) {
      byStart.set(key, { slot_id: row.slot_id, start_time: row.start_time, end_time: row.end_time, vehicles: {}, total: 0 });
    }
    const entry = byStart.get(key);
    if (row.vehicle_id) {
      entry.vehicles[row.vehicle_id] = row.booked;
      entry.total += row.booked;
    }
  }
  return byStart;
}

module.exports = {
  getBranchVehicles,
  computeCapacities,
  getBookingCountsBySlot,
  resolveBranchDefaultCapacity
};
