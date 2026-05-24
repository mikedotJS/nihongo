import { fsrs, createEmptyCard, State } from 'ts-fsrs';
import type { Card as FSRSCard, IPreview, Grade } from 'ts-fsrs';
import type { ReviewState, Word, Settings, RatingLabel } from '../types';
import { RATING_TO_GRADE } from '../types';

/**
 * Moteur SRS — fine couche au-dessus de ts-fsrs.
 *
 * Décisions :
 * - `ts-fsrs` est la source de vérité du planning. On ne recalcule rien à la main.
 * - La phase (`learning` | `review`) est dérivée de l'état FSRS (`State`), pas stockée
 *   en double — éviter la divergence.
 * - Garde-fou anti-noyade : si retard de révisions > max(2·newCardsPerDay, 100),
 *   les cartes neuves sont suspendues pour la journée (cf. §5 du brief). Le seuil
 *   vit ici comme constante, pas comme réglage utilisateur — c'est exprès.
 */

const f = fsrs();

export const ANTI_DROWNING_ABSOLUTE = 100;
export const ANTI_DROWNING_MULTIPLIER = 2;

export function antiDrowningThreshold(newCardsPerDay: number): number {
  return Math.max(ANTI_DROWNING_MULTIPLIER * newCardsPerDay, ANTI_DROWNING_ABSOLUTE);
}

export function phaseFor(card: FSRSCard): 'learning' | 'review' {
  // Learning + Relearning + New comptent comme "learning steps" courts ; Review = intervalles longs.
  return card.state === State.Review ? 'review' : 'learning';
}

export function makeInitialReviewState(word: Word, now: Date = new Date()): ReviewState {
  const card = createEmptyCard<FSRSCard>(now);
  return {
    wordId: word.id,
    fsrs: card,
    phase: phaseFor(card),
    updatedAt: now.getTime(),
  };
}

/**
 * Applique une note à une carte. Retourne le nouvel état SRS persistant.
 * `now` est passé explicitement pour permettre la déterminisme en test.
 */
export function applyRating(
  state: ReviewState,
  label: RatingLabel,
  now: Date = new Date(),
): ReviewState {
  const grade: Grade = RATING_TO_GRADE[label];
  const { card } = f.next(state.fsrs, now, grade);
  return {
    wordId: state.wordId,
    fsrs: card,
    phase: phaseFor(card),
    updatedAt: now.getTime(),
  };
}

/**
 * Renvoie un intervalle court ("1m", "10m", "1h", "4j") depuis maintenant
 * jusqu'à `due`. Utilisé pour les hints des boutons de notation.
 */
export function formatInterval(due: Date, now: Date = new Date()): string {
  const ms = due.getTime() - now.getTime();
  if (ms <= 0) return 'maintenant';
  const mins = ms / 60000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 365) return `${Math.round(days)}j`;
  return `${Math.round(days / 365)}a`;
}

/** Renvoie les intervalles projetés pour chaque grade — utilisé sur le verso. */
export function previewIntervals(
  state: ReviewState,
  now: Date = new Date(),
): Record<RatingLabel, string> {
  const preview = f.repeat(state.fsrs, now) as IPreview;
  return {
    Encore: formatInterval(preview[1].card.due, now),
    Difficile: formatInterval(preview[2].card.due, now),
    Correct: formatInterval(preview[3].card.due, now),
    Facile: formatInterval(preview[4].card.due, now),
  };
}

/**
 * Construit la file d'une session. Retourne les IDs des mots dans l'ordre :
 * révisions dues d'abord (les plus en retard en premier), puis cartes neuves
 * dans l'ordre de fréquence (frequencyRank croissant).
 *
 * Applique le garde-fou anti-noyade : pas de cartes neuves si retard trop élevé.
 */
export function buildSessionQueue({
  words,
  reviewStates,
  settings,
  now = new Date(),
}: {
  words: Word[];
  reviewStates: Record<string, ReviewState>;
  settings: Settings;
  now?: Date;
}): {
  queue: string[];
  duesCount: number;
  newsCount: number;
  suspendedNews: boolean;
} {
  // 1) Cartes déjà vues, dues maintenant.
  const dues = words
    .filter((w) => {
      const s = reviewStates[w.id];
      if (!s) return false;
      if (s.fsrs.state === State.New) return false;
      return s.fsrs.due.getTime() <= now.getTime();
    })
    .sort((a, b) => {
      const da = reviewStates[a.id].fsrs.due.getTime();
      const db = reviewStates[b.id].fsrs.due.getTime();
      return da - db; // les plus en retard en tête
    });

  // 2) Cartes neuves (jamais vues), dans l'ordre de fréquence.
  const news = words
    .filter((w) => {
      const s = reviewStates[w.id];
      return !s || s.fsrs.state === State.New;
    })
    .sort((a, b) => a.frequencyRank - b.frequencyRank);

  const threshold = antiDrowningThreshold(settings.newCardsPerDay);
  const suspendedNews = dues.length > threshold;
  const newsTake = suspendedNews ? 0 : Math.min(settings.newCardsPerDay, news.length);

  return {
    queue: [...dues.map((w) => w.id), ...news.slice(0, newsTake).map((w) => w.id)],
    duesCount: dues.length,
    newsCount: newsTake,
    suspendedNews,
  };
}
