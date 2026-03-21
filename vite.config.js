import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Keep the production GitHub Pages base while allowing local Playwright/dev runs at '/'.
  base: process.env.VITE_BASE || (mode === 'production' ? '/quiz-app/' : '/'),
}));