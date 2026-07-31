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
  folder: 'gallery',
  maxBytesEnv: 'GALLERY_IMAGE_MAX_BYTES'
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

/** Public: active gallery items */
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
    const sql = `SELECT * FROM gallery_items${where.length ? ` WHERE ${where.join(' AND ')}` : ''}
      ORDER BY sort_order ASC, created_at DESC`;
    const r = await db.query(sql, params);
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/upload-image',
  ...adminGuard,
  requirePermission('gallery', 'create'),
  uploader.middleware,
  uploader.handler
);

router.post(
  '/',
  ...adminGuard,
  requirePermission('gallery', 'create'),
  body('image_url').isString().trim().notEmpty(),
  body('title').optional().isString(),
  body('category').optional().isString(),
  body('branch_id').optional({ values: 'null' }).isUUID(),
  body('sort_order').optional().isInt(),
  body('is_active').optional().isBoolean(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const imageUrl = cloudinaryService.assertPersistableImageUrl(req.body.image_url, {
        allowEmpty: false
      });
      const r = await db.query(
        `INSERT INTO gallery_items (branch_id, title, category, image_url, sort_order, is_active)
         VALUES ($1,$2,COALESCE($3,''),$4,COALESCE($5,0),COALESCE($6,true))
         RETURNING *`,
        [
          req.body.branch_id || null,
          req.body.title || null,
          req.body.category ?? '',
          imageUrl,
          req.body.sort_order,
          typeof req.body.is_active === 'boolean' ? req.body.is_active : true
        ]
      );
      console.log(`[gallery] db insert ok id=${r.rows[0].id} image_url=${imageUrl}`);
      res.status(201).json(r.rows[0]);
    } catch (err) {
      if (err.status) return jsonError(res, err.status, err.message, err.errorCode);
      next(err);
    }
  }
);

router.put(
  '/id/:id',
  ...adminGuard,
  requirePermission('gallery', 'edit'),
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const existing = await db.query(`SELECT * FROM gallery_items WHERE id = $1`, [req.params.id]);
      if (!existing.rows[0]) return jsonError(res, 404, 'Gallery item not found', 'NOT_FOUND');

      let nextImage = existing.rows[0].image_url;
      if (req.body.image_url !== undefined && req.body.image_url !== null) {
        nextImage = cloudinaryService.resolveUpdatedImageUrl(
          req.body.image_url,
          existing.rows[0].image_url,
          { allowEmpty: false }
        );
      }

      const r = await db.query(
        `UPDATE gallery_items SET
          branch_id = COALESCE($2, branch_id),
          title = COALESCE($3, title),
          category = COALESCE($4, category),
          image_url = $5,
          sort_order = COALESCE($6, sort_order),
          is_active = COALESCE($7, is_active),
          updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [
          req.params.id,
          req.body.branch_id !== undefined ? req.body.branch_id : null,
          req.body.title ?? null,
          req.body.category ?? null,
          nextImage,
          req.body.sort_order ?? null,
          typeof req.body.is_active === 'boolean' ? req.body.is_active : null
        ]
      );
      await cloudinaryService.replaceImage(existing.rows[0].image_url, nextImage);
      console.log(`[gallery] db update ok id=${r.rows[0].id}`);
      res.json(r.rows[0]);
    } catch (err) {
      if (err.status) return jsonError(res, err.status, err.message, err.errorCode);
      next(err);
    }
  }
);

router.delete(
  '/id/:id',
  ...adminGuard,
  requirePermission('gallery', 'delete'),
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const r = await db.query(`DELETE FROM gallery_items WHERE id = $1 RETURNING id, image_url`, [
        req.params.id
      ]);
      if (!r.rows[0]) return jsonError(res, 404, 'Gallery item not found', 'NOT_FOUND');
      await cloudinaryService.destroyImage(r.rows[0].image_url);
      console.log(`[gallery] db delete ok id=${r.rows[0].id}`);
      res.json({ message: 'Gallery item deleted', id: r.rows[0].id });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
