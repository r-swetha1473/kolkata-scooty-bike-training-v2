/**
 * Rolling metrics for availability API performance and errors.
 */

const MAX_SAMPLES = 200;
const responseTimesMs = [];
let lastCalculationAt = null;
let lastCalculationMeta = null;
let apiErrors = [];
let totalRequests = 0;
let totalErrors = 0;

function recordAvailabilityResponse(durationMs, meta = {}) {
  totalRequests += 1;
  responseTimesMs.push(Number(durationMs) || 0);
  if (responseTimesMs.length > MAX_SAMPLES) responseTimesMs.shift();
  lastCalculationAt = new Date().toISOString();
  lastCalculationMeta = meta;
}

function recordAvailabilityError(error, meta = {}) {
  totalErrors += 1;
  apiErrors.push({
    at: new Date().toISOString(),
    message: String(error?.message || error || 'Unknown error'),
    ...meta
  });
  if (apiErrors.length > MAX_SAMPLES) apiErrors.shift();
}

function averageResponseMs() {
  if (!responseTimesMs.length) return null;
  const sum = responseTimesMs.reduce((a, b) => a + b, 0);
  return Math.round(sum / responseTimesMs.length);
}

function getMetrics() {
  return {
    totalRequests,
    totalErrors,
    averageResponseMs: averageResponseMs(),
    lastCalculationAt,
    lastCalculationMeta,
    recentErrors: apiErrors.slice(-10).reverse()
  };
}

module.exports = {
  recordAvailabilityResponse,
  recordAvailabilityError,
  getMetrics
};
