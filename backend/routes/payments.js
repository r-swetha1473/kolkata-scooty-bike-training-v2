const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { body, param, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { loadUserPermissions, requirePermission } = require('../middleware/permissions');
const paymentService = require('../services/payment.service');
const { jsonError } = require('../utils/httpError');

const router = express.Router();

paymentService.ensureReceiptDir();

const upload = multer({
  dest: path.join(paymentService.RECEIPT_DIR, '_tmp'),
  limits: {
    fileSize: parseInt(process.env.RECEIPT_MAX_BYTES || String(5 * 1024 * 1024), 10)
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, WebP, or PDF receipts are allowed'));
  }
});

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return jsonError(res, 400, 'Validation failed', 'VALIDATION_ERROR', { details: errors.array() });
  }
  return null;
}

router.get('/my', authenticate, async (req, res, next) => {
  try {
    const rows = await paymentService.listMyPayments(req.user.id);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    if (!payment) return jsonError(res, 404, 'Payment not found', 'NOT_FOUND');
    const isAdmin = ['admin', 'superadmin', 'subadmin'].includes(req.user.role);
    if (!isAdmin && payment.user_id !== req.user.id) {
      return jsonError(res, 403, 'Forbidden', 'FORBIDDEN');
    }
    res.json(payment);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/receipt',
  authenticate,
  param('id').isUUID(),
  upload.single('receipt'),
  body('reference_number').optional().isString().trim().isLength({ max: 100 }),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      if (!req.file) {
        return jsonError(res, 400, 'Receipt file is required', 'RECEIPT_REQUIRED');
      }
      const payment = await paymentService.submitReceipt({
        paymentId: req.params.id,
        userId: req.user.id,
        referenceNumber: req.body.reference_number,
        file: req.file
      });
      res.json(payment);
    } catch (err) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
      }
      next(err);
    }
  }
);

/** Admin list */
router.get(
  '/',
  authenticate,
  loadUserPermissions,
  authorize('admin', 'superadmin', 'subadmin'),
  requirePermission('payments', 'view'),
  async (req, res, next) => {
    try {
      const rows = await paymentService.listAdminPayments({
        status: req.query.status,
        branchId: req.query.branch_id,
        limit: req.query.limit,
        offset: req.query.offset
      });
      res.json(rows);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:id/approve',
  authenticate,
  loadUserPermissions,
  authorize('admin', 'superadmin', 'subadmin'),
  requirePermission('payments', 'edit'),
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const payment = await paymentService.approvePayment({
        paymentId: req.params.id,
        adminId: req.user.id
      });
      res.json(payment);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:id/reject',
  authenticate,
  loadUserPermissions,
  authorize('admin', 'superadmin', 'subadmin'),
  requirePermission('payments', 'edit'),
  param('id').isUUID(),
  body('reason').optional().isString().trim(),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const payment = await paymentService.rejectPayment({
        paymentId: req.params.id,
        adminId: req.user.id,
        reason: req.body.reason
      });
      res.json(payment);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/:id/receipt-file', authenticate, async (req, res, next) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    if (!payment?.receipt_path) {
      return jsonError(res, 404, 'No receipt uploaded for this payment', 'NOT_FOUND');
    }

    const isOwner = String(payment.user_id) === String(req.user.id);
    const isStaff = ['admin', 'superadmin', 'subadmin'].includes(req.user.role);
    if (!isOwner && !isStaff) {
      return jsonError(res, 403, 'Not allowed to view this receipt', 'FORBIDDEN');
    }

    // Cloudinary (or other HTTPS) receipt — return URL for SPA fetch clients
    if (paymentService.isRemoteReceiptUrl(payment.receipt_path)) {
      const wantsJson =
        String(req.headers.accept || '').includes('application/json') ||
        req.query.format === 'json';
      if (wantsJson) {
        return res.json({
          url: payment.receipt_path,
          mime: payment.receipt_mime || null,
          storage: 'remote'
        });
      }
      return res.redirect(302, payment.receipt_path);
    }

    const abs = paymentService.resolveReceiptAbsolutePath(payment.receipt_path);
    if (!abs || !fs.existsSync(abs)) {
      return jsonError(
        res,
        404,
        'Receipt file is no longer available. Ask the customer to re-upload their payment proof.',
        'RECEIPT_FILE_MISSING'
      );
    }
    res.setHeader('Content-Type', payment.receipt_mime || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="receipt-${payment.id}${path.extname(abs) || ''}"`
    );
    res.sendFile(abs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
