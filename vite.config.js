import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Sử dụng biến môi trường VITE_BASE nếu có, nếu không thì mặc định là '/'
  base: process.env.VITE_BASE || '/', 
});