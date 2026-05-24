/**
 * Setup global pour Vitest.
 * - Polyfill IndexedDB (idb-keyval s'attend à `indexedDB` global).
 * - Stub d'`import.meta.env` côté tests : on n'a pas Vite, donc on alimente
 *   les vars nécessaires à la main.
 */
import 'fake-indexeddb/auto';

// Réinitialise IndexedDB entre les tests pour éviter les fuites d'état.
import { beforeEach } from 'vitest';
import { clear } from 'idb-keyval';

beforeEach(async () => {
  await clear();
});
