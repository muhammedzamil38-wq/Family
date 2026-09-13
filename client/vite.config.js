import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local client variables while allowing Vercel environment variables to win.
const localEnv = dotenv.config({ path: path.resolve(__dirname, 'frontend.env') }).parsed || {};
const getEnv = (name) => process.env[name] || process.env[`VITE_${name}`] || localEnv[name] || localEnv[`VITE_${name}`] || '';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.API_BASE_URL': JSON.stringify(getEnv('API_BASE_URL') || 'http://localhost:5000'),
    'import.meta.env.APP_NAME': JSON.stringify(getEnv('APP_NAME') || 'Family Library & Heritage'),
    'import.meta.env.EMAILJS_PUBLIC_KEY': JSON.stringify(getEnv('EMAILJS_PUBLIC_KEY')),
    'import.meta.env.EMAILJS_SERVICE_ID': JSON.stringify(getEnv('EMAILJS_SERVICE_ID')),
    'import.meta.env.EMAILJS_TEMPLATE_ID': JSON.stringify(getEnv('EMAILJS_TEMPLATE_ID')),
  },
  server: {
    port: 5173,
    host: true,
  }
});
