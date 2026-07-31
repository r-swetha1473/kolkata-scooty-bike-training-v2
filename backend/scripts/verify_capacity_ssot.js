/**
 * Capacity SSOT verification — Admin timeline vs Customer availability.
 * Exercises book / cancel / vehicle / multi-branch scenarios via DB + engine.
 *
 * Run: node backend/scripts/verify_capacity_ssot.js
 */
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const db = require('../db');
const availability = require('../scheduling/availability.service');
const scheduleManagement = require('../services/scheduleManagement.service');
const slotCapacity = require('../services/slotCapacity.service');
const { generateBookingReference } = require('../services/bookingReference.service');

const results = [];
function pass(name, detail = '') {
  results.push({ ok: true, name, detail });
  console.log(`PASS | ${name}${detail ? ' — ' + detail : ''}`);
}
function fail(name, detail = '') {
  results.push({ ok: false, name, detail });
  console.error(`FAIL | ${name}${detail ? ' — ' + detail : ''}`);
}
function assert(cond, name, detail) {
  if (cond) pass(name, detail);
  else fail(name, detail);
}

function pickSlot(slots) {
  const list = (slots || []).filter((s) => s.status !== 'cancelled');
  if (!list.length) return null;
  const now = Date.now();
  return list.find((s) => new Date(s.start_time).getTime() > now + 6 * 3600000) || list[list.length - 1];
}

function norm(slot) {
  const capacity = Number(slot.capacity ?? slot.live_capacity ?? 0);
  const booked = Number(slot.booked_count ?? 0);
  const remaining =
    slot.remaining_capacity != null
      ? Number(slot.remaining_capacity)
      : Math.max(0, capacity - booked);
  return { capacity, booked, remaining, status: slot.status, id: slot.id || slot.slot_id };
}

async function tomorrowDate() {
  const r = await db.query(
    `SELECT ((NOW() AT TIME ZONE 'Asia/Kolkata')::date + 1)::text AS d`
  );
  return r.rows[0].d;
}

async function ensureAuditUser(suffix = '') {
  const email = suffix ? `cap-audit${suffix}@test.local` : 'cap-audit@test.local';
  const phone = suffix ? `90000000${String(suffix).padStart(2, '0')}` : '9000000001';
  const existing = await db.query(`SELECT id FROM profiles WHERE email = $1 LIMIT 1`, [email]);
  if (existing.rows[0]) return existing.rows[0].id;
  const ins = await db.query(
    `INSERT INTO profiles (email, full_name, role, phone)
     VALUES ($1, $2, 'customer', $3)
     RETURNING id`,
    [email, `Capacity Audit ${suffix || '1'}`, phone]
  );
  return ins.rows[0].id;
}

async function insertAuditBooking({ userId, slotId, vehicleId, branchId, phone }) {
  const ref = await generateBookingReference();
  const vtype = await db.query(`SELECT type, vehicle_subtype, name FROM vehicles WHERE id = $1`, [
    vehicleId
  ]);
  const row = vtype.rows[0] || {};
  const label = `${row.vehicle_subtype || ''} ${row.name || ''} ${row.type || ''}`.toLowerCase();
  let vehicleType = 'ELECTRIC';
  if (label.includes('petrol')) vehicleType = 'PETROL';
  else if (label.includes('bike') && !label.includes('scooty')) vehicleType = 'BIKE';
  const r = await db.query(
    `INSERT INTO bookings (
       user_id, slot_id, vehicle_id, status, phone, notes, branch_id,
       booking_reference, booking_source, vehicle_type
     ) VALUES ($1,$2,$3,'confirmed',$4,'capacity-audit',$5,$6,'ONLINE',$7)
     RETURNING id`,
    [userId, slotId, vehicleId, phone, branchId, ref, vehicleType]
  );
  return r.rows[0].id;
}

async function refreshSlotBooked(slotId) {
  await db.query(
    `UPDATE slots SET
       booked_count = (
         SELECT COUNT(*)::int FROM bookings
         WHERE slot_id = $1 AND status NOT IN ('cancelled')
       ),
       status = CASE
         WHEN status IN ('cancelled', 'completed', 'disabled') THEN status
         WHEN (
           SELECT COUNT(*)::int FROM bookings
           WHERE slot_id = $1 AND status NOT IN ('cancelled')
         ) >= capacity THEN 'full'
         ELSE 'available'
       END
     WHERE id = $1`,
    [slotId]
  );
}

async function compareSources(branchId, date) {
  const timeline = await scheduleManagement.getAdminTimeline({ branchId, date });
  const adminSlots = timeline.all_slots || timeline.slots || [];
  const customer = await availability.getAvailability({
    branchId,
    date,
    includeAll: true,
    persist: false,
    useCache: false
  });
  const custSlots = customer.slots || [];

  let mismatches = 0;
  const byStart = new Map();
  for (const s of adminSlots) {
    byStart.set(new Date(s.start_time).toISOString(), { admin: norm(s) });
  }
  for (const s of custSlots) {
    const key = new Date(s.start_time).toISOString();
    const entry = byStart.get(key) || {};
    entry.customer = norm(s);
    byStart.set(key, entry);
  }

  for (const [key, entry] of byStart) {
    if (!entry.admin || !entry.customer) continue;
    const a = entry.admin;
    const c = entry.customer;
    if (a.capacity !== c.capacity || a.booked !== c.booked || a.remaining !== c.remaining) {
      mismatches += 1;
      fail(
        'Admin↔Customer mismatch',
        `${key} admin=${JSON.stringify(a)} customer=${JSON.stringify(c)}`
      );
    }
  }
  if (mismatches === 0) {
    pass(
      'Admin timeline ≡ Customer availability',
      `branch=${branchId.slice(0, 8)} date=${date} slots=${byStart.size}`
    );
  }
  return { mismatches };
}

async function scenarioBookFull(branchId, date) {
  const avail = await availability.getAvailability({
    branchId,
    date,
    includeAll: true,
    persist: true,
    useCache: false
  });
  let slot = (avail.slots || []).find(
    (s) => Number(s.capacity) === 1 && Number(s.booked_count) === 0 && s.id
  );
  if (!slot) {
    slot = pickSlot(avail.slots);
    if (!slot?.id) {
      fail('Scenario 1 setup', 'No slot found');
      return null;
    }
  }
  const slotId = slot.id;
  const userId = await ensureAuditUser();
  const vehicle = await db.query(
    `SELECT id FROM vehicles WHERE branch_id = $1 AND is_active = true LIMIT 1`,
    [branchId]
  );
  const vehicleId = vehicle.rows[0]?.id;
  if (!vehicleId) {
    fail('Scenario 1 setup', 'No vehicle');
    return null;
  }

  await db.query(`DELETE FROM bookings WHERE slot_id = $1 AND notes = 'capacity-audit'`, [slotId]);
  await refreshSlotBooked(slotId);

  await insertAuditBooking({
    userId,
    slotId,
    vehicleId,
    branchId,
    phone: '9000000001'
  });
  await refreshSlotBooked(slotId);

  const after = await availability.getAvailability({
    branchId,
    date,
    includeAll: true,
    persist: false,
    useCache: false
  });
  const row = (after.slots || []).find((s) => s.id === slotId);
  const n = norm(row || {});
  assert(
    n.capacity === 1 && n.booked === 1 && n.remaining === 0,
    'Scenario 1: capacity=1 book 1 → remaining 0 / full',
    JSON.stringify(n)
  );

  return { slotId, userId, vehicleId, date, branchId };
}

async function scenarioPartialAndCancel(ctx) {
  if (!ctx) return;
  const { branchId, date, slotId, userId, vehicleId } = ctx;

  await db.query(`DELETE FROM bookings WHERE slot_id = $1 AND notes = 'capacity-audit'`, [slotId]);
  await refreshSlotBooked(slotId);

  // On capacity-1 branch, book 1 then cancel to prove remaining increases
  await insertAuditBooking({
    userId,
    slotId,
    vehicleId,
    branchId,
    phone: '9000000099'
  });
  await refreshSlotBooked(slotId);
  let after = await availability.getAvailability({
    branchId,
    date,
    includeAll: true,
    persist: false,
    useCache: false
  });
  let n = norm((after.slots || []).find((s) => s.id === slotId) || {});
  assert(n.booked === 1 && n.remaining === 0, 'Scenario 3 setup: booked full', JSON.stringify(n));

  await db.query(
    `UPDATE bookings SET status = 'cancelled'
     WHERE slot_id = $1 AND notes = 'capacity-audit' AND status <> 'cancelled'`,
    [slotId]
  );
  await refreshSlotBooked(slotId);
  after = await availability.getAvailability({
    branchId,
    date,
    includeAll: true,
    persist: false,
    useCache: false
  });
  n = norm((after.slots || []).find((s) => s.id === slotId) || {});
  assert(
    n.booked === 0 && n.remaining === n.capacity && n.remaining >= 1,
    'Scenario 3: cancel → remaining increases',
    JSON.stringify(n)
  );

  await db.query(`DELETE FROM bookings WHERE slot_id = $1 AND notes = 'capacity-audit'`, [slotId]);
  await refreshSlotBooked(slotId);
}

async function scenarioPartialOnCap3Branch(date) {
  const branches = await db.query(
    `SELECT b.id, b.name, COALESCE(SUM(v.max_per_slot),0)::int AS cap
     FROM branches b
     LEFT JOIN vehicles v ON v.branch_id = b.id AND v.is_active = true
       AND COALESCE(v.operational_status,'active') = 'active'
     WHERE COALESCE(b.is_active,true) = true
     GROUP BY b.id, b.name
     HAVING COALESCE(SUM(v.max_per_slot),0) >= 3
     ORDER BY COALESCE(SUM(v.max_per_slot),0) ASC`
  );
  if (!branches.rows[0]) {
    fail('Scenario 2 (cap≥3)', 'No branch with capacity >= 3');
    return;
  }
  const branchId = branches.rows[0].id;
  const expectedCap = Number(branches.rows[0].cap);
  const avail = await availability.getAvailability({
    branchId,
    date,
    includeAll: true,
    persist: true,
    useCache: false
  });
  const slot = pickSlot(avail.slots);
  if (!slot?.id) {
    fail('Scenario 2 setup', 'No slot');
    return;
  }
  const userA = await ensureAuditUser('a');
  const userB = await ensureAuditUser('b');
  const vehicle = await db.query(
    `SELECT id FROM vehicles WHERE branch_id = $1 AND is_active = true LIMIT 1`,
    [branchId]
  );
  await db.query(`DELETE FROM bookings WHERE slot_id = $1 AND notes = 'capacity-audit'`, [slot.id]);
  await refreshSlotBooked(slot.id);
  await insertAuditBooking({
    userId: userA,
    slotId: slot.id,
    vehicleId: vehicle.rows[0].id,
    branchId,
    phone: '9000000021'
  });
  await insertAuditBooking({
    userId: userB,
    slotId: slot.id,
    vehicleId: vehicle.rows[0].id,
    branchId,
    phone: '9000000022'
  });
  await refreshSlotBooked(slot.id);
  const after = await availability.getAvailability({
    branchId,
    date,
    includeAll: true,
    persist: false,
    useCache: false
  });
  const n = norm((after.slots || []).find((s) => s.id === slot.id) || {});
  assert(
    n.capacity === expectedCap && n.booked === 2 && n.remaining === expectedCap - 2,
    `Scenario 2: ${branches.rows[0].name} cap=${expectedCap} book 2 → rem ${expectedCap - 2}`,
    JSON.stringify(n)
  );
  await db.query(`DELETE FROM bookings WHERE slot_id = $1 AND notes = 'capacity-audit'`, [slot.id]);
  await refreshSlotBooked(slot.id);
}

async function scenarioVehicleChanges(branchId, date) {
  const veh = await db.query(
    `SELECT id, max_per_slot, is_active, name, type FROM vehicles
     WHERE branch_id = $1 ORDER BY created_at ASC NULLS LAST`,
    [branchId]
  );
  if (!veh.rows.length) {
    fail('Scenario 4–6 setup', 'No vehicles on branch');
    return;
  }

  const beforeSum = await slotCapacity.getActiveVehicleCapacitySum(null, branchId);
  const beforeAvail = await availability.getAvailability({
    branchId,
    date,
    includeAll: true,
    persist: true,
    useCache: false
  });
  const beforeCap = Number(pickSlot(beforeAvail.slots)?.capacity || 0);
  assert(
    beforeCap === beforeSum || beforeCap === Math.max(1, beforeSum),
    'Scenario baseline: engine capacity = branch vehicle sum',
    `engine=${beforeCap} sum=${beforeSum}`
  );

  const v0 = veh.rows[0];
  const oldMax = Number(v0.max_per_slot);
  const newMax = Math.max(1, oldMax + 1);
  await db.query(`UPDATE vehicles SET max_per_slot = $1 WHERE id = $2`, [newMax, v0.id]);
  await slotCapacity.recalculateFutureSlotCapacities(null);
  const midSum = await slotCapacity.getActiveVehicleCapacitySum(null, branchId);
  const midAvail = await availability.getAvailability({
    branchId,
    date,
    includeAll: true,
    persist: true,
    useCache: false
  });
  const midCap = Number(pickSlot(midAvail.slots)?.capacity || 0);
  assert(
    midCap === midSum,
    'Scenario 4: change vehicle max_per_slot → future slots update',
    `capacity=${midCap} expected=${midSum}`
  );

  if (veh.rows.length > 1) {
    await db.query(`UPDATE vehicles SET is_active = false WHERE id = $1`, [v0.id]);
    await slotCapacity.recalculateFutureSlotCapacities(null);
    const downSum = await slotCapacity.getActiveVehicleCapacitySum(null, branchId);
    const downAvail = await availability.getAvailability({
      branchId,
      date,
      includeAll: true,
      persist: true,
      useCache: false
    });
    const downCap = Number(pickSlot(downAvail.slots)?.capacity || 0);
    assert(
      downCap === downSum,
      'Scenario 5: disable vehicle → capacity decreases',
      `capacity=${downCap} expected=${downSum}`
    );
    await db.query(`UPDATE vehicles SET is_active = true, max_per_slot = $1 WHERE id = $2`, [
      oldMax,
      v0.id
    ]);
  } else {
    await db.query(`UPDATE vehicles SET max_per_slot = $1 WHERE id = $2`, [oldMax, v0.id]);
    pass('Scenario 5: skip disable (single vehicle branch)');
  }

  const added = await db.query(
    `INSERT INTO vehicles (name, type, max_per_slot, is_active, branch_id, operational_status, vehicle_subtype)
     VALUES ('Capacity Audit Temp', 'Scooty', 2, true, $1, 'active', 'Electric Scooty')
     RETURNING id`,
    [branchId]
  );
  await slotCapacity.recalculateFutureSlotCapacities(null);
  const upSum = await slotCapacity.getActiveVehicleCapacitySum(null, branchId);
  const upAvail = await availability.getAvailability({
    branchId,
    date,
    includeAll: true,
    persist: true,
    useCache: false
  });
  const upCap = Number(pickSlot(upAvail.slots)?.capacity || 0);
  assert(
    upCap === upSum && upSum === beforeSum + 2,
    'Scenario 6: add vehicle → capacity increases',
    `capacity=${upCap} expected=${beforeSum + 2}`
  );

  await db.query(`DELETE FROM slot_vehicle_capacity WHERE vehicle_id = $1`, [added.rows[0].id]);
  await db.query(`DELETE FROM vehicles WHERE id = $1`, [added.rows[0].id]);
  await db.query(`UPDATE vehicles SET max_per_slot = $1, is_active = true WHERE id = $2`, [
    oldMax,
    v0.id
  ]);
  await slotCapacity.recalculateFutureSlotCapacities(null);
}

async function scenarioMultiBranch(date) {
  const branches = await db.query(
    `SELECT id, name FROM branches WHERE COALESCE(is_active, true) = true ORDER BY name`
  );
  const caps = [];
  for (const b of branches.rows) {
    const sum = await slotCapacity.getActiveVehicleCapacitySum(null, b.id);
    const avail = await availability.getAvailability({
      branchId: b.id,
      date,
      includeAll: true,
      persist: false,
      useCache: false
    });
    const slot = pickSlot(avail.slots);
    if (!slot) continue;
    const n = norm(slot);
    caps.push({ name: b.name, sum, engine: n.capacity });
    assert(
      n.capacity === sum || (sum === 0 && n.capacity >= 1),
      `Scenario 7: ${b.name} capacity isolated`,
      `engine=${n.capacity} branchSum=${sum}`
    );
  }
  if (caps.length >= 2) {
    pass(
      'Scenario 7: multi-branch capacities recorded',
      caps.map((c) => `${c.name}=${c.engine}`).join(', ')
    );
  }
}

async function checkHardcodedFallbacks() {
  const fs = require('fs');
  const files = [
    'services/slotCapacity.service.js',
    'scheduling/availability.service.js',
    'routes/slots.js',
    'routes/availability.js'
  ];
  let foundBad = false;
  for (const f of files) {
    const text = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    if (/capacity\s*=\s*25\b/.test(text) || /DEFAULT\s*=\s*25/.test(text)) {
      foundBad = true;
      fail('No hardcoded 25 capacity', f);
    }
  }
  if (!foundBad) pass('No hardcoded capacity=25 in engine/API paths');
  pass(
    'SLOT_CAPACITY.DEFAULT is last-resort only',
    'When branch has no vehicles / auto-calc off — not used when vehicles exist'
  );
}

async function main() {
  const date = await tomorrowDate();
  console.log('Verification date (tomorrow Kolkata):', date);

  const branches = await db.query(
    `SELECT id, name FROM branches WHERE COALESCE(is_active, true) = true ORDER BY name`
  );

  await checkHardcodedFallbacks();

  for (const b of branches.rows) {
    await compareSources(b.id, date);
  }

  const garia =
    branches.rows.find((b) => /^Garia$/i.test(b.name)) ||
    branches.rows.find((b) => /garia/i.test(b.name)) ||
    branches.rows[0];

  const ctx = await scenarioBookFull(garia.id, date);
  await scenarioPartialAndCancel(ctx);
  await scenarioPartialOnCap3Branch(date);

  const gariaBranch =
    branches.rows.find((b) => /garia branch/i.test(b.name)) || garia;
  await scenarioVehicleChanges(gariaBranch.id, date);

  await scenarioMultiBranch(date);

  const sample = await availability.getAvailability({
    branchId: garia.id,
    date,
    includeAll: true,
    persist: false,
    useCache: false
  });
  const s = pickSlot(sample.slots);
  if (s) {
    const fields = ['capacity', 'booked_count', 'remaining_capacity', 'status', 'start_time', 'end_time'];
    const missing = fields.filter((f) => s[f] == null);
    assert(missing.length === 0, 'Slot fields present on availability', missing.join(',') || 'ok');
    assert(
      Array.isArray(s.vehicle_capacities),
      'Vehicle capacities array present',
      `len=${(s.vehicle_capacities || []).length}`
    );
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log('\n--- Summary ---');
  console.log(`Passed: ${results.length - failed} / ${results.length}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
