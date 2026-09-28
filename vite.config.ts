import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  server: {
    // In development the API runs under `npm run dev:api` (Wrangler, emulating Cloudflare + D1).
    // The Host header is kept so the API's CSRF origin check sees this dev origin.
    proxy: { '/api': { target: 'http://127.0.0.1:8788', changeOrigin: false } },
    watch: { ignored: ['**/.wrangler/**'] },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Same filename as the pre-React worker, so installed clients pick up the new one on their next update check.
      filename: 'service-worker.js',
      includeAssets: ['icons/icon-192.png'],
      manifest: {
        name: 'اقدامات مانده',
        short_name: 'اقدامات',
        description: 'پیگیری کارهای باقی‌مانده، اقدامات و تقویم پروژه‌ها',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#faf9f6',
        theme_color: '#a1471f',
        dir: 'rtl',
        lang: 'fa',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
        // API requests must always reach the network, never the offline app shell.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});
