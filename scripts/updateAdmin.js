import mongoose from '../server/node_modules/mongoose/index.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../server/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables (admin credentials, DB URI)
dotenv.config({ path: path.resolve(__dirname, '../env/backend.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/family_library';
const NEW_ADMIN_EMAIL = (process.env.INITIAL_ADMIN_EMAIL || '').toLowerCase();
const NEW_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || '';

async function updateAdmin() {
  console.log('🟢 Starting admin‑update script');
  if (!NEW_ADMIN_EMAIL || !NEW_ADMIN_PASSWORD) {
    console.error('❌ Admin credentials missing in backend.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 20000,
      maxPoolSize: 5,
    });
    console.log('✅ MongoDB connection established');
  } catch (connErr) {
    console.error('❌ Failed to connect to MongoDB:', connErr.message);
    process.exit(1);
  }

  // Hash the new password
  const passwordHash = await bcrypt.hash(NEW_ADMIN_PASSWORD, 10);

  // Try to update any existing admin user(s)
  const result = await User.updateMany(
    { role: 'admin' },
    { $set: { email: NEW_ADMIN_EMAIL, passwordHash, name: 'Family Administrator' } }
  );
  console.log(`👤 Admin users matched: ${result.matchedCount}, modified: ${result.modifiedCount}`);

  // If no admin existed, create one
  if (result.matchedCount === 0) {
    const admin = new User({
      name: 'Family Administrator',
      email: NEW_ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
    });
    await admin.save();
    console.log('🆕 Created new admin user');
  }

  await mongoose.disconnect();
  console.log('🔌 MongoDB disconnected');
  console.log('✅ Admin‑update script completed');
  process.exit(0);
}

updateAdmin().catch(err => {
  console.error('❗ Unexpected error:', err);
  process.exit(1);
});
