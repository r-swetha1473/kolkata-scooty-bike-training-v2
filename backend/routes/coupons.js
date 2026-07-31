const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { loadUserPermissions, requirePermission } = require('../middleware/permissions');
const { jsonError } = require('../utils/httpError');
const { calcDiscount, validateCouponRow } = require('../services/coupon.service');

const router = express.Router();

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return jsonError(res, 400, 'Validation failed', 'VALIDATION_ERROR', { details: errors.array() });
  }
  return null;
}

const adminGuard = [
  authenticate,
  loadUserPermissions,
  authorize('admin', 'superadmin', 'subadmin')
];

/** Public: active coupons (codes only useful server-side; list for display) */
router.get('/', async (req, res, next) => {
  try {
    const activeOnly = String(req.query.activeOnly || 'true') !== 'false';
    const r = await db.query(
      activeOnly
        ? `SELECT id, code, description, discount_type, discount_value, start_at, end_at,
                  min_amount, max_discount, branch_id, vehicle_id, is_active
           FROM coupons WHERE is_active = true ORDER BY created_at DESC`
        : `SELECT * FROM coupons ORDER BY created_at DESC`
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/validate',
  authenticate,
  body('code').isString().trim().notEmpty(),
  body('amount').isFloat({ min: 0 }),
  body('branch_id').optional({ values: 'null' }).isUUID(),
  body('vehicle_id').optional({ values: 'null' }).isUUID(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const code = String(req.body.code).trim().toUpperCase();
      const r = await db.query(`SELECT * FROM coupons WHERE UPPER(code) = $1 LIMIT 1`, [code]);
      const coupon = r.rows[0];
      if (!coupon) {
        return jsonError(res, 400, 'Invalid coupon code', 'COUPON_NOT_FOUND');
      }
      const fail = validateCouponRow(coupon, {
        amount: req.body.amount,
        branch_id: req.body.branch_id || null,
        vehicle_id: req.body.vehicle_id || null
      });
      if (fail) {
        return jsonError(res, 400, fail.message, fail.errorCode);
      }
      const { discount_amount, final_amount } = calcDiscount(coupon, req.body.amount);
      res.json({
        valid: true,
        discount_amount,
        final_amount,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          description: coupon.description,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          max_discount: coupon.max_discount
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/',
  ...adminGuard,
  requirePermission('coupons', 'create'),
  body('code').isString().trim().notEmpty(),
  body('discount_type').isIn(['percent', 'flat']),
  body('discount_value').isFloat({ min: 0 }),
  body('description').optional().isString(),
  body('start_at').optional({ values: 'null' }).isISO8601(),
  body('end_at').optional({ values: 'null' }).isISO8601(),
  body('min_amount').optional().isFloat({ min: 0 }),
  body('max_discount').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('usage_limit').optional({ values: 'null' }).isInt({ min: 1 }),
  body('branch_id').optional({ values: 'null' }).isUUID(),
  body('vehicle_id').optional({ values: 'null' }).isUUID(),
  body('is_active').optional().isBoolean(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const code = String(req.body.code).trim().toUpperCase();
      const r = await db.query(
        `INSERT INTO coupons (
           code, description, discount_type, discount_value, start_at, end_at,
           min_amount, max_discount, usage_limit, branch_id, vehicle_id, is_active
         ) VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,0),$8,$9,$10,$11,COALESCE($12,true))
         RETURNING *`,
        [
          code,
          req.body.description || null,
          req.body.discount_type,
          req.body.discount_value,
          req.body.start_at || null,
          req.body.end_at || null,
          req.body.min_amount,
          req.body.max_discount ?? null,
          req.body.usage_limit ?? null,
          req.body.branch_id || null,
          req.body.vehicle_id || null,
          typeof req.body.is_active === 'boolean' ? req.body.is_active : true
        ]
      );
      res.status(201).json(r.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        err.status = 409;
        err.message = 'Coupon code already exists';
      }
      next(err);
    }
  }
);

router.put(
  '/id/:id',
  ...adminGuard,
  requirePermission('coupons', 'edit'),
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const code = req.body.code != null ? String(req.body.code).trim().toUpperCase() : null;
      const r = await db.query(
        `UPDATE coupons SET
          code = COALESCE($2, code),
          description = COALESCE($3, description),
          discount_type = COALESCE($4, discount_type),
          discount_value = COALESCE($5, discount_value),
          start_at = COALESCE($6, start_at),
          end_at = COALESCE($7, end_at),
          min_amount = COALESCE($8, min_amount),
          max_discount = COALESCE($9, max_discount),
          usage_limit = COALESCE($10, usage_limit),
          branch_id = COALESCE($11, branch_id),
          vehicle_id = COALESCE($12, vehicle_id),
          is_active = COALESCE($13, is_active),
          updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [
          req.params.id,
          code,
          req.body.description !== undefined ? req.body.description : null,
          req.body.discount_type ?? null,
          req.body.discount_value ?? null,
          req.body.start_at !== undefined ? req.body.start_at : null,
          req.body.end_at !== undefined ? req.body.end_at : null,
          req.body.min_amount ?? null,
          req.body.max_discount !== undefined ? req.body.max_discount : null,
          req.body.usage_limit !== undefined ? req.body.usage_limit : null,
          req.body.branch_id !== undefined ? req.body.branch_id : null,
          req.body.vehicle_id !== undefined ? req.body.vehicle_id : null,
          typeof req.body.is_active === 'boolean' ? req.body.is_active : null
        ]
      );
      if (!r.rows[0]) return jsonError(res, 404, 'Coupon not found', 'NOT_FOUND');
      res.json(r.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        err.status = 409;
        err.message = 'Coupon code already exists';
      }
      next(err);
    }
  }
);

router.delete(
  '/id/:id',
  ...adminGuard,
  requirePermission('coupons', 'delete'),
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const r = await db.query(`DELETE FROM coupons WHERE id = $1 RETURNING id, code`, [req.params.id]);
      if (!r.rows[0]) return jsonError(res, 404, 'Coupon not found', 'NOT_FOUND');
      res.json({ message: 'Coupon deleted', id: r.rows[0].id });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
