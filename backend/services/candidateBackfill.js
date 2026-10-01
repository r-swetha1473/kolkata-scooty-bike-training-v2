const { normalizeStrictIndianMobile } = require('../utils/phoneNormalize');

/**
 * Groups possible candidate sources by normalized mobile.
 * Does not write. Used by scripts/candidates_backfill_dry_run.js.
 */
function groupByMobile(rows) {
  const groups = new Map();
  const missingMobile = [];
  for (const row of rows || []) {
    const mobile = normalizeStrictIndianMobile(row.phone);
    if (!mobile) {
      missingMobile.push({
        source: row.source,
        id: row.id,
        name: row.name || null,
        phone: row.phone || null
      });
      continue;
    }
    if (!groups.has(mobile)) groups.set(mobile, { mobile, names: [], rows: [] });
    const group = groups.get(mobile);
    if (row.name && !group.names.includes(row.name)) group.names.push(row.name);
    group.rows.push({ source: row.source, id: row.id, name: row.name || null });
  }
  const grouped = [...groups.values()];
  return {
    group_count: grouped.length,
    row_count: (rows || []).length - missingMobile.length,
    missing_mobile: missingMobile,
    duplicate_mobiles: grouped.filter((group) => group.names.length > 1 || group.rows.length > 1),
    groups: grouped
  };
}

module.exports = { groupByMobile };
