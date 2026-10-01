/**
 * Normalize stored or user-entered Indian mobile numbers to 10 ASCII digits.
 * Handles +91, leading 0, and digit-only strings from the DB.
 */
function normalizeIndianMobileDigits(input) {
  if (input == null) return '';
  const raw = String(input).trim();
  if (raw === '') return '';
  let d = raw.replace(/\D/g, '');
  if (d.length === 0) return '';
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  else if (d.length > 10) d = d.slice(-10);
  return d;
}

const INVALID_MOBILE_MESSAGE = 'Enter a 10-digit mobile number starting with 6-9';
const DUPLICATE_PHONE_MESSAGE =
  'This number is already used by another account. Sign in with that account or contact us.';

/**
 * Strict profile-phone normalizer.
 * Accepts +91, 91, and a single leading 0, plus spaces, dashes, and parentheses.
 * Returns 10 digits starting with 6-9, or '' when the value cannot be a mobile number.
 * Does not keep the last 10 digits of an unrecognized longer string.
 */
function normalizeStrictIndianMobile(input) {
  if (input == null) return '';
  let raw = String(input).trim();
  if (raw === '' || /^GOOGLE_/i.test(raw)) return '';
  raw = raw.replace(/[\s\-().]/g, '');
  if (raw.startsWith('+')) raw = raw.slice(1);
  if (!/^\d+$/.test(raw)) return '';
  if (raw.length === 12 && raw.startsWith('91')) raw = raw.slice(2);
  else if (raw.length === 11 && raw.startsWith('0')) raw = raw.slice(1);
  if (!/^[6-9]\d{9}$/.test(raw)) return '';
  return raw;
}

function isValidIndianMobile(phone) {
  return /^[6-9]\d{9}$/.test(String(phone || ''));
}

module.exports = {
  normalizeIndianMobileDigits,
  normalizeStrictIndianMobile,
  isValidIndianMobile,
  INVALID_MOBILE_MESSAGE,
  DUPLICATE_PHONE_MESSAGE
};
