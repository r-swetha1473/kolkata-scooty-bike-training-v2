const express = require('express');
const { body, query } = require('express-validator');
const { adminAccess } = require('../middleware/adminAccess');
const { handleValidationErrors } = require('../validators/common');
const scheduleManagement = require('../services/scheduleManagement.service');
const db = require('../db');

const router = express.Router();

const branchDateQuery = [
  query('branch_id').isUUID().withMessage('branch_id must be a valid UUID'),
  query('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD'),
  handleValidationErrors
];

const windowBody = [
  body('branch_id').isUUID(),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/),
  body('start_time').notEmpty().isISO8601(),
  body('end_time').notEmpty().isISO8601(),
  handleValidationErrors
];

/** Admin schedule timeline — engine output only */
router.get(
  '/timeline',
  ...adminAccess('slots', 'view'),
  ...branchDateQuery,
  query('vehicle_id').optional().isUUID(),
  query('trainer_id').optional().isUUID(),
  query('status').optional().isIn(['available', 'full', 'disabled']),
  query('search').optional().trim().isLength({ max: 100 }),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const payload = await scheduleManagement.getAdminTimeline({
        branchId: req.query.branch_id,
        date: req.query.date,
        vehicleId: req.query.vehicle_id || null,
        trainerId: req.query.trainer_id || null,
        status: req.query.status || null,
        search: req.query.search || null
      });
      res.json(payload);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/export',
  ...adminAccess('slots', 'view'),
  ...branchDateQuery,
  async (req, res, next) => {
    try {
      const payload = await scheduleManagement.getAdminTimeline({
        branchId: req.query.branch_id,
        date: req.query.date
      });
      const csv = scheduleManagement.timelineToCsv(payload.all_slots || payload.slots);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="schedule-${req.query.branch_id}-${req.query.date}.csv"`
      );
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/disable',
  ...adminAccess('slots', 'edit'),
  ...windowBody,
  body('reason').optional({ values: 'null' }).trim().isLength({ max: 500 }),
  async (req, res, next) => {
    try {
      const row = await scheduleManagement.disableWindow({
        branchId: req.body.branch_id,
        date: req.body.date,
        startTime: req.body.start_time,
        endTime: req.body.end_time,
        reason: req.body.reason || null,
        adminId: req.user.id
      });
      res.status(201).json({ message: 'Window disabled', exception: row });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/enable',
  ...adminAccess('slots', 'edit'),
  ...windowBody,
  async (req, res, next) => {
    try {
      const result = await scheduleManagement.enableWindow({
        branchId: req.body.branch_id,
        date: req.body.date,
        startTime: req.body.start_time,
        endTime: req.body.end_time
      });
      res.json({ message: 'Window enabled', ...result });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/capacity-override',
  ...adminAccess('slots', 'edit'),
  ...windowBody,
  body('capacity').isInt({ min: 0, max: 100 }).toInt(),
  body('vehicle_id').optional({ values: 'null' }).isUUID(),
  body('reason').optional({ values: 'null' }).trim().isLength({ max: 500 }),
  async (req, res, next) => {
    try {
      const row = await scheduleManagement.setCapacityOverride({
        branchId: req.body.branch_id,
        date: req.body.date,
        startTime: req.body.start_time,
        endTime: req.body.end_time,
        capacity: req.body.capacity,
        vehicleId: req.body.vehicle_id || null,
        reason: req.body.reason || null
      });
      res.json({ message: 'Capacity override saved', exception: row });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/trainer',
  ...adminAccess('slots', 'edit'),
  ...windowBody,
  body('trainer_id').optional({ values: 'null' }).isUUID(),
  async (req, res, next) => {
    try {
      const slot = await scheduleManagement.assignTrainer({
        branchId: req.body.branch_id,
        date: req.body.date,
        startTime: req.body.start_time,
        endTime: req.body.end_time,
        trainerId: req.body.trainer_id || null
      });
      res.json({ message: 'Trainer assigned', slot });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/notes',
  ...adminAccess('slots', 'edit'),
  ...windowBody,
  body('reason').trim().notEmpty().isLength({ max: 500 }),
  async (req, res, next) => {
    try {
      const row = await scheduleManagement.updateWindowNotes({
        branchId: req.body.branch_id,
        date: req.body.date,
        startTime: req.body.start_time,
        endTime: req.body.end_time,
        reason: req.body.reason
      });
      res.json({ message: 'Notes updated', exception: row });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/bulk-disable',
  ...adminAccess('slots', 'edit'),
  body('branch_id').isUUID(),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/),
  body('windows').isArray({ min: 1 }),
  body('windows.*.start_time').isISO8601(),
  body('windows.*.end_time').isISO8601(),
  body('reason').optional({ values: 'null' }).trim().isLength({ max: 500 }),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const result = await scheduleManagement.bulkDisableWindows({
        branchId: req.body.branch_id,
        date: req.body.date,
        windows: req.body.windows,
        reason: req.body.reason || null
      });
      res.json({ message: 'Bulk disable completed', ...result });
    } catch (error) {
      next(error);
    }
  }
);

/** Bookings overlapping a schedule window (exact match or slot start within window) */
router.get(
  '/bookings-for-window',
  ...adminAccess('slots', 'view'),
  query('branch_id').isUUID().withMessage('branch_id must be a valid UUID'),
  query('start_time').notEmpty().isISO8601(),
  query('end_time').notEmpty().isISO8601(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const r = await db.query(
        `SELECT
           b.id,
           b.status,
           b.booking_reference AS reference,
           COALESCE(NULLIF(TRIM(b.offline_customer_name), ''), u.full_name, 'N/A') AS customer_name,
           s.start_time,
           s.end_time,
           s.id AS slot_id
         FROM bookings b
         JOIN slots s ON s.id = b.slot_id
         LEFT JOIN profiles u ON u.id = b.user_id
         WHERE s.branch_id = $1
           AND (
             (s.start_time = $2::timestamptz AND s.end_time = $3::timestamptz)
             OR (s.start_time >= $2::timestamptz AND s.start_time < $3::timestamptz)
           )
         ORDER BY s.start_time ASC, b.created_at ASC`,
        [req.query.branch_id, req.query.start_time, req.query.end_time]
      );
      res.json(r.rows);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
