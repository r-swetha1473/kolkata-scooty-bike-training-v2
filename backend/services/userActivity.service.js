const db = require('../db');

function mapEvent(row) {
  return {
    id: row.id,
    type: row.event_type || row.action || 'ACTIVITY',
    title: row.title,
    description: row.description || null,
    created_at: row.created_at,
    actor_name: row.actor_name || null,
    ip_address: row.ip_address || null,
    metadata: row.metadata || null,
    source: row.source
  };
}

async function getUserActivity(userId, { search = '', limit = 100, offset = 0 } = {}) {
  const profile = await db.query(
    `SELECT id, full_name, email, phone, role, created_at, updated_at FROM profiles WHERE id = $1`,
    [userId]
  );
  if (!profile.rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    err.errorCode = 'USER_NOT_FOUND';
    throw err;
  }

  const user = profile.rows[0];
  const events = [];

  events.push({
    id: `profile-${user.id}`,
    type: 'ACCOUNT_CREATED',
    title: 'Account Created',
    description: `${user.full_name || user.email} registered`,
    created_at: user.created_at,
    actor_name: user.full_name,
    ip_address: null,
    metadata: { role: user.role },
    source: 'profile'
  });

  const auditResult = await db.query(
    `SELECT al.id, al.action, al.entity_type, al.entity_id, al.old_data, al.new_data,
            al.ip_address, al.created_at, p.full_name AS actor_name
     FROM audit_logs al
     LEFT JOIN profiles p ON al.user_id = p.id
     WHERE al.user_id = $1
        OR (al.entity_type = 'profile' AND al.entity_id = $1)
        OR al.entity_id IN (SELECT id FROM bookings WHERE user_id = $1)
     ORDER BY al.created_at DESC
     LIMIT 200`,
    [userId]
  ).catch(() => ({ rows: [] }));

  for (const row of auditResult.rows) {
    events.push(mapEvent({
      id: row.id,
      event_type: row.action,
      title: row.action.replace(/_/g, ' '),
      description: row.entity_type ? `${row.entity_type}${row.entity_id ? ` · ${row.entity_id}` : ''}` : null,
      created_at: row.created_at,
      actor_name: row.actor_name,
      ip_address: row.ip_address,
      metadata: row.new_data,
      source: 'audit'
    }));
  }

  const bookingEvents = await db.query(
    `SELECT be.id, be.event_type, be.title, be.description, be.metadata, be.created_at,
            p.full_name AS actor_name, b.booking_reference
     FROM booking_events be
     JOIN bookings b ON b.id = be.booking_id
     LEFT JOIN profiles p ON be.actor_id = p.id
     WHERE b.user_id = $1
     ORDER BY be.created_at DESC
     LIMIT 200`,
    [userId]
  ).catch(() => ({ rows: [] }));

  for (const row of bookingEvents.rows) {
    events.push(mapEvent({
      id: row.id,
      event_type: row.event_type,
      title: row.title,
      description: row.booking_reference
        ? `${row.description || ''} · Ref ${row.booking_reference}`.trim()
        : row.description,
      created_at: row.created_at,
      actor_name: row.actor_name,
      metadata: row.metadata,
      source: 'booking'
    }));
  }

  const paymentEvents = await db.query(
    `SELECT pe.id, pe.event_type, pe.created_at, pe.new_data,
            p.full_name AS actor_name, pay.reference_number, b.booking_reference
     FROM payment_events pe
     JOIN payments pay ON pay.id = pe.payment_id
     JOIN bookings b ON b.id = pay.booking_id
     LEFT JOIN profiles p ON pe.actor_id = p.id
     WHERE pay.user_id = $1
     ORDER BY pe.created_at DESC
     LIMIT 100`,
    [userId]
  ).catch(() => ({ rows: [] }));

  for (const row of paymentEvents.rows) {
    events.push(mapEvent({
      id: row.id,
      event_type: row.event_type,
      title: row.event_type.replace(/_/g, ' '),
      description: row.booking_reference || row.reference_number || null,
      created_at: row.created_at,
      actor_name: row.actor_name,
      metadata: row.new_data,
      source: 'payment'
    }));
  }

  events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  let filtered = events;
  const term = String(search || '').trim().toLowerCase();
  if (term) {
    filtered = events.filter((e) =>
      [e.title, e.description, e.type, e.actor_name].join(' ').toLowerCase().includes(term)
    );
  }

  const total = filtered.length;
  const slice = filtered.slice(offset, offset + limit);

  return {
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      last_seen: user.updated_at
    },
    events: slice,
    total
  };
}

module.exports = { getUserActivity };
