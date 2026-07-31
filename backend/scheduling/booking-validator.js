/**
 * Thin wrapper around centralized booking validation for scheduling engine callers.
 */
const bookingValidation = require('../services/bookingValidation.service');

module.exports = {
  validateBookingEligibility: bookingValidation.validateBookingEligibility
};
