import { defineConfig } from 'vitest/config';

// Config Vitest séparée de vite.config.ts pour éviter de charger les plugins
// React/PWA en mode test (plus rapide + moins de surface d'erreur).
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
    // Stable env pour les comparaisons de timestamps déterministes.
    clearMocks: true,
    restoreMocks: true,
  },
});
