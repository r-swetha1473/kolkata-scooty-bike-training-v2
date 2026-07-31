#!/usr/bin/env node
/**
 * Production demo data seed — idempotent, tagged with is_demo / demo emails.
 * Usage: cd backend && node scripts/seed_demo_production.js
 * Requires: migration 20260724240000_demo_data_and_progress.sql applied
 */
require('dotenv').config();
const db = require('../db');
const { parseClassCount } = require('../services/customerProgress.service');
const { inferVehicleType } = require('../utils/vehicleType');

const DEMO_EMAIL_DOMAIN = '@demo.kolkata-scooty.test';

const BRANCHES = [
  {
    slug: 'netaji-metro',
    name: 'Netaji Metro Branch',
    address: 'Netaji Metro Station, Kolkata',
    opening_time: '07:00',
    closing_time: '21:00',
    slot_duration_minutes: 30,
    default_slot_capacity: 6,
    working_days: [1, 2, 3, 4, 5, 6]
  },
  {
    slug: 'garia',
    name: 'Garia Branch',
    address: 'Garia, Kolkata',
    opening_time: '08:00',
    closing_time: '20:00',
    slot_duration_minutes: 45,
    default_slot_capacity: 4,
    working_days: [1, 2, 3, 4, 5, 6, 0]
  },
  {
    slug: 'salt-lake',
    name: 'Salt Lake Branch',
    address: 'Salt Lake Sector V, Kolkata',
    opening_time: '09:00',
    closing_time: '18:00',
    slot_duration_minutes: 60,
    default_slot_capacity: 5,
    working_days: [1, 2, 3, 4, 5]
  }
];

const VEHICLES = [
  { branch: 'netaji-metro', name: 'Scooty 01', max_per_slot: 2, vehicle_type: 'Scooty Petrol', operational_status: 'active', is_active: true },
  { branch: 'netaji-metro', name: 'Scooty 02', max_per_slot: 2, vehicle_type: 'Scooty Petrol', operational_status: 'active', is_active: true },
  { branch: 'netaji-metro', name: 'Bike 01', max_per_slot: 1, vehicle_type: 'Bike', operational_status: 'maintenance', is_active: true },
  { branch: 'garia', name: 'Scooty 03', max_per_slot: 2, vehicle_type: 'Scooty Electric', operational_status: 'active', is_active: true },
  { branch: 'garia', name: 'Bike 02', max_per_slot: 1, vehicle_type: 'Bike', operational_status: 'inactive', is_active: false },
  { branch: 'salt-lake', name: 'Scooty 04', max_per_slot: 2, vehicle_type: 'Scooty Petrol', operational_status: 'active', is_active: true },
  { branch: 'salt-lake', name: 'Scooty 05', max_per_slot: 3, vehicle_type: 'Scooty Electric', operational_status: 'active', is_active: true }
];

const TRAINERS = [
  { branch: 'netaji-metro', name: 'Rahul Sharma', email: 'trainer.rahul' + DEMO_EMAIL_DOMAIN, active: true, on_leave: false },
  { branch: 'netaji-metro', name: 'Priya Das', email: 'trainer.priya' + DEMO_EMAIL_DOMAIN, active: true, on_leave: true },
  { branch: 'garia', name: 'Amit Roy', email: 'trainer.amit' + DEMO_EMAIL_DOMAIN, active: true, on_leave: false },
  { branch: 'salt-lake', name: 'Sneha Banerjee', email: 'trainer.sneha' + DEMO_EMAIL_DOMAIN, active: false, on_leave: false }
];

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function kolkataToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

async function upsertBranch(b) {
  const r = await db.query(
    `INSERT INTO branches (name, slug, address, opening_time, closing_time, slot_duration_minutes,
                           default_slot_capacity, working_days, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name, address = EXCLUDED.address,
       opening_time = EXCLUDED.opening_time, closing_time = EXCLUDED.closing_time,
       slot_duration_minutes = EXCLUDED.slot_duration_minutes,
       default_slot_capacity = EXCLUDED.default_slot_capacity,
       working_days = EXCLUDED.working_days, updated_at = NOW()
     RETURNING id, slug`,
    [b.name, b.slug, b.address, b.opening_time, b.closing_time, b.slot_duration_minutes, b.default_slot_capacity, b.working_days]
  );
  const branchId = r.rows[0].id;
  for (let d = 0; d <= 6; d += 1) {
    const open = b.working_days.includes(d);
    await db.query(
      `INSERT INTO branch_working_hours (branch_id, day_of_week, opens_at, closes_at, is_closed)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (branch_id, day_of_week) DO UPDATE SET
         opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
         is_closed = EXCLUDED.is_closed, updated_at = NOW()`,
      [branchId, d, b.opening_time, b.closing_time, !open]
    );
  }
  await db.query(
    `INSERT INTO slot_templates (branch_id, duration_minutes, is_active)
     VALUES ($1,$2,true)
     ON CONFLICT (branch_id) DO UPDATE SET duration_minutes = EXCLUDED.duration_minutes, updated_at = NOW()`,
    [branchId, b.slot_duration_minutes]
  );
  return branchId;
}

async function upsertProfile({ email, full_name, phone, role = 'customer' }) {
  const existing = await db.query(`SELECT id FROM profiles WHERE email = $1`, [email]);
  if (existing.rows[0]) return existing.rows[0].id;
  const r = await db.query(
    `INSERT INTO profiles (email, full_name, phone, role)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [email, full_name, phone, role]
  );
  return r.rows[0].id;
}

async function createSlot(branchId, trainerId, dateStr, hourIst, minuteIst, durationMin, capacity) {
  const startUtcH = hourIst - 5;
  let startUtcM = minuteIst - 30;
  let adjH = startUtcH;
  if (startUtcM < 0) { startUtcM += 60; adjH -= 1; }
  if (adjH < 0) adjH += 24;
  const [y, m, d] = dateStr.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, adjH, startUtcM, 0));
  const end = new Date(start.getTime() + durationMin * 60000);
  const ins = await db.query(
    `INSERT INTO slots (branch_id, trainer_id, start_time, end_time, slot_date, capacity, booked_count, status, is_auto_generated, is_visible)
     VALUES ($1,$2,$3,$4,$5,$6,0,'available',true,true)
     RETURNING id`,
    [branchId, trainerId, start.toISOString(), end.toISOString(), dateStr, capacity]
  ).catch(async () => ({ rows: [] }));
  if (ins.rows[0]) return ins.rows[0].id;
  const found = await db.query(
    `SELECT id FROM slots WHERE branch_id = $1 AND start_time = $2 LIMIT 1`,
    [branchId, start.toISOString()]
  );
  return found.rows[0]?.id;
}

async function main() {
  console.log('=== Demo production seed ===');
  const existingDemo = await db.query(
    `SELECT COUNT(*)::int AS c FROM profiles WHERE email LIKE '%@demo.kolkata-scooty.test' AND role = 'customer'`
  );
  if (existingDemo.rows[0].c >= 15) {
    console.log('Demo data already present — skipping seed.');
    process.exit(0);
  }

  const branchIds = {};
  for (const b of BRANCHES) {
    branchIds[b.slug] = await upsertBranch(b);
    console.log(`Branch: ${b.name}`);
  }

  const vehicleIds = {};
  for (const v of VEHICLES) {
    const branchId = branchIds[v.branch];
    const ex = await db.query(`SELECT id FROM vehicles WHERE name = $1 AND branch_id = $2`, [v.name, branchId]);
    let r;
    if (ex.rows[0]) {
      r = await db.query(
        `UPDATE vehicles SET max_per_slot = $2, is_active = $3, operational_status = $4, vehicle_type = $5, type = $6, updated_at = NOW()
         WHERE id = $1 RETURNING id`,
        [ex.rows[0].id, v.max_per_slot, v.is_active, v.operational_status, v.vehicle_type, inferVehicleType(v.name)]
      );
    } else {
      r = await db.query(
        `INSERT INTO vehicles (name, max_per_slot, is_active, branch_id, vehicle_type, operational_status, type)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [v.name, v.max_per_slot, v.is_active, branchId, v.vehicle_type, v.operational_status, inferVehicleType(v.name)]
      );
    }
    vehicleIds[v.name] = r.rows[0].id;
  }
  console.log(`Vehicles: ${Object.keys(vehicleIds).length}`);

  const trainerIds = {};
  const today = kolkataToday();
  for (const t of TRAINERS) {
    const userId = await upsertProfile({
      email: t.email,
      full_name: t.name,
      phone: `9800${String(Object.keys(trainerIds).length + 1).padStart(6, '0')}`,
      role: 'trainer'
    });
    const branchId = branchIds[t.branch];
    const ex = await db.query(`SELECT id FROM trainers WHERE user_id = $1`, [userId]);
    let tr;
    if (ex.rows[0]) {
      tr = await db.query(
        `UPDATE trainers SET is_active = $2, branch_id = $3, updated_at = NOW() WHERE user_id = $1 RETURNING id`,
        [userId, t.active, branchId]
      );
    } else {
      tr = await db.query(
        `INSERT INTO trainers (user_id, bio, experience_years, specialization, is_active, rating, branch_id)
         VALUES ($1,'Demo trainer',5,$2,$3,4.5,$4) RETURNING id`,
        [userId, ['Scooty', 'Bike'], t.active, branchId]
      );
    }
    trainerIds[t.name] = tr.rows[0].id;
    if (t.on_leave) {
      await db.query(
        `INSERT INTO trainer_leave (trainer_id, leave_date, reason, is_demo)
         VALUES ($1,$2,'Demo leave day',true)
         ON CONFLICT (trainer_id, leave_date) DO NOTHING`,
        [trainerIds[t.name], today]
      );
    }
  }
  console.log(`Trainers: ${Object.keys(trainerIds).length}`);

  const courses = await db.query(`SELECT id, slug, name, class_count, duration_label, amount_inr FROM courses WHERE is_active = true ORDER BY sort_order`);
  const courseBySlug = Object.fromEntries(courses.rows.map((c) => [c.slug, c]));

  const customerIds = [];
  const customerSpecs = [
    { status: 'pending_payment', attendance: 'SCHEDULED' },
    { status: 'confirmed', attendance: 'SCHEDULED' },
    { status: 'confirmed', attendance: 'ATTENDED' },
    { status: 'completed', attendance: 'ATTENDED' },
    { status: 'cancelled', attendance: 'CANCELLED' },
    { status: 'no_show', attendance: 'NO_SHOW' },
    { status: 'pending_payment', attendance: 'SCHEDULED' },
    { status: 'confirmed', attendance: 'ATTENDED' },
    { status: 'confirmed', attendance: 'ATTENDED' },
    { status: 'completed', attendance: 'ATTENDED' },
    { status: 'pending_payment', attendance: 'SCHEDULED' },
    { status: 'confirmed', attendance: 'SCHEDULED' },
    { status: 'confirmed', attendance: 'ATTENDED' },
    { status: 'cancelled', attendance: 'CANCELLED' },
    { status: 'confirmed', attendance: 'ATTENDED' }
  ];

  for (let i = 0; i < 15; i += 1) {
    const id = await upsertProfile({
      email: `demo.customer${String(i + 1).padStart(2, '0')}${DEMO_EMAIL_DOMAIN}`,
      full_name: `Demo Customer ${i + 1}`,
      phone: `98765${String(i + 1).padStart(5, '0')}`
    });
    customerIds.push({ id, spec: customerSpecs[i] });
  }
  console.log(`Customers: ${customerIds.length}`);

  const branchSlugs = ['netaji-metro', 'garia', 'salt-lake'];
  const courseSlugs = ['basic-scooty', 'advanced-scooty', 'bike-training', 'doorstep', 'rto-assistance'];
  let bookingCount = 0;

  for (let i = 0; i < customerIds.length; i += 1) {
    const { id: userId, spec } = customerIds[i];
    const branchSlug = branchSlugs[i % branchSlugs.length];
    const branchId = branchIds[branchSlug];
    const branchCfg = BRANCHES.find((b) => b.slug === branchSlug);
    const courseSlug = courseSlugs[i % courseSlugs.length];
    const course = courseBySlug[courseSlug];
    if (!course) continue;

    const trainerName = Object.keys(trainerIds).find((n) => TRAINERS.find((t) => t.name === n && t.branch === branchSlug && t.active));
    const trainerId = trainerName ? trainerIds[trainerName] : null;
    const vehicleName = VEHICLES.find((v) => v.branch === branchSlug && v.operational_status === 'active')?.name;
    const vehicleId = vehicleName ? vehicleIds[vehicleName] : null;

    const dateStr = addDays(today, (i % 10) + 1);
    const slotId = await createSlot(
      branchId,
      trainerId,
      dateStr,
      10 + (i % 6),
      (i % 2) * 30,
      branchCfg.slot_duration_minutes,
      branchCfg.default_slot_capacity
    );
    if (!slotId || !vehicleId) continue;

    const phone = `98765${String(i + 1).padStart(5, '0')}`;
    const existing = await db.query(
      `SELECT id FROM bookings WHERE user_id = $1 AND slot_id = $2 LIMIT 1`,
      [userId, slotId]
    );
    if (existing.rows[0]) continue;

    const bk = await db.query(
      `INSERT INTO bookings (user_id, slot_id, trainer_id, vehicle_id, phone, status, branch_id, course_id, attendance_status, booking_source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ONLINE')
       RETURNING *`,
      [userId, slotId, trainerId, vehicleId, phone, spec.status, branchId, course.id, spec.attendance]
    );
    const booking = bk.rows[0];
    bookingCount += 1;

    await db.query(
      `UPDATE slots SET booked_count = booked_count + 1 WHERE id = $1`,
      [slotId]
    );

    let payStatus = 'pending_upload';
    let paymentStatusEnroll = 'pending';
    if (['confirmed', 'completed'].includes(spec.status)) {
      payStatus = 'verified';
      paymentStatusEnroll = 'approved';
    } else if (spec.status === 'cancelled') {
      payStatus = 'rejected';
      paymentStatusEnroll = 'rejected';
    } else if (i % 5 === 2) {
      payStatus = 'pending_verification';
      paymentStatusEnroll = 'uploaded';
    }

    await db.query(
      `INSERT INTO payments (booking_id, user_id, amount, currency, status, reference_number)
       SELECT $1,$2,$3,'INR',$4,$5
       WHERE NOT EXISTS (SELECT 1 FROM payments WHERE booking_id = $1)`,
      [booking.id, userId, course.amount_inr || 2500, payStatus, payStatus !== 'pending_upload' ? `DEMO-REF-${i + 1}` : null]
    );

    const classesPurchased = parseClassCount(course);
    const classesCompleted = spec.attendance === 'ATTENDED' ? Math.min(8, classesPurchased) : i % 4;
    await db.query(
      `INSERT INTO course_enrollments (
         user_id, course_id, branch_id, trainer_id, classes_purchased, classes_completed,
         payment_status, certificate_status, course_status, is_demo, last_class_at, next_class_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10,$11)
       ON CONFLICT (user_id, course_id, branch_id) DO UPDATE SET
         classes_completed = EXCLUDED.classes_completed,
         payment_status = EXCLUDED.payment_status,
         course_status = EXCLUDED.course_status,
         trainer_id = EXCLUDED.trainer_id,
         updated_at = NOW()`,
      [
        userId,
        course.id,
        branchId,
        trainerId,
        classesPurchased,
        classesCompleted,
        paymentStatusEnroll,
        spec.status === 'completed' ? 'pending' : 'not_applicable',
        spec.status === 'completed' ? 'completed' : classesCompleted > 0 ? 'in_progress' : 'not_started',
        spec.attendance === 'ATTENDED' ? new Date().toISOString() : null,
        ['confirmed', 'pending_payment'].includes(spec.status) ? addDays(dateStr, 0) + 'T10:00:00.000Z' : null
      ]
    );
  }

  console.log(`Bookings created/updated: ${bookingCount}`);
  console.log('Demo seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
