import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  deleteKanaFailure,
  formatLocalDate,
  incrementDailyCount,
  kanaFailureId,
  loadAllKanaFailures,
  loadAllReviewStates,
  loadDailyRecord,
  loadKanaFailure,
  loadLastNDays,
  loadProgress,
  loadReviewState,
  loadSession,
  loadSettings,
  saveKanaFailure,
  saveProgress,
  saveReviewState,
  saveSession,
  saveSettings,
} from './storage';
import { makeInitialReviewState } from './srs';

const NOW = new Date('2026-05-24T12:00:00Z');

describe('storage roundtrips', () => {
  it('returns DEFAULT_SETTINGS when nothing is stored', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('settings: write then read returns the same object', async () => {
    const s = {
      ...DEFAULT_SETTINGS,
      newCardsPerDay: 17,
      paletteId: 'sumi' as const,
      updatedAt: 42,
    };
    await saveSettings(s);
    expect(await loadSettings()).toEqual(s);
  });

  it('progress: write then read preserves all fields including the new kana cursor', async () => {
    const p = {
      ...DEFAULT_PROGRESS,
      kanaCompleted: true,
      onboardingDone: true,
      kanaLine: 7,
      kanaScript: 'katakana' as const,
      updatedAt: 9999,
    };
    await saveProgress(p);
    expect(await loadProgress()).toEqual(p);
  });

  it('review state: roundtrip preserves the FSRS card (incl. Date fields)', async () => {
    const word = {
      id: 'w-test',
      frequencyRank: 0,
      word: '私',
      reading: 'わたし',
      meaning: 'moi',
      pos: 'pronom',
      wordRuby: [],
      sentence: [],
      sentenceFr: '',
      kanjis: [],
    };
    const state = makeInitialReviewState(word, NOW);
    await saveReviewState(state);
    const loaded = await loadReviewState('w-test');
    expect(loaded).toBeDefined();
    expect(loaded!.fsrs.due).toBeInstanceOf(Date);
    expect(loaded!.updatedAt).toBe(NOW.getTime());
  });

  it('loadAllReviewStates returns a map keyed by wordId', async () => {
    const a = makeInitialReviewState(
      { id: 'a', frequencyRank: 0, word: '', reading: '', meaning: '', pos: '', wordRuby: [], sentence: [], sentenceFr: '', kanjis: [] },
      NOW,
    );
    const b = makeInitialReviewState(
      { id: 'b', frequencyRank: 1, word: '', reading: '', meaning: '', pos: '', wordRuby: [], sentence: [], sentenceFr: '', kanjis: [] },
      NOW,
    );
    await saveReviewState(a);
    await saveReviewState(b);
    const all = await loadAllReviewStates();
    expect(Object.keys(all).sort()).toEqual(['a', 'b']);
  });

  it('daily counts: incrementDailyCount accumulates and stamps updatedAt', async () => {
    const t0 = new Date('2026-05-24T10:00:00');
    const r1 = await incrementDailyCount(t0);
    expect(r1.count).toBe(1);
    const r2 = await incrementDailyCount(t0);
    expect(r2.count).toBe(2);
    expect(r2.updatedAt).toBeGreaterThanOrEqual(r1.updatedAt);
    const reloaded = await loadDailyRecord(t0);
    expect(reloaded.count).toBe(2);
  });

  it('loadLastNDays returns oldest→newest with zero-filled gaps', async () => {
    const today = new Date('2026-05-24T10:00:00');
    await incrementDailyCount(today);
    const days = await loadLastNDays(7, today);
    expect(days).toHaveLength(7);
    expect(days[6].date).toBe(formatLocalDate(today));
    expect(days[6].count).toBe(1);
    // Les 6 autres sont zéro (jamais incrémentés).
    for (let i = 0; i < 6; i++) expect(days[i].count).toBe(0);
  });

  it('session snapshot roundtrip', async () => {
    await saveSession({ startedAt: 'x', queue: ['w-1'], cursor: 0, ratings: {} });
    const snap = await loadSession();
    expect(snap?.queue).toEqual(['w-1']);
  });

  it('kana failures: save → load → delete', async () => {
    const f = {
      id: kanaFailureId('hiragana', 'ら'),
      script: 'hiragana' as const,
      kana: 'ら',
      romaji: 'ra',
      lineIdx: 8,
      updatedAt: 1,
    };
    await saveKanaFailure(f);
    expect(await loadKanaFailure('hiragana', 'ら')).toEqual(f);
    expect((await loadAllKanaFailures()).length).toBe(1);
    await deleteKanaFailure('hiragana', 'ら');
    expect(await loadKanaFailure('hiragana', 'ら')).toBeUndefined();
  });
});
