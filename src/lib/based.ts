import { createClient } from '@weirdscience/based-client';
import type { BasedClient } from '@weirdscience/based-client';
import type { Tables } from '../based.d';

// Le SDK exige une index signature sur le map des tables (`Record<string, Record<string, unknown>>`),
// alors que `based typegen` produit une interface fermée. On l'élargit ici sans perdre le typage
// des tables connues — l'intersection conserve les shapes typées.
export type BasedTables = Tables & Record<string, Record<string, unknown>>;

/**
 * Client `based` partagé. Lazy : créé au premier appel.
 *
 * - Si `VITE_BASED_URL` est absent, retourne `null` — l'app reste en local-only.
 * - Si `VITE_BASED_SESSION` est présent et que localStorage est vide, on
 *   hydrate la session avant la création du client (mono-utilisateur, pas
 *   d'écran auth en v1 — cf. §3 du brief, sync « invisible »).
 */

const SESSION_STORAGE_KEY = 'based.session';

let cached: BasedClient<BasedTables> | null | undefined;

export function getBased(): BasedClient<BasedTables> | null {
  if (cached !== undefined) return cached;

  const url = import.meta.env.VITE_BASED_URL;
  const anonKey = import.meta.env.VITE_BASED_ANON_KEY;
  if (!url || !anonKey) {
    cached = null;
    return null;
  }

  // Hydrate session depuis l'env si rien en localStorage. Le SDK gérera ensuite
  // le refresh du token automatiquement (`auth.refreshSession`).
  if (typeof window !== 'undefined') {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    const seed = import.meta.env.VITE_BASED_SESSION;
    if (!existing && seed) {
      try {
        JSON.parse(seed);
        window.localStorage.setItem(SESSION_STORAGE_KEY, seed);
      } catch {
        console.warn('[based] VITE_BASED_SESSION is not valid JSON, ignored.');
      }
    }
  }

  cached = createClient<BasedTables>({ url, anonKey });
  return cached;
}

/** Pour les tests / le hot-reload. */
export function resetBased(): void {
  cached = undefined;
}
