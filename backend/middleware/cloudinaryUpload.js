/**
 * Shared multer + Cloudinary upload middleware for Admin image uploads.
 * Usage:
 *   const { createImageUploader } = require('../middleware/cloudinaryUpload');
 *   const uploader = createImageUploader({ folder: 'gallery', maxBytesEnv: 'GALLERY_IMAGE_MAX_BYTES' });
 *   router.post('/upload-image', ...guards, uploader.middleware, uploader.handler);
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cloudinaryService = require('../services/cloudinary.service');
const { jsonError } = require('../utils/httpError');

const TMP_ROOT = path.join(os.tmpdir(), 'kolkata-bike-training-uploads');
fs.mkdirSync(TMP_ROOT, { recursive: true });

function createImageUploader({ folder, maxBytesEnv, fieldName = 'image' }) {
  const maxBytes = cloudinaryService.maxBytesFor(maxBytesEnv || 'IMAGE_MAX_BYTES');

  const upload = multer({
    dest: TMP_ROOT,
    limits: { fileSize: maxBytes },
    fileFilter: (req, file, cb) => {
      if (cloudinaryService.isAllowedMime(file.mimetype)) return cb(null, true);
      cb(new Error('Only JPEG, PNG, WebP, or GIF images are allowed'));
    }
  });

  const middleware = (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return jsonError(
            res,
            400,
            `Image too large. Maximum size is ${Math.round(maxBytes / (1024 * 1024))}MB`,
            'IMAGE_TOO_LARGE'
          );
        }
        return jsonError(res, 400, err.message || 'Upload failed', 'UPLOAD_ERROR');
      }
      return jsonError(res, 400, err.message || 'Invalid image', 'INVALID_IMAGE_TYPE');
    });
  };

  const handler = async (req, res, next) => {
    try {
      if (!req.file) {
        return jsonError(res, 400, 'Image file is required', 'IMAGE_REQUIRED');
      }

      const result = await cloudinaryService.uploadImage(req.file, {
        folder,
        maxBytes
      });

      // Always return secure_url only — never local paths
      res.status(201).json({
        image_url: result.secure_url,
        url: result.secure_url,
        secure_url: result.secure_url,
        public_id: result.public_id,
        bytes: result.bytes,
        format: result.format,
        width: result.width,
        height: result.height
      });
    } catch (err) {
      cloudinaryService.unlinkQuiet(req.file?.path);
      if (err.status) {
        return jsonError(res, err.status, err.message, err.errorCode || 'CLOUDINARY_UPLOAD_FAILED');
      }
      next(err);
    }
  };

  return { middleware, handler, maxBytes, folder };
}

module.exports = { createImageUploader, TMP_ROOT };
