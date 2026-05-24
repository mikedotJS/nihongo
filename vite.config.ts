import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Pont log browser → stdout du dev server. Le client POST chaque log sur
 * `/__log`, le middleware le print. Activé seulement en dev. Permet à un
 * outil qui tail le stdout du serveur de voir les logs browser en temps réel.
 */
function logBridge(): Plugin {
  return {
    name: 'log-bridge',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__log', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end();
        }
        let body = '';
        for await (const chunk of req) body += chunk;
        try {
          const evt = JSON.parse(body) as {
            level: string;
            area: string;
            args: unknown[];
          };
          const argsStr = evt.args
            .map((a) =>
              typeof a === 'string' ? a : JSON.stringify(a, null, 0),
            )
            .join(' ');
          console.log(`[browser:${evt.level}][${evt.area}] ${argsStr}`);
        } catch {
          /* ignore mal-formed payloads */
        }
        res.statusCode = 204;
        res.end();
      });
    },
  };
}

// Base path : sert localement à `/`, mais sur GitHub Pages le site vit sous
// `/<repo>/`. Le workflow CI passe `BASE_PATH=/nihongo/` au build.
const basePath = process.env.BASE_PATH ?? '/';
const iconPrefix = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

export default defineConfig({
  base: basePath,
  plugins: [
    logBridge(),
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
