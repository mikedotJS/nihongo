import { get, set, del, keys } from 'idb-keyval';
import type {
  DailyRecord,
  KanaFailure,
  KanaScript,
  Progress,
  ReviewState,
  Settings,
} from '../types';

/**
 * Couche de persistance locale. Source de vérité runtime.
 * Tout doit fonctionner hors-ligne — voir §2 du brief.
 *
 * Chaque entité porte un `updatedAt` (horloge logique côté client) utilisé
 * comme clé last-write-wins par la couche de synchro `based`.
 */

const KEY_SETTINGS = 'settings';
const KEY_PROGRESS = 'progress';
const KEY_SESSION = 'session';
const KEY_REVIEW_PREFIX = 'review:';
const KEY_DAILY_PREFIX = 'daily:';
const KEY_KANA_FAIL_PREFIX = 'kanafail:';

export const DEFAULT_SETTINGS: Settings = {
  newCardsPerDay: 10,
  paletteId: 'washi',
  dark: false,
  jaFont: 'sans',
  updatedAt: 0,
};

export const DEFAULT_PROGRESS: Progress = {
  kanaCompleted: false,
  onboardingDone: false,
  activeSessionStartedAt: null,
  kanaLine: 0,
  kanaScript: 'hiragana',
  updatedAt: 0,
};

export async function loadSettings(): Promise<Settings> {
  const stored = (await get(KEY_SETTINGS)) as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await set(KEY_SETTINGS, settings);
}

export async function loadProgress(): Promise<Progress> {
  const stored = (await get(KEY_PROGRESS)) as Partial<Progress> | undefined;
  return { ...DEFAULT_PROGRESS, ...(stored ?? {}) };
}

export async function saveProgress(progress: Progress): Promise<void> {
  await set(KEY_PROGRESS, progress);
}

export async function loadReviewState(
  wordId: string,
): Promise<ReviewState | undefined> {
  return (await get(KEY_REVIEW_PREFIX + wordId)) as ReviewState | undefined;
}

export async function saveReviewState(state: ReviewState): Promise<void> {
  await set(KEY_REVIEW_PREFIX + state.wordId, state);
}

export async function loadAllReviewStates(): Promise<
  Record<string, ReviewState>
> {
  const allKeys = await keys();
  const out: Record<string, ReviewState> = {};
  await Promise.all(
    allKeys
      .filter((k): k is string => typeof k === 'string' && k.startsWith(KEY_REVIEW_PREFIX))
      .map(async (k) => {
        const s = (await get(k)) as ReviewState | undefined;
        if (s) out[s.wordId] = s;
      }),
  );
  return out;
}

/** Session interrompue — pour reprise (cf. §5 « interruptibles »). */
export interface SessionSnapshot {
  startedAt: string;
  queue: string[];
  cursor: number;
  ratings: Record<string, number>;
}

export async function loadSession(): Promise<SessionSnapshot | undefined> {
  return (await get(KEY_SESSION)) as SessionSnapshot | undefined;
}

export async function saveSession(snapshot: SessionSnapshot): Promise<void> {
  await set(KEY_SESSION, snapshot);
}

export async function clearSession(): Promise<void> {
  await del(KEY_SESSION);
}

/**
 * Compteur quotidien de cartes révisées (cf. Dashboard « 7 derniers jours »).
 * Clé locale `daily:YYYY-MM-DD`. Date locale, pas UTC — c'est "aujourd'hui"
 * du point de vue utilisateur qui compte.
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function loadDailyRecord(date: Date): Promise<DailyRecord> {
  const dateStr = formatLocalDate(date);
  const stored = (await get(KEY_DAILY_PREFIX + dateStr)) as
    | DailyRecord
    | undefined;
  return stored ?? { date: dateStr, count: 0, updatedAt: 0 };
}

export async function saveDailyRecord(record: DailyRecord): Promise<void> {
  await set(KEY_DAILY_PREFIX + record.date, record);
}

export async function incrementDailyCount(date: Date): Promise<DailyRecord> {
  const dateStr = formatLocalDate(date);
  const key = KEY_DAILY_PREFIX + dateStr;
  const current = ((await get(key)) as DailyRecord | undefined) ?? {
    date: dateStr,
    count: 0,
    updatedAt: 0,
  };
  const next: DailyRecord = {
    date: dateStr,
    count: current.count + 1,
    updatedAt: Date.now(),
  };
  await set(key, next);
  return next;
}

// ─── Kana failures ────────────────────────────────────────────────────────

export function kanaFailureId(script: KanaScript, kana: string): string {
  return `${script}:${kana}`;
}

export async function saveKanaFailure(failure: KanaFailure): Promise<void> {
  await set(KEY_KANA_FAIL_PREFIX + failure.id, failure);
}

export async function loadKanaFailure(
  script: KanaScript,
  kana: string,
): Promise<KanaFailure | undefined> {
  return (await get(KEY_KANA_FAIL_PREFIX + kanaFailureId(script, kana))) as
    | KanaFailure
    | undefined;
}

export async function deleteKanaFailure(
  script: KanaScript,
  kana: string,
): Promise<void> {
  await del(KEY_KANA_FAIL_PREFIX + kanaFailureId(script, kana));
}

export async function loadAllKanaFailures(): Promise<KanaFailure[]> {
  const allKeys = await keys();
  const out: KanaFailure[] = [];
  await Promise.all(
    allKeys
      .filter(
        (k): k is string =>
          typeof k === 'string' && k.startsWith(KEY_KANA_FAIL_PREFIX),
      )
      .map(async (k) => {
        const f = (await get(k)) as KanaFailure | undefined;
        if (f) out.push(f);
      }),
  );
  return out;
}

/** Renvoie les `n` derniers jours, du plus ancien au plus récent (inclusif). */
export async function loadLastNDays(
  n: number,
  today: Date = new Date(),
): Promise<{ date: string; count: number }[]> {
  const out: { date: string; count: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = formatLocalDate(d);
    const stored = (await get(KEY_DAILY_PREFIX + date)) as
      | DailyRecord
      | undefined;
    out.push({ date, count: stored?.count ?? 0 });
  }
  return out;
}
