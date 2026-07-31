const db = require('../db');

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'branch';
}

function normalizeWorkingDays(value, fallback = [1, 2, 3, 4, 5, 6, 0]) {
  if (!Array.isArray(value)) return fallback;
  const cleaned = [...new Set(value.map((d) => parseInt(d, 10)).filter((d) => d >= 0 && d <= 6))];
  return cleaned.length ? cleaned : fallback;
}

async function listBranches({ activeOnly = false } = {}) {
  const params = [];
  let where = '';
  if (activeOnly) {
    where = 'WHERE is_active = true';
  }
  const r = await db.query(
    `SELECT * FROM branches ${where} ORDER BY name ASC`,
    params
  );
  return r.rows;
}

async function getBranchById(id) {
  const r = await db.query(`SELECT * FROM branches WHERE id = $1`, [id]);
  return r.rows[0] || null;
}

async function getBranchBySlug(slug) {
  const r = await db.query(`SELECT * FROM branches WHERE slug = $1`, [slug]);
  return r.rows[0] || null;
}

async function createBranch(payload) {
  const slug = payload.slug || slugify(payload.name);
  const workingDays = normalizeWorkingDays(payload.working_days);
  const r = await db.query(
    `INSERT INTO branches (
      name, slug, address, contact_phone, contact_email, maps_url,
      working_days, opening_time, closing_time, slot_duration_minutes,
      is_active, image_url, default_slot_capacity
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,true),$12,COALESCE($13,1))
    RETURNING *`,
    [
      payload.name,
      slug,
      payload.address || '',
      payload.contact_phone || null,
      payload.contact_email || null,
      payload.maps_url || null,
      workingDays,
      payload.opening_time || '07:00',
      payload.closing_time || '21:00',
      payload.slot_duration_minutes || 30,
      payload.is_active,
      payload.image_url || null,
      payload.default_slot_capacity != null ? parseInt(payload.default_slot_capacity, 10) : 1
    ]
  );
  return r.rows[0];
}

async function updateBranch(id, payload) {
  const existing = await getBranchById(id);
  if (!existing) return null;

  const workingDays =
    payload.working_days !== undefined
      ? normalizeWorkingDays(payload.working_days, existing.working_days)
      : null;

  const r = await db.query(
    `UPDATE branches SET
      name = COALESCE($2, name),
      slug = COALESCE($3, slug),
      address = COALESCE($4, address),
      contact_phone = COALESCE($5, contact_phone),
      contact_email = COALESCE($6, contact_email),
      maps_url = COALESCE($7, maps_url),
      working_days = COALESCE($8, working_days),
      opening_time = COALESCE($9, opening_time),
      closing_time = COALESCE($10, closing_time),
      slot_duration_minutes = COALESCE($11, slot_duration_minutes),
      is_active = COALESCE($12, is_active),
      image_url = COALESCE($13, image_url),
      default_slot_capacity = COALESCE($14, default_slot_capacity),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *`,
    [
      id,
      payload.name ?? null,
      payload.slug ?? null,
      payload.address ?? null,
      payload.contact_phone ?? null,
      payload.contact_email ?? null,
      payload.maps_url ?? null,
      workingDays,
      payload.opening_time ?? null,
      payload.closing_time ?? null,
      payload.slot_duration_minutes ?? null,
      typeof payload.is_active === 'boolean' ? payload.is_active : null,
      payload.image_url !== undefined ? payload.image_url : null,
      payload.default_slot_capacity != null
        ? parseInt(payload.default_slot_capacity, 10)
        : null
    ]
  );
  return r.rows[0];
}

module.exports = {
  slugify,
  normalizeWorkingDays,
  listBranches,
  getBranchById,
  getBranchBySlug,
  createBranch,
  updateBranch
};
