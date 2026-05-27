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

/**
 * Pour un mot donné (forme surface ou kana), renvoie la première paire
 * (JA, FR) contenant ce mot. Si rien ne matche, null.
 * Pour les verbes ichidan/godan, on tente aussi sans le -る / -く / etc.
 */
export function findExample(pairs, word) {
  // 1. Match brut sur la forme du dictionnaire.
  for (const p of pairs) {
    if (p.ja.includes(word)) return p;
  }
  // 2. Pour les mots en kanji+okurigana, tente la racine (sans le suffixe
  //    flexionnel) — capture les conjugaisons.
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
