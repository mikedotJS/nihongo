import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Base path : sert localement à `/`, mais sur GitHub Pages le site vit sous
// `/<repo>/`. Le workflow CI passe `BASE_PATH=/nihongo/` au build.
const basePath = process.env.BASE_PATH ?? '/';
const iconPrefix = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg'],
      manifest: {
        name: 'Nihongo',
        short_name: 'Nihongo',
        description:
          "Apprentissage du japonais — kana et vocabulaire par répétition espacée.",
        lang: 'fr',
        start_url: basePath,
        scope: basePath,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f1ece1',
        theme_color: '#1d1a13',
        icons: [
          {
            src: `${iconPrefix}/icons/icon-192.svg`,
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: `${iconPrefix}/icons/icon-512.svg`,
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
