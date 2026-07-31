const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { loadUserPermissions, requirePermission } = require('../middleware/permissions');
const auditService = require('../services/audit.service');
const { jsonError } = require('../utils/httpError');
const cloudinaryService = require('../services/cloudinary.service');
const { createImageUploader } = require('../middleware/cloudinaryUpload');

const router = express.Router();
const uploader = createImageUploader({
  folder: 'courses',
  maxBytesEnv: 'COURSE_IMAGE_MAX_BYTES'
});

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return jsonError(res, 400, 'Validation failed', 'VALIDATION_ERROR', { details: errors.array() });
  }
  return null;
}

function slugify(name) {
  return (
    String(name || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'course'
  );
}

function optionalImage(url) {
  return cloudinaryService.assertPersistableImageUrl(url == null || url === '' ? null : url);
}

function resolveImage(newVal, oldVal) {
  return cloudinaryService.resolveUpdatedImageUrl(newVal, oldVal);
}

/** Public active courses */
router.get('/', async (req, res, next) => {
  try {
    const activeOnly = String(req.query.activeOnly || 'true') !== 'false';
    const r = await db.query(
      activeOnly
        ? `SELECT * FROM courses WHERE is_active = true ORDER BY sort_order ASC, name ASC`
        : `SELECT * FROM courses ORDER BY sort_order ASC, name ASC`
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/upload-image',
  authenticate,
  loadUserPermissions,
  authorize('admin', 'superadmin', 'subadmin'),
  requirePermission('settings', 'edit'),
  uploader.middleware,
  uploader.handler
);

router.get('/:slug', async (req, res, next) => {
  try {
    if (['upload-image', 'id', 'media'].includes(req.params.slug)) {
      return jsonError(res, 404, 'Not found', 'NOT_FOUND');
    }
    const r = await db.query(`SELECT * FROM courses WHERE slug = $1`, [req.params.slug]);
    const course = r.rows[0];
    if (!course || !course.is_active) {
      return jsonError(res, 404, 'Course not found', 'NOT_FOUND');
    }
    res.json(course);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  authenticate,
  loadUserPermissions,
  authorize('admin', 'superadmin', 'subadmin'),
  requirePermission('settings', 'edit'),
  body('name').isString().trim().notEmpty(),
  body('amount_inr').optional().isFloat({ min: 0 }),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const slug = req.body.slug || slugify(req.body.name);
      const features = Array.isArray(req.body.features) ? req.body.features : [];
      const highlights = Array.isArray(req.body.highlights) ? req.body.highlights : [];
      const imageUrl = optionalImage(req.body.image_url);
      // Admin manages a single course image; keep variants aligned with the primary URL.
      const bannerUrl = optionalImage(req.body.banner_image_url || imageUrl);
      const thumbUrl = optionalImage(req.body.thumbnail_url || imageUrl);
      const mobileUrl = optionalImage(req.body.mobile_image_url || imageUrl);

      const r = await db.query(
        `INSERT INTO courses (
            name, slug, description, price_label, amount_inr, duration_label,
            features, highlights, tagline, difficulty, image_url,
            is_active, sort_order, is_featured, cta_text, cta_link,
            banner_image_url, thumbnail_url, mobile_image_url
          )
         VALUES (
            $1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,
            COALESCE($12,true),COALESCE($13,0),COALESCE($14,false),$15,$16,
            $17,$18,$19
          )
         RETURNING *`,
        [
          req.body.name,
          slug,
          req.body.description || '',
          req.body.price_label || (req.body.amount_inr ? `₹${req.body.amount_inr}` : ''),
          req.body.amount_inr || 0,
          req.body.duration_label || null,
          JSON.stringify(features),
          JSON.stringify(highlights),
          req.body.tagline || null,
          req.body.difficulty || 'Beginner',
          imageUrl,
          req.body.is_active,
          req.body.sort_order,
          req.body.is_featured,
          req.body.cta_text || null,
          req.body.cta_link || null,
          bannerUrl,
          thumbUrl,
          mobileUrl
        ]
      );
      const created = r.rows[0];
      console.log(`[courses] db insert ok id=${created.id} image_url=${imageUrl || ''}`);
      res.status(201).json(created);
      try {
        const meta = auditService.requestMeta(req);
        await auditService.logAdminAction({
          adminId: req.user.id,
          actionType: 'CREATE_COURSE',
          entityType: 'course',
          entityId: created.id,
          afterValue: { name: created.name, slug: created.slug, is_active: created.is_active },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent
        });
      } catch (auditErr) {
        console.warn('[courses] audit create failed:', auditErr.message);
      }
    } catch (err) {
      if (err.status) return jsonError(res, err.status, err.message, err.errorCode);
      if (err.code === '23505') {
        err.status = 409;
        err.message = 'Course slug already exists';
      }
      next(err);
    }
  }
);

router.put(
  '/id/:id',
  authenticate,
  loadUserPermissions,
  authorize('admin', 'superadmin', 'subadmin'),
  requirePermission('settings', 'edit'),
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const existing = await db.query(`SELECT * FROM courses WHERE id = $1`, [req.params.id]);
      if (!existing.rows[0]) return jsonError(res, 404, 'Course not found', 'NOT_FOUND');
      const before = existing.rows[0];

      const features =
        req.body.features !== undefined ? JSON.stringify(req.body.features) : null;
      const highlights =
        req.body.highlights !== undefined ? JSON.stringify(req.body.highlights) : null;

      const nextImageUrl =
        req.body.image_url !== undefined ? resolveImage(req.body.image_url, before.image_url) : before.image_url;
      const imageChanged =
        req.body.image_url !== undefined &&
        String(nextImageUrl || '') !== String(before.image_url || '');

      // Admin UI only edits image_url. When it changes, sync banner/thumb/mobile so
      // list/pricing cards (which used to prefer thumbnail_url) never keep a stale URL.
      let nextBanner =
        req.body.banner_image_url !== undefined
          ? resolveImage(req.body.banner_image_url, before.banner_image_url)
          : before.banner_image_url;
      let nextThumb =
        req.body.thumbnail_url !== undefined
          ? resolveImage(req.body.thumbnail_url, before.thumbnail_url)
          : before.thumbnail_url;
      let nextMobile =
        req.body.mobile_image_url !== undefined
          ? resolveImage(req.body.mobile_image_url, before.mobile_image_url)
          : before.mobile_image_url;

      if (imageChanged && nextImageUrl) {
        nextBanner = nextImageUrl;
        nextThumb = nextImageUrl;
        nextMobile = nextImageUrl;
      }

      const r = await db.query(
        `UPDATE courses SET
          name = COALESCE($2, name),
          slug = COALESCE($3, slug),
          description = COALESCE($4, description),
          price_label = COALESCE($5, price_label),
          amount_inr = COALESCE($6, amount_inr),
          duration_label = COALESCE($7, duration_label),
          features = COALESCE($8::jsonb, features),
          highlights = COALESCE($9::jsonb, highlights),
          tagline = COALESCE($10, tagline),
          difficulty = COALESCE($11, difficulty),
          image_url = $12,
          banner_image_url = $18,
          thumbnail_url = $19,
          mobile_image_url = $20,
          is_active = COALESCE($13, is_active),
          sort_order = COALESCE($14, sort_order),
          is_featured = COALESCE($15, is_featured),
          cta_text = COALESCE($16, cta_text),
          cta_link = COALESCE($17, cta_link),
          updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          req.params.id,
          req.body.name ?? null,
          req.body.slug ?? null,
          req.body.description ?? null,
          req.body.price_label ?? null,
          req.body.amount_inr ?? null,
          req.body.duration_label ?? null,
          features,
          highlights,
          req.body.tagline ?? null,
          req.body.difficulty ?? null,
          nextImageUrl,
          typeof req.body.is_active === 'boolean' ? req.body.is_active : null,
          req.body.sort_order ?? null,
          typeof req.body.is_featured === 'boolean' ? req.body.is_featured : null,
          req.body.cta_text ?? null,
          req.body.cta_link ?? null,
          nextBanner,
          nextThumb,
          nextMobile
        ]
      );
      const updated = r.rows[0];
      await cloudinaryService.replaceImage(before.image_url, nextImageUrl);
      await cloudinaryService.replaceImage(before.banner_image_url, nextBanner);
      await cloudinaryService.replaceImage(before.thumbnail_url, nextThumb);
      await cloudinaryService.replaceImage(before.mobile_image_url, nextMobile);
      console.log(`[courses] db update ok id=${updated.id}`);
      res.json(updated);
      try {
        const meta = auditService.requestMeta(req);
        await auditService.logAdminAction({
          adminId: req.user.id,
          actionType: 'UPDATE_COURSE',
          entityType: 'course',
          entityId: updated.id,
          afterValue: {
            name: updated.name,
            slug: updated.slug,
            is_active: updated.is_active,
            sort_order: updated.sort_order
          },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent
        });
      } catch (auditErr) {
        console.warn('[courses] audit update failed:', auditErr.message);
      }
    } catch (err) {
      if (err.status) return jsonError(res, err.status, err.message, err.errorCode);
      next(err);
    }
  }
);

router.delete(
  '/id/:id',
  authenticate,
  loadUserPermissions,
  authorize('admin', 'superadmin', 'subadmin'),
  requirePermission('settings', 'edit'),
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const bookings = await db.query(`SELECT 1 FROM bookings WHERE course_id = $1 LIMIT 1`, [
        req.params.id
      ]);
      if (bookings.rows.length) {
        return res.status(409).json({
          error: 'Course has existing bookings. Deactivate it instead of deleting.'
        });
      }
      const r = await db.query(
        `DELETE FROM courses WHERE id = $1
         RETURNING id, name, slug, image_url, banner_image_url, thumbnail_url, mobile_image_url`,
        [req.params.id]
      );
      if (!r.rows[0]) return jsonError(res, 404, 'Course not found', 'NOT_FOUND');
      const deleted = r.rows[0];
      await cloudinaryService.destroyImage(deleted.image_url);
      await cloudinaryService.destroyImage(deleted.banner_image_url);
      await cloudinaryService.destroyImage(deleted.thumbnail_url);
      await cloudinaryService.destroyImage(deleted.mobile_image_url);
      console.log(`[courses] db delete ok id=${deleted.id}`);
      res.json({ message: 'Course deleted', id: deleted.id });
      try {
        const meta = auditService.requestMeta(req);
        await auditService.logAdminAction({
          adminId: req.user.id,
          actionType: 'DELETE_COURSE',
          entityType: 'course',
          entityId: deleted.id,
          beforeValue: { name: deleted.name, slug: deleted.slug },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent
        });
      } catch (auditErr) {
        console.warn('[courses] audit delete failed:', auditErr.message);
      }
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
