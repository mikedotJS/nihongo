/**
 * Pipeline Tatoeba : pour chaque mot, retrouver une phrase japonaise qui
 * le contient ET dispose d'une traduction française.
 *
 * Fichiers attendus (décompressés dans data/raw) :
 *   - jpn_sentences.tsv : id, lang, text
 *   - fra_sentences.tsv : idem
 *   - jpn-fra_links.tsv : jp_id, fr_id
 */
import { readFileSync } from 'node:fs';

function readTsv(path) {
  const out = new Map();
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    if (!line) continue;
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const id = Number(parts[0]);
    const sentence = parts[2];
    if (Number.isFinite(id)) out.set(id, sentence);
  }
  return out;
}

export function loadTatoeba(dir) {
  const jp = readTsv(`${dir}/jpn_sentences.tsv`);
  const fr = readTsv(`${dir}/fra_sentences.tsv`);

  // Links JP → FR (1:N, on prend la première traduction)
  const linksText = readFileSync(`${dir}/jpn-fra_links.tsv`, 'utf8');
  const jpToFr = new Map();
  for (const line of linksText.split('\n')) {
    if (!line) continue;
    const [j, f] = line.split('\t').map(Number);
    if (!Number.isFinite(j) || !Number.isFinite(f)) continue;
    if (!jpToFr.has(j)) jpToFr.set(j, f);
  }

  // Index : pour chaque phrase JP avec traduction FR → { ja, fr, len }
  // Liste ordonnée par longueur croissante (favoriser les phrases courtes).
  const pairs = [];
  for (const [jpId, frId] of jpToFr) {
    const ja = jp.get(jpId);
    const frText = fr.get(frId);
    if (ja && frText) pairs.push({ ja, fr: frText, len: ja.length });
  }
  pairs.sort((a, b) => a.len - b.len);
  return pairs;
}

const PARTICLES = new Set([
  'が', 'を', 'は', 'に', 'で', 'も', 'と', 'へ', 'や', 'か', 'の', 'ね', 'よ',
]);
const KANJI_RE = /[一-鿿]/;

/**
 * Score une occurrence d'un mot dans une phrase. Plus c'est élevé, plus
 * l'usage est « substantif » (illustratif) plutôt que grammatical.
 *
 * Heuristiques :
 *   - のMOT (nominalisateur, ex. 僕のこと) → forte pénalité
 *   - というMOT / ということ → forte pénalité
 *   - MOT suivi d'une particule de cas (が/を/に…) → bonus (argument nominal)
 *   - MOT précédé d'un kanji, d'une virgule ou du début → bonus (frontière de syntagme)
 *   - longueur de phrase dans une fourchette lisible (8–25) → léger bonus
 */
function scoreOccurrence(ja, word) {
  const idx = ja.indexOf(word);
  if (idx < 0) return -Infinity;
  const before = idx > 0 ? ja[idx - 1] : '';
  const before2 = idx > 1 ? ja.slice(idx - 2, idx) : '';
  const after = ja[idx + word.length] ?? '';

  let score = 0;
  if (before === 'の') score -= 8; // nominalisateur
  if (before2 === 'いう' || before2 === 'って') score -= 6; // という/ってこと
  if (PARTICLES.has(after) && after !== 'の') score += 3;
  if (before === '' || before === '、' || before === '。' || KANJI_RE.test(before))
    score += 2;

  const len = ja.length;
  if (len >= 8 && len <= 25) score += 1;
  else if (len < 5) score -= 2;

  // Tiebreak léger : favorise les phrases courtes à score égal.
  score -= len * 0.01;
  return score;
}

/**
 * Renvoie la meilleure paire (JA, FR) illustrant `word` selon le scoring.
 * On scanne les candidates les plus courtes en priorité (pairs trié par
 * longueur) et on garde la meilleure parmi les `CANDIDATE_CAP` premières.
 * Fallback : racine sans suffixe flexionnel pour capter les conjugaisons.
 */
const CANDIDATE_CAP = 150;

export function findExample(pairs, word) {
  let best = null;
  let bestScore = -Infinity;
  let seen = 0;
  for (const p of pairs) {
    if (!p.ja.includes(word)) continue;
    const s = scoreOccurrence(p.ja, word);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
    if (++seen >= CANDIDATE_CAP) break;
  }
  if (best) return best;

  // Fallback racine (verbes/adjectifs conjugués).
  if (word.length >= 2) {
    const stem = word.slice(0, -1);
    if (stem.length >= 1) {
      for (const p of pairs) {
        if (p.ja.includes(stem)) return p;
      }
    }
  }
  return null;
}
