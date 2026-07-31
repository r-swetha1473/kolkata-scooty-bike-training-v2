/**
 * Shared SQL predicate: slots a customer may book (capacity, timing).
 * Trainer assignment is optional — customer bookings use trainer_id NULL at insert.
 */
const { SLOT_VISIBILITY_HOURS } = require('../config/app.config');

/**
 * @param {string} alias Table alias for slots (default "s")
 * @param {{ dateScoped?: boolean, visibilityHours?: number }} [options]
 *   dateScoped: when true (GET /date/:date?bookable_only), do not apply the global upper window
 * @returns {string} SQL fragment (no leading AND)
 */
function sqlBookableSlotConditions(alias = 's', options = {}) {
  const a = alias;
  const dateScoped = options.dateScoped === true;
  const hours =
    options.visibilityHours != null ? Number(options.visibilityHours) : SLOT_VISIBILITY_HOURS;
  const visibilityUpper = dateScoped
    ? ''
    : `AND ${a}.start_time <= (NOW() + INTERVAL '${hours} hours')`;

  return `
    ${a}.start_time > NOW()
    ${visibilityUpper}
    AND ${a}.booked_count < ${a}.capacity
    AND ${a}.status NOT IN ('disabled', 'cancelled', 'full')
  `;
}

module.exports = {
  sqlBookableSlotConditions
};
