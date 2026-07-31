/**
 * Scheduling engine + platform health snapshot for admin monitoring.
 */

const db = require('../db');
const scheduleCache = require('../scheduling/schedule-cache');
const schedulingMetrics = require('../scheduling/metrics');
const cronStatus = require('./cronStatus.service');

function getDeploymentVersion() {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
  try {
    return require('../package.json').version || 'unknown';
  } catch {
    return 'unknown';
  }
}

const KOLKATA_TODAY = `(NOW() AT TIME ZONE 'Asia/Kolkata')::date`;

function statusFrom(ok, warning = false) {
  if (ok && !warning) return 'ok';
  if (ok && warning) return 'warning';
  return 'error';
}

async function pingDatabase() {
  const start = Date.now();
  try {
    await db.query('SELECT 1');
    return {
      status: 'ok',
      latencyMs: Date.now() - start,
      message: 'Connected'
    };
  } catch (error) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      message: error.message
    };
  }
}

async function countActiveVehicles() {
  try {
    return await db.query(
      `SELECT COUNT(*)::int AS count FROM vehicles WHERE is_active = true AND operational_status = 'active'`
    );
  } catch {
    return db.query(`SELECT COUNT(*)::int AS count FROM vehicles WHERE is_active = true`);
  }
}

async function getSchedulingEngineHealth() {
  const [dbHealth, branches, trainers, vehicles, pendingPayments, bookingQueue, recentAuditErrors] =
    await Promise.all([
      pingDatabase(),
      db.query(`SELECT COUNT(*)::int AS count FROM branches WHERE is_active = true`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`SELECT COUNT(*)::int AS count FROM trainers WHERE is_active = true`).catch(() => ({ rows: [{ count: 0 }] })),
      countActiveVehicles().catch(() => ({ rows: [{ count: 0 }] })),
      db.query(
        `SELECT COUNT(*)::int AS count FROM payments WHERE status IN ('pending_verification', 'pending_upload')`
      ).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(
        `SELECT COUNT(*)::int AS count FROM bookings WHERE status IN ('pending', 'pending_payment', 'confirmed')`
      ).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(
        `SELECT COUNT(*)::int AS count FROM admin_audit_log
         WHERE created_at >= NOW() - INTERVAL '24 hours'
           AND action_type IN ('LOGIN_FAILED', 'BOOKING_VALIDATION_ERROR')`
      ).catch(() => ({ rows: [{ count: 0 }] }))
    ]);

  const metrics = schedulingMetrics.getMetrics();
  const cacheStats = scheduleCache.getStats();
  const cronJobs = cronStatus.getAllJobs();
  const failedJobs = cronJobs.filter((j) => j.status === 'failed' || j.lastFailureAt);

  const availabilityApiOk = dbHealth.status === 'ok';

  return {
    checkedAt: new Date().toISOString(),
    deploymentVersion: getDeploymentVersion(),
    overallStatus: statusFrom(
      dbHealth.status === 'ok' && availabilityApiOk,
      failedJobs.length > 0 || metrics.totalErrors > 0
    ),
    components: {
      availabilityApi: {
        status: availabilityApiOk ? 'ok' : 'error',
        label: 'Availability API',
        endpoint: '/api/availability',
        totalRequests: metrics.totalRequests,
        totalErrors: metrics.totalErrors
      },
      cache: {
        status: 'ok',
        label: 'Cache Status',
        type: 'in-memory',
        ...cacheStats
      },
      redis: {
        status: 'future',
        label: 'Redis',
        message: 'Not configured — using in-memory cache'
      },
      queue: {
        status: 'future',
        label: 'Queue',
        message: 'No background queue — cron runs in-process'
      },
      database: {
        status: dbHealth.status,
        label: 'Database',
        latencyMs: dbHealth.latencyMs,
        message: dbHealth.message
      }
    },
    jobs: {
      pending: cronJobs.filter((j) => j.lastRunAt == null),
      running: [],
      failed: failedJobs,
      cron: cronJobs.map((job) => ({
        name: job.name,
        status: job.status,
        lastRunAt: job.lastRunAt,
        lastSuccessAt: job.lastSuccessAt,
        lastFailureAt: job.lastFailureAt,
        lastError: job.lastError,
        runs: job.runs,
        failures: job.failures
      }))
    },
    metrics: {
      lastSlotCalculationTime: metrics.lastCalculationAt,
      lastSlotCalculationMeta: metrics.lastCalculationMeta,
      averageAvailabilityResponseMs: metrics.averageResponseMs,
      recentApiErrors: metrics.recentErrors
    },
    counts: {
      activeBranches: branches.rows[0]?.count || 0,
      activeTrainers: trainers.rows[0]?.count || 0,
      activeVehicles: vehicles.rows[0]?.count || 0,
      pendingPayments: pendingPayments.rows[0]?.count || 0,
      bookingQueue: bookingQueue.rows[0]?.count || 0,
      apiErrors24h: recentAuditErrors.rows[0]?.count || 0
    },
    engine: {
      name: 'dynamic-scheduling',
      version: '1.0',
      mode: 'jit-materialize',
      timezone: 'Asia/Kolkata'
    }
  };
}

module.exports = {
  getSchedulingEngineHealth,
  pingDatabase
};
