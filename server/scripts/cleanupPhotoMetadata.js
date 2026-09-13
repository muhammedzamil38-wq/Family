import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Photo from '../models/Photo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../backend.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/family_library';
const removedFields = {
  year: '',
  decade: '',
  location: '',
  peopleInPhoto: '',
  tags: '',
  displayOrder: '',
  isFeatured: ''
};

try {
  await mongoose.connect(MONGODB_URI);
  const result = await Photo.updateMany({}, { $unset: removedFields });
  console.log(`Removed deprecated fields from ${result.modifiedCount} photo record(s).`);
} finally {
  await mongoose.disconnect();
}
