import mongoose from '../server/node_modules/mongoose/index.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../server/models/User.js';
import SiteContent from '../server/models/SiteContent.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config({ path: path.resolve(__dirname, '../env/backend.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/family_library';

const INITIAL_ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL || 'muhammedzamil38@gmail.com';
const INITIAL_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || '12345678';

async function seed() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000, socketTimeoutMS: 15000, maxPoolSize: 5 });
    console.log('Ping successful');

    // 1. Seed Administrator
    const adminExists = await User.findOne({ email: INITIAL_ADMIN_EMAIL.toLowerCase() });
    if (!adminExists) {
      console.log('Seeding initial admin user...');
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(INITIAL_ADMIN_PASSWORD, saltRounds);

      const adminUser = new User({
        name: 'Family Administrator',
        email: INITIAL_ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        role: 'admin'
      });
      await adminUser.save();
      console.log(`Initial admin user created: ${INITIAL_ADMIN_EMAIL}`);
    } else {
      console.log('Admin user already exists. Skipping seeding of admin user.');
    }

    // 2. Seed Site Content: Hero Section
    const heroContent = await SiteContent.findOne({ key: 'hero' });
    if (!heroContent) {
      console.log('Seeding default Hero site content...');
      const defaultHero = new SiteContent({
        key: 'hero',
        value: {
          imagePath: '',
          altText: 'A landscape of our heritage lands',
          title: 'The Family Archive',
          subtitle: 'Preserving our history, library, and members for generations.',
          ctaLabel: 'Explore Collection',
          ctaDestination: '/collection'
        }
      });
      await defaultHero.save();
      console.log('Default Hero content seeded.');
    } else {
      console.log('Hero content already exists. Skipping.');
    }

    // 3. Seed Site Content: Qualities
    const qualitiesContent = await SiteContent.findOne({ key: 'qualities' });
    if (!qualitiesContent) {
      console.log('Seeding default Qualities...');
      const defaultQualities = new SiteContent({
        key: 'qualities',
        value: [
          {
            id: 'quality-1',
            title: 'Unity',
            description: 'We believe in supporting one another, standing together through all challenges, and celebrating our shared journey.',
            iconName: 'Users',
            displayOrder: 1,
            isVisible: true
          },
          {
            id: 'quality-2',
            title: 'Learning',
            description: 'A dedication to education, historical knowledge, curiosity, and reading that builds a bridge to our future.',
            iconName: 'BookOpen',
            displayOrder: 2,
            isVisible: true
          },
          {
            id: 'quality-3',
            title: 'Legacy',
            description: 'Preserving the wisdom, values, photographs, and records left to us by our ancestors as a guiding light.',
            iconName: 'History',
            displayOrder: 3,
            isVisible: true
          }
        ]
      });
      await defaultQualities.save();
      console.log('Default Qualities seeded.');
    } else {
      console.log('Qualities already exist. Skipping.');
    }

    // 4. Seed Site Content: About Us
    const aboutContent = await SiteContent.findOne({ key: 'about' });
    if (!aboutContent) {
      console.log('Seeding default About Us story...');
      const defaultAbout = new SiteContent({
        key: 'about',
        value: {
          text: 'Welcome to our Family Library & Heritage website. This digital archive was established to collect, preserve, and showcase our family\'s documents, books, and tree. Here you will find rare books, manuscripts, photographs, and detailed accounts of our ancestry. We hope this archive serves as a central hub where family members near and far can connect with our shared history and build a legacy for future generations.'
        }
      });
      await defaultAbout.save();
      console.log('Default About Us text seeded.');
    } else {
      console.log('About Us text already exists. Skipping.');
    }

    // 5. Seed Site Content: Settings (Theme default option)
    const settingsContent = await SiteContent.findOne({ key: 'settings' });
    if (!settingsContent) {
      console.log('Seeding default Settings...');
      const defaultSettings = new SiteContent({
        key: 'settings',
        value: {
          defaultTheme: 'light' // Default site theme, user selection overrides this in localStorage
        }
      });
      await defaultSettings.save();
      console.log('Default Settings seeded.');
    } else {
      console.log('Settings already exist. Skipping.');
    }

    console.log('Seeding script completed successfully.');
  } catch (error) {
    console.error('Error during database seeding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

seed();
