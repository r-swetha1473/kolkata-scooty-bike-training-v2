/** Same rules as backend/utils/phoneNormalize.js normalizeStrictIndianMobile. */

export const INVALID_MOBILE_MESSAGE = 'Enter a 10-digit mobile number starting with 6-9';

export const DUPLICATE_PHONE_MESSAGE =
  'This number is already used by another account. Sign in with that account or contact us.';

export function normalizeStrictIndianMobile(input: unknown): string {
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

export function isValidIndianMobile(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}
