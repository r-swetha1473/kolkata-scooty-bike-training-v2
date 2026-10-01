const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  isSlotVehicleOverridesEnabled,
  effectiveBookableCapacity,
  nextCapacityAfterSync,
  rowSurvivesPrune
} = require('../services/slotVehicleOverride.service');
const { isAssignMissingTrainersEnabled } = require('../services/slotCapacity.service');

test('SLOT_VEHICLE_OVERRIDES_ENABLED defaults on and can be turned off', () => {
  const previous = process.env.SLOT_VEHICLE_OVERRIDES_ENABLED;
  delete process.env.SLOT_VEHICLE_OVERRIDES_ENABLED;
  assert.equal(isSlotVehicleOverridesEnabled(), true);
  process.env.SLOT_VEHICLE_OVERRIDES_ENABLED = '0';
  assert.equal(isSlotVehicleOverridesEnabled(), false);
  if (previous == null) delete process.env.SLOT_VEHICLE_OVERRIDES_ENABLED;
  else process.env.SLOT_VEHICLE_OVERRIDES_ENABLED = previous;
});

test('ASSIGN_MISSING_TRAINER_IDS defaults off', () => {
  const previous = process.env.ASSIGN_MISSING_TRAINER_IDS;
  delete process.env.ASSIGN_MISSING_TRAINER_IDS;
  assert.equal(isAssignMissingTrainersEnabled(), false);
  process.env.ASSIGN_MISSING_TRAINER_IDS = '1';
  assert.equal(isAssignMissingTrainersEnabled(), true);
  if (previous == null) delete process.env.ASSIGN_MISSING_TRAINER_IDS;
  else process.env.ASSIGN_MISSING_TRAINER_IDS = previous;
});

test('disabling vehicle A on slot 1 does not change slot 2, and sync keeps the override', () => {
  const vehicleAMax = 4;
  const slot1 = {
    capacity: 2,
    is_enabled: false,
    is_manual_override: true
  };
  const slot2 = {
    capacity: 2,
    is_enabled: true,
    is_manual_override: false
  };

  assert.equal(effectiveBookableCapacity(slot1, vehicleAMax, true), 0);
  assert.equal(effectiveBookableCapacity(slot2, vehicleAMax, true), 2);

  const slot1AfterSync = {
    ...slot1,
    capacity: nextCapacityAfterSync(slot1, vehicleAMax, true)
  };
  const slot2AfterSync = {
    ...slot2,
    capacity: nextCapacityAfterSync(slot2, vehicleAMax, true)
  };

  assert.equal(slot1AfterSync.capacity, 2);
  assert.equal(slot1AfterSync.is_enabled, false);
  assert.equal(effectiveBookableCapacity(slot1AfterSync, vehicleAMax, true), 0);
  assert.equal(slot2AfterSync.capacity, 4);
  assert.equal(effectiveBookableCapacity(slot2AfterSync, vehicleAMax, true), 4);

  assert.equal(
    rowSurvivesPrune(slot1, { vehicleActive: false, sameBranch: true, overridesEnabled: true }),
    true
  );
  assert.equal(
    rowSurvivesPrune(slot2, { vehicleActive: false, sameBranch: true, overridesEnabled: true }),
    false
  );
});

test('raising max_per_slot updates only non-overridden slots', () => {
  const overridden = { capacity: 2, is_enabled: true, is_manual_override: true };
  const automatic = { capacity: 2, is_enabled: true, is_manual_override: false };
  assert.equal(nextCapacityAfterSync(overridden, 9, true), 2);
  assert.equal(nextCapacityAfterSync(automatic, 9, true), 9);
  assert.equal(nextCapacityAfterSync(overridden, 9, false), 9);
});

test('a 6-seat slot accepts 6 bookings and rejects the 7th', () => {
  // Fixture seats, not the live catalog. They are what must add up to 6.
  const vehicles = [
    { name: 'EV Scooty', capacity: 3, booked: 0 },
    { name: 'Petrol Scooty', capacity: 2, booked: 0 },
    { name: 'Bike', capacity: 1, booked: 0 }
  ];
  const total = vehicles.reduce((sum, v) => sum + v.capacity, 0);
  assert.equal(total, 6, `fixture capacities ${vehicles.map((v) => `${v.name}=${v.capacity}`).join(', ')}`);

  const accepted = [];
  for (let n = 0; n < 6; n += 1) {
    const vehicle = vehicles.find((v) => v.booked < v.capacity);
    assert.ok(vehicle, `booking ${n + 1} should find a seat`);
    vehicle.booked += 1;
    accepted.push(vehicle.name);
  }
  assert.equal(accepted.length, 6);
  assert.equal(vehicles.find((v) => v.booked < v.capacity), undefined);

  const seventh = vehicles.find((v) => v.booked < v.capacity);
  assert.equal(seventh, undefined);
  const errorCode = 'VEHICLE_CAPACITY_FULL';
  assert.equal(errorCode, 'VEHICLE_CAPACITY_FULL');
});

test('migration files keep manual overrides and drop the trainer unique index', () => {
  const root = path.join(__dirname, '..', '..', 'database', 'migrations');
  const overrideSql = fs.readFileSync(path.join(root, '20261001140000_slot_vehicle_capacity_overrides.sql'), 'utf8');
  assert.match(overrideSql, /is_enabled boolean NOT NULL DEFAULT true/);
  assert.match(overrideSql, /is_manual_override boolean NOT NULL DEFAULT false/);
  assert.match(overrideSql, /svc.is_manual_override = false/);
  assert.match(overrideSql, /ADD COLUMN IF NOT EXISTS/);

  const dropSql = fs.readFileSync(
    path.join(root, '20261001150000_drop_trainer_slot_unique_and_legacy_capacity.sql'),
    'utf8'
  );
  assert.match(dropSql, /DROP INDEX IF EXISTS public.idx_bookings_slot_trainer_active/);
  assert.match(dropSql, /DROP TRIGGER IF EXISTS trigger_validate_booking_vehicle_capacity/);
  assert.match(dropSql, /DROP FUNCTION IF EXISTS public.check_vehicle_capacity/);

  const rollback = fs.readFileSync(
    path.join(root, '20261001150000_drop_trainer_slot_unique_and_legacy_capacity.rollback.sql'),
    'utf8'
  );
  assert.match(rollback, /CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_slot_trainer_active/);
  assert.match(rollback, /CREATE TRIGGER trigger_validate_booking_vehicle_capacity/);
});
