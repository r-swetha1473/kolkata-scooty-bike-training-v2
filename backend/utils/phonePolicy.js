/**
 * Customer mobile-number gate.
 * REQUIRE_REAL_PHONE defaults on. Set to 0/false/off/no to restore the previous behaviour.
 */

const { isGooglePlaceholder } = require('./userPhone');
const {
  normalizeStrictIndianMobile,
  isValidIndianMobile,
  INVALID_MOBILE_MESSAGE,
  DUPLICATE_PHONE_MESSAGE
} = require('./phoneNormalize');

/** Customer booking gate. Trainer and admin accounts sign in without a mobile number. */
const PHONE_GATE_EXEMPT_ROLES = ['admin', 'superadmin', 'subadmin', 'trainer'];

function isRequireRealPhoneEnabled() {
  const raw = process.env.REQUIRE_REAL_PHONE;
  if (raw == null || String(raw).trim() === '') return true;
  return !['0', 'false', 'off', 'no'].includes(String(raw).trim().toLowerCase());
}

function isPlaceholderPhone(phone) {
  return isGooglePlaceholder(phone);
}

function customerNeedsRealPhone(user) {
  if (!user) return false;
  if (PHONE_GATE_EXEMPT_ROLES.includes(user.role)) return false;
  if (!isRequireRealPhoneEnabled()) return false;
  return isPlaceholderPhone(user.phone) || !isValidIndianMobile(user.phone);
}

function phoneCompleteForUser(user) {
  if (!user) return false;
  return !customerNeedsRealPhone(user);
}

/**
 * Validate a phone submitted to PUT /profiles/me.
 * Empty and GOOGLE_ placeholders are rejected. A valid value is normalized to 10 digits.
 */
function parseProfilePhone(rawPhone) {
  if (rawPhone == null || String(rawPhone).trim() === '' || isPlaceholderPhone(rawPhone)) {
    return { ok: false, status: 400, errorCode: 'INVALID_PHONE', message: INVALID_MOBILE_MESSAGE };
  }
  const phone = normalizeStrictIndianMobile(rawPhone);
  if (!phone) {
    return { ok: false, status: 400, errorCode: 'INVALID_PHONE', message: INVALID_MOBILE_MESSAGE };
  }
  return { ok: true, phone };
}

function isPhoneUniqueViolation(err) {
  if (!err || err.code !== '23505') return false;
  const blob = `${err.constraint || ''} ${err.detail || ''}`.toLowerCase();
  return blob.includes('phone');
}

function requireRealPhone(req, res, next) {
  if (!customerNeedsRealPhone(req.user)) return next();
  return res.status(428).json({
    success: false,
    code: 'PHONE_REQUIRED',
    errorCode: 'PHONE_REQUIRED',
    message: 'Add your mobile number to book classes.'
  });
}

module.exports = {
  ADMIN_ROLES: PHONE_GATE_EXEMPT_ROLES,
  PHONE_GATE_EXEMPT_ROLES,
  isRequireRealPhoneEnabled,
  isPlaceholderPhone,
  customerNeedsRealPhone,
  phoneCompleteForUser,
  parseProfilePhone,
  isPhoneUniqueViolation,
  requireRealPhone,
  INVALID_MOBILE_MESSAGE,
  DUPLICATE_PHONE_MESSAGE
};
