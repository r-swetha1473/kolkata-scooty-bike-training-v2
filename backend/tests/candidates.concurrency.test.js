/**
 * Two payments at once, against a database copy only.
 * Does not read DATABASE_URL, so it cannot hit the live database by accident.
 *
 *   set CANDIDATES_TEST_DATABASE_URL=postgresql://...copy...
 *   node --test tests/candidates.concurrency.test.js
 *
 * The copy must already have database/migrations/20261001170000_candidates.sql applied.
 * The test inserts one candidate and deletes that row when it finishes.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { createCandidateService } = require('../services/candidate.service');

const url = process.env.CANDIDATES_TEST_DATABASE_URL;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('two simultaneous payments cannot both pass the fee without override', async (t) => {
  if (!url) {
    t.skip('Set CANDIDATES_TEST_DATABASE_URL to a database copy. This test does not use DATABASE_URL.');
    return;
  }

  const pool = new Pool({
    connectionString: url,
    max: 4,
    connectionTimeoutMillis: 8000
  });
  const database = {
    query: (sql, params) => pool.query(sql, params),
    getClient: () => pool.connect()
  };
  const service = createCandidateService(database, {
    can: () => true,
    audit: { logAdminAction: async () => {} }
  });
  const actor = { id: null, role: 'admin' };
  const holder = await pool.connect();
  let candidateId = null;

  try {
    const ready = await pool.query(`SELECT to_regclass('public.candidates') AS name`);
    if (!ready.rows[0]?.name) {
      t.skip('Apply 20261001170000_candidates.sql on this copy before the concurrency test.');
      return;
    }

    const mobile = `9${String(Date.now()).slice(-9)}`;
    const created = await service.admit({
      name: 'Concurrency check',
      mobile,
      total_fee: '100.00',
      amount_paid: '0'
    }, actor);
    candidateId = created.candidate.id;

    await holder.query('BEGIN');
    await holder.query('SELECT id FROM candidates WHERE id = $1 FOR UPDATE', [candidateId]);

    let finished = false;
    const outcome = service.addPayment(
      candidateId,
      { amount: '60.00', method: 'CASH', paid_on: '2026-10-01' },
      actor,
      `lock-${mobile}`
    ).then(
      () => ({ ok: true }),
      (error) => ({ ok: false, error })
    ).finally(() => {
      finished = true;
    });

    await wait(400);
    const during = await pool.query(
      `SELECT COUNT(*)::int AS n FROM candidate_payments WHERE candidate_id = $1`,
      [candidateId]
    );
    assert.equal(finished, false, 'the second payment must wait while the candidate row is locked');
    assert.equal(during.rows[0].n, 0);

    await holder.query(
      `INSERT INTO candidate_payments (candidate_id, amount, paid_on, method, note)
       VALUES ($1, 60.00, '2026-10-01', 'CASH', 'first staff')`,
      [candidateId]
    );
    await holder.query('COMMIT');

    const result = await outcome;
    assert.equal(result.ok, false);
    assert.equal(result.error.errorCode, 'OVERPAYMENT');

    const bill = await service.bill(candidateId, actor);
    assert.equal(String(bill.paid_total), '60.00');
    assert.equal(String(bill.due_total), '40.00');
    assert.equal(bill.payments.filter((row) => !row.voided).length, 1);
  } finally {
    try {
      await holder.query('ROLLBACK');
    } catch (_) {
      /* already committed */
    }
    holder.release();
    if (candidateId) {
      await pool.query('DELETE FROM candidates WHERE id = $1', [candidateId]);
    }
    await pool.end();
  }
});

test('a locked repeat of the same idempotency key returns the original payment', async (t) => {
  if (!url) {
    t.skip('Set CANDIDATES_TEST_DATABASE_URL to a database copy. This test does not use DATABASE_URL.');
    return;
  }

  const pool = new Pool({ connectionString: url, max: 4, connectionTimeoutMillis: 8000 });
  const service = createCandidateService({
    query: (sql, params) => pool.query(sql, params),
    getClient: () => pool.connect()
  }, {
    can: () => true,
    audit: { logAdminAction: async () => {} }
  });
  const actor = { id: null, role: 'admin' };
  const holder = await pool.connect();
  let candidateId = null;

  try {
    const ready = await pool.query(`SELECT to_regclass('public.candidates') AS name`);
    if (!ready.rows[0]?.name) {
      t.skip('Apply 20261001170000_candidates.sql on this copy before the concurrency test.');
      return;
    }

    const mobile = `9${String(Date.now()).slice(-8)}2`;
    const created = await service.admit({
      name: 'Idempotency check',
      mobile,
      total_fee: '100.00',
      amount_paid: '0'
    }, actor);
    candidateId = created.candidate.id;
    const key = `click-${mobile}`;

    await holder.query('BEGIN');
    await holder.query('SELECT id FROM candidates WHERE id = $1 FOR UPDATE', [candidateId]);

    let finished = false;
    const outcome = service.addPayment(
      candidateId,
      { amount: '100.00', method: 'CASH', paid_on: '2026-10-01' },
      actor,
      key
    ).then(
      (saved) => ({ ok: true, saved }),
      (error) => ({ ok: false, error })
    ).finally(() => {
      finished = true;
    });

    await wait(400);
    assert.equal(finished, false, 'the repeat must wait until the candidate row lock is released');

    const inserted = await holder.query(
      `INSERT INTO candidate_payments (candidate_id, amount, paid_on, method, note, idempotency_key)
       VALUES ($1, 100.00, '2026-10-01', 'CASH', 'first click', $2)
       RETURNING id`,
      [candidateId, key]
    );
    await holder.query('COMMIT');

    const result = await outcome;
    assert.equal(result.ok, true);
    assert.equal(result.saved.idempotent, true);
    assert.equal(result.saved.payment.id, inserted.rows[0].id);
    assert.notEqual(result.saved.errorCode, 'OVERPAYMENT');

    const bill = await service.bill(candidateId, actor);
    assert.equal(String(bill.paid_total), '100.00');
    assert.equal(bill.payments.filter((row) => !row.voided).length, 1);
  } finally {
    try { await holder.query('ROLLBACK'); } catch (_) { /* already committed */ }
    holder.release();
    if (candidateId) await pool.query('DELETE FROM candidates WHERE id = $1', [candidateId]);
    await pool.end();
  }
});

test('two admissions of the same mobile leave one candidate and DUPLICATE_MOBILE', async (t) => {
  if (!url) {
    t.skip('Set CANDIDATES_TEST_DATABASE_URL to a database copy. This test does not use DATABASE_URL.');
    return;
  }

  const pool = new Pool({ connectionString: url, max: 4, connectionTimeoutMillis: 8000 });
  const service = createCandidateService({
    query: (sql, params) => pool.query(sql, params),
    getClient: () => pool.connect()
  }, {
    can: () => true,
    audit: { logAdminAction: async () => {} }
  });
  const actor = { id: null, role: 'admin' };
  const holder = await pool.connect();
  const mobile = `9${String(Date.now()).slice(-8)}3`;
  let holderId = null;

  try {
    const ready = await pool.query(`SELECT to_regclass('public.candidates') AS name`);
    if (!ready.rows[0]?.name) {
      t.skip('Apply 20261001170000_candidates.sql on this copy before the concurrency test.');
      return;
    }

    await holder.query('BEGIN');
    const inserted = await holder.query(
      `INSERT INTO candidates (name, mobile) VALUES ('Ada', $1) RETURNING id`,
      [mobile]
    );
    holderId = inserted.rows[0].id;

    let finished = false;
    const outcome = service.admit({
      name: 'Bea',
      mobile,
      total_fee: '100.00',
      amount_paid: '0'
    }, actor).then(
      (saved) => ({ ok: true, saved }),
      (error) => ({ ok: false, error })
    ).finally(() => {
      finished = true;
    });

    await wait(400);
    assert.equal(finished, false, 'the second admission must wait on the mobile unique index');

    await holder.query('COMMIT');
    const result = await outcome;
    assert.equal(result.ok, false);
    assert.equal(result.error.status, 409);
    assert.equal(result.error.errorCode, 'DUPLICATE_MOBILE');
    assert.equal(result.error.candidate.id, holderId);
    assert.equal(result.error.candidate.name, 'Ada');
    assert.equal(result.error.code, undefined);
    assert.doesNotMatch(String(result.error.message), /unique constraint/i);

    const rows = await pool.query(`SELECT id FROM candidates WHERE mobile = $1`, [mobile]);
    assert.equal(rows.rows.length, 1);
  } finally {
    try { await holder.query('ROLLBACK'); } catch (_) { /* already committed */ }
    holder.release();
    await pool.query('DELETE FROM candidates WHERE mobile = $1', [mobile]);
    await pool.end();
  }
});
