/**
 * Shared coupon validation + discount math for validate API and booking create.
 */
function calcDiscount(coupon, amount) {
  const amt = Number(amount) || 0;
  let discount = 0;
  if (coupon.discount_type === 'percent') {
    discount = (amt * Number(coupon.discount_value)) / 100;
    if (coupon.max_discount != null) {
      discount = Math.min(discount, Number(coupon.max_discount));
    }
  } else {
    discount = Number(coupon.discount_value);
  }
  discount = Math.max(0, Math.min(discount, amt));
  return {
    discount_amount: Math.round(discount * 100) / 100,
    final_amount: Math.round((amt - discount) * 100) / 100
  };
}

function validateCouponRow(coupon, { amount, branch_id, vehicle_id }) {
  if (!coupon || !coupon.is_active) {
    return { errorCode: 'COUPON_INACTIVE', message: 'Coupon is not active' };
  }
  const now = Date.now();
  if (coupon.start_at && new Date(coupon.start_at).getTime() > now) {
    return { errorCode: 'COUPON_NOT_STARTED', message: 'Coupon is not yet valid' };
  }
  if (coupon.end_at && new Date(coupon.end_at).getTime() < now) {
    return { errorCode: 'COUPON_EXPIRED', message: 'Coupon has expired' };
  }
  if (coupon.usage_limit != null && Number(coupon.used_count) >= Number(coupon.usage_limit)) {
    return { errorCode: 'COUPON_USAGE_LIMIT', message: 'Coupon usage limit reached' };
  }
  const amt = Number(amount) || 0;
  if (Number(coupon.min_amount || 0) > amt) {
    return { errorCode: 'COUPON_MIN_AMOUNT', message: `Minimum amount is ${coupon.min_amount}` };
  }
  if (coupon.branch_id && branch_id && String(coupon.branch_id) !== String(branch_id)) {
    return { errorCode: 'COUPON_BRANCH_MISMATCH', message: 'Coupon not valid for this branch' };
  }
  if (coupon.branch_id && !branch_id) {
    return { errorCode: 'COUPON_BRANCH_REQUIRED', message: 'Branch is required for this coupon' };
  }
  if (coupon.vehicle_id && vehicle_id && String(coupon.vehicle_id) !== String(vehicle_id)) {
    return { errorCode: 'COUPON_VEHICLE_MISMATCH', message: 'Coupon not valid for this vehicle' };
  }
  if (coupon.vehicle_id && !vehicle_id) {
    return { errorCode: 'COUPON_VEHICLE_REQUIRED', message: 'Vehicle is required for this coupon' };
  }
  return null;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {{ code: string, amount: number, branch_id?: string|null, vehicle_id?: string|null }} opts
 */
async function applyCouponForBooking(client, opts) {
  const code = String(opts.code || '').trim().toUpperCase();
  if (!code) return { amount: Number(opts.amount) || 0, coupon: null, discount_amount: 0 };

  const r = await client.query(`SELECT * FROM coupons WHERE UPPER(code) = $1 FOR UPDATE`, [code]);
  const coupon = r.rows[0];
  if (!coupon) {
    const err = new Error('Invalid coupon code');
    err.status = 400;
    err.errorCode = 'COUPON_NOT_FOUND';
    throw err;
  }
  const fail = validateCouponRow(coupon, {
    amount: opts.amount,
    branch_id: opts.branch_id || null,
    vehicle_id: opts.vehicle_id || null
  });
  if (fail) {
    const err = new Error(fail.message);
    err.status = 400;
    err.errorCode = fail.errorCode;
    throw err;
  }
  const { discount_amount, final_amount } = calcDiscount(coupon, opts.amount);
  await client.query(
    `UPDATE coupons SET used_count = COALESCE(used_count, 0) + 1, updated_at = NOW() WHERE id = $1`,
    [coupon.id]
  );
  return { amount: final_amount, coupon, discount_amount };
}

module.exports = {
  calcDiscount,
  validateCouponRow,
  applyCouponForBooking
};
