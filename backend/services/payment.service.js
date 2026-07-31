const path = require('path');
const fs = require('fs');
const os = require('os');
const db = require('../db');
const auditService = require('./audit.service');
const { logActivity } = require('./activity.service');
const { EVENT_TYPES, logBookingEvent } = require('./bookingEvent.service');

// Vercel / serverless: only /tmp (or os.tmpdir) is writable.
const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : process.env.VERCEL
    ? path.join(os.tmpdir(), 'kolkata-bike-training-uploads')
    : path.join(__dirname, '..', 'uploads');
const RECEIPT_DIR = path.join(UPLOAD_ROOT, 'receipts');

function ensureReceiptDir() {
  fs.mkdirSync(RECEIPT_DIR, { recursive: true });
  fs.mkdirSync(path.join(RECEIPT_DIR, '_tmp'), { recursive: true });
  return RECEIPT_DIR;
}

async function createPaymentForBooking(
  client,
  {
    bookingId,
    userId,
    amount,
    status = 'pending_upload',
    referenceNumber = null,
    paymentMethod = null,
    paymentDate = null,
    paymentNotes = null,
    recordedBy = null,
    receiptPath = null,
    receiptMime = null,
    receiptOriginalName = null
  }
) {
  const q = client || db;
  const r = await q.query(
    `INSERT INTO payments (
       booking_id, user_id, amount, currency, status,
       reference_number, payment_method, payment_date, payment_notes, recorded_by,
       receipt_path, receipt_mime, receipt_original_name,
       reviewed_by, reviewed_at
     ) VALUES (
       $1, $2, $3, 'INR', $4::payment_status_enum,
       $5, $6, $7, $8, $9,
       $10, $11, $12,
       $13, $14
     )
     RETURNING *`,
    [
      bookingId,
      userId || null,
      amount || 0,
      status,
      referenceNumber || null,
      paymentMethod || null,
      paymentDate || null,
      paymentNotes || null,
      recordedBy || null,
      receiptPath || null,
      receiptMime || null,
      receiptOriginalName || null,
      status === 'verified' || status === 'partial' ? recordedBy || null : null,
      status === 'verified' || status === 'partial' ? new Date().toISOString() : null
    ]
  );
  const payment = r.rows[0];
  await q.query(
    `INSERT INTO payment_events (payment_id, actor_id, event_type, new_data)
     VALUES ($1, $2, 'CREATED', $3::jsonb)`,
    [
      payment.id,
      recordedBy || userId || null,
      JSON.stringify({
        status: payment.status,
        amount: payment.amount,
        payment_method: payment.payment_method
      })
    ]
  );
  await logBookingEvent(
    {
      bookingId,
      eventType: EVENT_TYPES.PAYMENT_CREATED,
      title: 'Payment Created',
      description:
        status === 'verified'
          ? 'Payment recorded and approved by admin'
          : status === 'partial'
            ? 'Partial payment recorded by admin'
            : 'Awaiting receipt upload or verification',
      actorId: recordedBy || userId || null,
      metadata: {
        payment_id: payment.id,
        amount: payment.amount,
        status,
        payment_method: paymentMethod
      }
    },
    client
  );
  return payment;
}

/** Persist an uploaded receipt file and return relative storage paths. */
function persistReceiptFile(paymentId, file) {
  if (!file?.path) return null;
  ensureReceiptDir();
  const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
  const safeName = `${paymentId}_${Date.now()}${ext}`;
  const dest = path.join(RECEIPT_DIR, safeName);
  fs.renameSync(file.path, dest);
  return {
    relativePath: path.join('receipts', safeName).replace(/\\/g, '/'),
    mime: file.mimetype || null,
    originalName: file.originalname || null
  };
}

async function getPaymentById(id) {
  const r = await db.query(
    `SELECT p.*, b.status AS booking_status, b.branch_id, b.course_id, b.slot_id,
            b.booking_reference, b.offline_customer_name, b.booking_source,
            c.name AS course_name, c.price_label, br.name AS branch_name,
            reviewer.full_name AS reviewed_by_name
     FROM payments p
     JOIN bookings b ON b.id = p.booking_id
     LEFT JOIN courses c ON c.id = b.course_id
     LEFT JOIN branches br ON br.id = b.branch_id
     LEFT JOIN profiles reviewer ON reviewer.id = p.reviewed_by
     WHERE p.id = $1`,
    [id]
  );
  return r.rows[0] || null;
}

async function listMyPayments(userId) {
  const r = await db.query(
    `SELECT p.*, b.status AS booking_status, b.slot_id, b.booking_reference,
            c.name AS course_name, br.name AS branch_name
     FROM payments p
     JOIN bookings b ON b.id = p.booking_id
     LEFT JOIN courses c ON c.id = b.course_id
     LEFT JOIN branches br ON br.id = b.branch_id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  );
  return r.rows;
}

async function listAdminPayments({ status, branchId, limit = 50, offset = 0 } = {}) {
  const params = [];
  const where = [];
  if (status === 'pending' || status === 'needs_attention') {
    where.push(`p.status IN ('pending_upload', 'pending_verification')`);
  } else if (status) {
    params.push(status);
    where.push(`p.status = $${params.length}`);
  }
  if (branchId) {
    params.push(branchId);
    where.push(`b.branch_id = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(Math.min(Number(limit) || 50, 200));
  params.push(Math.max(Number(offset) || 0, 0));
  const r = await db.query(
    `SELECT p.*, b.status AS booking_status, b.phone AS booking_phone, b.branch_id, b.course_id,
            b.booking_reference, b.offline_customer_name, b.booking_source,
            pr.email AS user_email, pr.full_name AS user_name,
            c.name AS course_name, br.name AS branch_name,
            s.start_time AS slot_start, s.slot_date,
            reviewer.full_name AS reviewed_by_name
     FROM payments p
     JOIN bookings b ON b.id = p.booking_id
     LEFT JOIN profiles pr ON pr.id = p.user_id
     LEFT JOIN courses c ON c.id = b.course_id
     LEFT JOIN branches br ON br.id = b.branch_id
     LEFT JOIN slots s ON s.id = b.slot_id
     LEFT JOIN profiles reviewer ON reviewer.id = p.reviewed_by
     ${whereSql}
     ORDER BY
       CASE p.status
         WHEN 'pending_verification' THEN 0
         WHEN 'pending_upload' THEN 1
         WHEN 'partial' THEN 2
         WHEN 'rejected' THEN 3
         ELSE 4
       END,
       p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return r.rows;
}

async function submitReceipt({ paymentId, userId, referenceNumber, file, asAdmin = false }) {
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    const err = new Error('Payment not found');
    err.status = 404;
    err.errorCode = 'PAYMENT_NOT_FOUND';
    throw err;
  }
  if (!asAdmin && payment.user_id !== userId) {
    const err = new Error('Not allowed');
    err.status = 403;
    err.errorCode = 'FORBIDDEN';
    throw err;
  }
  if (!['pending_upload', 'rejected', 'partial', 'pending_verification'].includes(payment.status)) {
    const err = new Error('Receipt cannot be uploaded for this payment status');
    err.status = 400;
    err.errorCode = 'PAYMENT_STATUS_INVALID';
    throw err;
  }
  if (payment.booking_status === 'cancelled') {
    const err = new Error('Booking is cancelled');
    err.status = 400;
    err.errorCode = 'BOOKING_CANCELLED';
    throw err;
  }

  ensureReceiptDir();
  const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
  const safeName = `${paymentId}_${Date.now()}${ext}`;
  const dest = path.join(RECEIPT_DIR, safeName);
  fs.renameSync(file.path, dest);
  const relativePath = path.join('receipts', safeName).replace(/\\/g, '/');

  const nextStatus = asAdmin ? payment.status === 'verified' ? 'verified' : 'pending_verification' : 'pending_verification';

  const r = await db.query(
    `UPDATE payments SET
       reference_number = COALESCE($2, reference_number),
       receipt_path = $3,
       receipt_mime = $4,
       receipt_original_name = $5,
       status = CASE WHEN status = 'verified' THEN status ELSE $6::payment_status_enum END,
       rejection_reason = NULL,
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      paymentId,
      referenceNumber || null,
      relativePath,
      file.mimetype || null,
      file.originalname || null,
      nextStatus
    ]
  );

  await db.query(
    `INSERT INTO payment_events (payment_id, actor_id, event_type, old_data, new_data)
     VALUES ($1, $2, 'RECEIPT_UPLOADED', $3::jsonb, $4::jsonb)`,
    [
      paymentId,
      userId,
      JSON.stringify({ status: payment.status }),
      JSON.stringify({ status: r.rows[0].status, reference_number: referenceNumber, as_admin: !!asAdmin })
    ]
  );

  await logActivity({
    actorId: userId,
    action: 'PAYMENT_RECEIPT_UPLOAD',
    entityType: 'payment',
    entityId: paymentId,
    meta: { booking_id: payment.booking_id, as_admin: !!asAdmin }
  });

  await logBookingEvent({
    bookingId: payment.booking_id,
    eventType: EVENT_TYPES.PAYMENT_RECEIPT_UPLOADED,
    title: 'Payment Uploaded',
    description: asAdmin ? 'Receipt uploaded by admin' : 'Receipt submitted for admin verification',
    actorId: userId,
    metadata: { payment_id: paymentId, reference_number: referenceNumber || null }
  });

  return r.rows[0];
}

/** Map UI payment labels to DB enum + booking outcome. */
function mapOfflinePaymentStatus(uiStatus) {
  const s = String(uiStatus || 'pending').toLowerCase();
  if (s === 'paid') return { paymentStatus: 'verified', confirmBooking: true };
  if (s === 'partial') return { paymentStatus: 'partial', confirmBooking: true };
  if (s === 'failed') return { paymentStatus: 'rejected', confirmBooking: false };
  // pending
  return { paymentStatus: 'pending_upload', confirmBooking: false };
}

function normalizePaymentMethod(method) {
  const m = String(method || '').toLowerCase().trim().replace(/\s+/g, '_');
  const allowed = new Set(['cash', 'upi', 'bank_transfer', 'card', 'other']);
  return allowed.has(m) ? m : null;
}

async function approvePayment({ paymentId, adminId }) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const payRes = await client.query(`SELECT * FROM payments WHERE id = $1 FOR UPDATE`, [paymentId]);
    const payment = payRes.rows[0];
    if (!payment) {
      const err = new Error('Payment not found');
      err.status = 404;
      throw err;
    }
    if (payment.status !== 'pending_verification') {
      const err = new Error('Only payments pending verification can be approved');
      err.status = 400;
      err.errorCode = 'PAYMENT_STATUS_INVALID';
      throw err;
    }

    await client.query(
      `UPDATE payments SET status = 'verified', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [paymentId, adminId]
    );
    await client.query(
      `UPDATE bookings SET status = 'confirmed', updated_at = NOW() WHERE id = $1 AND status = 'pending_payment'`,
      [payment.booking_id]
    );
    await client.query(
      `INSERT INTO payment_events (payment_id, actor_id, event_type, new_data)
       VALUES ($1, $2, 'VERIFIED', $3::jsonb)`,
      [paymentId, adminId, JSON.stringify({ booking_id: payment.booking_id })]
    );
    await client.query('COMMIT');

    await logBookingEvent({
      bookingId: payment.booking_id,
      eventType: EVENT_TYPES.PAYMENT_APPROVED,
      title: 'Payment Approved',
      description: 'Payment verified by admin',
      actorId: adminId,
      metadata: { payment_id: paymentId }
    });
    await logBookingEvent({
      bookingId: payment.booking_id,
      eventType: EVENT_TYPES.BOOKING_CONFIRMED,
      title: 'Booking Confirmed',
      description: 'Booking confirmed after payment approval',
      actorId: adminId,
      metadata: { payment_id: paymentId }
    });

    await logActivity({
      actorId: adminId,
      action: 'PAYMENT_APPROVED',
      entityType: 'payment',
      entityId: paymentId,
      meta: { booking_id: payment.booking_id }
    });
    await auditService.logPaymentApproval(adminId, payment);

    return getPaymentById(paymentId);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function rejectPayment({ paymentId, adminId, reason }) {
  const payRes = await db.query(`SELECT * FROM payments WHERE id = $1`, [paymentId]);
  const payment = payRes.rows[0];
  if (!payment) {
    const err = new Error('Payment not found');
    err.status = 404;
    throw err;
  }
  if (payment.status !== 'pending_verification') {
    const err = new Error('Only payments pending verification can be rejected');
    err.status = 400;
    err.errorCode = 'PAYMENT_STATUS_INVALID';
    throw err;
  }

  const r = await db.query(
    `UPDATE payments SET
       status = 'rejected',
       rejection_reason = $2,
       reviewed_by = $3,
       reviewed_at = NOW(),
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [paymentId, reason || 'Rejected by admin', adminId]
  );

  // Booking stays pending_payment so student can re-upload
  await db.query(
    `INSERT INTO payment_events (payment_id, actor_id, event_type, new_data)
     VALUES ($1, $2, 'REJECTED', $3::jsonb)`,
    [paymentId, adminId, JSON.stringify({ reason: reason || null })]
  );

  await logBookingEvent({
    bookingId: payment.booking_id,
    eventType: EVENT_TYPES.PAYMENT_REJECTED,
    title: 'Payment Rejected',
    description: reason ? `Reason: ${reason}` : 'Receipt rejected — re-upload required',
    actorId: adminId,
    metadata: { payment_id: paymentId, reason: reason || null }
  });

  await logActivity({
    actorId: adminId,
    action: 'PAYMENT_REJECTED',
    entityType: 'payment',
    entityId: paymentId,
    meta: { booking_id: payment.booking_id, reason }
  });
  await auditService.logPaymentRejection(adminId, payment, reason);

  return r.rows[0];
}

/**
 * Cancel pending_payment bookings older than expireHours without verified payment.
 */
async function expireUnpaidBookings(expireHours = 12) {
  const client = await db.getClient();
  let expired = 0;
  try {
    await client.query('BEGIN');
    const due = await client.query(
      `SELECT b.id, b.slot_id, b.vehicle_id
       FROM bookings b
       LEFT JOIN payments p ON p.booking_id = b.id
       WHERE b.status = 'pending_payment'
         AND b.created_at < NOW() - ($1::text || ' hours')::interval
         AND (p.id IS NULL OR p.status IN ('pending_upload', 'rejected'))
       FOR UPDATE OF b`,
      [String(expireHours)]
    );

    for (const row of due.rows) {
      await client.query(
        `UPDATE bookings SET status = 'cancelled', cancelled_at = NOW(),
           cancellation_reason = 'Auto-expired: payment not completed in time',
           updated_at = NOW()
         WHERE id = $1`,
        [row.id]
      );
      await client.query(
        `UPDATE slots SET
           booked_count = GREATEST(booked_count - 1, 0),
           status = CASE
             WHEN GREATEST(booked_count - 1, 0) = 0 THEN 'available'
             WHEN GREATEST(booked_count - 1, 0) < capacity THEN 'available'
             ELSE status
           END,
           updated_at = NOW()
         WHERE id = $1`,
        [row.slot_id]
      );
      if (row.id) {
        await client.query(
          `UPDATE payments SET status = 'rejected', rejection_reason = 'Expired unpaid', updated_at = NOW()
           WHERE booking_id = $1 AND status IN ('pending_upload', 'pending_verification', 'rejected')`,
          [row.id]
        ).catch(() => {});
      }
      expired += 1;
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  return { expired };
}

function resolveReceiptAbsolutePath(relativePath) {
  if (!relativePath) return null;
  const abs = path.join(UPLOAD_ROOT, relativePath);
  if (!abs.startsWith(UPLOAD_ROOT)) return null;
  return abs;
}

module.exports = {
  UPLOAD_ROOT,
  RECEIPT_DIR,
  ensureReceiptDir,
  createPaymentForBooking,
  persistReceiptFile,
  getPaymentById,
  listMyPayments,
  listAdminPayments,
  submitReceipt,
  approvePayment,
  rejectPayment,
  expireUnpaidBookings,
  resolveReceiptAbsolutePath,
  mapOfflinePaymentStatus,
  normalizePaymentMethod
};
