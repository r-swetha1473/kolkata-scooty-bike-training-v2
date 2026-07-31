/**
 * Verify booking validation window logic (DB-driven) with no undefined helpers.
 * Run: node backend/scripts/verify_booking_validation_window.js
 */
const path = require('path');
const fs = require('fs');
const db = require('../db');

const validationPath = path.join(__dirname, '../services/bookingValidation.service.js');
const src = fs.readFileSync(validationPath, 'utf8');

if (/\bgetBookingWindowHours\s*\(/.test(src) || /\bbookingWindowSvc\b/.test(src)) {
  console.error('FAIL: bookingValidation.service.js still references undefined helpers');
  process.exit(1);
}
console.log('OK: no getBookingWindowHours / bookingWindowSvc in bookingValidation.service.js');

const { getBookingRules } = require('../config/app.config');
const { validateBookingEligibility } = require('../services/bookingValidation.service');

function hoursFromNow(h) {
  return new Date(Date.now() + h * 3600 * 1000).toISOString();
}

function kolkataDateOffset(days) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return fmt.format(new Date(Date.now() + days * 86400000));
}

(async () => {
  const rules = await getBookingRules();
  console.log('DB-driven bookingWindowHours:', rules.bookingWindowHours);
  console.log('minAdvanceHours:', rules.minAdvanceHours);

  const vehicleRes = await db.query(
    `SELECT id FROM vehicles WHERE is_active = true ORDER BY created_at NULLS LAST LIMIT 1`
  );
  const vehicleId = vehicleRes.rows[0]?.id;
  if (!vehicleId) {
    console.error('FAIL: no active vehicle in DB');
    process.exit(1);
  }
  console.log('Using vehicle:', vehicleId);

  const phone = '9876543210';
  const cases = [
    {
      name: 'past slot',
      slotDate: kolkataDateOffset(-1),
      slotTime: hoursFromNow(-2),
      expectReasonAny: ['SLOT_PAST', 'BOOKING_ADVANCE_REQUIRED']
    },
    {
      name: 'inside window',
      slotDate: kolkataDateOffset(1),
      slotTime: hoursFromNow(Math.max(rules.minAdvanceHours + 4, 24)),
      expectEligibleOrLaterGate: true
    },
    {
      name: 'outside booking window',
      slotDate: kolkataDateOffset(Math.ceil(rules.bookingWindowHours / 24) + 5),
      slotTime: hoursFromNow(rules.bookingWindowHours + 72),
      expectReason: 'BOOKING_NOT_OPEN_YET'
    },
    {
      name: 'too soon (min advance)',
      slotDate: kolkataDateOffset(0),
      slotTime: hoursFromNow(Math.max(0.5, Math.min(2, rules.minAdvanceHours - 1) || 1)),
      expectReasonAny: [
        'MIN_ADVANCE_NOT_MET',
        'BOOKING_TOO_SOON',
        'BOOKING_ADVANCE_REQUIRED',
        'SLOT_PAST',
        'SAME_DAY_NOT_ALLOWED'
      ]
    }
  ];

  let failed = 0;
  for (const c of cases) {
    try {
      const result = await validateBookingEligibility(
        phone,
        c.slotDate,
        c.slotTime,
        vehicleId,
        null,
        null,
        null,
        { mode: 'create' }
      );

      if (String(result.message || result.reason || '').includes('getBookingWindowHours')) {
        console.error(`FAIL ${c.name}: ReferenceError leaked`, result);
        failed++;
        continue;
      }

      if (c.expectReason && result.reason !== c.expectReason) {
        console.error(`FAIL ${c.name}: expected ${c.expectReason} got`, result.reason, result.message);
        failed++;
        continue;
      }
      if (c.expectReasonAny && !c.expectReasonAny.includes(result.reason)) {
        console.error(`FAIL ${c.name}: expected one of ${c.expectReasonAny} got`, result.reason);
        failed++;
        continue;
      }
      if (c.expectEligibleOrLaterGate) {
        // Without slotId, may pass window and fail later on slot/trainer — that is OK
        if (result.reason === 'BOOKING_NOT_OPEN_YET' || result.reason === 'SLOT_PAST') {
          console.error(`FAIL ${c.name}: should be inside window`, result);
          failed++;
          continue;
        }
      }

      console.log(`OK ${c.name}: eligible=${result.eligible} reason=${result.reason || 'none'}`);
    } catch (e) {
      console.error(`FAIL ${c.name}: threw ${e.message}`);
      failed++;
    }
  }

  await db.pool.end().catch(() => {});
  if (failed) {
    console.error(`FAILED ${failed} case(s)`);
    process.exit(1);
  }
  console.log('ALL CHECKS PASSED');
  process.exit(0);
})().catch(async (e) => {
  console.error(e);
  try { await db.pool.end(); } catch (_) {}
  process.exit(1);
});
