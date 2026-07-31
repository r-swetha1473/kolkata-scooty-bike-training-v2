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
  folder: 'blogs',
  maxBytesEnv: 'BLOG_IMAGE_MAX_BYTES'
});

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return jsonError(res, 400, 'Validation failed', 'VALIDATION_ERROR', { details: errors.array() });
  }
  return null;
}

function slugify(title) {
  return (
    String(title || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120) || 'post'
  );
}

const adminGuard = [
  authenticate,
  loadUserPermissions,
  authorize('admin', 'superadmin', 'subadmin')
];

/** Add canonical image_url alias alongside featured_image_url for FE consistency. */
function withBlogImageAlias(row) {
  if (!row) return row;
  return { ...row, image_url: row.featured_image_url || null };
}

router.get('/', async (req, res, next) => {
  try {
    const r = await db.query(
      `SELECT * FROM blog_posts WHERE status = 'published'
       ORDER BY published_at DESC NULLS LAST, created_at DESC`
    );
    res.json(r.rows.map(withBlogImageAlias));
  } catch (err) {
    next(err);
  }
});

router.get(
  '/admin/all',
  ...adminGuard,
  requirePermission('blogs', 'view'),
  async (req, res, next) => {
    try {
      const r = await db.query(`SELECT * FROM blog_posts ORDER BY created_at DESC`);
      res.json(r.rows.map(withBlogImageAlias));
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/upload-image',
  ...adminGuard,
  requirePermission('blogs', 'create'),
  uploader.middleware,
  uploader.handler
);

router.get('/:slug', async (req, res, next) => {
  try {
    if (['media', 'upload-image', 'id', 'admin'].includes(req.params.slug)) {
      return jsonError(res, 404, 'Not found', 'NOT_FOUND');
    }
    const r = await db.query(`SELECT * FROM blog_posts WHERE slug = $1`, [req.params.slug]);
    const post = r.rows[0];
    if (!post || post.status !== 'published') {
      return jsonError(res, 404, 'Blog post not found', 'NOT_FOUND');
    }
    res.json(withBlogImageAlias(post));
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  ...adminGuard,
  requirePermission('blogs', 'create'),
  body('title').isString().trim().notEmpty(),
  body('slug').optional().isString().trim(),
  body('status').optional().isIn(['draft', 'published']),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const slug = req.body.slug || slugify(req.body.title);
      const status = req.body.status || 'draft';
      const publishedAt =
        status === 'published' ? (req.body.published_at || new Date().toISOString()) : null;
      const featured = cloudinaryService.assertPersistableImageUrl(
        req.body.featured_image_url || null
      );
      const r = await db.query(
        `INSERT INTO blog_posts (
           title, slug, excerpt, content, featured_image_url, category, author_name,
           status, published_at, meta_title, meta_description
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          req.body.title,
          slug,
          req.body.excerpt || null,
          req.body.content || null,
          featured,
          req.body.category || null,
          req.body.author_name || null,
          status,
          publishedAt,
          req.body.meta_title || null,
          req.body.meta_description || null
        ]
      );
      console.log(`[blogs] db insert ok id=${r.rows[0].id}`);
      res.status(201).json(withBlogImageAlias(r.rows[0]));
    } catch (err) {
      if (err.status) return jsonError(res, err.status, err.message, err.errorCode);
      if (err.code === '23505') {
        err.status = 409;
        err.message = 'Blog slug already exists';
      }
      next(err);
    }
  }
);

router.put(
  '/id/:id',
  ...adminGuard,
  requirePermission('blogs', 'edit'),
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const existing = await db.query(`SELECT * FROM blog_posts WHERE id = $1`, [req.params.id]);
      if (!existing.rows[0]) return jsonError(res, 404, 'Blog post not found', 'NOT_FOUND');

      const nextStatus = req.body.status ?? existing.rows[0].status;
      let publishedAt =
        req.body.published_at !== undefined
          ? req.body.published_at
          : existing.rows[0].published_at;
      if (nextStatus === 'published' && !publishedAt) {
        publishedAt = new Date().toISOString();
      }
      if (nextStatus === 'draft' && req.body.published_at === null) {
        publishedAt = null;
      }

      const nextFeatured = cloudinaryService.resolveUpdatedImageUrl(
        req.body.featured_image_url !== undefined
          ? req.body.featured_image_url
          : undefined,
        existing.rows[0].featured_image_url
      );

      const r = await db.query(
        `UPDATE blog_posts SET
          title = COALESCE($2, title),
          slug = COALESCE($3, slug),
          excerpt = COALESCE($4, excerpt),
          content = COALESCE($5, content),
          featured_image_url = $6,
          category = COALESCE($7, category),
          author_name = COALESCE($8, author_name),
          status = COALESCE($9, status),
          published_at = $10,
          meta_title = COALESCE($11, meta_title),
          meta_description = COALESCE($12, meta_description),
          updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [
          req.params.id,
          req.body.title ?? null,
          req.body.slug ?? null,
          req.body.excerpt !== undefined ? req.body.excerpt : null,
          req.body.content !== undefined ? req.body.content : null,
          nextFeatured,
          req.body.category !== undefined ? req.body.category : null,
          req.body.author_name !== undefined ? req.body.author_name : null,
          req.body.status ?? null,
          publishedAt,
          req.body.meta_title !== undefined ? req.body.meta_title : null,
          req.body.meta_description !== undefined ? req.body.meta_description : null
        ]
      );
      await cloudinaryService.replaceImage(existing.rows[0].featured_image_url, nextFeatured);
      console.log(`[blogs] db update ok id=${r.rows[0].id}`);
      res.json(withBlogImageAlias(r.rows[0]));
    } catch (err) {
      if (err.status) return jsonError(res, err.status, err.message, err.errorCode);
      if (err.code === '23505') {
        err.status = 409;
        err.message = 'Blog slug already exists';
      }
      next(err);
    }
  }
);

router.delete(
  '/id/:id',
  ...adminGuard,
  requirePermission('blogs', 'delete'),
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const r = await db.query(
        `DELETE FROM blog_posts WHERE id = $1 RETURNING id, slug, featured_image_url`,
        [req.params.id]
      );
      if (!r.rows[0]) return jsonError(res, 404, 'Blog post not found', 'NOT_FOUND');
      await cloudinaryService.destroyImage(r.rows[0].featured_image_url);
      console.log(`[blogs] db delete ok id=${r.rows[0].id}`);
      res.json({ message: 'Blog post deleted', id: r.rows[0].id });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
