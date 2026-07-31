/**
 * Admin offline (walk-in) booking creation.
 * Skips customer OAuth, weekly limits, gap, and advance rules.
 * Uses the same vehicle/slot capacity checks as online bookings.
 * Supports optional payment capture + proof upload on create.
 */
const fs = require('fs');
const db = require('../db');
const config = require('../app.config');
const vehicleService = require('./vehicle.service');
const auditService = require('./audit.service');
const notificationService = require('./notification.service');
const paymentService = require('./payment.service');
const { generateOfflineReferenceNumber } = require('./bookingReference.service');
const { EVENT_TYPES, logBookingEvent } = require('./bookingEvent.service');
const { normalizeIndianMobileDigits } = require('../utils/phoneNormalize');
function inferBookingVehicleType(vehicleName) {
  const name = String(vehicleName || '').toLowerCase();
  if (name.includes('petrol')) return 'PETROL';
  if (name.includes('bike')) return 'BIKE';
  return 'ELECTRIC';
}
function buildOfflineNotes(baseNotes, age, gender) {
  const parts = [];
  if (age != null && String(age).trim() !== '') {
    parts.push(`Age: ${String(age).trim()}`);
  }
  if (gender != null && String(gender).trim() !== '') {
    parts.push(`Gender: ${String(gender).trim()}`);
  }
  const meta = parts.length ? `[Offline] ${parts.join(', ')}` : '';
  const notes = String(baseNotes || '').trim();
  if (meta && notes) return `${notes}\n${meta}`;
  return meta || notes || null;
}
function cleanupTempFile(file) {
  if (file?.path && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path);
    } catch (_) {
      /* ignore */
    }
  }
}
function resolvePaymentMode(payload) {
  const mode = String(payload.payment_mode || payload.paymentMode || 'pending')
    .toLowerCase()
    .trim();
  if (mode === 'complete_now' || mode === 'complete' || mode === 'paid_now') {
    return 'complete_now';
  }
  return 'pending';
}
async function createOfflineBooking(adminId, payload) {
  const {
    slot_id: slotId,
    vehicle_id: vehicleId,
    customer_name: customerName,
    phone,
    age,
    gender,
    notes,
    reuse_user_id: reuseUserId,
    course_id: courseId,
    payment_proof: paymentProofFile
  } = payload;
  const paymentMode = resolvePaymentMode(payload);
  const trimmedName = String(customerName || '').trim();
  if (!trimmedName) {
    cleanupTempFile(paymentProofFile);
    const error = new Error('Customer name is required');
    error.status = 400;
    error.errorCode = 'MISSING_CUSTOMER_NAME';
    throw error;
  }
  if (!slotId || !vehicleId) {
    cleanupTempFile(paymentProofFile);
    const error = new Error('slot_id and vehicle_id are required');
    error.status = 400;
    error.errorCode = 'MISSING_FIELDS';
    throw error;
  }
  let paymentMethod = null;
  let paymentAmount = null;
  let paymentDate = null;
  let paymentReference = null;
  let paymentNotes = null;
  let uiPaymentStatus = 'pending';
  let paymentStatus = 'pending_upload';
  let confirmBooking = false;
  if (paymentMode === 'complete_now') {
    paymentMethod = paymentService.normalizePaymentMethod(
      payload.payment_method || payload.paymentMethod
    );
    if (!paymentMethod) {
      cleanupTempFile(paymentProofFile);
      const error = new Error('Payment method is required when completing payment now');
      error.status = 400;
      error.errorCode = 'PAYMENT_METHOD_REQUIRED';
      throw error;
    }
    paymentAmount = Number(payload.amount_paid ?? payload.amount ?? payload.payment_amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount < 0) {
      cleanupTempFile(paymentProofFile);
      const error = new Error('Amount paid is required when completing payment now');
      error.status = 400;
      error.errorCode = 'PAYMENT_AMOUNT_REQUIRED';
      throw error;
    }
    const rawDate = payload.payment_date || payload.paymentDate;
    if (!rawDate || String(rawDate).trim() === '') {
      cleanupTempFile(paymentProofFile);
      const error = new Error('Payment date is required when completing payment now');
      error.status = 400;
      error.errorCode = 'PAYMENT_DATE_REQUIRED';
      throw error;
    }
    const parsedDate = new Date(rawDate);
    if (Number.isNaN(parsedDate.getTime())) {
      cleanupTempFile(paymentProofFile);
      const error = new Error('Payment date is invalid');
      error.status = 400;
      error.errorCode = 'PAYMENT_DATE_INVALID';
      throw error;
    }
    paymentDate = parsedDate.toISOString();
    paymentReference =
      payload.reference_number || payload.transaction_number || payload.payment_reference || null;
    if (paymentReference != null) {
      paymentReference = String(paymentReference).trim().slice(0, 100) || null;
    }
    paymentNotes = payload.payment_notes || payload.paymentNotes || null;
    if (paymentNotes != null) {
      paymentNotes = String(paymentNotes).trim().slice(0, 1000) || null;
    }
    uiPaymentStatus = String(payload.payment_status || payload.paymentStatus || 'paid').toLowerCase();
    const mapped = paymentService.mapOfflinePaymentStatus(uiPaymentStatus);
    paymentStatus = mapped.paymentStatus;
    confirmBooking = mapped.confirmBooking;
    // Proof uploaded with pending status → queue for verification
    if (paymentStatus === 'pending_upload' && paymentProofFile) {
      paymentStatus = 'pending_verification';
    }
  }
  let linkedUserId = null;
  if (reuseUserId) {
    const userCheck = await db.query(
      `SELECT id FROM profiles WHERE id = $1 AND role = 'customer'`,
      [reuseUserId]
    );
    if (userCheck.rows.length > 0) {
      linkedUserId = reuseUserId;
    }
  }
  let linkedCourseId = null;
  let courseAmount = 0;
  if (courseId) {
    const courseCheck = await db.query(
      `SELECT id, amount_inr, name FROM courses WHERE id = $1 AND is_active = true`,
      [courseId]
    );
    if (!courseCheck.rows.length) {
      cleanupTempFile(paymentProofFile);
      const error = new Error('Selected course is not available');
      error.status = 400;
      error.errorCode = 'INVALID_COURSE';
      throw error;
    }
    linkedCourseId = courseCheck.rows[0].id;
    courseAmount = Number(courseCheck.rows[0].amount_inr) || 0;
  }
  if (paymentMode === 'pending') {
    paymentAmount = Number(payload.amount_paid ?? payload.amount ?? courseAmount) || courseAmount || 0;
    paymentStatus = 'pending_upload';
    confirmBooking = false;
  }
  let bookingPhone = null;
  if (phone != null && String(phone).trim() !== '') {
    bookingPhone = normalizeIndianMobileDigits(phone);
    if (!config.booking.phoneNumberPattern.test(bookingPhone)) {
      cleanupTempFile(paymentProofFile);
      const error = new Error(config.booking.phoneNumberErrorMessage);
      error.status = 400;
      error.errorCode = 'INVALID_PHONE_FORMAT';
      throw error;
    }
  }
  const parsedAge =
    age != null && String(age).trim() !== '' ? parseInt(String(age), 10) : null;
  if (parsedAge != null && (!Number.isFinite(parsedAge) || parsedAge < 1 || parsedAge > 120)) {
    cleanupTempFile(paymentProofFile);
    const error = new Error('Age must be between 1 and 120');
    error.status = 400;
    error.errorCode = 'INVALID_AGE';
    throw error;
  }
  const vehicle = await vehicleService.getVehicleById(vehicleId);
  if (!vehicle || !vehicle.is_active) {
    cleanupTempFile(paymentProofFile);
    const error = new Error('Selected vehicle is not available');
    error.status = 400;
    error.errorCode = 'VEHICLE_INACTIVE';
    throw error;
  }
  const slotBranch = await db.query(
    `SELECT id, branch_id FROM slots WHERE id = $1`,
    [slotId]
  );
  if (!slotBranch.rows.length) {
    cleanupTempFile(paymentProofFile);
    const error = new Error('Slot not found');
    error.status = 404;
    error.errorCode = 'SLOT_NOT_FOUND';
    throw error;
  }
  const branchId = slotBranch.rows[0].branch_id;
  if (!branchId) {
    cleanupTempFile(paymentProofFile);
    const error = new Error('Slot is missing branch assignment. Contact support.');
    error.status = 400;
    error.errorCode = 'SLOT_MISSING_BRANCH';
    throw error;
  }
  if (vehicle.branch_id && String(vehicle.branch_id) !== String(branchId)) {
    cleanupTempFile(paymentProofFile);
    const error = new Error('Vehicle does not belong to this slot’s branch');
    error.status = 400;
    error.errorCode = 'BRANCH_VEHICLE_MISMATCH';
    throw error;
  }
  const availability = await vehicleService.checkVehicleAvailability(slotId, vehicleId);
  if (!availability.available) {
    cleanupTempFile(paymentProofFile);
    const error = new Error(
      `All ${vehicle.name} slots are full for this time slot (${availability.booked}/${availability.capacity} booked)`
    );
    error.status = 409;
    error.errorCode = 'VEHICLE_CAPACITY_FULL';
    throw error;
  }
  const vehicleType = inferBookingVehicleType(vehicle.name);
  const mergedNotes = buildOfflineNotes(notes, parsedAge, gender);
  const parsedGender =
    gender != null && String(gender).trim() !== '' ? String(gender).trim() : null;
  const initialBookingStatus = confirmBooking ? 'confirmed' : config.booking.defaultStatus;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const referenceNumber = await generateOfflineReferenceNumber(client);
    const bookingResult = await client.query(
      `WITH locked_slot AS (
        SELECT s.*,
               (SELECT COUNT(*) FROM bookings
                WHERE slot_id = s.id AND vehicle_id = $2 AND status NOT IN ('cancelled')) AS vehicle_booked_count
        FROM slots s
        WHERE s.id = $1
        FOR UPDATE NOWAIT
      ),
      vehicle_check AS (
        SELECT
          v.max_per_slot,
          v.name,
          COALESCE(
            (SELECT svc.capacity FROM slot_vehicle_capacity svc
             WHERE svc.slot_id = $1 AND svc.vehicle_id = v.id),
            v.max_per_slot
          ) AS vehicle_capacity
        FROM vehicles v
        WHERE v.id = $2 AND v.is_active = true
      ),
      slot_validation AS (
        SELECT
          ls.*,
          vc.vehicle_capacity,
          vc.name AS vehicle_name,
          CASE
            WHEN ls.id IS NULL THEN 'SLOT_NOT_FOUND'
            WHEN vc.vehicle_capacity IS NULL THEN 'INVALID_VEHICLE'
            WHEN ls.status IN ('disabled', 'cancelled') THEN 'SLOT_NOT_AVAILABLE'
            WHEN ls.status NOT IN ('available', 'full') THEN 'SLOT_INVALID_STATUS'
            WHEN ls.booked_count >= ls.capacity THEN 'SLOT_FULL'
            WHEN ls.vehicle_booked_count >= vc.vehicle_capacity THEN 'VEHICLE_CAPACITY_FULL'
            ELSE 'VALID'
          END AS validation_status
        FROM locked_slot ls
        CROSS JOIN vehicle_check vc
      ),
      booking_insert AS (
        INSERT INTO bookings (
          user_id,
          slot_id,
          trainer_id,
          vehicle_id,
          vehicle_type,
          phone,
          status,
          notes,
          booking_source,
          created_by_admin_id,
          offline_customer_name,
          offline_customer_age,
          offline_customer_gender,
          offline_reference_number,
          booking_reference,
          attendance_status,
          branch_id,
          course_id
        )
        SELECT
          $11,
          $1,
          NULL,
          $2,
          $3::vehicle_type_enum,
          $4,
          $5,
          $6,
          'OFFLINE',
          $7,
          $8,
          $9,
          $10,
          $12,
          $12,
          'SCHEDULED'::attendance_status_enum,
          $13,
          $14
        FROM slot_validation
        WHERE validation_status = 'VALID'
        RETURNING id, slot_id, trainer_id, vehicle_id, phone, status, notes,
                  booking_source, created_by_admin_id, offline_customer_name,
                  offline_customer_age, offline_customer_gender, offline_reference_number,
                  booking_reference, branch_id, course_id, attendance_status, created_at, updated_at
      ),
      slot_update AS (
        UPDATE slots
        SET booked_count = booked_count + 1,
            status = CASE
              WHEN slots.booked_count + 1 >= slots.capacity THEN 'full'
              WHEN slots.booked_count = 0 THEN 'available'
              ELSE slots.status
            END
        FROM booking_insert
        WHERE slots.id = $1
          AND EXISTS (SELECT 1 FROM booking_insert)
        RETURNING slots.*
      )
      SELECT bi.*, sv.validation_status
      FROM booking_insert bi
      CROSS JOIN slot_validation sv
      UNION ALL
      SELECT
        NULL::uuid AS id,
        NULL::uuid AS slot_id,
        NULL::uuid AS trainer_id,
        NULL::uuid AS vehicle_id,
        NULL::text AS phone,
        NULL::text AS status,
        NULL::text AS notes,
        NULL::booking_source_enum AS booking_source,
        NULL::uuid AS created_by_admin_id,
        NULL::text AS offline_customer_name,
        NULL::integer AS offline_customer_age,
        NULL::text AS offline_customer_gender,
        NULL::text AS offline_reference_number,
        NULL::text AS booking_reference,
        NULL::uuid AS branch_id,
        NULL::uuid AS course_id,
        NULL::attendance_status_enum AS attendance_status,
        NULL::timestamptz AS created_at,
        NULL::timestamptz AS updated_at,
        sv.validation_status
      FROM slot_validation sv
      WHERE NOT EXISTS (SELECT 1 FROM booking_insert)
        AND sv.validation_status != 'VALID'
      LIMIT 1`,
      [
        slotId,
        vehicleId,
        vehicleType,
        bookingPhone,
        initialBookingStatus,
        mergedNotes,
        adminId,
        trimmedName,
        parsedAge,
        parsedGender,
        linkedUserId,
        referenceNumber,
        branchId,
        linkedCourseId
      ]
    );
    if (bookingResult.rows.length === 0) {
      const error = new Error('Slot not found');
      error.status = 404;
      throw error;
    }
    const row = bookingResult.rows[0];
    if (row.validation_status !== 'VALID' || !row.id) {
      const messages = {
        SLOT_NOT_FOUND: 'Slot not found',
        SLOT_NOT_AVAILABLE: 'Slot is not available',
        SLOT_INVALID_STATUS: 'Slot is not available for booking',
        SLOT_FULL: 'This slot is fully booked',
        VEHICLE_CAPACITY_FULL: 'This vehicle is fully booked for the selected slot',
        INVALID_VEHICLE: 'Invalid or inactive vehicle selected'
      };
      const error = new Error(messages[row.validation_status] || 'Unable to create offline booking');
      error.status =
        row.validation_status === 'VEHICLE_CAPACITY_FULL' || row.validation_status === 'SLOT_FULL'
          ? 409
          : 400;
      error.errorCode = row.validation_status || 'BOOKING_NOT_ELIGIBLE';
      throw error;
    }
    await logBookingEvent(
      {
        bookingId: row.id,
        eventType: EVENT_TYPES.BOOKING_CREATED,
        title: 'Booking Created',
        description: `Offline booking ${referenceNumber} for ${trimmedName}`,
        actorId: adminId,
        metadata: { reference_number: referenceNumber, source: 'OFFLINE', payment_mode: paymentMode }
      },
      client
    );
    let receiptPath = null;
    let receiptMime = null;
    let receiptOriginalName = null;
    // Pre-create payment id for receipt naming when file present
    if (paymentProofFile) {
      // Will attach after payment insert using payment id
    }
    let payment = await paymentService.createPaymentForBooking(client, {
      bookingId: row.id,
      userId: linkedUserId,
      amount: paymentAmount ?? 0,
      status: paymentStatus,
      referenceNumber: paymentReference,
      paymentMethod,
      paymentDate,
      paymentNotes,
      recordedBy: adminId
    });
    if (paymentProofFile) {
      const stored = paymentService.persistReceiptFile(payment.id, paymentProofFile);
      if (stored) {
        receiptPath = stored.relativePath;
        receiptMime = stored.mime;
        receiptOriginalName = stored.originalName;
        const nextStatus =
          paymentStatus === 'pending_upload' ? 'pending_verification' : paymentStatus;
        const updated = await client.query(
          `UPDATE payments SET
             receipt_path = $2,
             receipt_mime = $3,
             receipt_original_name = $4,
             status = $5::payment_status_enum,
             updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [payment.id, receiptPath, receiptMime, receiptOriginalName, nextStatus]
        );
        payment = updated.rows[0];
        await client.query(
          `INSERT INTO payment_events (payment_id, actor_id, event_type, new_data)
           VALUES ($1, $2, 'RECEIPT_UPLOADED', $3::jsonb)`,
          [
            payment.id,
            adminId,
            JSON.stringify({ status: payment.status, as_admin: true, source: 'offline_booking' })
          ]
        );
        await logBookingEvent(
          {
            bookingId: row.id,
            eventType: EVENT_TYPES.PAYMENT_RECEIPT_UPLOADED,
            title: 'Payment Uploaded',
            description: 'Receipt uploaded by admin during offline booking',
            actorId: adminId,
            metadata: { payment_id: payment.id }
          },
          client
        );
      }
    }
    if (confirmBooking) {
      await logBookingEvent(
        {
          bookingId: row.id,
          eventType: EVENT_TYPES.PAYMENT_APPROVED,
          title: 'Payment Approved',
          description: 'Payment recorded and approved during offline booking',
          actorId: adminId,
          metadata: { payment_id: payment.id, payment_method: paymentMethod }
        },
        client
      );
      await logBookingEvent(
        {
          bookingId: row.id,
          eventType: EVENT_TYPES.BOOKING_CONFIRMED,
          title: 'Booking Confirmed',
          description: 'Offline booking confirmed with payment',
          actorId: adminId,
          metadata: { payment_id: payment.id }
        },
        client
      );
    }
    await client.query('COMMIT');
    await auditService.logAdminAction({
      adminId,
      actionType: 'OFFLINE_BOOKING_CREATED',
      entityType: 'booking',
      entityId: row.id,
      afterValue: {
        id: row.id,
        offline_reference_number: referenceNumber,
        booking_source: 'OFFLINE',
        offline_customer_name: trimmedName,
        slot_id: slotId,
        vehicle_id: vehicleId,
        course_id: linkedCourseId,
        status: initialBookingStatus,
        payment_mode: paymentMode,
        payment_id: payment.id,
        payment_status: payment.status
      },
      details: { source: 'offline_admin' }
    });
    await notificationService
      .createNotification({
        type: 'booking',
        title: 'Offline booking created',
        body: `${referenceNumber}: ${trimmedName} booked for ${vehicle.name}.`,
        entity_type: 'booking',
        entity_id: row.id,
        dedupeHours: 0
      })
      .catch(() => {});
    return {
      id: row.id,
      slot_id: row.slot_id,
      vehicle_id: row.vehicle_id,
      trainer_id: row.trainer_id,
      phone: row.phone,
      status: initialBookingStatus,
      notes: row.notes,
      booking_source: 'OFFLINE',
      offline_reference_number: referenceNumber,
      booking_reference: referenceNumber,
      attendance_status: row.attendance_status || 'SCHEDULED',
      created_by_admin_id: adminId,
      offline_customer_name: row.offline_customer_name,
      offline_customer_age: row.offline_customer_age,
      offline_customer_gender: row.offline_customer_gender,
      course_id: linkedCourseId,
      branch_id: branchId,
      created_at: row.created_at,
      updated_at: row.updated_at,
      vehicle_name: vehicle.name,
      payment
    };
  } catch (error) {
    await client.query('ROLLBACK');
    cleanupTempFile(paymentProofFile);
    if (error.code === '55P03') {
      const busy = new Error('Slot is being booked by another user. Please try again.');
      busy.status = 409;
      busy.errorCode = 'SLOT_BUSY';
      throw busy;
    }
    throw error;
  } finally {
    client.release();
  }
}
module.exports = {
  createOfflineBooking,
  inferBookingVehicleType
};
