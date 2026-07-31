const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { loadUserPermissions, requirePermission } = require('../middleware/permissions');
const { jsonError } = require('../utils/httpError');
const cloudinaryService = require('../services/cloudinary.service');
const { createImageUploader } = require('../middleware/cloudinaryUpload');

const router = express.Router();
const uploader = createImageUploader({
  folder: 'testimonials',
  maxBytesEnv: 'TESTIMONIAL_IMAGE_MAX_BYTES'
});

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

/** Canonical image_url alias for photo_url so FE can bind one field name. */
function withTestimonialImageAlias(row) {
  if (!row) return row;
  return { ...row, image_url: row.photo_url || null };
}

router.get('/', async (req, res, next) => {
  try {
    const activeOnly = String(req.query.activeOnly || 'true') !== 'false';
    const branchId = req.query.branch_id || null;
    const params = [];
    const where = [];
    if (activeOnly) where.push('is_active = true');
    if (branchId) {
      params.push(branchId);
      where.push(`(branch_id IS NULL OR branch_id = $${params.length})`);
    }
    const sql = `SELECT * FROM testimonials${where.length ? ` WHERE ${where.join(' AND ')}` : ''}
      ORDER BY display_order ASC, created_at DESC`;
    const r = await db.query(sql, params);
    res.json(r.rows.map(withTestimonialImageAlias));
  } catch (err) {
    next(err);
  }
});

router.post(
  '/upload-image',
  ...adminGuard,
  requirePermission('testimonials', 'create'),
  uploader.middleware,
  uploader.handler
);

router.post(
  '/',
  ...adminGuard,
  requirePermission('testimonials', 'create'),
  body('customer_name').isString().trim().notEmpty(),
  body('review').isString().trim().notEmpty(),
  body('photo_url').optional({ values: 'null' }).isString(),
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('branch_id').optional({ values: 'null' }).isUUID(),
  body('display_order').optional().isInt(),
  body('is_active').optional().isBoolean(),
  body('course_name').optional({ values: 'falsy' }).isString().trim().isLength({ max: 120 }),
  body('training_date').optional({ values: 'falsy' }).isISO8601(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const photoUrl = cloudinaryService.assertPersistableImageUrl(req.body.photo_url || null);
      const r = await db.query(
        `INSERT INTO testimonials
           (branch_id, customer_name, photo_url, rating, review, display_order, is_active, course_name, training_date)
         VALUES ($1,$2,$3,COALESCE($4,5),$5,COALESCE($6,0),COALESCE($7,true),$8,$9)
         RETURNING *`,
        [
          req.body.branch_id || null,
          req.body.customer_name,
          photoUrl,
          req.body.rating,
          req.body.review,
          req.body.display_order,
          typeof req.body.is_active === 'boolean' ? req.body.is_active : true,
          req.body.course_name || null,
          req.body.training_date || null
        ]
      );
      console.log(`[testimonials] db insert ok id=${r.rows[0].id}`);
      res.status(201).json(withTestimonialImageAlias(r.rows[0]));
    } catch (err) {
      if (err.status) return jsonError(res, err.status, err.message, err.errorCode);
      next(err);
    }
  }
);

router.put(
  '/id/:id',
  ...adminGuard,
  requirePermission('testimonials', 'edit'),
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const existing = await db.query(`SELECT * FROM testimonials WHERE id = $1`, [req.params.id]);
      if (!existing.rows[0]) return jsonError(res, 404, 'Testimonial not found', 'NOT_FOUND');

      let nextPhoto = existing.rows[0].photo_url;
      if (req.body.photo_url !== undefined) {
        nextPhoto = cloudinaryService.resolveUpdatedImageUrl(
          req.body.photo_url,
          existing.rows[0].photo_url
        );
      }

      const r = await db.query(
        `UPDATE testimonials SET
          branch_id = COALESCE($2, branch_id),
          customer_name = COALESCE($3, customer_name),
          photo_url = $4,
          rating = COALESCE($5, rating),
          review = COALESCE($6, review),
          display_order = COALESCE($7, display_order),
          is_active = COALESCE($8, is_active),
          course_name = COALESCE($9, course_name),
          training_date = COALESCE($10, training_date),
          updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [
          req.params.id,
          req.body.branch_id !== undefined ? req.body.branch_id : null,
          req.body.customer_name ?? null,
          nextPhoto,
          req.body.rating ?? null,
          req.body.review ?? null,
          req.body.display_order ?? null,
          typeof req.body.is_active === 'boolean' ? req.body.is_active : null,
          req.body.course_name !== undefined ? req.body.course_name || null : null,
          req.body.training_date !== undefined ? req.body.training_date || null : null
        ]
      );
      await cloudinaryService.replaceImage(existing.rows[0].photo_url, nextPhoto);
      console.log(`[testimonials] db update ok id=${r.rows[0].id}`);
      res.json(withTestimonialImageAlias(r.rows[0]));
    } catch (err) {
      if (err.status) return jsonError(res, err.status, err.message, err.errorCode);
      next(err);
    }
  }
);

router.delete(
  '/id/:id',
  ...adminGuard,
  requirePermission('testimonials', 'delete'),
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const r = await db.query(`DELETE FROM testimonials WHERE id = $1 RETURNING id, photo_url`, [
        req.params.id
      ]);
      if (!r.rows[0]) return jsonError(res, 404, 'Testimonial not found', 'NOT_FOUND');
      await cloudinaryService.destroyImage(r.rows[0].photo_url);
      console.log(`[testimonials] db delete ok id=${r.rows[0].id}`);
      res.json({ message: 'Testimonial deleted', id: r.rows[0].id });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
