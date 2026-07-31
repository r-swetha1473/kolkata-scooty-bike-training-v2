const express = require('express');
const { body, param, validationResult } = require('express-validator');
const branchService = require('../services/branch.service');
const { authenticate, authorize } = require('../middleware/auth');
const { loadUserPermissions, requirePermission } = require('../middleware/permissions');
const { logActivity } = require('../services/activity.service');
const auditService = require('../services/audit.service');
const { invalidateCacheForBranch } = require('../scheduling/availability.service');
const { jsonError } = require('../utils/httpError');
const cloudinaryService = require('../services/cloudinary.service');
const { createImageUploader } = require('../middleware/cloudinaryUpload');

const router = express.Router();
const uploader = createImageUploader({
  folder: 'branches',
  maxBytesEnv: 'BRANCH_IMAGE_MAX_BYTES'
});

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return jsonError(res, 400, 'Validation failed', 'VALIDATION_ERROR', { details: errors.array() });
  }
  return null;
}

/** Public: active branches */
router.get('/', async (req, res, next) => {
  try {
    const activeOnly = String(req.query.activeOnly || 'true') !== 'false';
    const rows = await branchService.listBranches({ activeOnly });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    if (['media', 'upload-image', 'id'].includes(req.params.slug)) {
      return jsonError(res, 404, 'Not found', 'NOT_FOUND');
    }
    const branch = await branchService.getBranchBySlug(req.params.slug);
    if (!branch || !branch.is_active) {
      return jsonError(res, 404, 'Branch not found', 'NOT_FOUND');
    }
    res.json(branch);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/upload-image',
  authenticate,
  loadUserPermissions,
  authorize('admin', 'superadmin', 'subadmin'),
  requirePermission('branches', 'edit'),
  uploader.middleware,
  uploader.handler
);

router.post(
  '/',
  authenticate,
  loadUserPermissions,
  authorize('admin', 'superadmin', 'subadmin'),
  requirePermission('branches', 'create'),
  body('name').isString().trim().notEmpty(),
  body('address').optional().isString(),
  body('slot_duration_minutes').optional().isInt({ min: 15, max: 120 }),
  body('default_slot_capacity').optional().isInt({ min: 1, max: 100 }),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      if (req.body.image_url) {
        req.body.image_url = cloudinaryService.assertPersistableImageUrl(req.body.image_url);
      }
      const branch = await branchService.createBranch(req.body);
      await logActivity({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'BRANCH_CREATE',
        entityType: 'branch',
        entityId: branch.id,
        meta: { name: branch.name },
        ipAddress: req.ip
      });
      const meta = auditService.requestMeta(req);
      await auditService.logAdminAction({
        adminId: req.user.id,
        actionType: 'BRANCH_CREATE',
        entityType: 'branch',
        entityId: branch.id,
        afterValue: { name: branch.name, slug: branch.slug, is_active: branch.is_active },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      });
      res.status(201).json(branch);
    } catch (err) {
      if (err.status) return jsonError(res, err.status, err.message, err.errorCode);
      if (err.code === '23505') {
        err.status = 409;
        err.message = 'Branch slug already exists';
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
  requirePermission('branches', 'edit'),
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const before = await branchService.getBranchById(req.params.id);
      if (!before) return jsonError(res, 404, 'Branch not found', 'NOT_FOUND');

      if (req.body.image_url !== undefined) {
        req.body.image_url = cloudinaryService.resolveUpdatedImageUrl(
          req.body.image_url,
          before.image_url
        );
      }

      const branch = await branchService.updateBranch(req.params.id, req.body);
      if (!branch) return jsonError(res, 404, 'Branch not found', 'NOT_FOUND');

      await cloudinaryService.replaceImage(before.image_url, branch.image_url);

      await logActivity({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'BRANCH_UPDATE',
        entityType: 'branch',
        entityId: branch.id,
        meta: {
          name: branch.name,
          before: before
            ? {
                is_active: before.is_active,
                opening_time: before.opening_time,
                closing_time: before.closing_time,
                slot_duration_minutes: before.slot_duration_minutes,
                default_slot_capacity: before.default_slot_capacity
              }
            : null,
          after: {
            is_active: branch.is_active,
            opening_time: branch.opening_time,
            closing_time: branch.closing_time,
            slot_duration_minutes: branch.slot_duration_minutes,
            default_slot_capacity: branch.default_slot_capacity
          }
        },
        ipAddress: req.ip
      });
      const meta = auditService.requestMeta(req);
      await auditService.logAdminAction({
        adminId: req.user.id,
        actionType: 'BRANCH_UPDATE',
        entityType: 'branch',
        entityId: branch.id,
        beforeValue: before
          ? {
              is_active: before.is_active,
              opening_time: before.opening_time,
              closing_time: before.closing_time,
              slot_duration_minutes: before.slot_duration_minutes,
              default_slot_capacity: before.default_slot_capacity
            }
          : null,
        afterValue: {
          is_active: branch.is_active,
          opening_time: branch.opening_time,
          closing_time: branch.closing_time,
          slot_duration_minutes: branch.slot_duration_minutes,
          default_slot_capacity: branch.default_slot_capacity
        },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      });
      invalidateCacheForBranch(branch.id);
      res.json(branch);
    } catch (err) {
      if (err.status) return jsonError(res, err.status, err.message, err.errorCode);
      next(err);
    }
  }
);

module.exports = router;
