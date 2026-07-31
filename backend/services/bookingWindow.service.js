/**
 * Compatibility facade: booking window hours via bookingRules.service.
 * Prefer require('./bookingRules.service') for new code.
 */
const bookingRules = require('./bookingRules.service');

async function getBookingWindowHours() {
  const rules = await bookingRules.getBookingRules();
  return rules.bookingWindowHours;
}

function getBookingWindowHoursSync() {
  return bookingRules.getBookingRulesSync().bookingWindowHours;
}

async function refreshBookingWindowHours() {
  const rules = await bookingRules.refreshBookingRules();
  return rules.bookingWindowHours;
}

function bookingWindowMessage(hours) {
  return bookingRules.bookingWindowMessage(hours);
}

function visibilityWindowMessage(hours) {
  return bookingWindowMessage(hours);
}

module.exports = {
  SETTINGS_KEY: bookingRules.KEYS.bookingWindowHours,
  DEFAULT_HOURS: bookingRules.defaults().bookingWindowHours,
  getBookingWindowHoursSync,
  getBookingWindowHours,
  refreshBookingWindowHours,
  bookingWindowMessage,
  visibilityWindowMessage,
  clampHours: (n) =>
    Math.min(24 * 90, Math.max(1, parseInt(String(n), 10) || bookingRules.defaults().bookingWindowHours))
};
