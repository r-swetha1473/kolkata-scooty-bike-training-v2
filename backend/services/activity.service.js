/**
 * Activity log helper (login, booking, payment, admin actions).
 */
const db = require('../db');

async function logActivity({
  actorId = null,
  actorRole = null,
  action,
  entityType = null,
  entityId = null,
  meta = {},
  ipAddress = null
} = {}) {
  if (!action) return;
  try {
    await db.query(
      `INSERT INTO activity_logs (actor_id, actor_role, action, entity_type, entity_id, meta, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        actorId,
        actorRole,
        action,
        entityType,
        entityId,
        JSON.stringify(meta || {}),
        ipAddress
      ]
    );
  } catch (err) {
    console.warn('[activity] log failed:', err.message);
  }
}

module.exports = { logActivity };
