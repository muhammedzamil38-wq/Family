import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load client-owned environment variables.
dotenv.config({ path: path.resolve(__dirname, 'frontend.env') });

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL || 'http://localhost:5000'),
    'import.meta.env.APP_NAME': JSON.stringify(process.env.APP_NAME || 'Family Library & Heritage'),
  },
  server: {
    port: 5173,
    host: true,
  }
});
