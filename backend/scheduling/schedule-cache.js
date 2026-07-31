/**
 * In-memory availability cache with TTL invalidation hooks.
 */
const DEFAULT_TTL_MS = parseInt(process.env.AVAILABILITY_CACHE_TTL_MS || '60000', 10);

const cache = new Map();

function cacheKey(branchId, date, vehicleId, mode) {
  return `${branchId}:${date}:${vehicleId || 'all'}:${mode || 'bookable'}`;
}

function get(branchId, date, vehicleId, mode) {
  const key = cacheKey(branchId, date, vehicleId, mode);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function set(branchId, date, vehicleId, mode, value, ttlMs = DEFAULT_TTL_MS) {
  const key = cacheKey(branchId, date, vehicleId, mode);
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function invalidateBranch(branchId) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${branchId}:`)) cache.delete(key);
  }
}

function invalidateAll() {
  cache.clear();
}

function getStats() {
  const now = Date.now();
  let active = 0;
  let expired = 0;
  for (const entry of cache.values()) {
    if (now > entry.expiresAt) expired += 1;
    else active += 1;
  }
  return {
    entries: cache.size,
    activeEntries: active,
    expiredEntries: expired,
    ttlMs: DEFAULT_TTL_MS
  };
}

module.exports = {
  get,
  set,
  invalidateBranch,
  invalidateAll,
  cacheKey,
  getStats
};
