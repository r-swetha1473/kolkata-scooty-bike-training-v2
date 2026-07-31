/**
 * Verify configurable booking window (default 168h) + 5h minimum advance.
 * Run: node backend/scripts/verify_booking_window.js
 */
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const availability = require('../scheduling/availability.service');
const bookingWindow = require('../services/bookingWindow.service');

function slotInHours(hoursFromNow) {
  return {
    start_time: new Date(Date.now() + hoursFromNow * 3600000).toISOString(),
    remaining_capacity: 3,
    status: 'available'
  };
}

async function main() {
  const windowHours = await bookingWindow.getBookingWindowHours();
  console.log('Resolved booking_window_hours:', windowHours);

  const cases = [
    { label: 'Today (+6h, past 5h min)', hours: 6, expectOk: true },
    { label: 'Today (+2h, fails 5h min)', hours: 2, expectOk: false },
    { label: 'Tomorrow (+30h)', hours: 30, expectOk: true },
    { label: '3 days later (+72h)', hours: 72, expectOk: true },
    { label: '7 days later (+160h)', hours: 160, expectOk: windowHours >= 160 },
    { label: 'Beyond window (+window+24h)', hours: windowHours + 24, expectOk: false }
  ];

  let failed = 0;
  for (const c of cases) {
    const r = availability.isBookableWindow(slotInHours(c.hours), {
      visibilityHours: windowHours
    });
    const pass = r.ok === c.expectOk;
    if (!pass) failed += 1;
    console.log(
      `${pass ? 'PASS' : 'FAIL'} | ${c.label} | ok=${r.ok}` +
        (r.reason ? ` (${r.reason})` : '') +
        ` | expected ok=${c.expectOk}`
    );
  }

  // Explicit: old 24h rule must NOT apply — a 48h-out slot must be bookable under 168h
  const fortyEight = availability.isBookableWindow(slotInHours(48), {
    visibilityHours: windowHours
  });
  const fortyEightPass = windowHours >= 48 ? fortyEight.ok === true : fortyEight.ok === false;
  if (!fortyEightPass) failed += 1;
  console.log(
    `${fortyEightPass ? 'PASS' : 'FAIL'} | Regression: +48h bookable under window=${windowHours} | ok=${fortyEight.ok}`
  );

  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
