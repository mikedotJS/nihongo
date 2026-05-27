import { describe, expect, it } from 'vitest';
import { State } from 'ts-fsrs';
import { DEFAULT_SETTINGS } from './storage';
import {
  ANTI_DROWNING_ABSOLUTE,
  ANTI_DROWNING_MULTIPLIER,
  antiDrowningThreshold,
  applyRating,
  buildSessionQueue,
  formatInterval,
  makeInitialReviewState,
  phaseFor,
  previewIntervals,
} from './srs';
import type { ReviewState, Word } from '../types';

const T0 = new Date('2026-05-24T12:00:00Z');

// Fixtures locales — indépendantes du deck généré.
function mkWord(id: string, rank: number): Word {
  return {
    id,
    frequencyRank: rank,
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

const WORDS: Word[] = [
  mkWord('w-a', 1),
  mkWord('w-b', 2),
  mkWord('w-c', 3),
];

describe('antiDrowningThreshold', () => {
  it('caps below the absolute floor of 100', () => {
    expect(antiDrowningThreshold(10)).toBe(
      Math.max(ANTI_DROWNING_MULTIPLIER * 10, ANTI_DROWNING_ABSOLUTE),
    );
    expect(antiDrowningThreshold(10)).toBe(100);
  });
  it('scales with newCardsPerDay above the floor', () => {
    expect(antiDrowningThreshold(60)).toBe(120);
  });
});

describe('makeInitialReviewState', () => {
  it('creates a New card stamped with now', () => {
    const w = WORDS[0];
    const s = makeInitialReviewState(w, T0);
    expect(s.wordId).toBe(w.id);
    expect(s.updatedAt).toBe(T0.getTime());
    expect(s.fsrs.state).toBe(State.New);
    expect(phaseFor(s.fsrs)).toBe('learning');
  });
});

describe('applyRating', () => {
  it('moves the card forward and bumps updatedAt', () => {
    const initial = makeInitialReviewState(WORDS[0], T0);
    const later = new Date('2026-05-25T12:00:00Z');
    const next = applyRating(initial, 'Correct', later);
    expect(next.updatedAt).toBe(later.getTime());
    // `due` doit avoir avancé (next card scheduled in the future).
    expect(next.fsrs.due.getTime()).toBeGreaterThan(initial.fsrs.due.getTime());
    // `reps` doit avoir augmenté.
    expect(next.fsrs.reps).toBe(initial.fsrs.reps + 1);
  });

  it('penalizes Encore with a shorter next-due than Facile', () => {
    const initial = makeInitialReviewState(WORDS[0], T0);
    const again = applyRating(initial, 'Encore', T0);
    const easy = applyRating(initial, 'Facile', T0);
    expect(easy.fsrs.due.getTime()).toBeGreaterThan(again.fsrs.due.getTime());
  });
});

describe('previewIntervals', () => {
  it('returns the 4 ordered intervals (Encore < Difficile < Correct < Facile in practice)', () => {
    const s = makeInitialReviewState(WORDS[0], T0);
    const i = previewIntervals(s, T0);
    expect(Object.keys(i)).toEqual(['Encore', 'Difficile', 'Correct', 'Facile']);
    expect(i.Encore).toMatch(/[mhja]$|maintenant/);
  });
});

describe('formatInterval', () => {
  it('formats minutes / hours / days correctly', () => {
    const now = new Date('2026-05-24T12:00:00Z');
    expect(formatInterval(new Date('2026-05-24T12:01:30Z'), now)).toBe('2m');
    expect(formatInterval(new Date('2026-05-24T14:00:00Z'), now)).toBe('2h');
    expect(formatInterval(new Date('2026-05-27T12:00:00Z'), now)).toBe('3j');
    expect(formatInterval(new Date('2027-05-24T12:00:00Z'), now)).toBe('1a');
  });
  it('returns "maintenant" for past dates', () => {
    const now = new Date('2026-05-24T12:00:00Z');
    expect(formatInterval(new Date('2026-05-24T11:00:00Z'), now)).toBe(
      'maintenant',
    );
  });
});

describe('buildSessionQueue', () => {
  const words = WORDS;
  const settings = { ...DEFAULT_SETTINGS, newCardsPerDay: 3 };
  const now = T0;

  it('returns up to N new cards in frequencyRank order when no review state exists', () => {
    const out = buildSessionQueue({
      words,
      reviewStates: {},
      settings,
      now,
    });
    expect(out.duesCount).toBe(0);
    expect(out.newsCount).toBe(3);
    expect(out.queue).toEqual(['w-a', 'w-b', 'w-c']);
    expect(out.suspendedNews).toBe(false);
  });

  it('puts overdue reviews first, then new cards', () => {
    const reviewStates: Record<string, ReviewState> = {
      'w-b': {
        wordId: 'w-b',
        fsrs: {
          ...makeInitialReviewState(WORDS[1], new Date('2026-05-23')).fsrs,
          state: State.Review,
          due: new Date('2026-05-24T11:00:00Z'),
        },
        phase: 'review',
        updatedAt: 1,
      },
    };
    const out = buildSessionQueue({
      words,
      reviewStates,
      settings: { ...settings, newCardsPerDay: 2 },
      now,
    });
    expect(out.duesCount).toBe(1);
    expect(out.newsCount).toBe(2);
    expect(out.queue[0]).toBe('w-b');
    expect(out.queue.slice(1)).toEqual(['w-a', 'w-c']);
  });

  it('respects anti-drowning: suspends news when dues > threshold', () => {
    // Build many fake due cards.
    const fakeWords = Array.from({ length: 150 }, (_, i) => ({
      id: `w-${i}`,
      frequencyRank: i,
      word: '',
      reading: '',
      meaning: '',
      pos: '',
      wordRuby: [],
      sentence: [],
      sentenceFr: '',
      kanjis: [],
    }));
    const reviewStates: Record<string, ReviewState> = {};
    for (const w of fakeWords) {
      reviewStates[w.id] = {
        wordId: w.id,
        fsrs: {
          ...makeInitialReviewState(w, new Date('2026-05-23')).fsrs,
          state: State.Review,
          due: new Date('2026-05-24T11:00:00Z'),
        },
        phase: 'review',
        updatedAt: 1,
      };
    }
    const out = buildSessionQueue({
      words: fakeWords,
      reviewStates,
      settings: { ...DEFAULT_SETTINGS, newCardsPerDay: 10 },
      now,
    });
    expect(out.duesCount).toBe(150);
    expect(out.newsCount).toBe(0);
    expect(out.suspendedNews).toBe(true);
  });

  it('orders dues by oldest-due first', () => {
    const reviewStates: Record<string, ReviewState> = {
      'w-a': {
        wordId: 'w-a',
        fsrs: {
          ...makeInitialReviewState(WORDS[0], new Date('2026-05-23')).fsrs,
          state: State.Review,
          due: new Date('2026-05-24T11:00:00Z'), // 1h late
        },
        phase: 'review',
        updatedAt: 1,
      },
      'w-b': {
        wordId: 'w-b',
        fsrs: {
          ...makeInitialReviewState(WORDS[1], new Date('2026-05-23')).fsrs,
          state: State.Review,
          due: new Date('2026-05-24T08:00:00Z'), // 4h late
        },
        phase: 'review',
        updatedAt: 1,
      },
    };
    const out = buildSessionQueue({
      words,
      reviewStates,
      settings: { ...DEFAULT_SETTINGS, newCardsPerDay: 0 },
      now,
    });
    expect(out.queue).toEqual(['w-b', 'w-a']);
  });
});
