import type { Word } from '../types';
import generated from './deck.generated.json';

/**
 * Jeu de test minimal — les 6 mots du brief design. Utilisé uniquement si
 * `deck.generated.json` est vide ou manquant (pas commit, etc.).
 */
const FALLBACK_SEED: Word[] = [
  {
    id: 'w-watashi',
    frequencyRank: 1,
    word: '私',
    reading: 'わたし',
    meaning: 'moi, je',
    pos: 'pronom',
    wordRuby: [{ k: '私', r: 'わたし' }],
    sentence: [
      { k: '私', r: 'わたし' },
      { t: 'は' },
      { k: '学生', r: 'がくせい' },
      { t: 'です。' },
    ],
    sentenceFr: 'Je suis étudiant.',
    kanjis: [{ char: '私', meaning: 'moi, privé', readingInWord: 'わたし' }],
  },
  {
    id: 'w-taberu',
    frequencyRank: 2,
    word: '食べる',
    reading: 'たべる',
    meaning: 'manger',
    pos: 'verbe',
    wordRuby: [{ k: '食', r: 'た' }, { t: 'べる' }],
    sentence: [
      { k: '朝', r: 'あさ' },
      { k: 'ご飯', r: 'ごはん' },
      { t: 'を' },
      { k: '食', r: 'た' },
      { t: 'べる。' },
    ],
    sentenceFr: 'Manger le petit-déjeuner.',
    kanjis: [
      { char: '食', meaning: 'manger, nourriture', readingInWord: 'た (べる)' },
    ],
  },
  {
    id: 'w-hito',
    frequencyRank: 3,
    word: '人',
    reading: 'ひと',
    meaning: 'personne',
    pos: 'nom',
    wordRuby: [{ k: '人', r: 'ひと' }],
    sentence: [
      { t: 'あの' },
      { k: '人', r: 'ひと' },
      { t: 'は' },
      { k: '先生', r: 'せんせい' },
      { t: 'です。' },
    ],
    sentenceFr: 'Cette personne est professeur.',
    kanjis: [{ char: '人', meaning: 'personne, humain', readingInWord: 'ひと' }],
  },
  {
    id: 'w-iku',
    frequencyRank: 4,
    word: '行く',
    reading: 'いく',
    meaning: 'aller',
    pos: 'verbe',
    wordRuby: [{ k: '行', r: 'い' }, { t: 'く' }],
    sentence: [
      { k: '学校', r: 'がっこう' },
      { t: 'に' },
      { k: '行', r: 'い' },
      { t: 'く。' },
    ],
    sentenceFr: 'Aller à l’école.',
    kanjis: [{ char: '行', meaning: 'aller, ligne', readingInWord: 'い (く)' }],
  },
  {
    id: 'w-ookii',
    frequencyRank: 5,
    word: '大きい',
    reading: 'おおきい',
    meaning: 'grand',
    pos: 'adjectif',
    wordRuby: [{ k: '大', r: 'おお' }, { t: 'きい' }],
    sentence: [
      { k: '大', r: 'おお' },
      { t: 'きい' },
      { k: '犬', r: 'いぬ' },
      { t: 'ですね。' },
    ],
    sentenceFr: 'C’est un grand chien, n’est-ce pas ?',
    kanjis: [{ char: '大', meaning: 'grand, gros', readingInWord: 'おお (きい)' }],
  },
  {
    id: 'w-jikan',
    frequencyRank: 6,
    word: '時間',
    reading: 'じかん',
    meaning: 'temps, heure',
    pos: 'nom',
    wordRuby: [
      { k: '時', r: 'じ' },
      { k: '間', r: 'かん' },
    ],
    sentence: [
      { k: '時間', r: 'じかん' },
      { t: 'がありません。' },
    ],
    sentenceFr: 'Je n’ai pas le temps.',
    kanjis: [
      { char: '時', meaning: 'temps, heure', readingInWord: 'じ' },
      { char: '間', meaning: 'intervalle, espace', readingInWord: 'かん' },
    ],
  },
];

/**
 * Le deck consommé par l'app : top 1000 BCCWJ généré par
 * `scripts/build-deck/index.mjs` (BCCWJ + JMdict + Tatoeba + kanjidic2).
 * Si la génération est absente, on retombe sur le seed minimal.
 */
export const SEED_DECK: Word[] =
  Array.isArray(generated) && generated.length > 0
    ? (generated as unknown as Word[])
    : FALLBACK_SEED;
