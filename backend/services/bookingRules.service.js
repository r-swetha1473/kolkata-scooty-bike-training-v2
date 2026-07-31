/**
 * Single source of truth for customer booking policies.
 * Loaded from settings table (admin-editable), with app.config / env fallbacks.
 */
const db = require('../db');
const app = require('../app.config');
const scheduleCache = require('../scheduling/schedule-cache');

const CACHE_TTL_MS = 60_000;

const KEYS = {
  minAdvanceHours: 'min_advance_hours',
  bookingWindowValue: 'booking_window_value',
  bookingWindowUnit: 'booking_window_unit',
  bookingWindowHours: 'booking_window_hours',
  maxBookingsPerWeek: 'max_bookings_per_week',
  bookingGapHours: 'booking_gap_hours',
  allowSameDayBooking: 'allow_same_day_booking',
  showFullyBookedSlots: 'show_fully_booked_slots',
  showSlotsOutsideWindow: 'show_slots_outside_window',
  slotVisibilityMode: 'slot_visibility_mode',
  holidayBookingAllowed: 'holiday_booking_allowed',
  cancellationWindowHours: 'cancellation_window_hours'
};

const VISIBILITY_MODES = new Set([
  'hide_unavailable',
  'disable_unavailable',
  'show_all_with_status'
]);

const WINDOW_UNITS = new Set(['hours', 'days', 'weeks']);

function defaults() {
  const windowHours =
    parseInt(process.env.BOOKING_WINDOW_HOURS || '', 10) ||
    Number(app.booking?.bookingWindowHours) ||
    168;
  return {
    minAdvanceHours: Number(app.booking?.minAdvanceHours) || 5,
    bookingWindowValue: Math.max(1, Math.round(windowHours / 24)) || 7,
    bookingWindowUnit: 'days',
    bookingWindowHours: windowHours,
    maxBookingsPerWeek: Number(app.booking?.weeklyLimit) || 2,
    bookingGapHours: Number(app.booking?.bookingGapHours) || 48,
    allowSameDayBooking: true,
    showFullyBookedSlots: false,
    showSlotsOutsideWindow: true,
    slotVisibilityMode: 'hide_unavailable',
    holidayBookingAllowed: false,
    cancellationWindowHours: Number(app.booking?.cancellationWindowHours) || 5
  };
}

function unwrapJson(raw) {
  if (raw == null) return null;
  let v = raw;
  if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
    if ('value' in v) v = v.value;
    else if ('hours' in v) v = v.hours;
  }
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      /* plain */
    }
  }
  return v;
}

function toInt(raw, fallback, { min = 0, max = 24 * 90 } = {}) {
  const n = parseInt(String(unwrapJson(raw) ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toBool(raw, fallback) {
  const v = unwrapJson(raw);
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === '1' || v === 1) return true;
  if (v === 'false' || v === '0' || v === 0) return false;
  return fallback;
}

function toUnit(raw, fallback = 'days') {
  const v = String(unwrapJson(raw) ?? fallback).toLowerCase().trim();
  return WINDOW_UNITS.has(v) ? v : fallback;
}

function toVisibilityMode(raw, fallback = 'hide_unavailable') {
  const v = String(unwrapJson(raw) ?? fallback).toLowerCase().trim();
  return VISIBILITY_MODES.has(v) ? v : fallback;
}

function windowValueToHours(value, unit) {
  const n = Math.max(1, Number(value) || 1);
  if (unit === 'weeks') return Math.min(24 * 90, n * 7 * 24);
  if (unit === 'days') return Math.min(24 * 90, n * 24);
  return Math.min(24 * 90, n);
}

function hoursToWindowParts(hours) {
  const h = Math.max(1, Number(hours) || 168);
  if (h % 168 === 0) return { value: h / 168, unit: 'weeks' };
  if (h % 24 === 0) return { value: h / 24, unit: 'days' };
  return { value: h, unit: 'hours' };
}

let cached = defaults();
let cachedAt = 0;

function getBookingRulesSync() {
  return { ...cached };
}

function bookingWindowMessage(hours = cached.bookingWindowHours) {
  const h = toInt(hours, cached.bookingWindowHours, { min: 1 });
  if (h % 24 === 0) {
    const days = h / 24;
    return `Booking opens up to ${days} day${days === 1 ? '' : 's'} before the class. This slot is outside the booking window.`;
  }
  return `Booking opens up to ${h} hours before the class. This slot is outside the booking window.`;
}

function bookingAdvanceMessage(hours = cached.minAdvanceHours) {
  return `Bookings must be made at least ${hours} hours before the slot start time.`;
}

function cancellationWindowMessage(hours = cached.cancellationWindowHours) {
  return `Cancellation is only allowed up to ${hours} hours before the class start time.`;
}

async function loadMap() {
  const keys = Object.values(KEYS);
  const r = await db.query(
    `SELECT key, value FROM settings WHERE key = ANY($1::text[])`,
    [keys]
  );
  const map = {};
  for (const row of r.rows) map[row.key] = row.value;
  return map;
}

function buildFromMap(map) {
  const d = defaults();
  const unit = toUnit(map[KEYS.bookingWindowUnit], d.bookingWindowUnit);
  let value = toInt(map[KEYS.bookingWindowValue], d.bookingWindowValue, { min: 1, max: 90 * 7 });
  let hours = toInt(map[KEYS.bookingWindowHours], 0, { min: 0, max: 24 * 90 });

  if (map[KEYS.bookingWindowValue] != null || map[KEYS.bookingWindowUnit] != null) {
    hours = windowValueToHours(value, unit);
  } else if (hours > 0) {
    const parts = hoursToWindowParts(hours);
    value = parts.value;
    // keep unit from parts when only hours was seeded historically
  } else {
    hours = windowValueToHours(value, unit);
  }

  return {
    minAdvanceHours: toInt(map[KEYS.minAdvanceHours], d.minAdvanceHours, { min: 0, max: 24 * 14 }),
    bookingWindowValue: value,
    bookingWindowUnit: unit,
    bookingWindowHours: hours,
    maxBookingsPerWeek: toInt(map[KEYS.maxBookingsPerWeek], d.maxBookingsPerWeek, {
      min: 1,
      max: 50
    }),
    bookingGapHours: toInt(map[KEYS.bookingGapHours], d.bookingGapHours, { min: 0, max: 24 * 30 }),
    allowSameDayBooking: toBool(map[KEYS.allowSameDayBooking], d.allowSameDayBooking),
    showFullyBookedSlots: toBool(map[KEYS.showFullyBookedSlots], d.showFullyBookedSlots),
    showSlotsOutsideWindow: toBool(map[KEYS.showSlotsOutsideWindow], d.showSlotsOutsideWindow),
    slotVisibilityMode: toVisibilityMode(map[KEYS.slotVisibilityMode], d.slotVisibilityMode),
    holidayBookingAllowed: toBool(map[KEYS.holidayBookingAllowed], d.holidayBookingAllowed),
    cancellationWindowHours: toInt(
      map[KEYS.cancellationWindowHours],
      d.cancellationWindowHours,
      { min: 0, max: 24 * 14 }
    )
  };
}

async function refreshBookingRules() {
  try {
    const map = await loadMap();
    cached = buildFromMap(map);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[bookingRules] settings lookup failed:', err.message);
    }
    cached = defaults();
  }
  cachedAt = Date.now();
  try {
    scheduleCache.invalidateAll();
  } catch (_) {
    /* optional */
  }
  return getBookingRulesSync();
}

async function getBookingRules() {
  if (cachedAt > 0 && Date.now() - cachedAt < CACHE_TTL_MS) {
    return getBookingRulesSync();
  }
  return refreshBookingRules();
}

/** Normalize admin payload and persist related keys (incl. resolved hours). */
function normalizeAdminPayload(input = {}) {
  const current = getBookingRulesSync();
  const unit = toUnit(input.bookingWindowUnit ?? input.booking_window_unit, current.bookingWindowUnit);
  const value = toInt(
    input.bookingWindowValue ?? input.booking_window_value,
    current.bookingWindowValue,
    { min: 1, max: 90 * 7 }
  );
  const hours = windowValueToHours(value, unit);

  return {
    [KEYS.minAdvanceHours]: toInt(
      input.minAdvanceHours ?? input.min_advance_hours,
      current.minAdvanceHours,
      { min: 0, max: 24 * 14 }
    ),
    [KEYS.bookingWindowValue]: value,
    [KEYS.bookingWindowUnit]: unit,
    [KEYS.bookingWindowHours]: hours,
    [KEYS.maxBookingsPerWeek]: toInt(
      input.maxBookingsPerWeek ?? input.max_bookings_per_week,
      current.maxBookingsPerWeek,
      { min: 1, max: 50 }
    ),
    [KEYS.bookingGapHours]: toInt(
      input.bookingGapHours ?? input.booking_gap_hours,
      current.bookingGapHours,
      { min: 0, max: 24 * 30 }
    ),
    [KEYS.allowSameDayBooking]: toBool(
      input.allowSameDayBooking ?? input.allow_same_day_booking,
      current.allowSameDayBooking
    ),
    [KEYS.showFullyBookedSlots]: toBool(
      input.showFullyBookedSlots ?? input.show_fully_booked_slots,
      current.showFullyBookedSlots
    ),
    [KEYS.showSlotsOutsideWindow]: toBool(
      input.showSlotsOutsideWindow ?? input.show_slots_outside_window,
      current.showSlotsOutsideWindow
    ),
    [KEYS.slotVisibilityMode]: toVisibilityMode(
      input.slotVisibilityMode ?? input.slot_visibility_mode,
      current.slotVisibilityMode
    ),
    [KEYS.holidayBookingAllowed]: toBool(
      input.holidayBookingAllowed ?? input.holiday_booking_allowed,
      current.holidayBookingAllowed
    ),
    [KEYS.cancellationWindowHours]: toInt(
      input.cancellationWindowHours ?? input.cancellation_window_hours,
      current.cancellationWindowHours,
      { min: 0, max: 24 * 14 }
    )
  };
}

const DESCRIPTIONS = {
  [KEYS.minAdvanceHours]: 'Minimum hours before slot start for customer bookings.',
  [KEYS.bookingWindowValue]: 'Numeric part of the customer booking window.',
  [KEYS.bookingWindowUnit]: 'Unit for booking window: hours | days | weeks.',
  [KEYS.bookingWindowHours]: 'Resolved booking window in hours (synced from value+unit).',
  [KEYS.maxBookingsPerWeek]: 'Maximum bookings a customer may hold in a calendar week.',
  [KEYS.bookingGapHours]: "Minimum gap in hours between a customer's bookings.",
  [KEYS.allowSameDayBooking]: 'When false, customers cannot book slots that start today.',
  [KEYS.showFullyBookedSlots]: 'When true, fully booked slots remain visible (disabled).',
  [KEYS.showSlotsOutsideWindow]: 'When true, outside-window slots show as opens later.',
  [KEYS.slotVisibilityMode]: 'hide_unavailable | disable_unavailable | show_all_with_status',
  [KEYS.holidayBookingAllowed]: 'When false, holidays block customer availability.',
  [KEYS.cancellationWindowHours]: 'Hours before start required to allow customer cancellation.'
};

async function saveBookingRules(input, updatedBy = null) {
  const payload = normalizeAdminPayload(input);
  for (const [key, value] of Object.entries(payload)) {
    await db.query(
      `INSERT INTO settings (key, value, description, updated_by)
       VALUES ($1, $2::jsonb, $3, $4)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         description = COALESCE(EXCLUDED.description, settings.description),
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()`,
      [key, JSON.stringify(value), DESCRIPTIONS[key] || '', updatedBy]
    );
  }
  return refreshBookingRules();
}

function toPublicDto(rules = cached) {
  return {
    min_advance_hours: rules.minAdvanceHours,
    booking_window_value: rules.bookingWindowValue,
    booking_window_unit: rules.bookingWindowUnit,
    booking_window_hours: rules.bookingWindowHours,
    max_bookings_per_week: rules.maxBookingsPerWeek,
    booking_gap_hours: rules.bookingGapHours,
    allow_same_day_booking: rules.allowSameDayBooking,
    show_fully_booked_slots: rules.showFullyBookedSlots,
    show_slots_outside_window: rules.showSlotsOutsideWindow,
    slot_visibility_mode: rules.slotVisibilityMode,
    holiday_booking_allowed: rules.holidayBookingAllowed,
    cancellation_window_hours: rules.cancellationWindowHours
  };
}

// Warm cache
refreshBookingRules().catch(() => {});

module.exports = {
  KEYS,
  VISIBILITY_MODES,
  WINDOW_UNITS,
  defaults,
  windowValueToHours,
  hoursToWindowParts,
  getBookingRulesSync,
  getBookingRules,
  refreshBookingRules,
  normalizeAdminPayload,
  saveBookingRules,
  toPublicDto,
  bookingWindowMessage,
  bookingAdvanceMessage,
  cancellationWindowMessage
};
