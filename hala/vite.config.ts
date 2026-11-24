import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the chat server runs on its own port (see scripts/dev.mjs) and
// Vite forwards the WebSocket to it, so the browser only ever talks to one origin.
const serverPort = Number(process.env.HULLO_SERVER_PORT ?? 3001);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/ws': { target: `ws://localhost:${serverPort}`, ws: true },
      '/healthz': { target: `http://localhost:${serverPort}` },
    },
  },
});
