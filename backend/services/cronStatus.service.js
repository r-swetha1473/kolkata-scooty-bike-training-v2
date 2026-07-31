/**
 * In-process cron job run registry for admin health monitoring.
 * Replace with Redis/DB job log when a real queue is introduced.
 */

const jobs = new Map();

function recordRun(jobName, { success = true, error = null, meta = {} } = {}) {
  const prev = jobs.get(jobName) || { runs: 0, failures: 0 };
  jobs.set(jobName, {
    name: jobName,
    lastRunAt: new Date().toISOString(),
    lastSuccessAt: success ? new Date().toISOString() : prev.lastSuccessAt || null,
    lastFailureAt: success ? prev.lastFailureAt || null : new Date().toISOString(),
    lastError: success ? null : String(error || 'Unknown error'),
    lastMeta: meta,
    runs: prev.runs + 1,
    failures: success ? prev.failures : prev.failures + 1,
    status: success ? 'ok' : 'failed'
  });
}

function getAllJobs() {
  return Array.from(jobs.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function getJob(name) {
  return jobs.get(name) || null;
}

module.exports = {
  recordRun,
  getAllJobs,
  getJob
};
