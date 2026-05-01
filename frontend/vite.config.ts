import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Target directory for monorepo-wide build aggregation
    outDir: '../../dist/landing-page',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});