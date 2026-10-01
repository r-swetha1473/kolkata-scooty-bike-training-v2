/**
 * Candidate admission, billing, and attendance.
 * Due is always computed (total_fee - sum of non-voided payments) and never stored.
 * Money columns are numeric(12,2) rupees.
 */

const { normalizeStrictIndianMobile, INVALID_MOBILE_MESSAGE } = require('../utils/phoneNormalize');
const { toPaise, fromPaise } = require('../utils/candidateMoney');
const { trainerScopeSql, trainerCanSeeCandidate } = require('./candidateAccess');
const { rowsToCsv } = require('../utils/bookingSearch');

const STATUSES = ['ACTIVE', 'COMPLETED', 'DROPPED'];
const METHODS = ['CASH', 'UPI', 'CARD', 'BANK', 'OTHER'];
const ATTENDANCE = ['SCHEDULED', 'ATTENDED', 'NO_SHOW', 'CANCELLED'];
const SORTS = {
  name: 'c.name ASC',
  admission_date: 'c.admission_date DESC',
  due: 's.due_total DESC',
  created_at: 'c.created_at DESC'
};

function httpError(status, errorCode, message, extra) {
  const error = new Error(message);
  error.status = status;
  error.errorCode = errorCode;
  if (extra) Object.assign(error, extra);
  return error;
}

function kolkataToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function money(value) {
  const paise = toPaise(value);
  if (paise == null) return null;
  return { paise, text: fromPaise(paise) };
}

function summaryFromRow(row) {
  const total = money(row?.total_fee ?? 0);
  const paid = money(row?.paid_total ?? 0);
  return {
    total_fee: total.text,
    paid_total: paid.text,
    due_total: fromPaise(total.paise - paid.paise),
    classes_completed: Number(row?.classes_completed || 0),
    course_label: row?.course_label || null
  };
}

function createCandidateService(database, deps = {}) {
  const can = deps.can || ((user, module, action) => {
    return require('../middleware/permissions').hasPermission(user, module, action);
  });

  async function writeAudit(entry) {
    const audit = deps.audit || require('./audit.service');
    await audit.logAdminAction(entry);
  }

  async function withTransaction(work) {
    const client = await database.getClient();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        /* the original error is the one to surface */
      }
      throw error;
    } finally {
      client.release();
    }
  }

  function assertCan(user, module, action) {
    if (!can(user, module, action)) {
      throw httpError(403, 'INSUFFICIENT_PERMISSIONS', `Permission denied: ${module}.${action}`);
    }
  }

  async function findByMobile(client, mobile) {
    const result = await client.query(
      `SELECT id, name, mobile FROM candidates WHERE mobile = $1`,
      [mobile]
    );
    return result.rows[0] || null;
  }

  async function linkedProfileId(client, mobile) {
    const result = await client.query(
      `SELECT id FROM profiles WHERE phone = $1 LIMIT 1`,
      [mobile]
    );
    return result.rows[0]?.id || null;
  }

  async function assertTrainer(client, trainerId) {
    if (!trainerId) return null;
    const result = await client.query(
      `SELECT id, is_active, branch_id FROM trainers WHERE id = $1`,
      [trainerId]
    );
    const trainer = result.rows[0];
    if (!trainer) throw httpError(400, 'TRAINER_NOT_FOUND', 'Choose an active trainer, or leave the trainer blank.');
    if (trainer.is_active === false) {
      throw httpError(400, 'TRAINER_INACTIVE', 'That trainer is inactive. Choose another trainer.');
    }
    return trainer;
  }

  async function loadSummary(client, candidateId) {
    const result = await client.query(
      `SELECT s.total_fee, s.paid_total, s.due_total, s.classes_completed, fp.course_label
       FROM candidate_bill_summary s
       LEFT JOIN candidate_fee_plans fp ON fp.candidate_id = s.candidate_id
       WHERE s.candidate_id = $1`,
      [candidateId]
    );
    if (!result.rows[0]) {
      return summaryFromRow({ total_fee: 0, paid_total: 0, classes_completed: 0 });
    }
    return summaryFromRow(result.rows[0]);
  }

  async function loadCandidate(client, id, user, options = {}) {
    const lock = options.forUpdate ? ' FOR UPDATE' : '';
    const result = await client.query(`SELECT * FROM candidates WHERE id = $1${lock}`, [id]);
    const candidate = result.rows[0];
    if (!candidate) throw httpError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found');
    if (user?.role === 'trainer') {
      const trainer = await client.query(
        `SELECT id FROM trainers WHERE user_id = $1 LIMIT 1`,
        [user.id]
      );
      if (!trainerCanSeeCandidate(user, candidate, trainer.rows[0])) {
        throw httpError(403, 'INSUFFICIENT_PERMISSIONS', 'You can only open candidates assigned to you.');
      }
    }
    return candidate;
  }

  async function admit(input, actor) {
    assertCan(actor, 'candidates', 'create');
    const name = String(input.name || '').trim();
    if (!name) throw httpError(400, 'INVALID_NAME', 'Enter the candidate name.');
    const mobile = normalizeStrictIndianMobile(input.mobile);
    if (!mobile) throw httpError(400, 'INVALID_PHONE', INVALID_MOBILE_MESSAGE);

    const total = money(input.total_fee);
    if (!total) throw httpError(400, 'INVALID_FEE', 'Enter a total fee of 0 or more, with up to 2 decimal places.');
    const paidInput = input.amount_paid == null || input.amount_paid === '' ? '0' : input.amount_paid;
    const paid = money(paidInput);
    if (!paid) throw httpError(400, 'INVALID_AMOUNT', 'Enter an amount paid of 0 or more, with up to 2 decimal places.');
    if (paid.paise > total.paise) {
      throw httpError(400, 'AMOUNT_EXCEEDS_FEE', 'Amount paid cannot be more than the total fee.');
    }
    if (input.due != null) {
      /* client-sent due is ignored */
    }

    const status = input.status || 'ACTIVE';
    if (!STATUSES.includes(status)) throw httpError(400, 'INVALID_STATUS', 'Status must be ACTIVE, COMPLETED, or DROPPED.');
    const admissionDate = input.admission_date || kolkataToday();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(admissionDate))) {
      throw httpError(400, 'INVALID_DATE', 'Admission date must be YYYY-MM-DD.');
    }

    let created;
    try {
      created = await withTransaction(async (client) => {
      const existing = await findByMobile(client, mobile);
      if (existing) {
        throw httpError(409, 'DUPLICATE_MOBILE', 'This mobile number is already used by a candidate.', {
          candidate: { id: existing.id, name: existing.name }
        });
      }
      const trainer = await assertTrainer(client, input.trainer_id || null);
      const profileId = await linkedProfileId(client, mobile);
      const inserted = await client.query(
        `INSERT INTO candidates
           (name, mobile, admission_date, trainer_id, branch_id, profile_id, status, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          name,
          mobile,
          admissionDate,
          trainer?.id || null,
          input.branch_id || trainer?.branch_id || null,
          profileId,
          status,
          input.notes || null,
          actor.id
        ]
      );
      const candidate = inserted.rows[0];
      await client.query(
        `INSERT INTO candidate_fee_plans (candidate_id, total_fee, course_label)
         VALUES ($1, $2, $3)`,
        [candidate.id, total.text, input.course_label || null]
      );
      let payment = null;
      if (paid.paise > 0) {
        const method = String(input.method || 'CASH').toUpperCase();
        if (!METHODS.includes(method)) throw httpError(400, 'INVALID_METHOD', 'Payment method is not recognised.');
        const pay = await client.query(
          `INSERT INTO candidate_payments
             (candidate_id, amount, paid_on, method, reference, note, recorded_by, idempotency_key)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            candidate.id,
            paid.text,
            admissionDate,
            method,
            input.reference || null,
            input.payment_note || 'Admission payment',
            actor.id,
            input.idempotency_key || null
          ]
        );
        payment = pay.rows[0];
      }
      const fee = await loadSummary(client, candidate.id);
      return { candidate, payment, fee };
    });
    } catch (error) {
      if (error.code === '23505') {
        const existing = await database.query(`SELECT id, name FROM candidates WHERE mobile = $1`, [mobile]);
        throw httpError(409, 'DUPLICATE_MOBILE', 'This mobile number is already used by a candidate.', {
          candidate: existing.rows[0] || { id: null, name: null }
        });
      }
      throw error;
    }

    await writeAudit({
      adminId: actor.id,
      actionType: 'CANDIDATE_CREATE',
      entityType: 'candidate',
      entityId: created.candidate.id,
      afterValue: {
        name: created.candidate.name,
        total_fee: created.fee.total_fee,
        paid_total: created.fee.paid_total,
        due_total: created.fee.due_total
      }
    });
    return created;
  }

  function listFilters(query, user, cap = 200) {
    const conditions = ['1=1'];
    const params = [];
    let idx = 1;
    const search = String(query.search || '').trim();
    if (search) {
      const mobile = normalizeStrictIndianMobile(search);
      conditions.push(`(c.name ILIKE $${idx} OR c.mobile LIKE $${idx + 1})`);
      params.push(`%${search}%`, `%${mobile || search.replace(/\D/g, '')}%`);
      idx += 2;
    }
    if (query.status && STATUSES.includes(String(query.status))) {
      conditions.push(`c.status = $${idx++}`);
      params.push(String(query.status));
    }
    if (query.trainer_id) {
      conditions.push(`c.trainer_id = $${idx++}`);
      params.push(query.trainer_id);
    }
    if (query.admission_from) {
      conditions.push(`c.admission_date >= $${idx++}::date`);
      params.push(query.admission_from);
    }
    if (query.admission_to) {
      conditions.push(`c.admission_date <= $${idx++}::date`);
      params.push(query.admission_to);
    }
    if (String(query.due) === 'true') {
      conditions.push(`s.due_total > 0`);
    }
    if (user?.role === 'trainer') {
      conditions.push(trainerScopeSql(user, `$${idx}`).replace(/^AND /, ''));
      params.push(user.id);
      idx += 1;
    }
    const sort = SORTS[query.sort] || SORTS.admission_date;
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), cap);
    const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
    return { where: conditions.join(' AND '), params, sort, limit, offset, idx };
  }

  const LIST_FROM = `
    FROM candidates c
    LEFT JOIN candidate_bill_summary s ON s.candidate_id = c.id
    LEFT JOIN trainers tr ON tr.id = c.trainer_id
    LEFT JOIN profiles tp ON tp.id = tr.user_id`;

  async function list(query, user, cap = 200) {
    assertCan(user, 'candidates', 'view');
    const filters = listFilters(query, user, cap);
    const count = await database.query(
      `SELECT COUNT(*)::int AS total ${LIST_FROM} WHERE ${filters.where}`,
      filters.params
    );
    const rows = await database.query(
      `SELECT c.*,
              COALESCE(tp.full_name, '') AS trainer_name,
              s.total_fee, s.paid_total, s.due_total, s.classes_completed
       ${LIST_FROM}
       WHERE ${filters.where}
       ORDER BY ${filters.sort}
       LIMIT $${filters.idx} OFFSET $${filters.idx + 1}`,
      [...filters.params, filters.limit, filters.offset]
    );
    return {
      candidates: rows.rows.map(mapListRow),
      total: count.rows[0]?.total || 0,
      limit: filters.limit,
      offset: filters.offset
    };
  }

  function mapListRow(row) {
    const fee = summaryFromRow(row);
    return {
      id: row.id,
      name: row.name,
      mobile: row.mobile,
      admission_date: row.admission_date,
      trainer_id: row.trainer_id,
      trainer_name: row.trainer_name || null,
      trainer_label: row.trainer_name || 'Unassigned',
      branch_id: row.branch_id,
      profile_id: row.profile_id,
      status: row.status,
      ...fee
    };
  }

  async function exportCsv(query, user) {
    const data = await list({ ...query, limit: 5000, offset: 0 }, user, 5000);
    const csv = rowsToCsv(data.candidates.map((row) => ({
      Name: row.name,
      Mobile: row.mobile,
      Trainer: row.trainer_label,
      'Admission date': row.admission_date,
      Total: row.total_fee,
      Paid: row.paid_total,
      Due: row.due_total,
      Classes: row.classes_completed
    })));
    return csv || 'Name,Mobile,Trainer,Admission date,Total,Paid,Due,Classes\n';
  }

  async function portfolio(id, user) {
    assertCan(user, 'candidates', 'view');
    return withTransaction(async (client) => {
      const candidate = await loadCandidate(client, id, user);
      const fee = await loadSummary(client, id);
      const payments = await client.query(
        `SELECT * FROM candidate_payments WHERE candidate_id = $1 ORDER BY created_at DESC, id DESC`,
        [id]
      );
      const classes = await client.query(
        `SELECT cl.*, tp.full_name AS trainer_name, v.name AS vehicle_name
         FROM candidate_classes cl
         LEFT JOIN trainers tr ON tr.id = cl.trainer_id
         LEFT JOIN profiles tp ON tp.id = tr.user_id
         LEFT JOIN vehicles v ON v.id = cl.vehicle_id
         WHERE cl.candidate_id = $1
         ORDER BY cl.class_date DESC, cl.created_at DESC`,
        [id]
      );
      let profile = null;
      if (candidate.profile_id) {
        const profileRow = await client.query(
          `SELECT id, full_name, email, phone FROM profiles WHERE id = $1`,
          [candidate.profile_id]
        );
        profile = profileRow.rows[0] || null;
      }
      const trainerName = candidate.trainer_id
        ? (await client.query(
            `SELECT p.full_name FROM trainers t JOIN profiles p ON p.id = t.user_id WHERE t.id = $1`,
            [candidate.trainer_id]
          )).rows[0]?.full_name || null
        : null;
      return {
        candidate: {
          ...candidate,
          trainer_name: trainerName,
          trainer_label: trainerName || 'Unassigned'
        },
        fee,
        payments: payments.rows.map((row) => ({
          ...row,
          amount: money(row.amount).text,
          voided: row.voided_at != null
        })),
        classes: classes.rows,
        profile
      };
    });
  }

  async function updateCandidate(id, input, actor) {
    assertCan(actor, 'candidates', 'edit');
    const updated = await withTransaction(async (client) => {
      const current = await loadCandidate(client, id, actor, { forUpdate: true });
      const name = input.name != null ? String(input.name).trim() : current.name;
      if (!name) throw httpError(400, 'INVALID_NAME', 'Enter the candidate name.');
      let mobile = current.mobile;
      if (input.mobile != null) {
        mobile = normalizeStrictIndianMobile(input.mobile);
        if (!mobile) throw httpError(400, 'INVALID_PHONE', INVALID_MOBILE_MESSAGE);
        if (mobile !== current.mobile) {
          const existing = await findByMobile(client, mobile);
          if (existing && existing.id !== current.id) {
            throw httpError(409, 'DUPLICATE_MOBILE', 'This mobile number is already used by a candidate.', {
              candidate: { id: existing.id, name: existing.name }
            });
          }
        }
      }
      const status = input.status != null ? input.status : current.status;
      if (!STATUSES.includes(status)) throw httpError(400, 'INVALID_STATUS', 'Status must be ACTIVE, COMPLETED, or DROPPED.');
      let trainerId = current.trainer_id;
      if (input.trainer_id !== undefined) {
        trainerId = input.trainer_id || null;
        if (trainerId) await assertTrainer(client, trainerId);
      }
      const notes = input.notes !== undefined ? input.notes : current.notes;
      const profileId = mobile === current.mobile ? current.profile_id : await linkedProfileId(client, mobile);
      const saved = await client.query(
        `UPDATE candidates
         SET name = $2, mobile = $3, trainer_id = $4, status = $5, notes = $6,
             profile_id = $7, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, name, mobile, trainerId, status, notes, profileId]
      );
      let feeChanged = null;
      if (input.total_fee != null) {
        const next = money(input.total_fee);
        if (!next) throw httpError(400, 'INVALID_FEE', 'Enter a total fee of 0 or more, with up to 2 decimal places.');
        const fee = await loadSummary(client, id);
        if (next.paise < toPaise(fee.paid_total)) {
          throw httpError(400, 'FEE_BELOW_PAID', 'Total fee cannot be less than the amount already paid.');
        }
        const before = fee.total_fee;
        await client.query(
          `UPDATE candidate_fee_plans SET total_fee = $2, course_label = COALESCE($3, course_label) WHERE candidate_id = $1`,
          [id, next.text, input.course_label || null]
        );
        feeChanged = { before, after: next.text };
      }
      return { candidate: saved.rows[0], fee: await loadSummary(client, id), feeChanged };
    });
    if (updated.feeChanged) {
      await writeAudit({
        adminId: actor.id,
        actionType: 'CANDIDATE_FEE_CHANGE',
        entityType: 'candidate',
        entityId: id,
        beforeValue: { total_fee: updated.feeChanged.before },
        afterValue: { total_fee: updated.feeChanged.after }
      });
    }
    return updated;
  }

  async function addPayment(id, input, actor, idempotencyKey) {
    assertCan(actor, 'candidates_payments', 'create');
    const amount = money(input.amount);
    if (!amount || amount.paise <= 0) {
      throw httpError(400, 'INVALID_AMOUNT', 'Enter a payment amount greater than 0.');
    }
    const method = String(input.method || '').toUpperCase();
    if (!METHODS.includes(method)) throw httpError(400, 'INVALID_METHOD', 'Choose Cash, UPI, card, bank, or other.');
    const paidOn = input.paid_on || kolkataToday();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(paidOn))) {
      throw httpError(400, 'INVALID_DATE', 'Payment date must be YYYY-MM-DD.');
    }
    const key = idempotencyKey || input.idempotency_key || null;

    let saved;
    try {
      saved = await withTransaction(async (client) => {
      await loadCandidate(client, id, actor, { forUpdate: true });
      if (key) {
        const existing = await client.query(
          `SELECT * FROM candidate_payments WHERE candidate_id = $1 AND idempotency_key = $2`,
          [id, key]
        );
        if (existing.rows[0]) {
          return { payment: existing.rows[0], idempotent: true, fee: await loadSummary(client, id) };
        }
      }
      const fee = await loadSummary(client, id);
      const nextPaid = toPaise(fee.paid_total) + amount.paise;
      if (nextPaid > toPaise(fee.total_fee)) {
        if (input.override !== true) {
          throw httpError(400, 'OVERPAYMENT', 'This payment is more than the amount due. Turn on override only if you mean to collect extra.');
        }
        if (!String(input.override_reason || '').trim()) {
          throw httpError(400, 'OVERRIDE_REASON_REQUIRED', 'Enter a reason for collecting more than the fee.');
        }
        assertCan(actor, 'candidates_payments', 'edit');
      }
      const inserted = await client.query(
        `INSERT INTO candidate_payments
           (candidate_id, amount, paid_on, method, reference, note, recorded_by, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [id, amount.text, paidOn, method, input.reference || null, input.note || null, actor.id, key]
      );
      return { payment: inserted.rows[0], idempotent: false, fee: await loadSummary(client, id) };
    });
    } catch (error) {
      if (error.code === '23505' && key) {
        const existing = await database.query(
          `SELECT * FROM candidate_payments WHERE candidate_id = $1 AND idempotency_key = $2`,
          [id, key]
        );
        if (existing.rows[0]) {
          const fee = await database.query(
            `SELECT s.total_fee, s.paid_total, s.due_total, s.classes_completed
             FROM candidate_bill_summary s WHERE s.candidate_id = $1`,
            [id]
          );
          return {
            payment: existing.rows[0],
            idempotent: true,
            fee: summaryFromRow(fee.rows[0] || {})
          };
        }
      }
      throw error;
    }

    if (!saved.idempotent) {
      await writeAudit({
        adminId: actor.id,
        actionType: 'CANDIDATE_PAYMENT_ADD',
        entityType: 'candidate_payment',
        entityId: saved.payment.id,
        afterValue: { candidate_id: id, amount: amount.text, method, due_total: saved.fee.due_total },
        details: input.override ? { override_reason: String(input.override_reason).trim() } : null
      });
    }
    return saved;
  }

  async function voidPayment(id, paymentId, input, actor) {
    assertCan(actor, 'candidates_payments', 'delete');
    const reason = String(input.reason || '').trim();
    if (!reason) throw httpError(400, 'VOID_REASON_REQUIRED', 'Enter a reason for voiding this payment.');
    const saved = await withTransaction(async (client) => {
      await loadCandidate(client, id, actor, { forUpdate: true });
      const current = await client.query(
        `SELECT * FROM candidate_payments WHERE id = $1 AND candidate_id = $2`,
        [paymentId, id]
      );
      const payment = current.rows[0];
      if (!payment) throw httpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
      if (payment.voided_at) throw httpError(409, 'ALREADY_VOIDED', 'This payment is already voided.');
      const updated = await client.query(
        `UPDATE candidate_payments
         SET voided_at = NOW(), voided_by = $3, void_reason = $4
         WHERE id = $1 AND candidate_id = $2
         RETURNING *`,
        [paymentId, id, actor.id, reason]
      );
      return { payment: updated.rows[0], fee: await loadSummary(client, id) };
    });
    await writeAudit({
      adminId: actor.id,
      actionType: 'CANDIDATE_PAYMENT_VOID',
      entityType: 'candidate_payment',
      entityId: paymentId,
      details: { reason, due_total: saved.fee.due_total }
    });
    return saved;
  }

  async function addClass(id, input, actor) {
    assertCan(actor, 'candidates', 'edit');
    const classDate = input.class_date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(classDate || ''))) {
      throw httpError(400, 'INVALID_DATE', 'Class date must be YYYY-MM-DD.');
    }
    const attendance = input.attendance || 'SCHEDULED';
    if (!ATTENDANCE.includes(attendance)) {
      throw httpError(400, 'INVALID_ATTENDANCE', 'Attendance must be scheduled, attended, no-show, or cancelled.');
    }
    const saved = await withTransaction(async (client) => {
      await loadCandidate(client, id, actor);
      if (input.trainer_id) await assertTrainer(client, input.trainer_id);
      if (input.vehicle_id) {
        const vehicle = await client.query(`SELECT id FROM vehicles WHERE id = $1`, [input.vehicle_id]);
        if (!vehicle.rows[0]) throw httpError(400, 'VEHICLE_NOT_FOUND', 'That vehicle was not found.');
      }
      if (input.booking_id) {
        const booking = await client.query(`SELECT id FROM bookings WHERE id = $1`, [input.booking_id]);
        if (!booking.rows[0]) throw httpError(400, 'BOOKING_NOT_FOUND', 'That booking was not found.');
      }
      const inserted = await client.query(
        `INSERT INTO candidate_classes
           (candidate_id, class_date, trainer_id, vehicle_id, attendance, booking_id, note, marked_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          id,
          classDate,
          input.trainer_id || null,
          input.vehicle_id || null,
          attendance,
          input.booking_id || null,
          input.note || null,
          actor.id
        ]
      );
      return { class_row: inserted.rows[0], fee: await loadSummary(client, id) };
    });
    await writeAudit({
      adminId: actor.id,
      actionType: 'CANDIDATE_ATTENDANCE',
      entityType: 'candidate_class',
      entityId: saved.class_row.id,
      afterValue: { attendance, class_date: classDate, classes_completed: saved.fee.classes_completed }
    });
    return saved;
  }

  async function updateClass(id, classId, input, actor) {
    assertCan(actor, 'candidates', 'edit');
    if (input.attendance && !ATTENDANCE.includes(input.attendance)) {
      throw httpError(400, 'INVALID_ATTENDANCE', 'Attendance must be scheduled, attended, no-show, or cancelled.');
    }
    const saved = await withTransaction(async (client) => {
      await loadCandidate(client, id, actor);
      const current = await client.query(
        `SELECT * FROM candidate_classes WHERE id = $1 AND candidate_id = $2`,
        [classId, id]
      );
      if (!current.rows[0]) throw httpError(404, 'CLASS_NOT_FOUND', 'Class not found');
      const attendance = input.attendance || current.rows[0].attendance;
      const note = input.note !== undefined ? input.note : current.rows[0].note;
      const updated = await client.query(
        `UPDATE candidate_classes SET attendance = $3, note = $4 WHERE id = $1 AND candidate_id = $2 RETURNING *`,
        [classId, id, attendance, note]
      );
      return {
        class_row: updated.rows[0],
        before: current.rows[0].attendance,
        fee: await loadSummary(client, id)
      };
    });
    await writeAudit({
      adminId: actor.id,
      actionType: 'CANDIDATE_ATTENDANCE',
      entityType: 'candidate_class',
      entityId: classId,
      beforeValue: { attendance: saved.before },
      afterValue: { attendance: saved.class_row.attendance, classes_completed: saved.fee.classes_completed }
    });
    return saved;
  }

  async function bill(id, user) {
    assertCan(user, 'candidates', 'view');
    return withTransaction(async (client) => {
      await loadCandidate(client, id, user);
      const fee = await loadSummary(client, id);
      const payments = await client.query(
        `SELECT id, amount, paid_on, method, reference, note, voided_at, void_reason, created_at
         FROM candidate_payments WHERE candidate_id = $1 ORDER BY created_at DESC`,
        [id]
      );
      return {
        ...fee,
        payments: payments.rows.map((row) => ({
          ...row,
          amount: money(row.amount).text,
          voided: row.voided_at != null
        }))
      };
    });
  }

  return {
    admit,
    list,
    exportCsv,
    portfolio,
    updateCandidate,
    addPayment,
    voidPayment,
    addClass,
    updateClass,
    bill,
    listFilters
  };
}

module.exports = { createCandidateService, summaryFromRow, STATUSES, METHODS, ATTENDANCE };
