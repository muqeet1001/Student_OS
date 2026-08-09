import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Keeps the browser on one origin in dev, so cookies (refresh token)
      // are same-site and no CORS preflight is needed.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',

    /*
     * Source maps in development builds only.
     *
     * A production build was shipping 4.2 MB of maps alongside 1.1 MB of
     * code — four times the payload — and publishing readable original
     * source with it. Neither is wanted on a public deploy. If an error
     * tracker is added later, switch this to 'hidden' and upload the maps to
     * it rather than serving them.
     */
    sourcemap: process.env.NODE_ENV !== 'production',

    rollupOptions: {
      output: {
        /*
         * Splits the dependencies that never change away from application
         * code that changes every deploy, so a returning student re-downloads
         * only what actually moved. The editor is the big one — it is used on
         * a single route and has no business in the bundle every other route
         * has to parse first.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('codemirror') || id.includes('@lezer')) return 'editor';
          if (id.includes('react-router')) return 'router';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'react';
          }
          return 'vendor';
        },
      },
    },
  },
});
