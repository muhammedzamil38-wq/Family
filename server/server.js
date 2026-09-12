import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import Route Controllers
import { requestOtp, verifyOtp, resendOtp, logout, me } from './controllers/authController.js';
import {
  getSiteContent,
  getPublishedBooks,
  getBookBySlug,
  streamBookPdf,
  getVisibleFamily,
  getPublicPhotos,
  getPublicPhotoById
} from './controllers/publicController.js';
import {
  getDashboardStats,
  getAllBooks,
  createBook,
  updateBook,
  updateBookStatus,
  deleteBook,
  getAllFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  getAdminSiteContent,
  updateAdminSiteContent,
  getAllPhotos,
  createPhoto,
  updatePhoto,
  updatePhotoVisibility,
  deletePhoto
} from './controllers/adminController.js';

// Import Middleware
import { requireAdmin } from './middleware/auth.js';
import { upload, checkUploadLimits } from './middleware/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load server-owned configuration.
dotenv.config({ path: path.resolve(__dirname, 'env/backend.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';
const MONGODB_URI = process.env.MONGODB_URI || (isProduction ? '' : 'mongodb://mongo:27017/family_library');
const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback_session_secret_12345';

// 1. Database Connection
let databaseConnection;

function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }

  if (!databaseConnection) {
    if (!MONGODB_URI) {
      return Promise.reject(new Error('MONGODB_URI is not configured.'));
    }

    console.log('Connecting to MongoDB');
    databaseConnection = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10
    }).then(() => {
      console.log('Successfully connected to MongoDB.');
    }).catch((error) => {
      databaseConnection = null;
      console.error('Failed to connect to MongoDB:', error.message);
      throw error;
    });
  }

  return databaseConnection;
}

// 2. CORS Policy Configuration
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Request Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ service: 'family-heritage-api', status: 'running' });
});

// Vercel may invoke the function before MongoDB is connected.
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    res.status(503).json({
      message: 'Database unavailable',
      errors: ['The server could not connect to MongoDB.']
    });
  }
});

// 4. Session Configuration (using MongoStore for persistent sessions)
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  ...(MONGODB_URI ? {
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      collectionName: 'sessions',
      ttl: 14 * 24 * 60 * 60 // Sessions expire in 14 days
    })
  } : {}),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 Day session expiry
  }
}));

// 5. Safe Static Asset Exposure
// Serve cover thumbnails, general images (portraits), and vintage gallery photos publicly
// Always resolve upload dir relative to server directory for local and Docker parity
const baseUploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
app.use('/uploads/covers', express.static(path.join(baseUploadDir, 'covers')));
app.use('/uploads/images', express.static(path.join(baseUploadDir, 'images')));
app.use('/uploads/photos', express.static(path.join(baseUploadDir, 'photos')));

// NOTE: We DO NOT statically serve uploads/pdfs.
// All PDFs are requested and streamed dynamically via streamBookPdf after verifying status.

/* =========================================================================
   API ROUTES
   ========================================================================= */

// --- Liveness/Health Endpoint ---
app.get('/api/v1/health', async (req, res) => {
  try {
    // Attempt ping to confirm Mongoose/MongoDB connection is ready
    if (mongoose.connection.readyState === 1) {
      return res.json({ status: 'healthy', database: 'connected' });
    }
    throw new Error('Database is in disconnecting/disconnected state.');
  } catch (err) {
    console.error('Healthcheck failed:', err.message);
    return res.status(503).json({ status: 'unhealthy', error: 'Database unreachable' });
  }
});

// --- Public Authentication Routes ---
app.post('/api/v1/auth/login', requestOtp);
app.post('/api/v1/auth/request-otp', requestOtp);
app.post('/api/v1/auth/verify-otp', verifyOtp);
app.post('/api/v1/auth/resend-otp', resendOtp);
app.post('/api/v1/auth/logout', logout);
app.get('/api/v1/auth/me', me);

// --- Public Site Content, Archives & Gallery ---
app.get('/api/v1/public/site-content', getSiteContent);
app.get('/api/v1/public/books', getPublishedBooks);
app.get('/api/v1/public/books/:slug', getBookBySlug);
app.get('/api/v1/public/books/pdf/:slug', streamBookPdf); // Secure stream endpoint
app.get('/api/v1/public/family', getVisibleFamily);
app.get('/api/v1/public/photos', getPublicPhotos);
app.get('/api/v1/public/photos/:id', getPublicPhotoById);

// --- Administrative CMS Routes (Protected) ---
app.get('/api/v1/admin/dashboard', requireAdmin, getDashboardStats);

// Books Management
app.get('/api/v1/admin/books', requireAdmin, getAllBooks);
app.post('/api/v1/admin/books', requireAdmin, upload.single('pdf'), checkUploadLimits, createBook);
app.patch('/api/v1/admin/books/:id', requireAdmin, upload.single('pdf'), checkUploadLimits, updateBook);
app.patch('/api/v1/admin/books/:id/status', requireAdmin, updateBookStatus);
app.delete('/api/v1/admin/books/:id', requireAdmin, deleteBook);

// Family Tree Management
app.get('/api/v1/admin/family-members', requireAdmin, getAllFamilyMembers);
app.post('/api/v1/admin/family-members', requireAdmin, upload.single('portrait'), checkUploadLimits, createFamilyMember);
app.patch('/api/v1/admin/family-members/:id', requireAdmin, upload.single('portrait'), checkUploadLimits, updateFamilyMember);
app.delete('/api/v1/admin/family-members/:id', requireAdmin, deleteFamilyMember);

// Photo Gallery Management
app.get('/api/v1/admin/photos', requireAdmin, getAllPhotos);
app.post('/api/v1/admin/photos', requireAdmin, upload.single('photo'), checkUploadLimits, createPhoto);
app.patch('/api/v1/admin/photos/:id', requireAdmin, upload.single('photo'), checkUploadLimits, updatePhoto);
app.patch('/api/v1/admin/photos/:id/visibility', requireAdmin, updatePhotoVisibility);
app.delete('/api/v1/admin/photos/:id', requireAdmin, deletePhoto);

// Site Content Customizations
app.get('/api/v1/admin/site-content/:key', requireAdmin, getAdminSiteContent);
app.patch('/api/v1/admin/site-content/:key', requireAdmin, upload.single('image'), checkUploadLimits, updateAdminSiteContent);

// --- Global Error Handler (Hides server stacktraces from client) ---
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  return res.status(err.status || 500).json({
    message: 'An unexpected server error occurred.',
    errors: process.env.NODE_ENV === 'development' ? [err.message] : []
  });
});

// Start listening locally; Vercel uses the exported Express app as its handler.
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Express API Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Authorized origin: ${FRONTEND_URL}`);
  });
}

export default app;
