import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./based', () => ({
  getBased: vi.fn(),
  resetBased: vi.fn(),
}));

// Import après le mock pour que sync.ts utilise notre stub.
import { getBased } from './based';
import {
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  kanaFailureId,
  loadKanaFailure,
  loadProgress,
  loadReviewState,
  loadSettings,
  saveKanaFailure,
  saveProgress,
  saveReviewState,
  saveSettings,
  saveDailyRecord,
  loadDailyRecord,
} from './storage';
import { pullAndMerge } from './sync';
import { makeInitialReviewState } from './srs';

/** Liste de toutes les upserts captées, indexées par table. */
type Captured = Record<string, Record<string, unknown>[]>;

function makeFakeClient(state: {
  settings?: Record<string, unknown> | null;
  progress?: Record<string, unknown> | null;
  reviewStates?: Record<string, unknown>[];
  dailyCounts?: Record<string, unknown>[];
  kanaFailures?: Record<string, unknown>[];
}) {
  const captured: Captured = {
    settings: [],
    progress: [],
    review_states: [],
    daily_counts: [],
    kana_failures: [],
  };
  const singletonGet = async (id: string, val: Record<string, unknown> | null | undefined) => {
    if (val && val.id === id) return val;
    return null;
  };
  const listFor = (val: Record<string, unknown>[] | undefined) =>
    Promise.resolve({ data: val ?? [], total: (val ?? []).length });
  const upsertFor = (table: string) => async (data: Record<string, unknown>) => {
    captured[table].push(data);
    return data;
  };
  const client = {
    async ready() {},
    from(table: string) {
      switch (table) {
        case 'settings':
          return {
            get: (id: string) => singletonGet(id, state.settings ?? null),
            select: () => listFor(state.settings ? [state.settings] : []),
            upsert: upsertFor('settings'),
          };
        case 'progress':
          return {
            get: (id: string) => singletonGet(id, state.progress ?? null),
            select: () => listFor(state.progress ? [state.progress] : []),
            upsert: upsertFor('progress'),
          };
        case 'review_states':
          return {
            get: async () => null,
            select: () => listFor(state.reviewStates),
            upsert: upsertFor('review_states'),
          };
        case 'daily_counts':
          return {
            get: async () => null,
            select: () => listFor(state.dailyCounts),
            upsert: upsertFor('daily_counts'),
          };
        case 'kana_failures':
          return {
            get: async () => null,
            select: () => listFor(state.kanaFailures),
            upsert: upsertFor('kana_failures'),
          };
        default:
          throw new Error(`unexpected table ${table}`);
      }
    },
  };
  return { client, captured };
}

function installClient(state: Parameters<typeof makeFakeClient>[0]) {
  const { client, captured } = makeFakeClient(state);
  vi.mocked(getBased).mockReturnValue(client as unknown as ReturnType<typeof getBased>);
  return captured;
}

/** Petit délai pour laisser les push fire-and-forget se résoudre. */
async function flushMicrotasks() {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

afterEach(() => {
  vi.mocked(getBased).mockReset();
});

describe('pullAndMerge — Settings LWW', () => {
  it('applies remote when remote is newer', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, newCardsPerDay: 5, updatedAt: 100 });
    installClient({
      settings: {
        id: 'me',
        newCardsPerDay: 15,
        paletteId: 'sumi',
        dark: 0,
        jaFont: 'serif',
        clientUpdatedAt: 200,
      },
    });
    const out = await pullAndMerge();
    expect(out.settings).toBeTruthy();
    const local = await loadSettings();
    expect(local.newCardsPerDay).toBe(15);
    expect(local.paletteId).toBe('sumi');
    expect(local.jaFont).toBe('serif');
    expect(local.updatedAt).toBe(200);
  });

  it('keeps local + pushes when local is newer', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, newCardsPerDay: 18, updatedAt: 500 });
    const captured = installClient({
      settings: {
        id: 'me',
        newCardsPerDay: 5,
        paletteId: 'washi',
        dark: 0,
        jaFont: 'sans',
        clientUpdatedAt: 100,
      },
    });
    const out = await pullAndMerge();
    expect(out.settings).toBeNull();
    const local = await loadSettings();
    expect(local.newCardsPerDay).toBe(18);
    await flushMicrotasks();
    expect(captured.settings).toHaveLength(1);
    expect(captured.settings[0].newCardsPerDay).toBe(18);
    expect(captured.settings[0].clientUpdatedAt).toBe(500);
  });

  it('pushes local when remote does not exist', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, newCardsPerDay: 11, updatedAt: 999 });
    const captured = installClient({ settings: null });
    await pullAndMerge();
    await flushMicrotasks();
    expect(captured.settings).toHaveLength(1);
    expect(captured.settings[0].newCardsPerDay).toBe(11);
  });

  it('does nothing when timestamps are equal', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, newCardsPerDay: 10, updatedAt: 1000 });
    const captured = installClient({
      settings: {
        id: 'me',
        newCardsPerDay: 99,
        paletteId: 'washi',
        dark: 0,
        jaFont: 'sans',
        clientUpdatedAt: 1000,
      },
    });
    const out = await pullAndMerge();
    expect(out.settings).toBeNull();
    const local = await loadSettings();
    expect(local.newCardsPerDay).toBe(10);
    await flushMicrotasks();
    // Egalité = no push (le code prend la branche « else if local > remote »
    // qui est false ici).
    expect(captured.settings).toHaveLength(0);
  });
});

describe('pullAndMerge — Progress (incl. kana cursor)', () => {
  it('propagates remote katakana + kanaLine when remote is newer (THE bug scenario)', async () => {
    // Local : ce que App lit à l'hydration — kanaScript hiragana, ligne 5.
    await saveProgress({
      ...DEFAULT_PROGRESS,
      onboardingDone: true,
      kanaScript: 'hiragana',
      kanaLine: 5,
      updatedAt: 100,
    });
    // Remote : marqué « hiragana terminé, sur katakana » par un autre device.
    installClient({
      progress: {
        id: 'me',
        kanaCompleted: 0,
        onboardingDone: 1,
        kanaLine: 0,
        kanaScript: 'katakana',
        clientUpdatedAt: 200,
      },
    });
    const out = await pullAndMerge();
    expect(out.progress).toBeTruthy();
    const local = await loadProgress();
    expect(local.kanaScript).toBe('katakana');
    expect(local.kanaLine).toBe(0);
    expect(local.onboardingDone).toBe(true);
    expect(local.updatedAt).toBe(200);
  });

  it('does not clobber a fresher remote with stale local — even when local just hydrated', async () => {
    // Simule le scenario du bug d'hier : local progress vient d'être lu
    // depuis IDB, remote a été modifié plus récemment par un autre device.
    // pullAndMerge ne doit PAS push avant pull pour cette entité.
    await saveProgress({
      ...DEFAULT_PROGRESS,
      kanaScript: 'hiragana',
      kanaLine: 0,
      updatedAt: 100,
    });
    const captured = installClient({
      progress: {
        id: 'me',
        kanaCompleted: 0,
        onboardingDone: 1,
        kanaLine: 7,
        kanaScript: 'katakana',
        clientUpdatedAt: 500,
      },
    });
    await pullAndMerge();
    await flushMicrotasks();
    // Local doit refléter le remote.
    const local = await loadProgress();
    expect(local.kanaScript).toBe('katakana');
    expect(local.kanaLine).toBe(7);
    // Aucun push ne doit avoir été déclenché par pullAndMerge.
    expect(captured.progress).toHaveLength(0);
  });

  it('preserves activeSessionStartedAt locally (never synchronized)', async () => {
    await saveProgress({
      ...DEFAULT_PROGRESS,
      activeSessionStartedAt: '2026-01-01T00:00:00Z',
      updatedAt: 50,
    });
    installClient({
      progress: {
        id: 'me',
        kanaCompleted: 1,
        onboardingDone: 1,
        kanaLine: 0,
        kanaScript: 'katakana',
        clientUpdatedAt: 100,
      },
    });
    await pullAndMerge();
    const local = await loadProgress();
    // Le remote a écrasé les flags mais activeSessionStartedAt persiste.
    expect(local.activeSessionStartedAt).toBe('2026-01-01T00:00:00Z');
    expect(local.kanaCompleted).toBe(true);
  });

  it('pushes local when local is newer than remote', async () => {
    await saveProgress({
      ...DEFAULT_PROGRESS,
      onboardingDone: true,
      kanaLine: 9,
      updatedAt: 500,
    });
    const captured = installClient({
      progress: {
        id: 'me',
        kanaCompleted: 0,
        onboardingDone: 0,
        kanaLine: 0,
        kanaScript: 'hiragana',
        clientUpdatedAt: 100,
      },
    });
    await pullAndMerge();
    await flushMicrotasks();
    expect(captured.progress).toHaveLength(1);
    expect(captured.progress[0].kanaLine).toBe(9);
    expect(captured.progress[0].onboardingDone).toBe(1);
  });

  it('tolerates remote with null kanaLine / kanaScript (legacy rows)', async () => {
    await saveProgress({ ...DEFAULT_PROGRESS, updatedAt: 0 });
    installClient({
      progress: {
        id: 'me',
        kanaCompleted: 0,
        onboardingDone: 1,
        kanaLine: null,
        kanaScript: null,
        clientUpdatedAt: 100,
      },
    });
    await pullAndMerge();
    const local = await loadProgress();
    expect(local.kanaLine).toBe(0); // default fallback
    expect(local.kanaScript).toBe('hiragana');
    expect(local.onboardingDone).toBe(true);
  });
});

describe('pullAndMerge — Review states', () => {
  function buildRemoteRow(wordId: string, clientUpdatedAt: number) {
    return {
      id: wordId,
      fsrs: JSON.stringify({
        due: '2026-06-01T00:00:00Z',
        stability: 1,
        difficulty: 5,
        elapsed_days: 0,
        scheduled_days: 1,
        learning_steps: 0,
        reps: 1,
        lapses: 0,
        state: 1,
        last_review: '2026-05-31T00:00:00Z',
      }),
      phase: 'learning',
      clientUpdatedAt,
    };
  }

  function dummyWord(id: string) {
    return {
      id,
      frequencyRank: 0,
      word: '',
      reading: '',
      meaning: '',
      pos: '',
      wordRuby: [],
      sentence: [],
      sentenceFr: '',
      kanjis: [],
    };
  }

  it('imports remote review states the local does not have', async () => {
    installClient({ reviewStates: [buildRemoteRow('w-1', 500)] });
    const out = await pullAndMerge();
    expect(Object.keys(out.reviewStates)).toEqual(['w-1']);
    const local = await loadReviewState('w-1');
    expect(local).toBeDefined();
    expect(local!.phase).toBe('learning');
    expect(local!.updatedAt).toBe(500);
    expect(local!.fsrs.due).toBeInstanceOf(Date);
  });

  it('keeps the newer side per word (mixed local/remote)', async () => {
    const wordA = makeInitialReviewState(dummyWord('a'), new Date(100));
    const wordB = makeInitialReviewState(dummyWord('b'), new Date(900));
    await saveReviewState(wordA);
    await saveReviewState(wordB);

    const captured = installClient({
      reviewStates: [
        buildRemoteRow('a', 500), // remote newer than local A (100)
        buildRemoteRow('b', 200), // remote older than local B (900)
      ],
    });

    const out = await pullAndMerge();
    // Word A : remote applied.
    expect(out.reviewStates['a']).toBeDefined();
    expect(out.reviewStates['a'].updatedAt).toBe(500);
    // Word B : local kept (no entry in result).
    expect(out.reviewStates['b']).toBeUndefined();
    await flushMicrotasks();
    // Word B : un push doit avoir été déclenché.
    const pushedB = captured.review_states.find((r) => r.id === 'b');
    expect(pushedB).toBeDefined();
    expect(pushedB!.clientUpdatedAt).toBe(900);
  });

  it('pushes local entries absent from remote', async () => {
    const word = makeInitialReviewState(dummyWord('only-local'), new Date(42));
    await saveReviewState(word);
    const captured = installClient({ reviewStates: [] });
    await pullAndMerge();
    await flushMicrotasks();
    const pushed = captured.review_states.find((r) => r.id === 'only-local');
    expect(pushed).toBeDefined();
    expect(pushed!.clientUpdatedAt).toBe(42);
  });
});

describe('pullAndMerge — Daily counts', () => {
  it('imports remote rows when remote is newer', async () => {
    installClient({
      dailyCounts: [{ id: '2026-05-24', count: 12, clientUpdatedAt: 1000 }],
    });
    const out = await pullAndMerge();
    expect(out.daily['2026-05-24']).toBeDefined();
    const local = await loadDailyRecord(new Date(2026, 4, 24));
    expect(local.count).toBe(12);
    expect(local.updatedAt).toBe(1000);
  });

  it('pushes local when local is newer for a given date', async () => {
    await saveDailyRecord({ date: '2026-05-24', count: 9, updatedAt: 5000 });
    const captured = installClient({
      dailyCounts: [{ id: '2026-05-24', count: 1, clientUpdatedAt: 100 }],
    });
    await pullAndMerge();
    await flushMicrotasks();
    const pushed = captured.daily_counts.find((r) => r.id === '2026-05-24');
    expect(pushed).toBeDefined();
    expect(pushed!.count).toBe(9);
  });
});

describe('pullAndMerge — Kana failures', () => {
  it('imports new failures from remote', async () => {
    installClient({
      kanaFailures: [
        {
          id: 'hiragana:ら',
          script: 'hiragana',
          kana: 'ら',
          romaji: 'ra',
          lineIdx: 8,
          clientUpdatedAt: 500,
        },
      ],
    });
    const out = await pullAndMerge();
    expect(out.kanaFailures['hiragana:ら']).toBeDefined();
    const local = await loadKanaFailure('hiragana', 'ら');
    expect(local?.lineIdx).toBe(8);
  });

  it('pushes local-only failures', async () => {
    await saveKanaFailure({
      id: kanaFailureId('katakana', 'ヲ'),
      script: 'katakana',
      kana: 'ヲ',
      romaji: 'wo',
      lineIdx: 9,
      updatedAt: 42,
    });
    const captured = installClient({ kanaFailures: [] });
    await pullAndMerge();
    await flushMicrotasks();
    const pushed = captured.kana_failures.find((r) => r.id === 'katakana:ヲ');
    expect(pushed).toBeDefined();
    expect(pushed!.kana).toBe('ヲ');
  });
});

describe('pullAndMerge — when no client (local-only mode)', () => {
  beforeEach(() => {
    vi.mocked(getBased).mockReturnValue(null);
  });
  it('returns an empty result and touches no storage', async () => {
    await saveProgress({ ...DEFAULT_PROGRESS, kanaLine: 3, updatedAt: 1 });
    const out = await pullAndMerge();
    expect(out.settings).toBeNull();
    expect(out.progress).toBeNull();
    expect(out.reviewStates).toEqual({});
    expect(out.daily).toEqual({});
    expect(out.kanaFailures).toEqual({});
    // Local intact.
    const p = await loadProgress();
    expect(p.kanaLine).toBe(3);
  });
});
