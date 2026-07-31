/**
 * Booking activity timeline events — single audit trail for admin & support.
 */

const db = require('../db');

const EVENT_TYPES = {
  BOOKING_CREATED: 'BOOKING_CREATED',
  BOOKING_UPDATED: 'BOOKING_UPDATED',
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  PAYMENT_RECEIPT_UPLOADED: 'PAYMENT_RECEIPT_UPLOADED',
  PAYMENT_APPROVED: 'PAYMENT_APPROVED',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  TRAINER_ASSIGNED: 'TRAINER_ASSIGNED',
  VEHICLE_CHANGED: 'VEHICLE_CHANGED',
  ATTENDANCE_MARKED: 'ATTENDANCE_MARKED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  BOOKING_COMPLETED: 'BOOKING_COMPLETED',
  CERTIFICATE_GENERATED: 'CERTIFICATE_GENERATED'
};

const PAYMENT_EVENT_LABELS = {
  CREATED: { type: EVENT_TYPES.PAYMENT_CREATED, title: 'Payment Created', description: 'Awaiting receipt upload' },
  RECEIPT_UPLOADED: {
    type: EVENT_TYPES.PAYMENT_RECEIPT_UPLOADED,
    title: 'Payment Uploaded',
    description: 'Receipt submitted for verification'
  },
  VERIFIED: {
    type: EVENT_TYPES.PAYMENT_APPROVED,
    title: 'Payment Approved',
    description: 'Payment verified by admin'
  },
  REJECTED: {
    type: EVENT_TYPES.PAYMENT_REJECTED,
    title: 'Payment Rejected',
    description: 'Receipt rejected — re-upload required'
  }
};

async function logBookingEvent(
  { bookingId, eventType, title, description = null, actorId = null, metadata = {} },
  client = null
) {
  const runner = client || db;
  try {
    await runner.query(
      `INSERT INTO booking_events (booking_id, event_type, title, description, actor_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [bookingId, eventType, title, description, actorId, JSON.stringify(metadata || {})]
    );
  } catch (error) {
    if (error.code === '42P01') return;
    console.error('[bookingEvent] Failed to log event:', error.message);
  }
}

async function getBookingTimeline(bookingId, client = null) {
  return getUnifiedBookingTimeline(bookingId, client);
}

async function fetchBookingEvents(bookingId, client = null) {
  const runner = client || db;
  try {
    const result = await runner.query(
      `SELECT be.id, be.event_type, be.title, be.description, be.metadata, be.created_at,
              p.full_name AS actor_name, p.role AS actor_role, 'booking_event' AS source
       FROM booking_events be
       LEFT JOIN profiles p ON be.actor_id = p.id
       WHERE be.booking_id = $1`,
      [bookingId]
    );
    return result.rows;
  } catch (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
}

async function fetchPaymentTimelineEvents(bookingId, client = null) {
  const runner = client || db;
  try {
    const result = await runner.query(
      `SELECT pe.id, pe.event_type, pe.new_data, pe.created_at,
              p.full_name AS actor_name, p.role AS actor_role, 'payment_event' AS source
       FROM payment_events pe
       JOIN payments pay ON pay.id = pe.payment_id
       LEFT JOIN profiles p ON pe.actor_id = p.id
       WHERE pay.booking_id = $1`,
      [bookingId]
    );
    return result.rows.map((row) => {
      const mapped = PAYMENT_EVENT_LABELS[row.event_type] || {
        type: `PAYMENT_${row.event_type}`,
        title: row.event_type.replace(/_/g, ' '),
        description: null
      };
      let description = mapped.description;
      if (row.event_type === 'REJECTED' && row.new_data?.reason) {
        description = `Reason: ${row.new_data.reason}`;
      }
      if (row.event_type === 'VERIFIED') {
        description = 'Booking confirmed after payment approval';
      }
      return {
        id: row.id,
        event_type: mapped.type,
        title: mapped.title,
        description,
        metadata: row.new_data || {},
        created_at: row.created_at,
        actor_name: row.actor_name,
        actor_role: row.actor_role,
        source: row.source
      };
    });
  } catch (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
}

/**
 * Synthesize lifecycle steps for legacy bookings missing explicit events.
 */
function buildSyntheticTimeline(bookingRow, attendanceCount = 0) {
  if (!bookingRow) return [];
  const synthetic = [];
  const push = (event_type, title, description, created_at) => {
    synthetic.push({
      id: `synthetic-${event_type}-${created_at}`,
      event_type,
      title,
      description,
      metadata: { synthetic: true },
      created_at,
      actor_name: null,
      actor_role: null,
      source: 'synthetic'
    });
  };

  if (bookingRow.created_at) {
    push(
      EVENT_TYPES.BOOKING_CREATED,
      bookingRow.booking_source === 'OFFLINE' ? 'Offline Booking Created' : 'Booking Created',
      bookingRow.booking_source === 'OFFLINE' ? 'Created at branch' : 'Customer initiated booking',
      bookingRow.created_at
    );
  }

  if (['confirmed', 'completed'].includes(bookingRow.status) && bookingRow.updated_at) {
    push(
      EVENT_TYPES.BOOKING_CONFIRMED,
      'Booking Confirmed',
      'Ready for training session',
      bookingRow.updated_at
    );
  }

  if (bookingRow.trainer_id && bookingRow.updated_at) {
    push(
      EVENT_TYPES.TRAINER_ASSIGNED,
      'Trainer Assigned',
      bookingRow.trainer_name ? `Trainer: ${bookingRow.trainer_name}` : null,
      bookingRow.updated_at
    );
  }

  if (bookingRow.attendance_status === 'ATTENDED' && bookingRow.attendance_updated_at) {
    push(
      EVENT_TYPES.ATTENDANCE_MARKED,
      attendanceCount > 1 ? `Attendance ${attendanceCount}` : 'Attendance Marked',
      'Session attended',
      bookingRow.attendance_updated_at
    );
  }

  if (bookingRow.status === 'completed' && bookingRow.updated_at) {
    push(
      EVENT_TYPES.BOOKING_COMPLETED,
      'Completed',
      'Training course completed',
      bookingRow.updated_at
    );
    push(
      EVENT_TYPES.CERTIFICATE_GENERATED,
      'Certificate Generated',
      'Completion certificate issued',
      bookingRow.updated_at
    );
  }

  if (bookingRow.status === 'cancelled' && bookingRow.updated_at) {
    push(
      EVENT_TYPES.BOOKING_CANCELLED,
      'Booking Cancelled',
      bookingRow.cancellation_reason || null,
      bookingRow.updated_at
    );
  }

  return synthetic;
}

function dedupeTimeline(events) {
  const seen = new Set();
  return events.filter((ev) => {
    const key = `${ev.event_type}:${ev.created_at}:${ev.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Unified chronological timeline: booking_events + payment_events + legacy backfill.
 */
async function getUnifiedBookingTimeline(bookingId, client = null) {
  const runner = client || db;
  const [bookingEvents, paymentEvents, bookingRes, attendanceCountRes] = await Promise.all([
    fetchBookingEvents(bookingId, client),
    fetchPaymentTimelineEvents(bookingId, client),
    runner.query(
      `SELECT b.*, tp.full_name AS trainer_name
       FROM bookings b
       LEFT JOIN trainers t ON b.trainer_id = t.id
       LEFT JOIN profiles tp ON t.user_id = tp.id
       WHERE b.id = $1`,
      [bookingId]
    ),
    runner.query(
      `SELECT COUNT(*)::int AS count FROM booking_events
       WHERE booking_id = $1 AND event_type = $2`,
      [bookingId, EVENT_TYPES.ATTENDANCE_MARKED]
    ).catch(() => ({ rows: [{ count: 0 }] }))
  ]);

  const bookingRow = bookingRes.rows[0] || null;
  const attendanceCount = (attendanceCountRes.rows[0]?.count || 0) + 1;
  const merged = [...bookingEvents, ...paymentEvents];

  if (merged.length === 0 && bookingRow) {
    merged.push(...buildSyntheticTimeline(bookingRow, attendanceCount));
  } else if (bookingRow && merged.length > 0) {
    const hasCreated = merged.some((e) => e.event_type === EVENT_TYPES.BOOKING_CREATED);
    if (!hasCreated && bookingRow.created_at) {
      merged.unshift({
        id: `synthetic-created-${bookingId}`,
        event_type: EVENT_TYPES.BOOKING_CREATED,
        title: bookingRow.booking_source === 'OFFLINE' ? 'Offline Booking Created' : 'Booking Created',
        description: null,
        metadata: { synthetic: true },
        created_at: bookingRow.created_at,
        actor_name: null,
        actor_role: null,
        source: 'synthetic'
      });
    }
  }

  const confirmedFromPayment = merged.some(
    (e) => e.event_type === EVENT_TYPES.PAYMENT_APPROVED || e.event_type === EVENT_TYPES.BOOKING_CONFIRMED
  );
  if (confirmedFromPayment) {
    const approved = merged.find((e) => e.event_type === EVENT_TYPES.PAYMENT_APPROVED);
    if (approved && !merged.some((e) => e.event_type === EVENT_TYPES.BOOKING_CONFIRMED)) {
      merged.push({
        id: `derived-confirmed-${bookingId}`,
        event_type: EVENT_TYPES.BOOKING_CONFIRMED,
        title: 'Booking Confirmed',
        description: 'Confirmed after payment approval',
        metadata: { derived: true },
        created_at: approved.created_at,
        actor_name: approved.actor_name,
        actor_role: approved.actor_role,
        source: 'derived'
      });
    }
  }

  return dedupeTimeline(merged).sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    if (ta !== tb) return ta - tb;
    return String(a.id).localeCompare(String(b.id));
  });
}

module.exports = {
  EVENT_TYPES,
  logBookingEvent,
  getBookingTimeline,
  getUnifiedBookingTimeline
};
