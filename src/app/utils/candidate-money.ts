/** INR amounts for the candidate screens. Same paise rules as backend/utils/candidateMoney.js. */

export function toPaise(value: unknown): number | null {
  if (value == null || value === '') return null;
  const raw = String(value).trim().replace(/,/g, '');
  const negative = raw.startsWith('-');
  const body = negative ? raw.slice(1) : raw;
  if (!/^\d+(\.\d{1,2})?$/.test(body)) return null;
  const [whole, frac = ''] = body.split('.');
  const paise = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  if (!Number.isSafeInteger(paise)) return null;
  return negative ? -paise : paise;
}

export function fromPaise(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(Number(paise) || 0);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

export function formatInr(value: unknown): string {
  const paise = toPaise(value ?? 0);
  if (paise == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
}

export function dueBetween(totalFee: unknown, amountPaid: unknown): string | null {
  const total = toPaise(totalFee);
  const paid = toPaise(amountPaid == null || amountPaid === '' ? '0' : amountPaid);
  if (total == null || paid == null) return null;
  return fromPaise(total - paid);
}

/** Positive due stays a currency amount. A negative due is an overpayment, never a red minus. */
export function balanceLabel(dueValue: unknown): { text: string; tone: 'due' | 'clear' | 'overpaid' } {
  const paise = toPaise(dueValue ?? 0);
  if (paise == null) return { text: '—', tone: 'clear' };
  if (paise > 0) return { text: formatInr(fromPaise(paise)), tone: 'due' };
  if (paise < 0) return { text: `Overpaid by ${formatInr(fromPaise(-paise))}`, tone: 'overpaid' };
  return { text: formatInr(0), tone: 'clear' };
}

export function paidExceedsFee(totalFee: unknown, amountPaid: unknown): boolean {
  const total = toPaise(totalFee);
  const paid = toPaise(amountPaid == null || amountPaid === '' ? '0' : amountPaid);
  if (total == null || paid == null) return false;
  return paid > total;
}
