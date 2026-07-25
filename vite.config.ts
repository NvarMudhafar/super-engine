import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base so `npm run build` output can be opened from the file system
  // or served from any sub-path without extra configuration.
  base: './',
  server: {
    port: 5173,
    open: true,
  },
});
