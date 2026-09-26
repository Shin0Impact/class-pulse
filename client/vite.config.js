import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // shared/ lives outside client/ so the server can import it too
    alias: { '@shared': path.resolve(import.meta.dirname, '../shared') },
  },
  server: {
    host: true, // reachable from phones on the same wifi during development
    port: 5173,
    fs: { allow: ['..'] },
  },
});
