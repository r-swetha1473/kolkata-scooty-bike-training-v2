const express = require('express');
const { query, validationResult } = require('express-validator');
const availabilityService = require('../scheduling/availability.service');
const schedulingMetrics = require('../scheduling/metrics');
const { adminAccess } = require('../middleware/adminAccess');

const router = express.Router();

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  return null;
}

/**
 * GET /api/availability?branch_id=&date=&vehicle_id=&course_id=&full_day=
 * Dynamic branch-aware availability (SSOT for capacity on booking UI).
 * full_day=true returns all windows with engine capacity (for customer calendar messaging).
 */
router.get(
  '/',
  query('branch_id').isUUID(),
  query('date').matches(/^\d{4}-\d{2}-\d{2}$/),
  query('vehicle_id').optional().isUUID(),
  query('course_id').optional().isUUID(),
  async (req, res, next) => {
    const started = Date.now();
    try {
      if (handleValidation(req, res)) return;

      const includeAll =
        req.query.full_day === 'true' ||
        req.query.full_day === '1' ||
        (req.query.include_all === 'true' &&
          req.user &&
          ['admin', 'superadmin', 'subadmin'].includes(req.user.role));

      const result = await availabilityService.getAvailability({
        branchId: req.query.branch_id,
        date: req.query.date,
        vehicleId: req.query.vehicle_id || null,
        courseId: req.query.course_id || null,
        includeAll,
        persist: true,
        useCache: !includeAll
      });

      schedulingMetrics.recordAvailabilityResponse(Date.now() - started, {
        branchId: req.query.branch_id,
        date: req.query.date,
        returned: result.slots?.length || 0
      });

      // Normalize customer payload: capacity + remaining always from engine
      const slots = (result.slots || []).map((s) => ({
        ...s,
        capacity: s.capacity ?? s.live_capacity ?? 0,
        live_capacity: s.live_capacity ?? s.capacity ?? 0,
        remaining_capacity:
          s.remaining_capacity != null
            ? s.remaining_capacity
            : Math.max(0, (s.capacity ?? 0) - (s.booked_count ?? 0)),
        booked_count: s.booked_count ?? 0
      }));

      res.json(slots);
    } catch (err) {
      schedulingMetrics.recordAvailabilityError(err, {
        branchId: req.query.branch_id,
        date: req.query.date
      });
      next(err);
    }
  }
);

/** Admin schedule view with disabled/full slots and reasons */
router.get(
  '/admin',
  ...adminAccess('slots', 'view'),
  query('branch_id').isUUID(),
  query('date').matches(/^\d{4}-\d{2}-\d{2}$/),
  async (req, res, next) => {
    try {
      if (handleValidation(req, res)) return;
      const result = await availabilityService.getAvailability({
        branchId: req.query.branch_id,
        date: req.query.date,
        includeAll: true,
        persist: false,
        useCache: false
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
