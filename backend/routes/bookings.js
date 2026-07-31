const express = require('express');
const { enrichBookingTimes } = require('../utils/bookingTimeFormat');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const emailService = require('../services/email.service');
const whatsappService = require('../services/whatsapp.service');
const { validateBookingCreation } = require('../validators');
const config = require('../app.config');
const { getBookingRules } = require('../config/app.config');
const bookingRulesSvc = require('../services/bookingRules.service');
const { validateBookingEligibility, validateCancellationEligibility } = require('../services/bookingValidation.service');
const vehicleService = require('../services/vehicle.service');
const auditService = require('../services/audit.service');
const notificationService = require('../services/notification.service');
const { invalidateCacheForBranch } = require('../scheduling/availability.service');
const { EVENT_TYPES, logBookingEvent } = require('../services/bookingEvent.service');
const { normalizeBookingCreateBody } = require('../middleware/bookingPayload');
const { normalizeIndianMobileDigits } = require('../utils/phoneNormalize');
const {
  getProfileInactiveStatus,
  isCustomerInactiveBlocked
} = require('../utils/profileInactive');
const { generateBookingReference } = require('../services/bookingReference.service');
const { applyCouponForBooking } = require('../services/coupon.service');
const router = express.Router();

/** OAuth profiles use a synthetic phone (GOOGLE_<id>) until the user saves a real number. */
function isPlaceholderProfilePhone(phone) {
  if (phone == null || String(phone).trim() === '') return true;
  return String(phone).startsWith('GOOGLE_');
}

function logPostBookingRequest(req, res, next) {
  const enabled =
    process.env.LOG_BOOKING_DEBUG === '1' || process.env.NODE_ENV === 'development';
  if (!enabled) return next();

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const u = req.user || {};
  const bodyForLog = {
    slot_id: b.slot_id,
    vehicle_id: b.vehicle_id,
    trainer_id: b.trainer_id || null,
    phone: b.phone
      ? `***${String(b.phone).slice(-4)} (${String(b.phone).length} digits)`
      : b.phone === '' ? '(empty)' : '(omitted)',
    notes: typeof b.notes === 'string' && b.notes.length ? `[${b.notes.length} chars]` : '(empty)'
  };
  console.log('[Bookings][POST] request payload:', {
    user_id: u.id,
    email: u.email,
    role: u.role,
    body: bodyForLog
  });
  next();
}

router.post(
  '/',
  authenticate,
  normalizeBookingCreateBody,
  logPostBookingRequest,
  validateBookingCreation,
  async (req, res, next) => {
  const client = await db.getClient();

  try {
    if (!req.user || !req.user.id) {
      const authError = new Error('Unauthorized');
      authError.status = 401;
      authError.errorCode = 'AUTH_USER_MISSING';
      throw authError;
    }

    await client.query('BEGIN');

    // DEPRECATED Phase 3: student_recognition / student_entitlements no longer gate online booking.
    // Payment + receipt upload + admin verification is the source of truth.

    let {
      slot_id,
      phone,
      notes,
      trainer_id: clientTrainerId,
      vehicle_id: clientVehicleId,
      branch_id: clientBranchId,
      course_id: clientCourseId,
      coupon_code: clientCouponCode
    } = req.body;

    if (!slot_id) {
      const error = new Error('slot_id is required');
      error.status = 400;
      error.errorCode = 'MISSING_SLOT_ID';
      throw error;
    }

    if (!clientCourseId) {
      const error = new Error('course_id is required');
      error.status = 400;
      error.errorCode = 'MISSING_COURSE_ID';
      throw error;
    }

    const courseRow = await client.query(
      `SELECT id, amount_inr, is_active FROM courses WHERE id = $1`,
      [clientCourseId]
    );
    if (!courseRow.rows[0] || !courseRow.rows[0].is_active) {
      const error = new Error('Selected course is not available');
      error.status = 400;
      error.errorCode = 'INVALID_COURSE';
      throw error;
    }
    const courseAmount = parseFloat(courseRow.rows[0].amount_inr) || 0;

    const slotMeta = await client.query(
      `SELECT id, branch_id FROM slots WHERE id = $1`,
      [slot_id]
    );
    if (!slotMeta.rows[0]) {
      const error = new Error('Slot not found');
      error.status = 404;
      error.errorCode = 'SLOT_NOT_FOUND';
      throw error;
    }
    const resolvedBranchId = clientBranchId || slotMeta.rows[0].branch_id;
    if (!resolvedBranchId) {
      const error = new Error('branch_id is required');
      error.status = 400;
      error.errorCode = 'MISSING_BRANCH_ID';
      throw error;
    }
    if (String(slotMeta.rows[0].branch_id) !== String(resolvedBranchId)) {
      const error = new Error('Slot does not belong to the selected branch');
      error.status = 400;
      error.errorCode = 'BRANCH_SLOT_MISMATCH';
      throw error;
    }
    const branch_id = resolvedBranchId;
    const course_id = clientCourseId;

    const phoneRow = await client.query(
      'SELECT phone FROM profiles WHERE id = $1',
      [req.user.id]
    );

    if (phoneRow.rows.length === 0) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const inactiveStatus = await getProfileInactiveStatus(req.user.id, client);
    const user = {
      phone: phoneRow.rows[0].phone,
      role: inactiveStatus.role,
      inactive_blocked: inactiveStatus.inactive_blocked
    };

    if (isCustomerInactiveBlocked(user)) {
      const blocked = new Error('Your account is inactive. Contact admin.');
      blocked.status = 403;
      blocked.errorCode = 'INACTIVE_BLOCKED';
      throw blocked;
    }

    const slotDateRow = await client.query(
      `SELECT COALESCE(slot_date, (start_time AT TIME ZONE 'UTC')::date) AS booking_date
       FROM slots WHERE id = $1`,
      [slot_id]
    );
    if (slotDateRow.rows.length > 0) {
      const activeBookingRow = await client.query(
        `SELECT b.id
         FROM bookings b
         JOIN slots s ON b.slot_id = s.id
         WHERE b.user_id = $1
           AND b.status NOT IN ('cancelled', 'completed', 'no_show')
           AND s.end_time > NOW()
           AND COALESCE(s.slot_date, (s.start_time AT TIME ZONE 'UTC')::date) = $2::date
         LIMIT 1`,
        [req.user.id, slotDateRow.rows[0].booking_date]
      );
      if (activeBookingRow.rows.length > 0) {
        const dup = new Error('You already have a booking on this date. Cancel or update your existing booking.');
        dup.status = 400;
        dup.errorCode = 'ACTIVE_BOOKING_EXISTS';
        throw dup;
      }
    }

    // PHASE 5: Fix MBR-002 - Enforce phone number must match registered profile phone
    // Business rule: "Booking allowed only for registered phone numbers"
    // If user has no phone registered, require them to provide one (and it will be registered)
    if (isPlaceholderProfilePhone(user.phone) && !phone) {
      const err = new Error('Phone number is required to make bookings. Please provide your mobile number.');
      err.status = 400;
      throw err;
    }
    
    if (phone) {
      if (!config.booking.phoneNumberPattern.test(phone)) {
        const err = new Error(config.booking.phoneNumberErrorMessage);
        err.status = 400;
        throw err;
      }
      
      if (!isPlaceholderProfilePhone(user.phone)) {
        const a = normalizeIndianMobileDigits(phone);
        const b = normalizeIndianMobileDigits(user.phone);
        if (a !== b || !a) {
          const err = new Error(
            'Phone number must match your registered mobile (same 10 digits as on your profile, with or without +91).'
          );
          err.status = 400;
          err.errorCode = 'PHONE_MISMATCH';
          throw err;
        }
      }
      
      if (isPlaceholderProfilePhone(user.phone)) {
        try {
          await client.query(
            'UPDATE profiles SET phone = $1, updated_at = NOW() WHERE id = $2',
            [phone, req.user.id]
          );
          console.log(`[Booking] Registered phone number for user ${req.user.id}: ${phone}`);
        } catch (updateError) {
          // If unique constraint violation, phone already exists for another user
          if (updateError.code === '23505' || updateError.message.includes('unique')) {
            throw new Error('This phone number is already registered to another account. Please use your registered phone number.');
          }
          throw updateError;
        }
      }
    }
    
    // Use registered phone number (either existing or newly set); normalize profile storage (+91, etc.)
    const bookingPhone = phone || normalizeIndianMobileDigits(user.phone) || user.phone;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let trainer_id;
    let vehicle_id;

    const chosenVehicleId =
      clientVehicleId && uuidPattern.test(String(clientVehicleId).trim())
        ? String(clientVehicleId).trim()
        : null;

    if (chosenVehicleId) {
      const vehicleRow = await client.query(
        `SELECT id FROM vehicles WHERE id = $1 AND is_active = true`,
        [chosenVehicleId]
      );
      if (vehicleRow.rows.length === 0) {
        const err = new Error('Selected vehicle is not available.');
        err.status = 400;
        err.errorCode = 'VEHICLE_INACTIVE';
        throw err;
      }
      const earlyVehicleCheck = await vehicleService.checkVehicleAvailability(
        slot_id,
        chosenVehicleId
      );
      if (!earlyVehicleCheck.available) {
        const err = new Error(
          'This vehicle type is fully booked for the selected time slot. Please choose another vehicle or slot.'
        );
        err.status = 409;
        err.errorCode = 'VEHICLE_CAPACITY_FULL';
        throw err;
      }
      vehicle_id = chosenVehicleId;
    }

    if (!vehicle_id) {
      const err = new Error('vehicle_id is required. Please select a vehicle type.');
      err.status = 400;
      err.errorCode = 'VEHICLE_REQUIRED';
      throw err;
    }

    const vehicleBranchCheck = await client.query(
      `SELECT id, branch_id, is_active FROM vehicles WHERE id = $1`,
      [vehicle_id]
    );
    if (!vehicleBranchCheck.rows[0]?.is_active) {
      const err = new Error('Selected vehicle is not available');
      err.status = 400;
      err.errorCode = 'VEHICLE_INACTIVE';
      throw err;
    }
    if (String(vehicleBranchCheck.rows[0].branch_id) !== String(branch_id)) {
      const err = new Error('Vehicle does not belong to the selected branch');
      err.status = 400;
      err.errorCode = 'BRANCH_VEHICLE_MISMATCH';
      throw err;
    }

    // Customer bookings: trainer is assigned by admin later; capacity is vehicle/slot based only.
    trainer_id = null;

    if (process.env.LOG_BOOKING_DEBUG === '1') {
      console.log('[Bookings][POST] pre-insert:', {
        user_id: req.user.id,
        slot_id,
        vehicle_id,
        trainer_id,
        slot_date: null,
        booking_phone: bookingPhone ? `***${String(bookingPhone).slice(-4)}` : null
      });
    }

    const slotCheck = await client.query(
      `SELECT start_time, end_time, slot_date FROM slots WHERE id = $1`,
      [slot_id]
    );

    if (slotCheck.rows.length === 0) {
      const err = new Error('Slot not found');
      err.status = 404;
      throw err;
    }

    const slot = slotCheck.rows[0];
    const slotDate = slot.slot_date || slot.start_time.toISOString().split('T')[0];
    const slotTime = slot.start_time;

    const validationResult = await validateBookingEligibility(
      bookingPhone,
      slotDate,
      slotTime,
      vehicle_id,
      slot_id,
      req.user.id,
      trainer_id
    );

    if (!validationResult.eligible) {
      const err = new Error(validationResult.message || `Booking not eligible: ${validationResult.reason}`);
      err.status = validationResult.reason === 'INACTIVE_BLOCKED' ? 403 : 400;
      err.errorCode = validationResult.reason || validationResult.errorCode || 'BOOKING_NOT_ELIGIBLE';
      throw err;
    }

    // Get vehicle details dynamically
    const vehicle = await vehicleService.getVehicleById(vehicle_id);
    if (!vehicle || !vehicle.is_active) {
      throw new Error('Invalid or inactive vehicle selected');
    }

    // Check vehicle capacity dynamically
    const vehicleAvailability = await vehicleService.checkVehicleAvailability(slot_id, vehicle_id);
    if (!vehicleAvailability.available) {
      throw new Error(`All ${vehicle.name} slots are full for this time slot (${vehicleAvailability.booked}/${vehicleAvailability.capacity} booked)`);
    }

    const bookingReference = await generateBookingReference(client);
    const rules = await getBookingRules();
    const bookingWindowHours = rules.bookingWindowHours;
    const minAdvanceHours = rules.minAdvanceHours;

    // Dynamic vehicle-based booking creation
    // PHASE 5: Fix DIR-002 - Harden vehicle capacity with FOR UPDATE NOWAIT to prevent race conditions
    // Lock slot with NOWAIT to fail fast if slot is already locked (prevents deadlocks)
    // Lock is held until transaction commit, ensuring no concurrent bookings can interfere
    // No hardcoded vehicle types - uses vehicle_id and vehicle.max_per_slot dynamically
    const bookingResult = await client.query(
      `WITH locked_slot AS (
        SELECT s.*,
               (SELECT COUNT(*) FROM bookings WHERE slot_id = s.id AND vehicle_id = $3 AND status NOT IN ('cancelled')) as vehicle_booked_count
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
        WHERE v.id = $3 AND v.is_active = true
      ),
      slot_validation AS (
        SELECT 
          ls.*,
          vc.vehicle_capacity,
          vc.name as vehicle_name,
          CASE 
            WHEN ls.id IS NULL THEN 'SLOT_NOT_FOUND'
            WHEN vc.vehicle_capacity IS NULL THEN 'INVALID_VEHICLE'
            WHEN ls.status IN ('disabled', 'cancelled') THEN 'SLOT_NOT_AVAILABLE'
            WHEN ls.status NOT IN ('available', 'full') THEN 'SLOT_INVALID_STATUS'
            WHEN ls.start_time <= NOW() THEN 'SLOT_PAST'
            WHEN ls.start_time < (NOW() + INTERVAL '${minAdvanceHours} hours') THEN 'BOOKING_ADVANCE_REQUIRED'
            WHEN ls.start_time > (NOW() + INTERVAL '${bookingWindowHours} hours') THEN 'BOOKING_NOT_OPEN_YET'
            WHEN ls.vehicle_booked_count >= vc.vehicle_capacity THEN 'VEHICLE_CAPACITY_FULL'
            ELSE 'VALID'
          END as validation_status
        FROM locked_slot ls
        CROSS JOIN vehicle_check vc
      ),
      booking_insert AS (
        INSERT INTO bookings (user_id, slot_id, trainer_id, vehicle_id, phone, status, notes, branch_id, course_id, booking_reference)
        SELECT $2, $1, NULL, $3, $4, $5, $6, $7, $8, $9
        FROM slot_validation sv
        WHERE validation_status = 'VALID'
        RETURNING *
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
      SELECT 
        bi.id,
        bi.user_id,
        bi.slot_id,
        bi.trainer_id,
        bi.vehicle_id,
        bi.phone,
        bi.status,
        bi.notes,
        bi.branch_id,
        bi.course_id,
        bi.created_at,
        bi.updated_at,
        sv.validation_status
      FROM booking_insert bi
      CROSS JOIN slot_validation sv
      UNION ALL
      SELECT 
        NULL::uuid as id,
        NULL::uuid as user_id,
        NULL::uuid as slot_id,
        NULL::uuid as trainer_id,
        NULL::uuid as vehicle_id,
        NULL::text as phone,
        NULL::text as status,
        NULL::text as notes,
        NULL::uuid as branch_id,
        NULL::uuid as course_id,
        NULL::timestamptz as created_at,
        NULL::timestamptz as updated_at,
        sv.validation_status
      FROM slot_validation sv
      WHERE NOT EXISTS (SELECT 1 FROM booking_insert)
        AND sv.validation_status != 'VALID'
      LIMIT 1`,
      [slot_id, req.user.id, vehicle_id, bookingPhone, config.booking.defaultStatus, notes, branch_id, course_id, bookingReference]
    );

    if (bookingResult.rows.length === 0) {
      throw new Error('Slot not found');
    }

    const result = bookingResult.rows[0];

    // Check if booking was inserted (validation_status will be 'VALID' if successful)
    if (result.validation_status !== 'VALID' || !result.id) {
      // Map validation status to user-friendly error messages
      const errorMessages = {
        'SLOT_NOT_FOUND': 'Slot not found',
        'SLOT_NOT_AVAILABLE': 'Slot is not available',
        'SLOT_INVALID_STATUS': 'Slot is not available for booking',
        'SLOT_FULL': 'Slot is already fully booked',
        'SLOT_INVALID_CAPACITY': config.slot.maxCapacityErrorMessage,
        'SLOT_NOT_VISIBLE': bookingRulesSvc.bookingWindowMessage(bookingWindowHours),
        'SLOT_PAST': 'This slot has already started or passed',
        'BOOKING_NOT_OPEN_YET': bookingRulesSvc.bookingWindowMessage(bookingWindowHours),
        'BOOKING_ADVANCE_REQUIRED': bookingRulesSvc.bookingAdvanceMessage(minAdvanceHours),
        'TRAINER_NOT_FOUND': 'Selected trainer was not found',
        'TRAINER_INACTIVE': 'This trainer is not available for booking',
        'TRAINER_SLOT_TAKEN': 'This trainer is already booked for this time slot. Choose another trainer.',
        'VEHICLE_CAPACITY_FULL': `All ${vehicle.name} slots are full for this time slot`,
        'INVALID_VEHICLE': 'Invalid or inactive vehicle selected'
      };
      const insertErr = new Error(
        errorMessages[result.validation_status] || 'Unable to create booking'
      );
      insertErr.status = 400;
      insertErr.errorCode = result.validation_status || 'BOOKING_NOT_ELIGIBLE';
      throw insertErr;
    }

    // Extract booking data (exclude validation fields)
    const booking = {
      id: result.id,
      user_id: result.user_id,
      slot_id: result.slot_id,
      trainer_id: result.trainer_id,
      vehicle_id: result.vehicle_id,
      phone: result.phone || bookingPhone,
      status: result.status,
      notes: result.notes,
      branch_id: result.branch_id || branch_id,
      course_id: result.course_id || course_id,
      booking_reference: result.booking_reference || bookingReference,
      created_at: result.created_at,
      updated_at: result.updated_at
    };

    try {
      await client.query('SELECT increment_weekly_booking_count($1)', [req.user.id]);
    } catch (err) {
      await client.query(
        `UPDATE profiles
         SET last_booking_date = CURRENT_DATE,
             total_bookings = COALESCE(total_bookings, 0) + 1,
             updated_at = NOW()
         WHERE id = $1`,
        [req.user.id]
      );
    }

    let paymentAmount = courseAmount;
    let appliedCoupon = null;
    let discountAmount = 0;
    if (clientCouponCode && String(clientCouponCode).trim()) {
      const couponResult = await applyCouponForBooking(client, {
        code: clientCouponCode,
        amount: courseAmount,
        branch_id: branch_id,
        vehicle_id: result.vehicle_id || clientVehicleId || null
      });
      paymentAmount = couponResult.amount;
      appliedCoupon = couponResult.coupon;
      discountAmount = couponResult.discount_amount;
    }

    const paymentService = require('../services/payment.service');
    const payment = await paymentService.createPaymentForBooking(client, {
      bookingId: booking.id,
      userId: req.user.id,
      amount: paymentAmount
    });
    booking.payment = payment;
    if (appliedCoupon) {
      booking.coupon = {
        code: appliedCoupon.code,
        discount_amount: discountAmount,
        original_amount: courseAmount,
        final_amount: paymentAmount
      };
    }

    await client.query('COMMIT');

    if (branch_id) invalidateCacheForBranch(branch_id);

    logBookingEvent({
      bookingId: booking.id,
      eventType: EVENT_TYPES.BOOKING_CREATED,
      title: 'Booking Created',
      description: 'Customer initiated online booking — payment pending',
      actorId: req.user.id,
      metadata: { slot_id, vehicle_id, branch_id, course_id, status: booking.status, booking_reference: booking.booking_reference }
    }).catch((err) => console.error('[bookingEvent] BOOKING_CREATED failed:', err.message));

    auditService.logBookingCreate(req.user.id, booking).catch((err) => {
      console.error('[Audit] BOOKING_CREATED failed:', err.message);
    });

    notificationService.createNotification({
      type: 'new_booking',
      title: 'New booking received',
      body: `New booking for slot ${String(slot_id).slice(0, 8)}…`,
      entity_type: 'booking',
      entity_id: booking.id,
      dedupeHours: 0
    }).catch(() => {});

    // Send email notification (non-blocking)
    try {
      const [userResult, slotResult, trainerResult, vehicleResult] = await Promise.all([
        db.query('SELECT * FROM profiles WHERE id = $1', [req.user.id]),
        db.query('SELECT * FROM slots WHERE id = $1', [slot_id]),
        booking.trainer_id
          ? db.query(
              `SELECT t.*, p.full_name, p.avatar_url
               FROM trainers t
               JOIN profiles p ON t.user_id = p.id
               WHERE t.id = $1`,
              [booking.trainer_id]
            )
          : Promise.resolve({ rows: [] }),
        db.query('SELECT * FROM vehicles WHERE id = $1', [vehicle_id])
      ]);

      if (userResult.rows[0] && slotResult.rows[0] && vehicleResult.rows[0]) {
        const user = userResult.rows[0];
        const slot = slotResult.rows[0];
        const trainer = {
          full_name: trainerResult.rows[0]?.full_name || 'To be assigned'
        };
        const vehicle = vehicleResult.rows[0];

        // Send email notification
        emailService.sendBookingConfirmation(
          booking, user, slot, trainer, vehicle
        ).catch(err => console.error('Email notification failed:', err));

        // Send WhatsApp notification
        if (user.phone) {
          whatsappService.sendBookingConfirmation(
            booking, user, slot, trainer, vehicle
          ).catch(err => console.error('WhatsApp notification failed:', err));

          // Send admin alert
          whatsappService.sendAdminAlert(
            booking, user, slot, trainer, vehicle
          ).catch(err => console.error('Admin WhatsApp alert failed:', err));
        }
      }
    } catch (emailError) {
      console.error('Failed to send booking email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json(booking);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('[Bookings][POST /] Rollback failed:', rollbackErr.message);
    }
    if (error?.code && String(error.code).startsWith('23')) {
      console.error('[Bookings][POST /] Database constraint error:', {
        code: error.code,
        constraint: error.constraint,
        table: error.table,
        column: error.column,
        detail: error.detail,
        message: error.message,
        stack: error.stack,
        sql_operation: 'INSERT INTO bookings (user_id, slot_id, trainer_id, vehicle_id, phone, status, notes) via slot_validation CTE',
        user_id: req.user?.id,
        slot_id: req.body?.slot_id,
        vehicle_id: req.body?.vehicle_id,
        trainer_id: null,
        phone: req.body?.phone ? `***${String(req.body.phone).slice(-4)}` : undefined
      });
    } else if (process.env.NODE_ENV === 'development' || process.env.LOG_BOOKING_DEBUG === '1') {
      console.error('[Bookings][POST /] Error:', error.message, error.code, error.stack);
    }

    // PHASE 5: Fix DIR-002 - Handle lock timeout errors (NOWAIT failures)
    // If slot is locked by another transaction, provide clear error message
    if (error.code === '55P03' || error.message.includes('could not obtain lock') || error.message.includes('lock not available')) {
      const lockError = new Error('This slot is currently being booked by another user. Please try again in a moment.');
      lockError.status = 409; // Conflict
      lockError.errorCode = 'SLOT_LOCKED';
      return next(lockError);
    }

    if (error.code === '23505') {
      const c = String(error.constraint || '');
      const d = String(error.detail || '');
      if (
        c.includes('user_slot') ||
        c.includes('idx_bookings_unique_user_slot') ||
        (d.includes('user_id') && d.includes('slot_id'))
      ) {
        const dup = new Error('You already have a booking for this slot');
        dup.status = 409;
        dup.errorCode = 'DUPLICATE_BOOKING';
        return next(dup);
      }
      if (
        c.includes('slot_trainer') ||
        (d.includes('slot_id') && d.includes('trainer_id'))
      ) {
        const dup = new Error('This trainer is already booked for this time slot. Choose another trainer.');
        dup.status = 409;
        dup.errorCode = 'TRAINER_SLOT_TAKEN';
        return next(dup);
      }
    }

    // Convert common booking business validation errors to 400 instead of generic 500.
    if (!error.status) {
      error.status = 400;
      error.errorCode = error.errorCode || 'BOOKING_VALIDATION_ERROR';
    }
    
    next(error);
  } finally {
    client.release();
  }
});

router.get('/slot/:slotId/status', authenticate, async (req, res, next) => {
  try {
    const { slotId } = req.params;

    const slotResult = await db.query(
      `SELECT id, capacity, booked_count, status FROM slots WHERE id = $1`,
      [slotId]
    );
    if (slotResult.rows.length === 0) {
      const error = new Error('Slot not found');
      error.status = 404;
      error.errorCode = 'SLOT_NOT_FOUND';
      return next(error);
    }
    const slot = slotResult.rows[0];

    const myBookingResult = await db.query(
      `SELECT b.id, b.slot_id, b.trainer_id, b.vehicle_id, b.status, b.notes,
              t.id AS trainer_id,
              p.full_name AS trainer_name,
              v.name AS vehicle_name
       FROM bookings b
       LEFT JOIN trainers t ON b.trainer_id = t.id
       LEFT JOIN profiles p ON t.user_id = p.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.slot_id = $1
         AND b.user_id = $2
         AND b.status NOT IN ('cancelled')
       LIMIT 1`,
      [slotId, req.user.id]
    );

    const ownedByMe = myBookingResult.rows.length > 0;
    const booking = ownedByMe ? myBookingResult.rows[0] : null;

    const slotFull =
      slot.status === 'full' ||
      parseInt(slot.booked_count, 10) >= parseInt(slot.capacity, 10);

    let ownedByOther = false;
    if (!ownedByMe && slotFull) {
      ownedByOther = true;
    } else if (!ownedByMe) {
      const allVehiclesFull = await vehicleService.getActiveVehicles();
      let anyAvailable = false;
      for (const vehicle of allVehiclesFull) {
        const avail = await vehicleService.checkVehicleAvailability(slotId, vehicle.id);
        if (avail.available) {
          anyAvailable = true;
          break;
        }
      }
      if (!anyAvailable && parseInt(slot.booked_count, 10) > 0) {
        ownedByOther = true;
      }
    }

    res.json({
      ownedByMe,
      ownedByOther,
      slotFull,
      booking
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/update', authenticate, async (req, res, next) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const { vehicle_id } = req.body;
    if (!vehicle_id) {
      const error = new Error('vehicle_id is required');
      error.status = 400;
      error.errorCode = 'MISSING_FIELDS';
      throw error;
    }

    const bookingResult = await client.query(
      `SELECT b.* FROM bookings b
       WHERE b.id = $1 AND b.user_id = $2 AND b.status NOT IN ('cancelled')
       FOR UPDATE`,
      [req.params.id, req.user.id]
    );

    if (bookingResult.rows.length === 0) {
      const error = new Error('Booking not found or cannot be updated');
      error.status = 404;
      error.errorCode = 'BOOKING_NOT_FOUND';
      throw error;
    }

    const booking = bookingResult.rows[0];
    const slotId = booking.slot_id;

    const profileRow = await client.query('SELECT phone FROM profiles WHERE id = $1', [req.user.id]);
    const bookingPhone =
      normalizeIndianMobileDigits(profileRow.rows[0]?.phone) || profileRow.rows[0]?.phone || booking.phone;

    const slotRow = await client.query(
      `SELECT start_time, COALESCE(slot_date, (start_time AT TIME ZONE 'UTC')::date) AS slot_date
       FROM slots WHERE id = $1`,
      [slotId]
    );
    if (slotRow.rows.length === 0) {
      const error = new Error('Slot not found');
      error.status = 404;
      error.errorCode = 'SLOT_NOT_FOUND';
      throw error;
    }

    const slotDate = slotRow.rows[0].slot_date;
    const slotTime = slotRow.rows[0].start_time;

    const updateValidation = await validateBookingEligibility(
      bookingPhone,
      slotDate,
      slotTime,
      vehicle_id,
      slotId,
      req.user.id,
      null,
      { excludeBookingId: booking.id, mode: 'update' }
    );

    if (!updateValidation.eligible) {
      const error = new Error(updateValidation.message || 'Booking update not allowed');
      error.status = updateValidation.reason === 'INACTIVE_BLOCKED' ? 403 : 400;
      error.errorCode = updateValidation.reason || 'BOOKING_NOT_ELIGIBLE';
      throw error;
    }

    if (booking.vehicle_id !== vehicle_id) {
      const vehicleAvail = await vehicleService.checkVehicleAvailability(slotId, vehicle_id);
      if (!vehicleAvail.available) {
        const error = new Error('That vehicle is fully booked for this slot');
        error.status = 409;
        error.errorCode = 'VEHICLE_CAPACITY_FULL';
        throw error;
      }
    }

    const vehicleCheck = await client.query(
      'SELECT id FROM vehicles WHERE id = $1 AND is_active = true',
      [vehicle_id]
    );
    if (vehicleCheck.rows.length === 0) {
      const error = new Error('Vehicle not found or inactive');
      error.status = 400;
      error.errorCode = 'INVALID_VEHICLE';
      throw error;
    }

    const updateResult = await client.query(
      `UPDATE bookings
       SET vehicle_id = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [vehicle_id, req.params.id, req.user.id]
    );

    await client.query('COMMIT');

    res.json(updateResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

router.get('/my-bookings', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT b.*,
             s.start_time, s.end_time, s.slot_date,
             t.id as trainer_id,
             p.full_name as trainer_name, p.avatar_url as trainer_avatar,
             v.name as vehicle_name, v.type as vehicle_type,
             br.name as branch_name,
             pay.id as payment_id,
             pay.status as payment_status,
             pay.amount as payment_amount,
             pay.currency as payment_currency,
             pay.reference_number as payment_reference,
             pay.receipt_path as payment_receipt_path,
             pay.created_at as payment_created_at
      FROM bookings b
      JOIN slots s ON b.slot_id = s.id
      LEFT JOIN trainers t ON b.trainer_id = t.id
      LEFT JOIN profiles p ON t.user_id = p.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN branches br ON br.id = b.branch_id
      LEFT JOIN payments pay ON pay.booking_id = b.id
      WHERE b.user_id = $1
      ORDER BY s.start_time DESC
    `, [req.user.id]);

    res.json(result.rows.map(enrichBookingTimes));
  } catch (error) {
    next(error);
  }
});

router.put('/:id/cancel', authenticate, async (req, res, next) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const { cancellation_reason } = req.body;

    // PHASE 1: Get user's phone number for phone-based validation
    const userCheck = await client.query(
      'SELECT phone FROM profiles WHERE id = $1',
      [req.user.id]
    );
    
    if (userCheck.rows.length === 0 || !userCheck.rows[0].phone) {
      throw new Error('User phone number not found');
    }

    const userPhone = userCheck.rows[0].phone;

    // PHASE 1: Use centralized cancellation validation (phone-based)
    const cancellationValidation = await validateCancellationEligibility(
      userPhone,
      req.params.id
    );

    if (!cancellationValidation.eligible) {
      const error = new Error(cancellationValidation.message || `Cancellation not allowed: ${cancellationValidation.reason}`);
      if (cancellationValidation.reason === 'BOOKING_NOT_FOUND') {
        error.status = 404;
      } else if (cancellationValidation.reason === 'ALREADY_CANCELLED') {
        error.status = 400;
      } else {
        error.status = 400;
      }
      throw error;
    }

    // PHASE 5: Fix MBR-004 - Require BOTH user_id match AND phone match
    // Business rule: "Only the same phone number can modify/cancel its booking"
    // Get booking details with phone verification
    const bookingResult = await client.query(
      `SELECT b.*, p.phone as booking_phone
       FROM bookings b
       JOIN profiles p ON b.user_id = p.id
       WHERE b.id = $1 AND b.user_id = $2 AND p.phone = $3`,
      [req.params.id, req.user.id, userPhone]
    );

    if (bookingResult.rows.length === 0) {
      // Check if booking exists but phone doesn't match
      const bookingExistsCheck = await client.query(
        'SELECT id FROM bookings WHERE id = $1 AND user_id = $2',
        [req.params.id, req.user.id]
      );
      
      if (bookingExistsCheck.rows.length > 0) {
        throw new Error('Access denied. This booking belongs to a different phone number. Only the registered phone number can cancel bookings.');
      }
      
      throw new Error('Booking not found or does not belong to you');
    }

    const booking = bookingResult.rows[0];

    // Update booking - MUST include user_id check to prevent unauthorized updates
    const updateResult = await client.query(
      `UPDATE bookings
       SET status = 'cancelled',
           cancelled_at = NOW(),
           cancelled_by = $1,
           cancellation_reason = $2
       WHERE id = $3 AND user_id = $1
       RETURNING id`,
      [req.user.id, cancellation_reason, req.params.id]
    );

    // Verify update succeeded (defense in depth)
    if (updateResult.rows.length === 0) {
      const error = new Error('Access denied. This booking does not belong to you.');
      error.status = 403;
      throw error;
    }

    // Update slot booked_count (vehicle-specific counts are calculated dynamically from bookings table)
    // No need to update electric_booked/petrol_booked/bike_booked as they don't exist in slots table
    await client.query(
      `UPDATE slots 
       SET booked_count = GREATEST(booked_count - 1, 0)
       WHERE id = $1`,
      [booking.slot_id]
    );

    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      await auditService.logBookingCancellation(req.user.id, req.params.id, booking, cancellation_reason || 'Admin cancellation');
    } else {
      await auditService.logUserBookingCancellation(req.user.id, req.params.id, booking, cancellation_reason || 'User cancellation');
    }

    notificationService.createNotification({
      type: 'booking_cancelled',
      title: 'Booking cancelled',
      body: `Customer cancelled booking ${String(req.params.id).slice(0, 8)}…`,
      entity_type: 'booking',
      entity_id: req.params.id,
      dedupeHours: 1
    }).catch(() => {});

    try {
      await client.query(
        `UPDATE student_entitlements
         SET used_slots = GREATEST(COALESCE(used_slots, 0) - 1, 0), updated_at = NOW()
         WHERE user_id = $1`,
        [req.user.id]
      );
    } catch (entErr) {
      if (entErr.code !== '42P01') {
        console.warn('[Bookings] student_entitlements used_slots decrement:', entErr.message);
      }
    }

    // Update slot aggregate status from booked_count (per-vehicle counts live in bookings + slot_vehicle_capacity)
    const slotStatusCheck = await client.query(
      `SELECT booked_count, capacity FROM slots WHERE id = $1`,
      [booking.slot_id]
    );
    
    if (slotStatusCheck.rows.length > 0) {
      const slot = slotStatusCheck.rows[0];
      const isFull = slot.booked_count >= slot.capacity;
      const isAvailable = slot.booked_count === 0;
      
      // Update status: full if at capacity, available if empty, otherwise keep current status
      if (isFull) {
        await client.query(
          `UPDATE slots SET status = 'full' WHERE id = $1`,
          [booking.slot_id]
        );
      } else if (isAvailable) {
        await client.query(
          `UPDATE slots SET status = $1 WHERE id = $2`,
          [config.slot.defaultStatus, booking.slot_id]
        );
      } else {
        // Remove 'full' status if capacity freed up
        await client.query(
          `UPDATE slots SET status = $1 WHERE id = $2 AND status = 'full'`,
          [config.slot.defaultStatus, booking.slot_id]
        );
      }
    }

    await client.query('COMMIT');

    if (booking.branch_id) invalidateCacheForBranch(booking.branch_id);

    logBookingEvent({
      bookingId: booking.id,
      eventType: EVENT_TYPES.BOOKING_CANCELLED,
      title: 'Booking Cancelled',
      description: cancellation_reason || 'Cancelled by customer',
      actorId: req.user.id,
      metadata: { reason: cancellation_reason || null }
    }).catch((err) => console.error('[bookingEvent] BOOKING_CANCELLED failed:', err.message));

    // Send cancellation email (non-blocking)
    try {
      const [userResult, slotResult, trainerResult, vehicleResult] = await Promise.all([
        db.query('SELECT * FROM profiles WHERE id = $1', [req.user.id]),
        db.query('SELECT * FROM slots WHERE id = $1', [booking.slot_id]),
        db.query(`
          SELECT t.*, p.full_name, p.avatar_url 
          FROM trainers t 
          JOIN profiles p ON t.user_id = p.id 
          WHERE t.id = $1
        `, [booking.trainer_id]),
        booking.vehicle_id ? db.query('SELECT * FROM vehicles WHERE id = $1', [booking.vehicle_id]) : Promise.resolve({ rows: [{ name: 'N/A', type: 'N/A' }] })
      ]);

      if (userResult.rows[0] && slotResult.rows[0] && trainerResult.rows[0]) {
        const user = userResult.rows[0];
        const slot = slotResult.rows[0];
        const trainer = { full_name: trainerResult.rows[0].full_name };
        const vehicle = vehicleResult.rows[0] || { name: 'N/A', type: 'N/A' };

        // Send email notification
        emailService.sendBookingCancellation(
          booking, user, slot, trainer, vehicle
        ).catch(err => console.error('Email notification failed:', err));

        // Send WhatsApp notification
        if (user.phone) {
          whatsappService.sendBookingCancellation(
            booking, user, slot, trainer, vehicle
          ).catch(err => console.error('WhatsApp notification failed:', err));
        }
      }
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
