/**
 * Shared Cloudinary image upload/destroy helper.
 * All Admin CMS modules must use this — never persist local disk paths.
 */
const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

const FOLDER_ROOT = process.env.CLOUDINARY_FOLDER_ROOT || 'kolkata-bike-training';

/** Canonical subfolders under kolkata-bike-training/ */
const CLOUDINARY_FOLDERS = Object.freeze({
  gallery: 'gallery',
  blogs: 'blogs',
  courses: 'courses',
  testimonials: 'testimonials',
  banner: 'banner',
  branches: 'branches',
  settings: 'settings',
  trainers: 'trainers',
  vehicles: 'vehicles',
  receipts: 'receipts'
});

const RECEIPT_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

function folderPath(key) {
  const sub = CLOUDINARY_FOLDERS[key] || key || 'misc';
  return `${FOLDER_ROOT}/${sub}`.replace(/\/+/g, '/');
}

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

let configured = false;

function getConfigStatus() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME || '';
  const api_key = process.env.CLOUDINARY_API_KEY || '';
  const api_secret = process.env.CLOUDINARY_API_SECRET || '';
  const missing = [];
  if (!cloud_name) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!api_key) missing.push('CLOUDINARY_API_KEY');
  if (!api_secret) missing.push('CLOUDINARY_API_SECRET');
  return {
    ok: missing.length === 0,
    missing,
    cloud_name: cloud_name || null
  };
}

function configureCloudinary() {
  const status = getConfigStatus();
  if (!status.ok) {
    configured = false;
    return status;
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  configured = true;
  return status;
}

/** Call once at server startup. Throws if required env vars are missing. */
function assertCloudinaryConfigured() {
  const status = configureCloudinary();
  if (!status.ok) {
    const err = new Error(
      `Cloudinary is not configured. Missing: ${status.missing.join(', ')}`
    );
    err.code = 'CLOUDINARY_CONFIG';
    throw err;
  }
  console.log(`[cloudinary] configured cloud_name=${status.cloud_name} folder_root=${FOLDER_ROOT}`);
  return status;
}

function ensureConfigured() {
  if (configured) return;
  const status = configureCloudinary();
  if (!status.ok) {
    const err = new Error(
      `Cloudinary is not configured. Missing: ${status.missing.join(', ')}`
    );
    err.status = 503;
    err.code = 'CLOUDINARY_CONFIG';
    err.errorCode = 'CLOUDINARY_CONFIG';
    throw err;
  }
}

function maxBytesFor(envKey) {
  return parseInt(process.env[envKey] || String(DEFAULT_MAX_BYTES), 10);
}

function isAllowedMime(mime) {
  return ALLOWED_MIME.has(mime);
}

/**
 * True when URL is a Cloudinary secure HTTPS URL for our cloud.
 * Also accepts any https://res.cloudinary.com/... URL.
 */
function isCloudinaryUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' && /(^|\.)res\.cloudinary\.com$/i.test(u.hostname);
  } catch {
    return false;
  }
}

/** Reject local / relative / localhost image paths that must never be stored. */
function isForbiddenLocalImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const v = url.trim();
  if (!v) return false;
  if (v.startsWith('/api/') || v.startsWith('/media/') || v.startsWith('uploads/') || v.startsWith('/uploads/')) {
    return true;
  }
  if (v.startsWith('file:') || v.includes('\\')) return true;
  try {
    const u = new URL(v);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
  } catch {
    // relative path
    if (!/^https?:\/\//i.test(v)) return true;
  }
  return false;
}

/**
 * Extract Cloudinary public_id from a secure_url.
 * Example:
 *  https://res.cloudinary.com/demo/image/upload/v123/kolkata-bike-training/gallery/abc.webp
 *  → kolkata-bike-training/gallery/abc
 */
function extractPublicId(url) {
  if (!isCloudinaryUrl(url)) return null;
  try {
    const u = new URL(url.trim());
    const marker = '/upload/';
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    let rest = u.pathname.slice(idx + marker.length);
    // Strip transformation segments and version (v123456)
    const parts = rest.split('/').filter(Boolean);
    let start = 0;
    while (start < parts.length) {
      const p = parts[start];
      if (/^v\d+$/i.test(p)) {
        start += 1;
        break;
      }
      // transformation segment (contains _ or ,) — skip until version or asset path
      if (p.includes(',') || (p.includes('_') && !p.includes('.'))) {
        start += 1;
        continue;
      }
      break;
    }
    const idParts = parts.slice(start);
    if (!idParts.length) return null;
    const last = idParts[idParts.length - 1];
    idParts[idParts.length - 1] = last.replace(/\.[a-z0-9]+$/i, '');
    return idParts.join('/');
  } catch {
    return null;
  }
}

function unlinkQuiet(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
}

/**
 * Upload an image file (multer disk or memory) to Cloudinary.
 * @param {object} file - multer file ({ path } or { buffer, mimetype, originalname })
 * @param {{ folder: string, maxBytes?: number }} options
 * @returns {Promise<{ secure_url: string, public_id: string, bytes: number, format: string, width?: number, height?: number }>}
 */
async function uploadImage(file, options = {}) {
  ensureConfigured();

  if (!file) {
    const err = new Error('Image file is required');
    err.status = 400;
    err.errorCode = 'IMAGE_REQUIRED';
    throw err;
  }

  const mime = file.mimetype || '';
  if (!isAllowedMime(mime)) {
    unlinkQuiet(file.path);
    const err = new Error('Only JPEG, PNG, WebP, or GIF images are allowed');
    err.status = 400;
    err.errorCode = 'INVALID_IMAGE_TYPE';
    throw err;
  }

  const maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;
  const size = file.size || (file.buffer ? file.buffer.length : 0);
  if (size && size > maxBytes) {
    unlinkQuiet(file.path);
    const err = new Error(`Image too large. Maximum size is ${Math.round(maxBytes / (1024 * 1024))}MB`);
    err.status = 400;
    err.errorCode = 'IMAGE_TOO_LARGE';
    throw err;
  }

  const folder = folderPath(options.folder || 'misc');
  console.log(`[cloudinary] upload started folder=${folder} mime=${mime} size=${size || 'unknown'}`);

  try {
    let result;
    if (file.buffer) {
      result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
            overwrite: false,
            unique_filename: true,
            use_filename: false
          },
          (err, res) => (err ? reject(err) : resolve(res))
        );
        stream.end(file.buffer);
      });
    } else if (file.path) {
      result = await cloudinary.uploader.upload(file.path, {
        folder,
        resource_type: 'image',
        overwrite: false,
        unique_filename: true,
        use_filename: false
      });
    } else {
      const err = new Error('Invalid upload file payload');
      err.status = 400;
      err.errorCode = 'IMAGE_REQUIRED';
      throw err;
    }

    unlinkQuiet(file.path);

    if (!result?.secure_url || !result?.public_id) {
      const err = new Error('Cloudinary upload did not return secure_url');
      err.status = 502;
      err.errorCode = 'CLOUDINARY_UPLOAD_FAILED';
      throw err;
    }

    console.log(
      `[cloudinary] upload completed public_id=${result.public_id} secure_url=${result.secure_url} bytes=${result.bytes}`
    );

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      bytes: result.bytes,
      format: result.format,
      width: result.width,
      height: result.height
    };
  } catch (err) {
    unlinkQuiet(file.path);
    console.error('[cloudinary] upload failed:', err?.message || err);
    if (err.http_code === 401 || /Invalid API Key|unauthorized/i.test(err.message || '')) {
      err.status = 503;
      err.errorCode = 'CLOUDINARY_AUTH_FAILED';
    } else if (!err.status) {
      err.status = 502;
      err.errorCode = err.errorCode || 'CLOUDINARY_UPLOAD_FAILED';
    }
    throw err;
  }
}

/**
 * Upload a payment receipt (JPEG/PNG/WebP/PDF) to Cloudinary.
 * Uses resource_type=auto so PDFs work alongside images.
 */
async function uploadReceipt(file, options = {}) {
  ensureConfigured();

  if (!file) {
    const err = new Error('Receipt file is required');
    err.status = 400;
    err.errorCode = 'RECEIPT_REQUIRED';
    throw err;
  }

  const mime = file.mimetype || '';
  if (!RECEIPT_ALLOWED_MIME.has(mime)) {
    unlinkQuiet(file.path);
    const err = new Error('Only JPEG, PNG, WebP, or PDF receipts are allowed');
    err.status = 400;
    err.errorCode = 'INVALID_RECEIPT_TYPE';
    throw err;
  }

  const maxBytes = options.maxBytes || maxBytesFor('RECEIPT_MAX_BYTES');
  const size = file.size || (file.buffer ? file.buffer.length : 0);
  if (size && size > maxBytes) {
    unlinkQuiet(file.path);
    const err = new Error(
      `Receipt too large. Maximum size is ${Math.round(maxBytes / (1024 * 1024))}MB`
    );
    err.status = 400;
    err.errorCode = 'RECEIPT_TOO_LARGE';
    throw err;
  }

  const folder = folderPath(options.folder || 'receipts');
  console.log(`[cloudinary] receipt upload started folder=${folder} mime=${mime} size=${size || 'unknown'}`);

  try {
    let result;
    const uploadOpts = {
      folder,
      resource_type: 'auto',
      overwrite: false,
      unique_filename: true,
      use_filename: false,
      type: 'upload'
    };
    if (file.buffer) {
      result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(uploadOpts, (err, res) =>
          err ? reject(err) : resolve(res)
        );
        stream.end(file.buffer);
      });
    } else if (file.path) {
      result = await cloudinary.uploader.upload(file.path, uploadOpts);
    } else {
      const err = new Error('Invalid receipt file payload');
      err.status = 400;
      err.errorCode = 'RECEIPT_REQUIRED';
      throw err;
    }

    unlinkQuiet(file.path);

    if (!result?.secure_url) {
      const err = new Error('Cloudinary receipt upload did not return secure_url');
      err.status = 502;
      err.errorCode = 'CLOUDINARY_UPLOAD_FAILED';
      throw err;
    }

    console.log(
      `[cloudinary] receipt upload completed public_id=${result.public_id} url=${result.secure_url}`
    );

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      bytes: result.bytes,
      format: result.format,
      resource_type: result.resource_type
    };
  } catch (err) {
    unlinkQuiet(file.path);
    console.error('[cloudinary] receipt upload failed:', err?.message || err);
    if (!err.status) {
      err.status = 502;
      err.errorCode = err.errorCode || 'CLOUDINARY_UPLOAD_FAILED';
    }
    throw err;
  }
}

/**
 * Delete a Cloudinary asset by secure_url or public_id.
 * Safe no-op for non-Cloudinary URLs.
 */
async function destroyImage(urlOrPublicId) {
  if (!urlOrPublicId) return { result: 'skipped' };
  ensureConfigured();

  const publicId = isCloudinaryUrl(urlOrPublicId)
    ? extractPublicId(urlOrPublicId)
    : String(urlOrPublicId).trim();

  if (!publicId) {
    console.log(`[cloudinary] destroy skipped (not a cloudinary asset): ${String(urlOrPublicId).slice(0, 80)}`);
    return { result: 'skipped' };
  }

  try {
    console.log(`[cloudinary] destroy started public_id=${publicId}`);
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    console.log(`[cloudinary] destroy completed public_id=${publicId} result=${result?.result}`);
    return result;
  } catch (err) {
    console.error(`[cloudinary] destroy failed public_id=${publicId}:`, err?.message || err);
    return { result: 'error', error: err?.message };
  }
}

/**
 * If the image URL changed and the old one was Cloudinary, destroy the old asset.
 */
async function replaceImage(oldUrl, newUrl) {
  if (!oldUrl || oldUrl === newUrl) return;
  // Destroy old Cloudinary asset when replaced or cleared
  if (!isCloudinaryUrl(oldUrl)) return;
  await destroyImage(oldUrl);
}

/**
 * Resolve next image URL on update.
 * - undefined → keep existing
 * - same as existing → keep (allows legacy /media until re-uploaded)
 * - new value → must be Cloudinary HTTPS secure_url (or empty if allowEmpty)
 */
function resolveUpdatedImageUrl(newVal, oldVal, { allowEmpty = true } = {}) {
  if (newVal === undefined) return oldVal ?? null;
  if (newVal === oldVal) return oldVal ?? null;
  if (newVal == null || newVal === '') {
    return assertPersistableImageUrl(null, { allowEmpty });
  }
  return assertPersistableImageUrl(newVal, { allowEmpty });
}

/**
 * Validate a URL that will be persisted as an image field.
 * Allows empty/null; rejects local paths; requires HTTPS (Cloudinary secure_url).
 */
function assertPersistableImageUrl(url, { allowEmpty = true } = {}) {
  if (url == null || url === '') {
    if (allowEmpty) return null;
    const err = new Error('Image URL is required');
    err.status = 400;
    err.errorCode = 'IMAGE_REQUIRED';
    throw err;
  }
  const v = String(url).trim();
  if (isForbiddenLocalImageUrl(v)) {
    const err = new Error(
      'Local image paths are not allowed. Upload via Admin to Cloudinary and save the secure_url.'
    );
    err.status = 400;
    err.errorCode = 'INVALID_IMAGE_URL';
    throw err;
  }
  if (!/^https:\/\//i.test(v)) {
    const err = new Error('Image URL must be an HTTPS Cloudinary secure_url');
    err.status = 400;
    err.errorCode = 'INVALID_IMAGE_URL';
    throw err;
  }
  return v;
}

module.exports = {
  FOLDER_ROOT,
  CLOUDINARY_FOLDERS,
  folderPath,
  ALLOWED_MIME,
  DEFAULT_MAX_BYTES,
  getConfigStatus,
  configureCloudinary,
  assertCloudinaryConfigured,
  maxBytesFor,
  isAllowedMime,
  isCloudinaryUrl,
  isForbiddenLocalImageUrl,
  extractPublicId,
  uploadImage,
  uploadReceipt,
  RECEIPT_ALLOWED_MIME,
  destroyImage,
  replaceImage,
  resolveUpdatedImageUrl,
  assertPersistableImageUrl,
  unlinkQuiet
};

