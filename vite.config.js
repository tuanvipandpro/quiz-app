import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages lives under /quiz-app/; VITE_BASE can override it explicitly.
  base: process.env.VITE_BASE || '/quiz-app/',
});
