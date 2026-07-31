const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { validateSettingUpdate, validateSettingsUpdate } = require('../validators');
const { filterPublicSettings, isPublicSettingsKey, PUBLIC_SETTINGS_KEYS } = require('../utils/publicSettings');
const bookingRulesSvc = require('../services/bookingRules.service');
const { createImageUploader } = require('../middleware/cloudinaryUpload');
const { jsonError } = require('../utils/httpError');
const router = express.Router();

const BOOKING_SETTING_KEYS = new Set(Object.values(bookingRulesSvc.KEYS));
const bannerUploader = createImageUploader({
  folder: 'banner',
  maxBytesEnv: 'SETTINGS_IMAGE_MAX_BYTES'
});
const settingsUploader = createImageUploader({
  folder: 'settings',
  maxBytesEnv: 'SETTINGS_IMAGE_MAX_BYTES'
});

async function refreshIfBookingTouched(keys) {
  const list = Array.isArray(keys) ? keys : [keys];
  if (list.some((k) => BOOKING_SETTING_KEYS.has(k))) {
    try {
      await bookingRulesSvc.refreshBookingRules();
    } catch (_) {
      /* ignore */
    }
  }
}

/** Admin: upload homepage banner image → kolkata-bike-training/banner */
router.post(
  '/upload-image',
  authenticate,
  (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return jsonError(res, 403, 'Forbidden', 'FORBIDDEN');
    }
    next();
  },
  bannerUploader.middleware,
  bannerUploader.handler
);

/** Admin: upload settings/logo image → kolkata-bike-training/settings */
router.post(
  '/upload-logo',
  authenticate,
  (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return jsonError(res, 403, 'Forbidden', 'FORBIDDEN');
    }
    next();
  },
  settingsUploader.middleware,
  settingsUploader.handler
);

// Get public site settings only (no operational/admin keys)
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT key, value FROM settings WHERE key = ANY($1::text[]) ORDER BY key`,
      [PUBLIC_SETTINGS_KEYS]
    );

    const settings = filterPublicSettings(result.rows);
    // Overlay resolved booking rules so frontend always gets consistent numbers
    Object.assign(settings, bookingRulesSvc.toPublicDto(await bookingRulesSvc.getBookingRules()));
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// Resolved booking policy object (public — used by customer booking UI)
router.get('/booking-rules', async (req, res, next) => {
  try {
    const rules = await bookingRulesSvc.getBookingRules();
    res.json(bookingRulesSvc.toPublicDto(rules));
  } catch (error) {
    next(error);
  }
});

// Admin: replace booking rules in one request
router.put('/booking-rules', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      const error = new Error('Forbidden');
      error.status = 403;
      error.errorCode = 'FORBIDDEN';
      return next(error);
    }
    const rules = await bookingRulesSvc.saveBookingRules(req.body || {}, req.user.id);
    res.json({
      message: 'Booking settings saved',
      rules: bookingRulesSvc.toPublicDto(rules)
    });
  } catch (error) {
    next(error);
  }
});

// Get all settings with metadata (admin only)
router.get('/all', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      const error = new Error('Forbidden');
      error.status = 403;
      error.errorCode = 'FORBIDDEN';
      return next(error);
    }

    const result = await db.query('SELECT * FROM settings ORDER BY key');

    const settings = result.rows.map((row) => ({
      key: row.key,
      value: row.value,
      description: row.description,
      updated_at: row.updated_at,
      updated_by: row.updated_by
    }));

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// Get single public site setting
router.get('/:key', async (req, res, next) => {
  try {
    const key = req.params.key;
    if (!isPublicSettingsKey(key)) {
      const error = new Error('Setting not found');
      error.status = 404;
      error.errorCode = 'SETTING_NOT_FOUND';
      return next(error);
    }

    const result = await db.query('SELECT value FROM settings WHERE key = $1', [key]);

    if (result.rows.length === 0) {
      const error = new Error('Setting not found');
      error.status = 404;
      error.errorCode = 'SETTING_NOT_FOUND';
      return next(error);
    }

    res.json({ key, value: result.rows[0].value });
  } catch (error) {
    next(error);
  }
});

// Update setting (admin only)
router.put('/:key', authenticate, validateSettingUpdate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      const error = new Error('Forbidden');
      error.status = 403;
      error.errorCode = 'FORBIDDEN';
      return next(error);
    }

    const { value, description } = req.body;

    const result = await db.query(
      `
      INSERT INTO settings (key, value, description, updated_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = EXCLUDED.value,
        description = COALESCE(EXCLUDED.description, settings.description),
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING *
    `,
      [req.params.key, JSON.stringify(value), description || '', req.user.id]
    );

    await refreshIfBookingTouched(req.params.key);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update multiple settings (admin only)
router.put('/', authenticate, validateSettingsUpdate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      const error = new Error('Forbidden');
      error.status = 403;
      error.errorCode = 'FORBIDDEN';
      return next(error);
    }

    const settings = req.body;
    const touched = [];

    for (const [key, data] of Object.entries(settings)) {
      const { value, description } =
        typeof data === 'object' && data !== null && !Array.isArray(data) && 'value' in data
          ? data
          : { value: data };
      touched.push(key);

      await db.query(
        `
        INSERT INTO settings (key, value, description, updated_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (key) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          description = COALESCE(EXCLUDED.description, settings.description),
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      `,
        [key, JSON.stringify(value), description || '', req.user.id]
      );
    }

    await refreshIfBookingTouched(touched);

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
