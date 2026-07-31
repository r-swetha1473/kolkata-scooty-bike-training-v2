/**
 * Flat booking/slot constants used by routes and SQL builders.
 * Booking policy numbers resolve via bookingRules.service (settings → env → config).
 */
const app = require('../app.config');
const bookingRules = require('../services/bookingRules.service');
const bookingWindow = require('../services/bookingWindow.service');

const SLOT_CAPACITY = {
  MAX: app.slot.maxCapacity,
  DEFAULT: app.slot.defaultCapacity
};

/** Soft admin deadline (hours before start); distinct from customer cancel window */
const CANCELLATION_DEADLINE_HOURS = 3;

/** Concurrent active booking limit per customer (business rule) */
const TOTAL_BOOKING_LIMIT = 2;

/** @deprecated entitlement gating removed from online booking; retained for residual cancel paths */
const ENTITLEMENT_VALIDITY_DAYS = 30;

Object.defineProperty(module.exports, 'SLOT_VISIBILITY_HOURS', {
  enumerable: true,
  get: () => bookingRules.getBookingRulesSync().bookingWindowHours
});
Object.defineProperty(module.exports, 'BOOKING_WINDOW_HOURS', {
  enumerable: true,
  get: () => bookingRules.getBookingRulesSync().bookingWindowHours
});
Object.defineProperty(module.exports, 'BOOKING_ADVANCE_HOURS', {
  enumerable: true,
  get: () => bookingRules.getBookingRulesSync().bookingWindowHours
});
Object.defineProperty(module.exports, 'MIN_BOOKING_ADVANCE_HOURS', {
  enumerable: true,
  get: () => bookingRules.getBookingRulesSync().minAdvanceHours
});
Object.defineProperty(module.exports, 'WEEKLY_BOOKING_LIMIT', {
  enumerable: true,
  get: () => bookingRules.getBookingRulesSync().maxBookingsPerWeek
});
Object.defineProperty(module.exports, 'BOOKING_GAP_HOURS', {
  enumerable: true,
  get: () => bookingRules.getBookingRulesSync().bookingGapHours
});
Object.defineProperty(module.exports, 'CANCELLATION_WINDOW_HOURS', {
  enumerable: true,
  get: () => bookingRules.getBookingRulesSync().cancellationWindowHours
});

module.exports.SLOT_CAPACITY = SLOT_CAPACITY;
module.exports.CANCELLATION_DEADLINE_HOURS = CANCELLATION_DEADLINE_HOURS;
module.exports.TOTAL_BOOKING_LIMIT = TOTAL_BOOKING_LIMIT;
module.exports.ENTITLEMENT_VALIDITY_DAYS = ENTITLEMENT_VALIDITY_DAYS;
module.exports.getBookingWindowHours = () => bookingWindow.getBookingWindowHours();
module.exports.getBookingRules = () => bookingRules.getBookingRules();
module.exports.getBookingRulesSync = () => bookingRules.getBookingRulesSync();
module.exports.refreshBookingWindowHours = () => bookingRules.refreshBookingRules();
module.exports.refreshBookingRules = () => bookingRules.refreshBookingRules();

bookingRules.refreshBookingRules().catch(() => {});
