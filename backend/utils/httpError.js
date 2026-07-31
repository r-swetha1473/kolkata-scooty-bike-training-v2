/**
 * Canonical API error JSON. Includes legacy `error` for Phase 3 clients.
 * @param {import('express').Response} res
 * @param {number} status
 * @param {string} message
 * @param {string} [errorCode]
 * @param {Record<string, unknown>} [extra]
 */
function jsonError(res, status, message, errorCode = 'ERROR', extra = {}) {
  return res.status(status).json({
    success: false,
    message,
    errorCode,
    error: message,
    ...extra
  });
}

module.exports = { jsonError };
