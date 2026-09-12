import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../env/backend.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/family_library';
const newAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || '').toLowerCase();
const newAdminPassword = process.env.INITIAL_ADMIN_PASSWORD || '';

async function updateAdmin() {
  if (!newAdminEmail || !newAdminPassword) {
    console.error('Admin credentials missing in server/env/backend.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 20000,
      maxPoolSize: 5
    });
    console.log('MongoDB connection established');

    const passwordHash = await bcrypt.hash(newAdminPassword, 10);
    const result = await User.updateMany(
      { role: 'admin' },
      { $set: { email: newAdminEmail, passwordHash, name: 'Family Administrator' } }
    );

    console.log(`Admin users matched: ${result.matchedCount}, modified: ${result.modifiedCount}`);
    if (result.matchedCount === 0) {
      await new User({
        name: 'Family Administrator',
        email: newAdminEmail,
        passwordHash,
        role: 'admin'
      }).save();
      console.log('Created new admin user');
    }
  } catch (error) {
    console.error('Admin update failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

updateAdmin();
