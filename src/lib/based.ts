import { createClient } from '@weirdscience/based-client';
import type { BasedClient } from '@weirdscience/based-client';
import type { Tables as TablesGen } from '../based.d';

/**
 * `based typegen` produit les noms de tables en **camelCase** (`dailyCounts`),
 * mais l'endpoint REST utilise toujours le **snake_case** d'origine
 * (`/api/daily_counts`). Le SDK passe le nom verbatim → 404 si on lui donne
 * la version camelCase.
 *
 * On remappe ici sur les noms réels côté serveur. Si une table est renommée
 * côté `based`, mettre à jour ces clés + faire un `based typegen`.
 */
export interface Tables {
  settings: TablesGen['settings'];
  progress: TablesGen['progress'];
  review_states: TablesGen['reviewStates'];
  daily_counts: TablesGen['dailyCounts'];
  kana_failures: TablesGen['kanaFailures'];
}

// Le SDK exige une index signature sur le map des tables — l'intersection
// satisfait la contrainte sans perdre le typage par table.
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

  // Hydrate session depuis l'env. Si localStorage contient déjà une session,
  // on la garde **seulement** si elle est plus récente que celle de l'env
  // (le SDK rafraîchit son JWT en arrière-plan et le ré-écrit en localStorage —
  // on ne veut pas écraser un token récent par un token plus ancien).
  // En dev, ça permet de mettre à jour `.env.local` sans avoir à vider
  // manuellement le localStorage.
  if (typeof window !== 'undefined') {
    const seed = import.meta.env.VITE_BASED_SESSION;
    if (seed) {
      try {
        JSON.parse(seed);
        const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
        if (!existing || jwtIat(seed) > jwtIat(existing)) {
          window.localStorage.setItem(SESSION_STORAGE_KEY, seed);
        }
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

/**
 * Renvoie l'`iat` (issued-at, en secondes epoch) du JWT contenu dans un blob
 * de session sérialisé, ou `0` si non parseable. Utilisé pour décider quelle
 * session est la plus récente entre l'env et localStorage.
 */
function jwtIat(rawSession: string): number {
  try {
    const session = JSON.parse(rawSession) as { accessToken?: string };
    const token = session.accessToken;
    if (!token) return 0;
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) return 0;
    // base64url → base64
    const b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64)) as { iat?: number };
    return typeof payload.iat === 'number' ? payload.iat : 0;
  } catch {
    return 0;
  }
}
