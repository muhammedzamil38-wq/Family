import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve upload base dir relative to the server directory (not process.cwd())
const getBaseUploadDir = () => {
  const envDir = process.env.UPLOAD_DIR;
  if (envDir && path.isAbsolute(envDir)) {
    return envDir;
  }
  // Relative path: resolve from server root (one level above this middleware file)
  const serverRoot = path.resolve(__dirname, '..');
  return path.join(serverRoot, envDir || 'uploads');
};

// Helper to determine destination folder dynamically based on field names
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const baseUploadDir = getBaseUploadDir();
    let targetDir = baseUploadDir;

    if (file.fieldname === 'pdf') {
      targetDir = path.join(baseUploadDir, 'pdfs');
    } else if (file.fieldname === 'image' || file.fieldname === 'portrait') {
      targetDir = path.join(baseUploadDir, 'images');
    } else if (file.fieldname === 'photo') {
      targetDir = path.join(baseUploadDir, 'photos');
    }

    // Ensure the destination subdirectory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${fileExt}`);
  }
});

// Enforce type restrictions at multer level
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'pdf') {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only PDF files are allowed for books.'), false);
    }
  } else if (file.fieldname === 'image' || file.fieldname === 'portrait') {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only JPEG, PNG, and WEBP images are allowed.'), false);
    }
  } else if (file.fieldname === 'photo') {
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Gallery uploads must be JPEG, PNG, WEBP, MP4, WEBM, MOV, or AVI files.'), false);
    }
  } else {
    cb(new Error(`Unexpected upload field: ${file.fieldname}`), false);
  }
};

const maxPdfSizeBytes = (parseInt(process.env.MAX_PDF_UPLOAD_MB) || 25) * 1024 * 1024;
const maxImageSizeBytes = (parseInt(process.env.MAX_IMAGE_UPLOAD_MB) || 10) * 1024 * 1024;
const maxVideoSizeBytes = (parseInt(process.env.MAX_VIDEO_UPLOAD_MB) || 100) * 1024 * 1024;

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Math.max(maxPdfSizeBytes, maxImageSizeBytes)
  }
});

// Gallery photos are sent to Cloudinary and do not need a local disk copy.
export const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: Math.max(maxImageSizeBytes, maxVideoSizeBytes)
  }
});

export const uploadHero = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: maxImageSizeBytes
  }
});

export const uploadPortrait = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: maxImageSizeBytes
  }
});

/**
 * Middleware to enforce strict, granular file size limits.
 * Deletes uploaded file from disk if it violates size guidelines.
 */
export function checkUploadLimits(req, res, next) {
  if (req.file) {
    const file = req.file;

    if (file.fieldname === 'pdf' && file.size > maxPdfSizeBytes) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({
        message: 'Validation error',
        errors: [`PDF upload size exceeds the maximum limit of ${process.env.MAX_PDF_UPLOAD_MB || 25}MB`]
      });
    }

    const maxAllowedBytes = file.fieldname === 'photo' && file.mimetype.startsWith('video/')
      ? maxVideoSizeBytes
      : maxImageSizeBytes;
    if ((file.fieldname === 'image' || file.fieldname === 'portrait' || file.fieldname === 'photo') && file.size > maxAllowedBytes) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({
        message: 'Validation error',
        errors: [`Upload size exceeds the maximum limit of ${file.mimetype.startsWith('video/') ? process.env.MAX_VIDEO_UPLOAD_MB || 100 : process.env.MAX_IMAGE_UPLOAD_MB || 10}MB`]
      });
    }
  }
  next();
}
