const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const {
  strictLimiter,
  pollingLimiter,
  adminLimiter
} = require('./middleware/rateLimiters');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const trainerRoutes = require('./routes/trainers');
const slotRoutes = require('./routes/slots');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');
const ratingsRoutes = require('./routes/ratings');
const settingsRoutes = require('./routes/settings');
const vehiclesRoutes = require('./routes/vehicles');
const recognitionRoutes = require('./routes/recognition');
const adminManagementRoutes = require('./routes/adminManagement');
const branchesRoutes = require('./routes/branches');
const coursesRoutes = require('./routes/courses');
const availabilityRoutes = require('./routes/availability');
const scheduleRoutes = require('./routes/schedule');
const paymentsRoutes = require('./routes/payments');
const galleryRoutes = require('./routes/gallery');
const testimonialsRoutes = require('./routes/testimonials');
const blogsRoutes = require('./routes/blogs');
const couponsRoutes = require('./routes/coupons');
const errorHandler = require('./middleware/errorHandler');
const { getBuildInfo } = require('./utils/buildInfo');
const cron = require('node-cron');
const { runInactivityBlockCheck } = require('./services/inactivity.service');
const { runNightlyAutoGeneration, ensureSlotsOnStartup } = require('./services/slotGeneration.service');
const { runOverdueBookingDetection } = require('./services/overdueDetection.service');
const { expireUnpaidBookings } = require('./services/payment.service');
const cronStatus = require('./services/cronStatus.service');
const config = require('./app.config');

const app = express();
const events = require('./events');

// Render sits behind a reverse proxy — required for correct req.ip in rate limiting
app.set('trust proxy', 1);

app.use(helmet());

// CORS configuration: allow main frontend, preview frontend and local Angular dev
// FRONTEND_URL          -> main production frontend
// FRONTEND_URL_PREVIEW  -> Vercel preview / staging frontend (optional)
//
// Note: Normalize URLs to avoid mismatches due to trailing slashes.
const normalizeOrigin = (url) => {
  if (!url) return url;
  try {
    // Some environments may pass full URLs, others just origin strings.
    // We always strip exactly one trailing slash, if present.
    return url.replace(/\/$/, '');
  } catch {
    return url;
  }
};

const allowedOrigins = [
  normalizeOrigin(process.env.FRONTEND_URL),
  normalizeOrigin(process.env.FRONTEND_URL_PREVIEW),
  'http://localhost:4200'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser/SSR requests with no origin
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);

    // Exact match against allowed origins
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // Optionally allow any Vercel deployment of this app
    if (normalizedOrigin.endsWith('kolkata-scooty-bike-training.vercel.app')) {
      return callback(null, true);
    }

    console.warn('Blocked CORS origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET environment variable is required (Google OAuth sessions).');
  process.exit(1);
}

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

require('./config/passport');

const [strictLog, strictLimit] = strictLimiter;
const [adminLog, adminLimit] = adminLimiter;

function runLimiterPair(pair, req, res, next) {
  const [logMw, limiter] = pair;
  logMw(req, res, () => limiter(req, res, next));
}

// Register routes - apply limiters as middleware
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/profile', profileRoutes);

// Public GET endpoints with lenient limiter
app.use('/api/trainers', (req, res, next) => {
  if (req.method === 'GET') {
    return runLimiterPair(pollingLimiter, req, res, next);
  }
  return runLimiterPair(strictLimiter, req, res, next);
});
app.use('/api/trainers', trainerRoutes);

app.use('/api/slots', (req, res, next) => {
  if (req.method === 'GET') {
    return runLimiterPair(pollingLimiter, req, res, next);
  }
  return runLimiterPair(strictLimiter, req, res, next);
});
app.use('/api/slots', slotRoutes);

app.use('/api/vehicles', (req, res, next) => {
  if (req.method === 'GET') {
    return runLimiterPair(pollingLimiter, req, res, next);
  }
  return runLimiterPair(strictLimiter, req, res, next);
});
app.use('/api/vehicles', vehiclesRoutes);

app.use('/api/settings', (req, res, next) => {
  if (req.method === 'GET') {
    return runLimiterPair(pollingLimiter, req, res, next);
  }
  return runLimiterPair(strictLimiter, req, res, next);
});
app.use('/api/settings', settingsRoutes);

app.use('/api/branches', (req, res, next) => {
  if (req.method === 'GET') {
    return runLimiterPair(pollingLimiter, req, res, next);
  }
  return runLimiterPair(strictLimiter, req, res, next);
});
app.use('/api/branches', branchesRoutes);

app.use('/api/courses', (req, res, next) => {
  if (req.method === 'GET') {
    return runLimiterPair(pollingLimiter, req, res, next);
  }
  return runLimiterPair(strictLimiter, req, res, next);
});
app.use('/api/courses', coursesRoutes);

app.use('/api/gallery', (req, res, next) => {
  if (req.method === 'GET') {
    return runLimiterPair(pollingLimiter, req, res, next);
  }
  return runLimiterPair(strictLimiter, req, res, next);
});
app.use('/api/gallery', galleryRoutes);

app.use('/api/testimonials', (req, res, next) => {
  if (req.method === 'GET') {
    return runLimiterPair(pollingLimiter, req, res, next);
  }
  return runLimiterPair(strictLimiter, req, res, next);
});
app.use('/api/testimonials', testimonialsRoutes);

app.use('/api/blogs', (req, res, next) => {
  if (req.method === 'GET') {
    return runLimiterPair(pollingLimiter, req, res, next);
  }
  return runLimiterPair(strictLimiter, req, res, next);
});
app.use('/api/blogs', blogsRoutes);

app.use('/api/coupons', (req, res, next) => {
  if (req.method === 'GET') {
    return runLimiterPair(pollingLimiter, req, res, next);
  }
  return runLimiterPair(strictLimiter, req, res, next);
});
app.use('/api/coupons', couponsRoutes);

app.use('/api/availability', (req, res, next) => {
  return runLimiterPair(pollingLimiter, req, res, next);
});
app.use('/api/availability', availabilityRoutes);

app.use('/api/schedule', (req, res, next) => {
  return runLimiterPair(adminLimiter, req, res, next);
});
app.use('/api/schedule', scheduleRoutes);

app.use('/api/payments', strictLog, strictLimit, paymentsRoutes);

// Protected routes
app.use('/api/bookings', strictLog, strictLimit, bookingRoutes);
app.use('/api/admin', adminLog, adminLimit, adminRoutes);
app.use('/api/admin-management', adminLog, adminLimit, adminManagementRoutes);
app.use('/api/ratings', strictLog, strictLimit, ratingsRoutes);
app.use('/api/recognition', strictLog, strictLimit, recognitionRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: getBuildInfo()
  });
});

/** Public deploy metadata — compare commit to GitHub main when debugging 404s */
app.get('/api/version', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    ...getBuildInfo(),
    routes: {
      subAdmins: 'GET /api/admin/sub-admins'
    }
  });
});

// Server-Sent Events endpoint for real-time updates
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  // Send initial comment to establish stream
  res.write(': connected\n\n');
  events.addClient(res);

  const keepAlive = setInterval(() => {
    try { res.write(': keepalive\n\n'); } catch (_) {}
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    events.removeClient(res);
    try { res.end(); } catch (_) {}
  });
});

/** JSON 404 for unknown API paths (avoids HTML "Cannot GET" confusing Angular) */
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
    errorCode: 'ROUTE_NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to 0.0.0.0 for Docker compatibility

// Start server
const server = app.listen(PORT, HOST, () => {
  try {
    const cloudinaryService = require('./services/cloudinary.service');
    cloudinaryService.assertCloudinaryConfigured();
  } catch (err) {
    console.error('[cloudinary] startup config error:', err.message);
    if (process.env.NODE_ENV === 'production' || process.env.REQUIRE_CLOUDINARY === '1') {
      console.error('[cloudinary] refusing to start without Cloudinary config');
      process.exit(1);
    } else {
      console.warn('[cloudinary] continuing in development — image uploads will fail until env is set');
    }
  }
  console.log(`Server running on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Daily inactivity check (customers with no booking for N days → inactive_blocked)
if (process.env.DISABLE_INACTIVITY_CRON !== '1') {
  const cronExpr = process.env.INACTIVITY_CRON || '0 2 * * *';
  cron.schedule(cronExpr, () => {
    runInactivityBlockCheck()
      .then((result) => cronStatus.recordRun('inactivity_block', { success: true, meta: result || {} }))
      .catch((err) => {
        console.error('[Inactivity cron]', err.message);
        cronStatus.recordRun('inactivity_block', { success: false, error: err.message });
      });
  });
}

/** Auto-generate training slots for 7 days starting today (server date) at cron time (default midnight Asia/Kolkata) */
if (process.env.DISABLE_AUTO_SLOT_CRON !== '1') {
  const autoSlotCron = process.env.AUTO_SLOT_CRON || '0 0 * * *';
  const autoSlotTz = process.env.AUTO_SLOT_CRON_TZ || 'Asia/Kolkata';
  cron.schedule(
    autoSlotCron,
    () => {
      runNightlyAutoGeneration()
        .then((result) => cronStatus.recordRun('auto_slot_generation', { success: true, meta: result || {} }))
        .catch((err) => {
          console.error('[Auto slot cron]', err.message);
          cronStatus.recordRun('auto_slot_generation', { success: false, error: err.message });
        });
    },
    { timezone: autoSlotTz }
  );
}

if (process.env.DISABLE_OVERDUE_BOOKING_CRON !== '1') {
  const overdueCron = process.env.OVERDUE_BOOKING_CRON || '*/30 * * * *';
  cron.schedule(overdueCron, () => {
    runOverdueBookingDetection()
      .then((result) => cronStatus.recordRun('overdue_booking_detection', { success: true, meta: result || {} }))
      .catch((err) => {
        console.error('[Overdue booking cron]', err.message);
        cronStatus.recordRun('overdue_booking_detection', { success: false, error: err.message });
      });
  });
}

if (process.env.DISABLE_PAYMENT_EXPIRE_CRON !== '1') {
  const expireCron = process.env.PAYMENT_EXPIRE_CRON || '0 * * * *';
  cron.schedule(expireCron, () => {
    const hours = config.booking.pendingPaymentExpireHours || 12;
    expireUnpaidBookings(hours)
      .then((r) => {
        if (r.expired > 0) console.log(`[Payment expire cron] Expired ${r.expired} unpaid booking(s)`);
        cronStatus.recordRun('payment_expire', { success: true, meta: r });
      })
      .catch((err) => {
        console.error('[Payment expire cron]', err.message);
        cronStatus.recordRun('payment_expire', { success: false, error: err.message });
      });
  });
}

if (process.env.DISABLE_AUTO_SLOT_STARTUP !== '1') {
  const startupDays = Number(process.env.AUTO_SLOT_STARTUP_DAYS || '7');
  ensureSlotsOnStartup(Number.isFinite(startupDays) && startupDays > 0 ? startupDays : 7).catch((err) => {
    console.error('[Auto slot startup]', err.message);
  });
}

if (process.env.DISABLE_SLOT_CAPACITY_STARTUP !== '1') {
  const slotCapacityService = require('./services/slotCapacity.service');
  slotCapacityService.recalculateFutureSlotCapacities(null).then((result) => {
    if (result?.updated > 0) {
      console.log(`[Slot capacity startup] Updated ${result.updated} slot(s) to capacity ${result.capacity}`);
    }
  }).catch((err) => {
    console.error('[Slot capacity startup]', err.message);
  });
}

if (process.env.DISABLE_REACTIVATION_SCHEMA_STARTUP !== '1') {
  const reactivationService = require('./services/reactivationRequest.service');
  reactivationService.ensureSchemaOnStartup().catch((err) => {
    console.error('[Reactivation schema startup]', err.message);
  });
}

if (process.env.DISABLE_OFFLINE_BOOKING_SCHEMA_STARTUP !== '1') {
  const { ensureOfflineBookingSchemaOnStartup } = require('./services/offlineBookingSchema.service');
  ensureOfflineBookingSchemaOnStartup().catch((err) => {
    console.error('[Offline booking schema startup]', err.message);
  });
}

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
    
    // Close database connections
    const { pool } = require('./db');
    pool.end(() => {
      console.log('Database connections closed.');
      process.exit(0);
    });
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});
