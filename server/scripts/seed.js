import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import SiteContent from '../models/SiteContent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../env/backend.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/family_library';
const INITIAL_ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL || 'admin@family.local';
const INITIAL_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || 'change_this_secure_password';

async function seed() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000, socketTimeoutMS: 15000, maxPoolSize: 5 });
    console.log('Ping successful');

    const adminExists = await User.findOne({ email: INITIAL_ADMIN_EMAIL.toLowerCase() });
    if (!adminExists) {
      const passwordHash = await bcrypt.hash(INITIAL_ADMIN_PASSWORD, 10);
      await new User({
        name: 'Family Administrator',
        email: INITIAL_ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        role: 'admin'
      }).save();
      console.log(`Initial admin user created: ${INITIAL_ADMIN_EMAIL}`);
    } else {
      console.log('Admin user already exists. Skipping seeding of admin user.');
    }

    const defaults = [
      {
        key: 'hero',
        value: {
          imagePath: '',
          altText: 'A landscape of our heritage lands',
          title: 'The Family Archive',
          subtitle: 'Preserving our history, library, and members for generations.',
          ctaLabel: 'Explore Collection',
          ctaDestination: '/collection'
        }
      },
      {
        key: 'qualities',
        value: [
          { id: 'quality-1', title: 'Unity', description: 'We believe in supporting one another, standing together through all challenges, and celebrating our shared journey.', iconName: 'Users', displayOrder: 1, isVisible: true },
          { id: 'quality-2', title: 'Learning', description: 'A dedication to education, historical knowledge, curiosity, and reading that builds a bridge to our future.', iconName: 'BookOpen', displayOrder: 2, isVisible: true },
          { id: 'quality-3', title: 'Legacy', description: 'Preserving the wisdom, values, photographs, and records left to us by our ancestors as a guiding light.', iconName: 'History', displayOrder: 3, isVisible: true }
        ]
      },
      {
        key: 'about',
        value: {
          text: "Welcome to our Family Library & Heritage website. This digital archive was established to collect, preserve, and showcase our family's documents, books, and tree. Here you will find rare books, manuscripts, photographs, and detailed accounts of our ancestry."
        }
      },
      { key: 'settings', value: { defaultTheme: 'light' } }
    ];

    for (const entry of defaults) {
      if (!(await SiteContent.findOne({ key: entry.key }))) {
        await new SiteContent(entry).save();
        console.log(`Default ${entry.key} content seeded.`);
      } else {
        console.log(`${entry.key} content already exists. Skipping.`);
      }
    }

    console.log('Seeding script completed successfully.');
  } catch (error) {
    console.error('Error during database seeding:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

seed();
