/**
 * Verify Cloudinary config + upload a tiny test image.
 * Usage: cd backend && node scripts/verify_cloudinary_upload.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const cloudinaryService = require('../services/cloudinary.service');

async function main() {
  cloudinaryService.assertCloudinaryConfigured();

  // 1x1 PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const tmp = path.join(os.tmpdir(), `cloudinary-verify-${Date.now()}.png`);
  fs.writeFileSync(tmp, png);

  try {
    const result = await cloudinaryService.uploadImage(
      { path: tmp, mimetype: 'image/png', size: png.length },
      { folder: 'verify' }
    );
    console.log('UPLOAD_OK', {
      secure_url: result.secure_url,
      public_id: result.public_id
    });
    if (!/^https:\/\/res\.cloudinary\.com\//i.test(result.secure_url)) {
      throw new Error('secure_url is not a Cloudinary HTTPS URL');
    }
    const destroyed = await cloudinaryService.destroyImage(result.secure_url);
    console.log('DESTROY_OK', destroyed);
    console.log('VERIFY_PASSED');
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

main().catch((err) => {
  console.error('VERIFY_FAILED', err.message || err);
  process.exit(1);
});
