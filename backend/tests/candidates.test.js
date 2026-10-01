const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { toPaise, fromPaise, duePaise } = require('../utils/candidateMoney');
const { isCandidatesEnabled, candidatesGate, trainerScopeSql, trainerCanSeeCandidate } = require('../services/candidateAccess');
const { createCandidateService } = require('../services/candidate.service');
const { groupByMobile } = require('../services/candidateBackfill');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createFakeDb(seed = {}) {
  const state = {
    candidates: clone(seed.candidates || []),
    plans: [],
    payments: [],
    classes: [],
    profiles: seed.profiles || [],
    trainers: seed.trainers || [],
    vehicles: seed.vehicles || [],
    bookings: seed.bookings || []
  };
  let snapshot = null;
  const begins = { count: 0 };
  const uniqueAttempts = { count: 0 };

  function paidText(candidateId) {
    const paise = state.payments
      .filter((row) => row.candidate_id === candidateId && !row.voided_at)
      .reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0);
    return (paise / 100).toFixed(2);
  }

  async function query(sql, params = []) {
    const text = sql.replace(/\s+/g, ' ').trim();
    if (text === 'BEGIN') {
      begins.count += 1;
      snapshot = clone(state);
      return { rows: [] };
    }
    if (text === 'COMMIT') {
      snapshot = null;
      return { rows: [] };
    }
    if (text === 'ROLLBACK') {
      if (snapshot) {
        state.candidates = snapshot.candidates;
        state.plans = snapshot.plans;
        state.payments = snapshot.payments;
        state.classes = snapshot.classes;
      }
      snapshot = null;
      return { rows: [] };
    }
    if (text.includes('FROM candidates WHERE mobile')) {
      if (seed.uniqueViolationOnInsert && snapshot) return { rows: [] };
      return { rows: state.candidates.filter((row) => row.mobile === params[0]) };
    }
    if (text.includes('FROM profiles WHERE phone')) {
      return { rows: state.profiles.filter((row) => row.phone === params[0]).slice(0, 1) };
    }
    if (text.includes('FROM trainers WHERE id')) {
      return { rows: state.trainers.filter((row) => row.id === params[0]) };
    }
    if (text.includes('FROM trainers WHERE user_id')) {
      return { rows: state.trainers.filter((row) => row.user_id === params[0]) };
    }
    if (text.includes('INSERT INTO candidates')) {
      if (seed.uniqueViolationOnInsert) {
        uniqueAttempts.count += 1;
        const error = new Error('duplicate key value violates unique constraint "idx_candidates_mobile"');
        error.code = '23505';
        throw error;
      }
      const row = {
        id: `cand-${state.candidates.length + 1}`,
        name: params[0],
        mobile: params[1],
        admission_date: params[2],
        trainer_id: params[3],
        branch_id: params[4],
        profile_id: params[5],
        status: params[6],
        notes: params[7],
        created_by: params[8]
      };
      state.candidates.push(row);
      return { rows: [row] };
    }
    if (text.includes('INSERT INTO candidate_fee_plans')) {
      const row = { candidate_id: params[0], total_fee: params[1], course_label: params[2] };
      state.plans.push(row);
      return { rows: [row] };
    }
    if (text.includes('INSERT INTO candidate_payments')) {
      if (seed.failPaymentInsert) {
        const error = new Error('payment insert failed');
        error.code = 'PAYMENT_FAIL';
        throw error;
      }
      const row = {
        id: `pay-${state.payments.length + 1}`,
        candidate_id: params[0],
        amount: params[1],
        paid_on: params[2],
        method: params[3],
        reference: params[4],
        note: params[5],
        recorded_by: params[6],
        idempotency_key: params[7],
        voided_at: null,
        void_reason: null
      };
      state.payments.push(row);
      return { rows: [row] };
    }
    if (text.includes('FROM candidate_bill_summary')) {
      const id = params[0];
      const plan = state.plans.find((row) => row.candidate_id === id);
      const total = plan ? Number(plan.total_fee) : 0;
      const paid = Number(paidText(id));
      const classes = state.classes.filter((row) => row.candidate_id === id && row.attendance === 'ATTENDED').length;
      return {
        rows: [{
          total_fee: total.toFixed(2),
          paid_total: paid.toFixed(2),
          due_total: (total - paid).toFixed(2),
          classes_completed: classes,
          course_label: plan?.course_label || null
        }]
      };
    }
    if (text.includes('FROM candidates WHERE id')) {
      return { rows: state.candidates.filter((row) => row.id === params[0]) };
    }
    if (text.includes('idempotency_key')) {
      return {
        rows: state.payments.filter((row) => row.candidate_id === params[0] && row.idempotency_key === params[1])
      };
    }
    if (text.includes('FROM candidate_payments WHERE id')) {
      return { rows: state.payments.filter((row) => row.id === params[0] && row.candidate_id === params[1]) };
    }
    if (text.includes('SET voided_at')) {
      const payment = state.payments.find((row) => row.id === params[0] && row.candidate_id === params[1]);
      payment.voided_at = '2026-10-01T00:00:00.000Z';
      payment.voided_by = params[2];
      payment.void_reason = params[3];
      return { rows: [payment] };
    }
    if (text.includes('UPDATE candidate_fee_plans')) {
      const plan = state.plans.find((row) => row.candidate_id === params[0]);
      plan.total_fee = params[1];
      if (params[2]) plan.course_label = params[2];
      return { rows: [plan] };
    }
    if (text.includes('UPDATE candidates')) {
      const candidate = state.candidates.find((row) => row.id === params[0]);
      candidate.name = params[1];
      candidate.mobile = params[2];
      candidate.trainer_id = params[3];
      candidate.status = params[4];
      candidate.notes = params[5];
      candidate.profile_id = params[6];
      return { rows: [candidate] };
    }
    if (text.includes('INSERT INTO candidate_classes')) {
      const row = {
        id: `class-${state.classes.length + 1}`,
        candidate_id: params[0],
        class_date: params[1],
        trainer_id: params[2],
        vehicle_id: params[3],
        attendance: params[4],
        booking_id: params[5],
        note: params[6],
        marked_by: params[7]
      };
      state.classes.push(row);
      return { rows: [row] };
    }
    if (text.includes('FROM vehicles WHERE id')) {
      return { rows: state.vehicles.filter((row) => row.id === params[0]) };
    }
    if (text.includes('FROM bookings WHERE id')) {
      return { rows: state.bookings.filter((row) => row.id === params[0]) };
    }
    if (text.includes('FROM candidate_classes WHERE id')) {
      return { rows: state.classes.filter((row) => row.id === params[0] && row.candidate_id === params[1]) };
    }
    if (text.includes('UPDATE candidate_classes')) {
      const row = state.classes.find((item) => item.id === params[0] && item.candidate_id === params[1]);
      row.attendance = params[2];
      row.note = params[3];
      return { rows: [row] };
    }
    if (text.includes('FROM candidate_payments')) {
      return { rows: state.payments.filter((row) => row.candidate_id === params[0]) };
    }
    throw new Error(`Unexpected SQL in candidate test: ${text}`);
  }

  return {
    state,
    begins,
    uniqueAttempts,
    query,
    getClient: async () => ({ query, release() {} })
  };
}

function serviceFor(seed, can) {
  const database = createFakeDb(seed);
  const audits = [];
  const service = createCandidateService(database, {
    can: can || (() => true),
    audit: { logAdminAction: async (entry) => audits.push(entry) }
  });
  return { service, database, audits };
}

const admin = { id: 'admin-1', role: 'admin' };

test('money helper keeps rupees at 2 decimal places', () => {
  assert.equal(toPaise('10.10'), 1010);
  assert.equal(toPaise('10.1'), 1010);
  assert.equal(fromPaise(duePaise('10000', '4000.50')), '5999.50');
  assert.equal(toPaise('10.999'), null);
  assert.equal(toPaise('-1'), null);
});

test('admission writes candidate, fee plan, and first payment, and due is computed', async () => {
  const { service, database, audits } = serviceFor();
  const result = await service.admit({
    name: 'Ada',
    mobile: '+91 98765 43210',
    total_fee: '10000',
    amount_paid: '4000',
    due: '1',
    admission_date: '2026-10-01'
  }, admin);
  assert.equal(database.state.candidates.length, 1);
  assert.equal(database.state.candidates[0].mobile, '9876543210');
  assert.equal(database.state.plans.length, 1);
  assert.equal(database.state.payments.length, 1);
  assert.equal(result.fee.due_total, '6000.00');
  assert.equal(result.fee.paid_total, '4000.00');
  assert.equal(audits[0].actionType, 'CANDIDATE_CREATE');
});

test('a failed payment insert rolls the admission back', async () => {
  const { service, database } = serviceFor({ failPaymentInsert: true });
  await assert.rejects(
    () => service.admit({
      name: 'Ada',
      mobile: '9876543210',
      total_fee: '1000',
      amount_paid: '100',
      admission_date: '2026-10-01'
    }, admin),
    (error) => error.code === 'PAYMENT_FAIL'
  );
  assert.equal(database.state.candidates.length, 0);
  assert.equal(database.state.plans.length, 0);
  assert.equal(database.state.payments.length, 0);
});

test('amount paid above the fee, and a fee cut below paid, are rejected', async () => {
  const { service } = serviceFor();
  await assert.rejects(
    () => service.admit({
      name: 'Ada',
      mobile: '9876543210',
      total_fee: '1000',
      amount_paid: '1001',
      admission_date: '2026-10-01'
    }, admin),
    (error) => error.errorCode === 'AMOUNT_EXCEEDS_FEE'
  );
  const created = await service.admit({
    name: 'Ada',
    mobile: '9876543210',
    total_fee: '1000',
    amount_paid: '800',
    admission_date: '2026-10-01'
  }, admin);
  await assert.rejects(
    () => service.updateCandidate(created.candidate.id, { total_fee: '700' }, admin),
    (error) => error.errorCode === 'FEE_BELOW_PAID'
  );
});

test('duplicate mobile returns the existing candidate and does not insert again', async () => {
  const { service, database } = serviceFor();
  const first = await service.admit({
    name: 'Ada',
    mobile: '9876543210',
    total_fee: '1000',
    amount_paid: '0',
    admission_date: '2026-10-01'
  }, admin);
  await assert.rejects(
    () => service.admit({
      name: 'Bea',
      mobile: '09876543210',
      total_fee: '500',
      amount_paid: '0',
      admission_date: '2026-10-01'
    }, admin),
    (error) => error.errorCode === 'DUPLICATE_MOBILE' && error.candidate.id === first.candidate.id && error.candidate.name === 'Ada'
  );
  assert.equal(database.state.candidates.length, 1);
});

test('a simultaneous insert unique violation becomes DUPLICATE_MOBILE', async () => {
  const { service, database } = serviceFor({
    uniqueViolationOnInsert: true,
    candidates: [{ id: 'cand-existing', name: 'Ada', mobile: '9876543210', status: 'ACTIVE' }]
  });
  await assert.rejects(
    () => service.admit({
      name: 'Bea',
      mobile: '+91 98765 43210',
      total_fee: '100',
      amount_paid: '0',
      admission_date: '2026-10-01'
    }, admin),
    (error) => {
      assert.equal(error.status, 409);
      assert.equal(error.errorCode, 'DUPLICATE_MOBILE');
      assert.equal(error.candidate.id, 'cand-existing');
      assert.equal(error.candidate.name, 'Ada');
      assert.equal(error.code, undefined);
      assert.doesNotMatch(error.message, /unique constraint/i);
      return true;
    }
  );
  assert.equal(database.uniqueAttempts.count, 1);
  assert.equal(database.state.candidates.length, 1);
  assert.equal(database.state.plans.length, 0);
  assert.equal(database.state.payments.length, 0);
});

test('invalid mobiles are rejected and prefixes are normalized', async () => {
  const { service, database } = serviceFor();
  for (const mobile of ['987654321', '98765432101', '98ab543210', '3876543210', 'GOOGLE_1', '']) {
    await assert.rejects(
      () => service.admit({ name: 'Ada', mobile, total_fee: '1', amount_paid: '0', admission_date: '2026-10-01' }, admin),
      (error) => error.errorCode === 'INVALID_PHONE'
    );
  }
  assert.equal(database.begins.count, 0);
  const created = await service.admit({
    name: 'Ada',
    mobile: '0 98765-43210',
    total_fee: '1',
    amount_paid: '0',
    admission_date: '2026-10-01'
  }, admin);
  assert.equal(created.candidate.mobile, '9876543210');
});

test('a repeat idempotency key is resolved after the row lock, even when the fee is already paid', async () => {
  const { service, database } = serviceFor();
  const created = await service.admit({
    name: 'Ada', mobile: '9876543210', total_fee: '1000', amount_paid: '0', admission_date: '2026-10-01'
  }, admin);
  const first = await service.addPayment(
    created.candidate.id,
    { amount: '1000', method: 'CASH', paid_on: '2026-10-01' },
    admin,
    'click-1'
  );
  const replay = await service.addPayment(
    created.candidate.id,
    { amount: '1000', method: 'CASH', paid_on: '2026-10-01' },
    admin,
    'click-1'
  );
  assert.equal(first.idempotent, false);
  assert.equal(replay.idempotent, true);
  assert.equal(replay.payment.id, first.payment.id);
  assert.notEqual(replay.errorCode, 'OVERPAYMENT');
  assert.equal(database.state.payments.length, 1);
  assert.equal(replay.fee.paid_total, '1000.00');
  const source = fs.readFileSync(path.join(__dirname, '../services/candidate.service.js'), 'utf8');
  const body = source.slice(source.indexOf('async function addPayment'), source.indexOf('async function voidPayment'));
  const lockAt = body.indexOf('forUpdate: true');
  const keyAt = body.indexOf('idempotency_key = $2');
  const feeAt = body.indexOf('nextPaid > toPaise');
  assert.ok(lockAt >= 0 && keyAt > lockAt && feeAt > keyAt);
});

test('the same idempotency key records one payment', async () => {
  const { service, database } = serviceFor();
  const created = await service.admit({
    name: 'Ada', mobile: '9876543210', total_fee: '1000', amount_paid: '0', admission_date: '2026-10-01'
  }, admin);
  const first = await service.addPayment(created.candidate.id, { amount: '100', method: 'UPI', paid_on: '2026-10-01' }, admin, 'key-1');
  const second = await service.addPayment(created.candidate.id, { amount: '100', method: 'UPI', paid_on: '2026-10-01' }, admin, 'key-1');
  assert.equal(first.idempotent, false);
  assert.equal(second.idempotent, true);
  assert.equal(second.payment.id, first.payment.id);
  assert.equal(database.state.payments.length, 1);
});

test('overpayment needs override, a reason, and the override permission', async () => {
  const limited = { id: 'sub-1', role: 'subadmin' };
  const can = (user, module, action) => {
    if (user.role === 'admin') return true;
    return `${module}.${action}` !== 'candidates_payments.edit';
  };
  const { service } = serviceFor({}, can);
  const created = await service.admit({
    name: 'Ada', mobile: '9876543210', total_fee: '100', amount_paid: '80', admission_date: '2026-10-01'
  }, admin);
  await assert.rejects(
    () => service.addPayment(created.candidate.id, { amount: '30', method: 'CASH', paid_on: '2026-10-01' }, admin),
    (error) => error.errorCode === 'OVERPAYMENT'
  );
  await assert.rejects(
    () => service.addPayment(created.candidate.id, {
      amount: '30', method: 'CASH', paid_on: '2026-10-01', override: true, override_reason: 'Scholarship top-up'
    }, limited),
    (error) => error.errorCode === 'INSUFFICIENT_PERMISSIONS'
  );
  const saved = await service.addPayment(created.candidate.id, {
    amount: '30', method: 'CASH', paid_on: '2026-10-01', override: true, override_reason: 'Scholarship top-up'
  }, admin);
  assert.equal(saved.fee.due_total, '-10.00');
});

test('void keeps the row, recalculates due, and cannot be repeated', async () => {
  const { service, database, audits } = serviceFor();
  const created = await service.admit({
    name: 'Ada', mobile: '9876543210', total_fee: '1000', amount_paid: '200', admission_date: '2026-10-01'
  }, admin);
  const paymentId = database.state.payments[0].id;
  const voided = await service.voidPayment(created.candidate.id, paymentId, { reason: 'Wrong amount' }, admin);
  assert.equal(database.state.payments.length, 1);
  assert.equal(voided.payment.void_reason, 'Wrong amount');
  assert.equal(voided.fee.due_total, '1000.00');
  assert.equal(audits.some((entry) => entry.actionType === 'CANDIDATE_PAYMENT_VOID'), true);
  await assert.rejects(
    () => service.voidPayment(created.candidate.id, paymentId, { reason: 'Again' }, admin),
    (error) => error.errorCode === 'ALREADY_VOIDED'
  );
});

test('class attendance updates the completed count', async () => {
  const { service } = serviceFor();
  const created = await service.admit({
    name: 'Ada', mobile: '9876543210', total_fee: '1000', amount_paid: '0', admission_date: '2026-10-01'
  }, admin);
  const added = await service.addClass(created.candidate.id, {
    class_date: '2026-10-02',
    attendance: 'ATTENDED'
  }, admin);
  assert.equal(added.fee.classes_completed, 1);
  const updated = await service.updateClass(created.candidate.id, added.class_row.id, { attendance: 'NO_SHOW' }, admin);
  assert.equal(updated.fee.classes_completed, 0);
});

test('a user without the module is rejected', async () => {
  const { service } = serviceFor({}, () => false);
  await assert.rejects(
    () => service.list({}, admin),
    (error) => error.status === 403 && error.errorCode === 'INSUFFICIENT_PERMISSIONS'
  );
});

test('admission links a profile with the same mobile', async () => {
  const { service, database } = serviceFor({
    profiles: [{ id: 'profile-9', phone: '9876543210' }]
  });
  const created = await service.admit({
    name: 'Ada', mobile: '9876543210', total_fee: '100', amount_paid: '0', admission_date: '2026-10-01'
  }, admin);
  assert.equal(created.candidate.profile_id, 'profile-9');
  assert.equal(database.state.candidates[0].profile_id, 'profile-9');
});

test('an inactive trainer is rejected and a missing trainer stays unassigned', async () => {
  const { service, database } = serviceFor({
    trainers: [{ id: 'trainer-1', is_active: false, branch_id: 'branch-1' }]
  });
  await assert.rejects(
    () => service.admit({
      name: 'Ada', mobile: '9876543210', total_fee: '100', amount_paid: '0',
      trainer_id: 'trainer-1', admission_date: '2026-10-01'
    }, admin),
    (error) => error.errorCode === 'TRAINER_INACTIVE'
  );
  const created = await service.admit({
    name: 'Ada', mobile: '9876543210', total_fee: '100', amount_paid: '0', admission_date: '2026-10-01'
  }, admin);
  assert.equal(created.candidate.trainer_id, null);
  assert.equal(database.state.candidates.length, 1);
});

test('CANDIDATES_ENABLED=0 returns 404 and trainer scope is ready for a later login', () => {
  const previous = process.env.CANDIDATES_ENABLED;
  process.env.CANDIDATES_ENABLED = '0';
  assert.equal(isCandidatesEnabled(), false);
  let status = 0;
  candidatesGate({}, { status(code) { status = code; return this; }, json() {} }, () => {});
  assert.equal(status, 404);
  process.env.CANDIDATES_ENABLED = previous;

  const sql = trainerScopeSql({ role: 'trainer' }, '$4');
  assert.match(sql, /trainers t WHERE t.user_id = \$4/);
  assert.equal(trainerCanSeeCandidate(
    { role: 'trainer' },
    { trainer_id: 't1' },
    { id: 't1' }
  ), true);
  assert.equal(trainerCanSeeCandidate(
    { role: 'trainer' },
    { trainer_id: 't2' },
    { id: 't1' }
  ), false);
});

test('backfill dry run groups mobiles and does not invent rows', () => {
  const report = groupByMobile([
    { source: 'offline_booking', id: 'b1', name: 'Ada', phone: '+91 98765 43210' },
    { source: 'offline_booking', id: 'b2', name: 'Ada', phone: '09876543210' },
    { source: 'offline_booking', id: 'b3', name: 'Bea', phone: '9876543210' },
    { source: 'course_enrollment', id: 'e1', name: 'No phone', phone: null },
    { source: 'course_enrollment', id: 'e2', name: 'Placeholder', phone: 'GOOGLE_9' }
  ]);
  assert.equal(report.group_count, 1);
  assert.equal(report.missing_mobile.length, 2);
  assert.equal(report.duplicate_mobiles.length, 1);
  assert.equal(report.duplicate_mobiles[0].names.length, 2);
  assert.equal(report.groups[0].rows.length, 3);
});

test('candidate migration and rollback files exist', () => {
  const dir = path.join(__dirname, '../../database/migrations');
  const up = fs.readFileSync(path.join(dir, '20261001170000_candidates.sql'), 'utf8');
  const down = fs.readFileSync(path.join(dir, '20261001170000_candidates.rollback.sql'), 'utf8');
  assert.match(up, /CREATE TABLE IF NOT EXISTS public\.candidates/);
  assert.match(up, /numeric\(12,2\)/);
  assert.match(up, /candidate_bill_summary/);
  assert.match(up, /idx_candidates_mobile/);
  assert.match(down, /DROP TABLE IF EXISTS public\.candidates/);
  const route = fs.readFileSync(path.join(__dirname, '../routes/candidates.js'), 'utf8');
  assert.match(route, /candidatesGate/);
  assert.match(route, /Idempotency-Key/);
  const serviceSource = fs.readFileSync(path.join(__dirname, '../services/candidate.service.js'), 'utf8');
  assert.match(serviceSource, /FOR UPDATE/);
  assert.equal((serviceSource.match(/forUpdate: true/g) || []).length, 3);
});
