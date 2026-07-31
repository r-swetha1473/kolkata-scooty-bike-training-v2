/**
 * Smoke-test Cloudinary upload endpoints for all CMS modules.
 * Usage: cd backend && node scripts/verify_cloudinary_api_uploads.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const jwt = require('jsonwebtoken');
const db = require('../db');

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function upload(modulePath, token, filePath) {
  const form = new FormData();
  const blob = new Blob([PNG], { type: 'image/png' });
  form.append('image', blob, 'uptest.png');
  const res = await fetch(`http://127.0.0.1:3000${modulePath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text };
}

(async () => {
  const admin = await db.query(
    `SELECT id, role FROM profiles WHERE role IN ('admin', 'superadmin') LIMIT 1`
  );
  if (!admin.rows[0]) {
    console.error('NO_ADMIN');
    process.exit(1);
  }
  const token = jwt.sign(
    { userId: admin.rows[0].id, email: 'verify@local' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const modules = [
    ['gallery', '/api/gallery/upload-image', 'kolkata-bike-training/gallery'],
    ['blogs', '/api/blogs/upload-image', 'kolkata-bike-training/blogs'],
    ['courses', '/api/courses/upload-image', 'kolkata-bike-training/courses'],
    ['testimonials', '/api/testimonials/upload-image', 'kolkata-bike-training/testimonials'],
    ['branches', '/api/branches/upload-image', 'kolkata-bike-training/branches'],
    ['banner', '/api/settings/upload-image', 'kolkata-bike-training/banner'],
    ['settings', '/api/settings/upload-logo', 'kolkata-bike-training/settings'],
    ['vehicles', '/api/vehicles/upload-image', 'kolkata-bike-training/vehicles']
  ];

  const tmp = path.join(os.tmpdir(), `uptest-${Date.now()}.png`);
  fs.writeFileSync(tmp, PNG);

  let failed = 0;
  for (const [name, route, folder] of modules) {
    const result = await upload(route, token, tmp);
    const url = result.json?.secure_url || result.json?.image_url || '';
    const publicId = result.json?.public_id || '';
    const folderOk = publicId.startsWith(folder + '/') || publicId.startsWith(folder);
    const ok =
      result.status === 201 &&
      /^https:\/\/res\.cloudinary\.com\//i.test(url) &&
      folderOk;
    if (ok) {
      console.log(`${name}: CLOUDINARY_OK folder=${folder} public_id=${publicId}`);
    } else {
      failed += 1;
      console.log(
        `${name}: FAIL status=${result.status} folderWanted=${folder} public_id=${publicId} body=${(result.text || '').slice(0, 220)}`
      );
    }
  }

  try {
    fs.unlinkSync(tmp);
  } catch {
    /* ignore */
  }
  await db.pool.end();
  if (failed) process.exit(1);
  console.log('ALL_MODULES_PASSED');
})().catch(async (err) => {
  console.error(err);
  try {
    await db.pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
