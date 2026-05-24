import type { Card as FSRSCard, Grade } from 'ts-fsrs';

export type PaletteId = 'washi' | 'sumi' | 'terre';
export type JaFontId = 'sans' | 'serif' | 'klee';
export type Mode = 'light' | 'dark';

export interface PaletteTokens {
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  ink2: string;
  mute: string;
  faint: string;
  line: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  again: string;
  againSoft: string;
  good: string;
  goodSoft: string;
}

export interface KanjiEntry {
  char: string;
  meaning: string;
  /** Lecture du kanji telle qu'elle apparaît dans le mot — pas exhaustive. */
  readingInWord: string;
}

/** Segment d'un mot ou d'une phrase avec ruby :
 *  soit un bloc kanji + lecture, soit du texte brut (kana). */
export type RubySegment = { k: string; r: string } | { t: string };

export interface Word {
  id: string;
  frequencyRank: number;
  word: string;
  reading: string;
  meaning: string;
  pos: string;
  wordRuby: RubySegment[];
  sentence: RubySegment[];
  sentenceFr: string;
  kanjis: KanjiEntry[];
}

export interface ReviewState {
  wordId: string;
  fsrs: FSRSCard;
  phase: 'learning' | 'review';
  /** Horloge logique côté client — clé pour le LWW de la synchro `based`. */
  updatedAt: number;
}

export type RatingLabel = 'Encore' | 'Difficile' | 'Correct' | 'Facile';

export const RATING_TO_GRADE: Record<RatingLabel, Grade> = {
  Encore: 1, // Again
  Difficile: 2, // Hard
  Correct: 3, // Good
  Facile: 4, // Easy
};

export interface Settings {
  /** 5–20, défaut 10. */
  newCardsPerDay: number;
  paletteId: PaletteId;
  dark: boolean;
  jaFont: JaFontId;
  updatedAt: number;
}

export interface Progress {
  kanaCompleted: boolean;
  onboardingDone: boolean;
  /** ISO du début de session courante, null si pas de session active. */
  activeSessionStartedAt: string | null;
  /** Reprise du module kana : ligne en cours (0..KANA_LINES.length-1). */
  kanaLine: number;
  /** Reprise du module kana : script en cours. */
  kanaScript: KanaScript;
  updatedAt: number;
}

/** Compteur quotidien — synchronisé séparément. */
export interface DailyRecord {
  date: string; // YYYY-MM-DD (local)
  count: number;
  updatedAt: number;
}

/**
 * Un signe kana raté lors d'un test. Persisté par script (id = `${script}:${kana}`).
 * Permet de re-exposer les signes fragiles dans les sessions futures.
 */
export interface KanaFailure {
  /** `${script}:${kana}` — clé unique. */
  id: string;
  script: KanaScript;
  kana: string;
  romaji: string;
  lineIdx: number;
  updatedAt: number;
}

export type KanaScript = 'hiragana' | 'katakana';

export interface KanaSign {
  character: string;
  romaji: string;
  type: KanaScript;
  /** Romaji de la ligne, ex. "a", "ka". */
  row: string;
}
