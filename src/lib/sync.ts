import { getBased } from './based';
import { log } from './log';
import {
  loadAllKanaFailures,
  loadAllReviewStates,
  loadDailyRecord,
  loadProgress,
  loadSettings,
  saveDailyRecord,
  saveKanaFailure,
  saveProgress,
  saveReviewState,
  saveSettings,
} from './storage';
import type {
  DailyRecord,
  KanaFailure,
  KanaScript,
  PaletteId,
  Progress,
  ReviewState,
  Settings,
} from '../types';
import type { Card as FSRSCard } from 'ts-fsrs';

/**
 * Couche de synchronisation `based`.
 *
 * Règles (cf. brief §2) :
 * - Local-first : on lit/écrit toujours d'abord en IndexedDB.
 * - Synchro asynchrone, opportuniste, invisible : ces fonctions ne bloquent
 *   jamais le rendu. Toute erreur réseau est silencieusement avalée — l'app
 *   reste fonctionnelle.
 * - Last-write-wins sur `client_updated_at` (notre horloge logique côté client),
 *   pas l'`updatedAt` serveur (qui peut diverger entre devices).
 *
 * Les IDs côté serveur :
 * - settings / progress : ligne unique d'id `me` (mono-utilisateur en v1).
 * - review_states : id = wordId.
 * - daily_counts : id = `YYYY-MM-DD`.
 */

const SINGLETON_ID = 'me';

/** Wrapper qui avale les erreurs réseau (sync best-effort) et les log. */
async function silentTry<T>(label: string, op: () => Promise<T>): Promise<T | null> {
  try {
    const out = await op();
    log.debug('sync', `${label} → ok`);
    return out;
  } catch (err) {
    log.warn('sync', `${label} → fail`, err);
    return null;
  }
}

// ─── PUSH ─────────────────────────────────────────────────────────────────

export function pushSettings(s: Settings): void {
  const client = getBased();
  if (!client) return;
  void silentTry('push settings', () =>
    client.from('settings').upsert({
      id: SINGLETON_ID,
      newCardsPerDay: s.newCardsPerDay,
      paletteId: s.paletteId,
      dark: s.dark ? 1 : 0,
      jaFont: s.jaFont,
      clientUpdatedAt: s.updatedAt,
    }),
  );
}

export function pushProgress(p: Progress): void {
  const client = getBased();
  if (!client) return;
  void silentTry('push progress', () =>
    client.from('progress').upsert({
      id: SINGLETON_ID,
      kanaCompleted: p.kanaCompleted ? 1 : 0,
      onboardingDone: p.onboardingDone ? 1 : 0,
      kanaLine: p.kanaLine,
      kanaScript: p.kanaScript,
      clientUpdatedAt: p.updatedAt,
    }),
  );
}

export function pushKanaFailure(f: KanaFailure): void {
  const client = getBased();
  if (!client) return;
  void silentTry(`push kana_failure ${f.id}`, () =>
    client.from('kana_failures').upsert({
      id: f.id,
      script: f.script,
      kana: f.kana,
      romaji: f.romaji,
      lineIdx: f.lineIdx,
      clientUpdatedAt: f.updatedAt,
    }),
  );
}

export function pushReviewState(state: ReviewState): void {
  const client = getBased();
  if (!client) return;
  void silentTry(`push review ${state.wordId}`, () =>
    client.from('review_states').upsert({
      id: state.wordId,
      fsrs: serializeFsrs(state.fsrs),
      phase: state.phase,
      clientUpdatedAt: state.updatedAt,
    }),
  );
}

export function pushDailyRecord(record: DailyRecord): void {
  const client = getBased();
  if (!client) return;
  void silentTry(`push daily ${record.date}`, () =>
    client.from('daily_counts').upsert({
      id: record.date,
      count: record.count,
      clientUpdatedAt: record.updatedAt,
    }),
  );
}

// ─── PULL (merge LWW) ─────────────────────────────────────────────────────

export interface PullResult {
  settings: Settings | null;
  progress: Progress | null;
  reviewStates: Record<string, ReviewState>;
  /** Map date → count, dont seuls les enregistrements changés sont présents. */
  daily: Record<string, DailyRecord>;
  /** Map id → failure, mêmes règles que ci-dessus. */
  kanaFailures: Record<string, KanaFailure>;
}

/**
 * Pull all remote rows, merge avec le local en LWW. Pour chaque entité :
 * - si le remote est plus récent (ou n'existe pas en local) → on écrit le
 *   remote en local et on l'inclut dans le résultat ;
 * - si le local est plus récent → on push le local.
 *
 * Renvoie ce qui a changé en local. Si pas de client `based`, renvoie un
 * résultat vide sans toucher au stockage.
 */
export async function pullAndMerge(): Promise<PullResult> {
  const empty: PullResult = {
    settings: null,
    progress: null,
    reviewStates: {},
    daily: {},
    kanaFailures: {},
  };
  const client = getBased();
  if (!client) return empty;

  log.info('sync', 'pullAndMerge start');
  await silentTry('client ready', () => client.ready());

  const [settings, progress, allReviewStates, localFailures] = await Promise.all([
    loadSettings(),
    loadProgress(),
    loadAllReviewStates(),
    loadAllKanaFailures(),
  ]);

  const result: PullResult = {
    settings: null,
    progress: null,
    reviewStates: {},
    daily: {},
    kanaFailures: {},
  };

  // settings (singleton)
  const remoteS = await silentTry('pull settings', () =>
    client.from('settings').get(SINGLETON_ID),
  );
  if (remoteS && remoteS.clientUpdatedAt > settings.updatedAt) {
    const next: Settings = {
      newCardsPerDay: remoteS.newCardsPerDay,
      paletteId: remoteS.paletteId as PaletteId,
      dark: remoteS.dark !== 0,
      jaFont: remoteS.jaFont as Settings['jaFont'],
      updatedAt: remoteS.clientUpdatedAt,
    };
    await saveSettings(next);
    result.settings = next;
  } else if (!remoteS || settings.updatedAt > remoteS.clientUpdatedAt) {
    pushSettings(settings);
  }

  // progress (singleton)
  const remoteP = await silentTry('pull progress', () =>
    client.from('progress').get(SINGLETON_ID),
  );
  if (remoteP && remoteP.clientUpdatedAt > progress.updatedAt) {
    const next: Progress = {
      kanaCompleted: remoteP.kanaCompleted !== 0,
      onboardingDone: remoteP.onboardingDone !== 0,
      // activeSessionStartedAt reste **local** (jamais synchro — c'est le
      // marqueur de session en cours sur ce device).
      activeSessionStartedAt: progress.activeSessionStartedAt,
      kanaLine: remoteP.kanaLine ?? 0,
      kanaScript: (remoteP.kanaScript as KanaScript | null) ?? 'hiragana',
      updatedAt: remoteP.clientUpdatedAt,
    };
    await saveProgress(next);
    result.progress = next;
  } else if (!remoteP || progress.updatedAt > remoteP.clientUpdatedAt) {
    pushProgress(progress);
  }

  // review states — page tout (deck < 2000 lignes en v1, pas besoin de
  // pagination — on relèvera si le deck explose)
  const remoteReviews = await silentTry('pull review_states', () =>
    client.from('review_states').select({ limit: 5000 }),
  );
  if (remoteReviews) {
    const remoteById = new Map(remoteReviews.data.map((r) => [r.id, r]));
    for (const r of remoteReviews.data) {
      const local = allReviewStates[r.id];
      if (!local || r.clientUpdatedAt > local.updatedAt) {
        const next: ReviewState = {
          wordId: r.id,
          fsrs: deserializeFsrs(r.fsrs),
          phase: r.phase as ReviewState['phase'],
          updatedAt: r.clientUpdatedAt,
        };
        await saveReviewState(next);
        result.reviewStates[r.id] = next;
      }
    }
    for (const local of Object.values(allReviewStates)) {
      const remote = remoteById.get(local.wordId);
      if (!remote || local.updatedAt > remote.clientUpdatedAt) {
        pushReviewState(local);
      }
    }
  }

  // daily counts — pull all, merge
  const remoteDaily = await silentTry('pull daily_counts', () =>
    client.from('daily_counts').select({ limit: 5000 }),
  );
  if (remoteDaily) {
    for (const r of remoteDaily.data) {
      const localStored = await loadDailyRecord(parseLocalDate(r.id));
      if (r.clientUpdatedAt > localStored.updatedAt) {
        const next: DailyRecord = {
          date: r.id,
          count: r.count,
          updatedAt: r.clientUpdatedAt,
        };
        await saveDailyRecord(next);
        result.daily[r.id] = next;
      } else if (localStored.updatedAt > r.clientUpdatedAt) {
        pushDailyRecord(localStored);
      }
    }
  }

  // kana_failures — pull all + merge
  const remoteFailures = await silentTry('pull kana_failures', () =>
    client.from('kana_failures').select({ limit: 5000 }),
  );
  if (remoteFailures) {
    const localById = new Map(localFailures.map((f) => [f.id, f]));
    for (const r of remoteFailures.data) {
      const local = localById.get(r.id);
      if (!local || r.clientUpdatedAt > local.updatedAt) {
        const next: KanaFailure = {
          id: r.id,
          script: r.script as KanaScript,
          kana: r.kana,
          romaji: r.romaji,
          lineIdx: r.lineIdx,
          updatedAt: r.clientUpdatedAt,
        };
        await saveKanaFailure(next);
        result.kanaFailures[r.id] = next;
      }
    }
    const remoteById = new Map(remoteFailures.data.map((r) => [r.id, r]));
    for (const local of localFailures) {
      const remote = remoteById.get(local.id);
      if (!remote || local.updatedAt > remote.clientUpdatedAt) {
        pushKanaFailure(local);
      }
    }
  }

  log.info('sync', 'pullAndMerge done', {
    settingsUpdated: !!result.settings,
    progressUpdated: !!result.progress,
    reviewStatesUpdated: Object.keys(result.reviewStates).length,
    dailyUpdated: Object.keys(result.daily).length,
    kanaFailuresUpdated: Object.keys(result.kanaFailures).length,
  });
  return result;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

// FSRS Card contient des Date — on serialise en ISO pour le voyage HTTP,
// on désérialise en Date au retour. ts-fsrs accepte les deux mais on garde
// les types stables en interne.
interface FSRSCardSerialized
  extends Omit<FSRSCard, 'due' | 'last_review'> {
  due: string;
  last_review?: string;
}

function serializeFsrs(card: FSRSCard): string {
  const serialised: FSRSCardSerialized = {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review ? card.last_review.toISOString() : undefined,
  };
  return JSON.stringify(serialised);
}

function deserializeFsrs(raw: string): FSRSCard {
  const parsed = JSON.parse(raw) as FSRSCardSerialized;
  return {
    ...parsed,
    due: new Date(parsed.due),
    last_review: parsed.last_review ? new Date(parsed.last_review) : undefined,
  } as FSRSCard;
}

