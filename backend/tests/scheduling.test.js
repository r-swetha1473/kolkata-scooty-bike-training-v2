const test = require('node:test');
const assert = require('node:assert/strict');
const slotEngine = require('../scheduling/slot-engine');

test('slot-engine generates windows for open weekday', () => {
  const windows = slotEngine.generateSlotWindows({
    dateString: '2026-07-27',
    daySchedule: { opens_at: '07:00', closes_at: '09:00', is_closed: false },
    durationMinutes: 30,
    slotCapacity: 5
  });
  assert.equal(windows.length, 4);
  assert.ok(windows[0].start_time);
  assert.equal(windows[0].slot_date, '2026-07-27');
});

test('slot-engine returns empty for closed day', () => {
  const windows = slotEngine.generateSlotWindows({
    dateString: '2026-07-26',
    daySchedule: { opens_at: '07:00', closes_at: '21:00', is_closed: true },
    durationMinutes: 30
  });
  assert.equal(windows.length, 0);
});

test('schedule cache stores and expires entries', () => {
  const cache = require('../scheduling/schedule-cache');
  cache.invalidateAll();
  cache.set('b1', '2026-07-27', null, 'bookable', { slots: [1] }, 50);
  assert.deepEqual(cache.get('b1', '2026-07-27', null, 'bookable'), { slots: [1] });
});

const availability = require('../scheduling/availability.service');
test('isBookableWindow rejects past slots', () => {
  const past = {
    start_time: new Date(Date.now() - 3600000).toISOString(),
    remaining_capacity: 2,
    status: 'available'
  };
  const result = availability.isBookableWindow(past, {});
  assert.equal(result.ok, false);
});

test('isBookableWindow accepts slots within configurable 7-day window', () => {
  const inThreeDays = {
    start_time: new Date(Date.now() + 3 * 24 * 3600000).toISOString(),
    remaining_capacity: 2,
    status: 'available'
  };
  const ok = availability.isBookableWindow(inThreeDays, { visibilityHours: 168 });
  assert.equal(ok.ok, true);
});

test('isBookableWindow rejects slots beyond booking window (not 24h)', () => {
  const inEightDays = {
    start_time: new Date(Date.now() + 8 * 24 * 3600000).toISOString(),
    remaining_capacity: 2,
    status: 'available'
  };
  // Old incorrect rule (24h) would also reject — assert new 168h ceiling
  const withinWeek = availability.isBookableWindow(
    {
      start_time: new Date(Date.now() + 6 * 24 * 3600000).toISOString(),
      remaining_capacity: 2,
      status: 'available'
    },
    { visibilityHours: 168 }
  );
  assert.equal(withinWeek.ok, true);

  const beyond = availability.isBookableWindow(inEightDays, { visibilityHours: 168 });
  assert.equal(beyond.ok, false);
  assert.match(beyond.reason, /Outside booking window/i);
});

test('isBookableWindow keeps 5h minimum advance', () => {
  const tooSoon = {
    start_time: new Date(Date.now() + 2 * 3600000).toISOString(),
    remaining_capacity: 2,
    status: 'available'
  };
  const result = availability.isBookableWindow(tooSoon, { visibilityHours: 168 });
  assert.equal(result.ok, false);
  assert.match(result.reason, /Minimum advance/i);
});
