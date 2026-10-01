/**
 * Candidate fees are stored as numeric(12,2) rupees (INR).
 * Comparisons use integer paise so 0.1 + 0.2 style errors cannot change a due amount.
 */

function toPaise(value) {
  if (value == null || value === '') return null;
  const raw = String(value).trim().replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const [whole, frac = ''] = raw.split('.');
  const paise = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  if (!Number.isSafeInteger(paise)) return null;
  return paise;
}

function fromPaise(paise) {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(Number(paise) || 0);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${frac}`;
}

function duePaise(totalFee, paidTotal) {
  return toPaise(totalFee) - toPaise(paidTotal);
}

module.exports = { toPaise, fromPaise, duePaise };
