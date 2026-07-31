require('dotenv').config();
const jwt = require('jsonwebtoken');
const db = require('../db');

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

(async () => {
  const admin = await db.query(
    `SELECT id FROM profiles WHERE role IN ('admin', 'superadmin') LIMIT 1`
  );
  const trainer = await db.query(`SELECT id FROM trainers LIMIT 1`);
  if (!trainer.rows[0]) {
    console.log('trainers: SKIP no trainer row');
    await db.pool.end();
    return;
  }
  const token = jwt.sign({ userId: admin.rows[0].id }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });
  const form = new FormData();
  form.append('image', new Blob([PNG], { type: 'image/png' }), 't.png');
  const res = await fetch(
    `http://127.0.0.1:3000/api/admin/trainers/${trainer.rows[0].id}/upload-image`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  const j = await res.json();
  const ok =
    res.status === 201 &&
    String(j.public_id || '').startsWith('kolkata-bike-training/trainers');
  console.log(
    ok
      ? `trainers: CLOUDINARY_OK ${j.public_id}`
      : `trainers: FAIL ${res.status} ${JSON.stringify(j).slice(0, 220)}`
  );
  await db.pool.end();
  if (!ok) process.exit(1);
})().catch(async (e) => {
  console.error(e);
  try {
    await db.pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
