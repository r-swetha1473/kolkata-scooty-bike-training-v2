/**
 * Verify offline booking payment flow scenarios.
 * Run from backend/: node scripts/verify_offline_payment_flow.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs');
const db = require('../db');
const offlineBookingService = require('../services/offlineBooking.service');
const paymentService = require('../services/payment.service');
const bookingAdminService = require('../services/bookingAdmin.service');

async function pickSlotAndVehicle() {
  const r = await db.query(
    `SELECT s.id AS slot_id, v.id AS vehicle_id, s.branch_id, c.id AS course_id, c.amount_inr
     FROM slots s
     JOIN vehicles v ON v.branch_id = s.branch_id AND v.is_active = true
     LEFT JOIN courses c ON c.is_active = true
     WHERE s.status IN ('available', 'full')
       AND s.slot_date >= CURRENT_DATE
       AND s.booked_count < s.capacity
     ORDER BY s.slot_date ASC, s.start_time ASC
     LIMIT 1`
  );
  if (!r.rows.length) throw new Error('No bookable slot/vehicle found for tests');
  return r.rows[0];
}

async function pickAdmin() {
  const r = await db.query(
    `SELECT id FROM profiles WHERE role IN ('admin','superadmin') ORDER BY created_at ASC LIMIT 1`
  );
  if (!r.rows.length) throw new Error('No admin profile found');
  return r.rows[0].id;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const results = [];
  const adminId = await pickAdmin();
  const base = await pickSlotAndVehicle();
  console.log('Using slot', base.slot_id, 'vehicle', base.vehicle_id, 'admin', adminId);

  // 1) Pending payment
  {
    const created = await offlineBookingService.createOfflineBooking(adminId, {
      slot_id: base.slot_id,
      vehicle_id: base.vehicle_id,
      customer_name: `Pending Test ${Date.now()}`,
      phone: '9876543210',
      course_id: base.course_id || undefined,
      payment_mode: 'pending'
    });
    assert(created.status === 'pending_payment', `Expected pending_payment, got ${created.status}`);
    assert(created.payment?.status === 'pending_upload', `Expected pending_upload payment`);
    const pendingList = await paymentService.listAdminPayments({ status: 'pending' });
    assert(
      pendingList.some((p) => p.id === created.payment.id),
      'Pending offline payment missing from Payment Approval (needs attention)'
    );
    results.push({ scenario: 'Offline booking without payment → Pending Payment', pass: true, bookingId: created.id });
  }

  // 2) Cash paid → approved immediately
  {
    const created = await offlineBookingService.createOfflineBooking(adminId, {
      slot_id: base.slot_id,
      vehicle_id: base.vehicle_id,
      customer_name: `Cash Test ${Date.now()}`,
      course_id: base.course_id || undefined,
      payment_mode: 'complete_now',
      payment_method: 'cash',
      amount_paid: base.amount_inr || 500,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_status: 'paid',
      reference_number: `CASH-${Date.now()}`
    });
    assert(created.status === 'confirmed', `Cash booking should be confirmed, got ${created.status}`);
    assert(created.payment?.status === 'verified', `Cash payment should be verified, got ${created.payment?.status}`);
    const pendingList = await paymentService.listAdminPayments({ status: 'pending' });
    assert(
      !pendingList.some((p) => p.id === created.payment.id),
      'Verified cash payment should NOT appear in pending approval'
    );
    const verifiedList = await paymentService.listAdminPayments({ status: 'verified' });
    assert(
      verifiedList.some((p) => p.id === created.payment.id),
      'Verified cash payment should appear as Approved'
    );
    results.push({ scenario: 'Offline booking with Cash payment → Approved immediately', pass: true, bookingId: created.id });
  }

  // 3) UPI + screenshot
  {
    paymentService.ensureReceiptDir();
    const tmpDir = path.join(paymentService.RECEIPT_DIR, '_tmp');
    fs.mkdirSync(tmpDir, { recursive: true });
    const tmpPath = path.join(tmpDir, `upi_test_${Date.now()}.png`);
    // Minimal valid-enough PNG header bytes
    fs.writeFileSync(
      tmpPath,
      Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
        'hex'
      )
    );
    const created = await offlineBookingService.createOfflineBooking(adminId, {
      slot_id: base.slot_id,
      vehicle_id: base.vehicle_id,
      customer_name: `UPI Test ${Date.now()}`,
      course_id: base.course_id || undefined,
      payment_mode: 'complete_now',
      payment_method: 'upi',
      amount_paid: base.amount_inr || 999,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_status: 'paid',
      reference_number: `UPI-${Date.now()}`,
      payment_proof: {
        path: tmpPath,
        mimetype: 'image/png',
        originalname: 'upi-screenshot.png'
      }
    });
    assert(created.status === 'confirmed', 'UPI booking should be confirmed');
    assert(created.payment?.status === 'verified', 'UPI payment should be verified');
    assert(!!created.payment?.receipt_path, 'Payment proof path missing');
    const abs = paymentService.resolveReceiptAbsolutePath(created.payment.receipt_path);
    assert(fs.existsSync(abs), `Receipt file missing at ${abs}`);
    results.push({
      scenario: 'Offline booking with UPI + Screenshot → proof saved',
      pass: true,
      bookingId: created.id,
      receipt: created.payment.receipt_path
    });

    // 4) Booking details payment section
    const detail = await bookingAdminService.getBookingDetail(created.id);
    assert(detail.payment, 'Booking detail missing payment');
    assert(detail.payment.payment_method === 'upi', 'Detail payment method mismatch');
    assert(detail.payment.receipt_path, 'Detail missing receipt');
    assert(detail.payment.approval_status === 'Approved', 'Detail approval status should be Approved');
    results.push({ scenario: 'View booking details → Payment information displayed', pass: true, bookingId: created.id });
  }

  // 5) Payment approval page fields for pending
  {
    const pending = await paymentService.listAdminPayments({ status: 'pending_upload', limit: 5 });
    const row = pending[0];
    assert(row, 'Need at least one pending_upload payment');
    assert('booking_reference' in row || 'offline_customer_name' in row, 'Approval list missing booking/customer fields');
    assert('branch_name' in row, 'Approval list missing branch');
    results.push({ scenario: 'Payment Approval page → fields available', pass: true, samplePaymentId: row.id });
  }

  console.log('\n=== Offline Payment Flow Verification ===');
  for (const r of results) {
    console.log(r.pass ? 'PASS' : 'FAIL', '-', r.scenario);
  }
  console.log(JSON.stringify({ ok: results.every((r) => r.pass), results }, null, 2));
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}

main().catch((err) => {
  console.error('VERIFY FAILED', err);
  process.exit(1);
});
