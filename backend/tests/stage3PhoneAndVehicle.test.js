const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  normalizeStrictIndianMobile,
  isValidIndianMobile
} = require('../utils/phoneNormalize');
const {
  isRequireRealPhoneEnabled,
  parseProfilePhone,
  isPhoneUniqueViolation,
  requireRealPhone,
  phoneCompleteForUser,
  DUPLICATE_PHONE_MESSAGE,
  INVALID_MOBILE_MESSAGE
} = require('../utils/phonePolicy');
const { formatAdminVehicleLabel, sqlAdminVehicleCategoryLabel } = require('../utils/vehicleLabel');
const { buildBookingListQuery } = require('../utils/bookingSearch');

function withEnv(name, value, fn) {
  const previous = process.env[name];
  if (value == null) delete process.env[name];
  else process.env[name] = value;
  try {
    return fn();
  } finally {
    if (previous == null) delete process.env[name];
    else process.env[name] = previous;
  }
}

test('strict mobile normalizer accepts +91, 91, and 0 prefixes only', () => {
  assert.equal(normalizeStrictIndianMobile('+91 98765 43210'), '9876543210');
  assert.equal(normalizeStrictIndianMobile('+91-98765-43210'), '9876543210');
  assert.equal(normalizeStrictIndianMobile('919876543210'), '9876543210');
  assert.equal(normalizeStrictIndianMobile('098765 43210'), '9876543210');
  assert.equal(normalizeStrictIndianMobile('9876543210'), '9876543210');
  assert.equal(isValidIndianMobile('9876543210'), true);
  assert.equal(isValidIndianMobile('6876543210'), true);
  assert.equal(isValidIndianMobile('7876543210'), true);
  assert.equal(isValidIndianMobile('8876543210'), true);
});

test('strict mobile normalizer rejects 9 digits, 11 digits, letters, and leading 3', () => {
  assert.equal(normalizeStrictIndianMobile('987654321'), '');
  assert.equal(normalizeStrictIndianMobile('98765432101'), '');
  assert.equal(normalizeStrictIndianMobile('98ab543210'), '');
  assert.equal(normalizeStrictIndianMobile('3876543210'), '');
  assert.equal(normalizeStrictIndianMobile(''), '');
  assert.equal(normalizeStrictIndianMobile('GOOGLE_123'), '');
  assert.equal(parseProfilePhone('987654321').ok, false);
  assert.equal(parseProfilePhone('987654321').message, INVALID_MOBILE_MESSAGE);
  assert.equal(parseProfilePhone('3876543210').errorCode, 'INVALID_PHONE');
  assert.equal(parseProfilePhone('98ab543210').ok, false);
  assert.equal(parseProfilePhone('98765432101').ok, false);
});

test('profile phone update rejects empty and placeholder values', () => {
  for (const value of ['', '   ', null, undefined, 'GOOGLE_abc', 'google_99']) {
    const parsed = parseProfilePhone(value);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.status, 400);
    assert.equal(parsed.errorCode, 'INVALID_PHONE');
  }
  assert.equal(parseProfilePhone('+91 98765 43210').phone, '9876543210');
  assert.equal(parseProfilePhone('09876543210').phone, '9876543210');
});

test('duplicate phone violations map to DUPLICATE_PHONE', () => {
  assert.equal(
    isPhoneUniqueViolation({ code: '23505', constraint: 'idx_profiles_phone_unique' }),
    true
  );
  assert.equal(
    isPhoneUniqueViolation({ code: '23505', detail: 'Key (phone)=(9876543210) already exists.' }),
    true
  );
  assert.equal(isPhoneUniqueViolation({ code: '23505', constraint: 'profiles_email_key' }), false);
  assert.equal(DUPLICATE_PHONE_MESSAGE.includes('already used'), true);
});

test('REQUIRE_REAL_PHONE defaults on and 428 blocks a placeholder customer', () => {
  withEnv('REQUIRE_REAL_PHONE', null, () => {
    assert.equal(isRequireRealPhoneEnabled(), true);
  });

  const req = { user: { role: 'customer', phone: 'GOOGLE_123' } };
  let status = 0;
  let body = null;
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(payload) {
      body = payload;
    }
  };
  let nextCalled = false;
  requireRealPhone(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(status, 428);
  assert.equal(body.code, 'PHONE_REQUIRED');
  assert.equal(body.errorCode, 'PHONE_REQUIRED');
});

test('real phone, admin, and REQUIRE_REAL_PHONE=0 skip the gate', () => {
  const pass = (user) => {
    let nextCalled = false;
    requireRealPhone({ user }, { status() { return this; }, json() {} }, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  };

  pass({ role: 'customer', phone: '9876543210' });
  pass({ role: 'admin', phone: 'GOOGLE_admin' });
  pass({ role: 'admin', phone: 'ADMIN_e65cf7a1-d18f-4a1a-be0f-0f06cb132d9b' });
  pass({ role: 'superadmin', phone: '' });
  pass({ role: 'subadmin', phone: '' });
  pass({ role: 'trainer', phone: 'TRAINER_1785564180523_hfwkomctd' });
  pass({ role: 'trainer', phone: '' });

  withEnv('REQUIRE_REAL_PHONE', '0', () => {
    assert.equal(isRequireRealPhoneEnabled(), false);
    assert.equal(phoneCompleteForUser({ role: 'customer', phone: 'GOOGLE_123' }), true);
    pass({ role: 'customer', phone: 'GOOGLE_123' });
  });

  withEnv('REQUIRE_REAL_PHONE', null, () => {
    assert.equal(phoneCompleteForUser({ role: 'customer', phone: 'GOOGLE_123' }), false);
    assert.equal(phoneCompleteForUser({ role: 'customer', phone: '9876543210' }), true);
    assert.equal(phoneCompleteForUser({ role: 'admin', phone: 'GOOGLE_1' }), true);
    assert.equal(phoneCompleteForUser({ role: 'trainer', phone: 'TRAINER_1' }), true);
    assert.equal(phoneCompleteForUser({ role: 'admin', phone: 'ADMIN_1' }), true);
    assert.equal(phoneCompleteForUser({ role: 'customer', phone: 'TRAINER_1' }), false);
    assert.equal(phoneCompleteForUser({ role: 'customer', phone: 'ADMIN_1' }), false);
  });
});

test('admin vehicle label uses booking type first, then the vehicle, else a dash', () => {
  assert.equal(
    formatAdminVehicleLabel({
      vehicle_id: 'v1',
      vehicle_type: 'ELECTRIC',
      vehicle_subtype: 'Petrol Scooty',
      vehicle_name: 'Scooty 03'
    }),
    'EV Scooty · Scooty 03'
  );
  assert.equal(
    formatAdminVehicleLabel({
      vehicle_id: 'v2',
      vehicle_type: 'PETROL',
      vehicle_name: 'Scooty 04'
    }),
    'Petrol Scooty · Scooty 04'
  );
  assert.equal(
    formatAdminVehicleLabel({
      vehicle_id: 'v3',
      vehicle_type: 'BIKE',
      vehicle_name: 'Bike 01'
    }),
    'Bike · Bike 01'
  );
  assert.equal(
    formatAdminVehicleLabel({
      vehicle_id: 'v4',
      vehicle_type: null,
      vehicle_subtype: 'Electric Scooty',
      vehicle_catalog_type: 'Scooty Electric',
      vehicle_name: 'Scooty 03'
    }),
    'EV Scooty · Scooty 03'
  );
  assert.equal(formatAdminVehicleLabel({ vehicle_name: '', vehicle_id: null }), '—');
  assert.equal(formatAdminVehicleLabel({}), '—');
});

test('admin booking search and export SQL include the vehicle label fields', () => {
  const { listSql } = buildBookingListQuery({
    status: '',
    source: '',
    attendance: '',
    startDate: '',
    endDate: '',
    searchRaw: 'EV Scooty',
    branchId: '',
    trainerId: '',
    vehicleId: '',
    paymentStatus: '',
    limit: 20,
    offset: 0
  });
  assert.match(listSql, /v\.vehicle_subtype AS vehicle_subtype/);
  assert.match(listSql, /v\.vehicle_type AS vehicle_catalog_type/);
  assert.match(listSql, /EV Scooty/);
  assert.match(sqlAdminVehicleCategoryLabel('b', 'v'), /WHEN 'ELECTRIC' THEN 'EV Scooty'/);
});

test('phone check migration and rollback exist and are idempotent', () => {
  const dir = path.join(__dirname, '../../database/migrations');
  const up = fs.readFileSync(
    path.join(dir, '20261001160000_profiles_phone_digits_or_placeholder.sql'),
    'utf8'
  );
  const down = fs.readFileSync(
    path.join(dir, '20261001160000_profiles_phone_digits_or_placeholder.rollback.sql'),
    'utf8'
  );
  assert.match(up, /profiles_phone_digits_or_placeholder/);
  assert.match(up, /GOOGLE_/);
  assert.match(up, /TRAINER_/);
  assert.match(up, /ADMIN_/);
  assert.match(up, /\[6-9\]\[0-9\]\{9\}/);
  assert.match(up, /DROP CONSTRAINT IF EXISTS/);
  assert.match(down, /DROP CONSTRAINT IF EXISTS profiles_phone_digits_or_placeholder/);
  const gate = fs.readFileSync(
    path.join(__dirname, '../../src/app/utils/phone-gate.ts'),
    'utf8'
  );
  assert.match(gate, /'trainer'/);
  assert.match(gate, /PHONE_GATE_EXEMPT_ROLES/);
});

test('slot reset route is present and captcha component is gone', () => {
  const slots = fs.readFileSync(path.join(__dirname, '../routes/slots.js'), 'utf8');
  const overrideService = fs.readFileSync(
    path.join(__dirname, '../services/slotVehicleOverride.service.js'),
    'utf8'
  );
  assert.match(slots, /reset-vehicle-overrides/);
  assert.match(slots, /vehicle-overrides/);
  assert.match(overrideService, /is_manual_override = false/);
  assert.match(overrideService, /capacity = v\.max_per_slot/);
  assert.match(overrideService, /syncSlotVehicleCapacities\(\[slotId\]\)/);
  const captcha = path.join(__dirname, '../../src/app/components/captcha/captcha.component.ts');
  assert.equal(fs.existsSync(captcha), false);
});
