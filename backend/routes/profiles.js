const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const {
  parseProfilePhone,
  isPhoneUniqueViolation,
  phoneCompleteForUser,
  requireRealPhone,
  DUPLICATE_PHONE_MESSAGE
} = require('../utils/phonePolicy');
const reactivationService = require('../services/reactivationRequest.service');
const { getProgressForUser } = require('../services/customerProgress.service');
const router = express.Router();

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { password_hash, ...safe } = req.user;
    res.json({
      ...safe,
      phone_complete: phoneCompleteForUser(safe)
    });
  } catch (error) {
    next(error);
  }
});

router.put('/me', authenticate, async (req, res, next) => {
  try {
    const { full_name, phone: rawPhone, email } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      params.push(full_name);
    }
    if (rawPhone !== undefined) {
      const parsed = parseProfilePhone(rawPhone);
      if (!parsed.ok) {
        const err = new Error(parsed.message);
        err.status = parsed.status;
        err.errorCode = parsed.errorCode;
        return next(err);
      }
      updates.push(`phone = $${paramIndex++}`);
      params.push(parsed.phone);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(email);
    }

    if (updates.length === 0) {
      const error = new Error('No fields to update');
      error.status = 400;
      error.errorCode = 'NO_FIELDS_TO_UPDATE';
      return next(error);
    }

    updates.push(`updated_at = NOW()`);
    params.push(req.user.id);

    const result = await db.query(
      `UPDATE profiles SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      const error = new Error('Profile not found');
      error.status = 404;
      error.errorCode = 'PROFILE_NOT_FOUND';
      return next(error);
    }

    const { password_hash, ...safe } = result.rows[0];
    res.json({
      ...safe,
      phone_complete: phoneCompleteForUser(safe)
    });
  } catch (err) {
    if (isPhoneUniqueViolation(err)) {
      const dup = new Error(DUPLICATE_PHONE_MESSAGE);
      dup.status = 409;
      dup.errorCode = 'DUPLICATE_PHONE';
      return next(dup);
    }
    next(err);
  }
});

router.get('/me/progress', authenticate, requireRealPhone, async (req, res, next) => {
  try {
    const progress = await getProgressForUser(req.user.id);
    res.json(progress);
  } catch (error) {
    next(error);
  }
});

router.get('/reactivation-status', authenticate, async (req, res, next) => {
  try {
    const latest = await reactivationService.getLatestForUser(req.user.id);
    if (!latest) {
      return res.json({ request: null });
    }
    res.json({
      request: {
        id: latest.id,
        status: latest.status,
        requested_at: latest.requested_at,
        reviewed_at: latest.reviewed_at,
        user_message: latest.user_message,
        status_label:
          latest.status === 'pending'
            ? 'Pending Review'
            : latest.status === 'approved'
              ? 'Approved'
              : 'Rejected'
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/reactivation-request', authenticate, async (req, res, next) => {
  try {
    await reactivationService.createRequest(req.user);
    res.status(201).json({
      success: true,
      message: 'Reactivation request sent successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
