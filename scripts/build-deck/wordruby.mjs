/**
 * Génère les segments `wordRuby` d'un mot à partir de sa forme écrite (mix
 * kanji + okurigana) et de sa lecture en kana.
 *
 * Approche pragmatique :
 *   - Strip le préfixe kana commun (rare en pratique)
 *   - Strip le suffixe kana (okurigana) — par ex. 食べる/たべる → suffixe べる
 *   - Le bloc kanji central reçoit le reste de la lecture en une fois
 *
 * Limite : pour les composés multi-kanji (時間/じかん), on émet un seul
 * segment `{k:'時間', r:'じかん'}` au lieu de `{k:'時',r:'じ'},{k:'間',r:'かん'}`.
 * Le breakdown par kanji est exposé séparément via le champ `kanjis`.
 */

const HIRAGANA_RANGE = [0x3040, 0x309f];
const KATAKANA_RANGE = [0x30a0, 0x30ff];
const CJK_RANGE = [0x4e00, 0x9fff];

function inRange(code, [a, b]) {
  return code >= a && code <= b;
}

function isKana(ch) {
  const code = ch.charCodeAt(0);
  return inRange(code, HIRAGANA_RANGE) || inRange(code, KATAKANA_RANGE);
}

function isKanji(ch) {
  return inRange(ch.charCodeAt(0), CJK_RANGE);
}

/** Convertit la katakana en hiragana pour comparer aux lectures. */
function toHira(s) {
  let out = '';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (inRange(code, KATAKANA_RANGE) && code >= 0x30a1 && code <= 0x30f6) {
      out += String.fromCharCode(code - 0x60);
    } else {
      out += ch;
    }
  }
  return out;
}

export function buildWordRuby(word, reading) {
  const w = word;
  const r = toHira(reading);
  const segments = [];

  // 1. Préfixe kana commun
  let wi = 0;
  let ri = 0;
  while (wi < w.length && isKana(w[wi])) {
    const wHira = toHira(w[wi]);
    if (ri < r.length && r[ri] === wHira) {
      segments.push({ t: w[wi] });
      wi++;
      ri++;
    } else break;
  }

  // 2. Suffixe kana commun (depuis la fin)
  let we = w.length;
  let re = r.length;
  while (we > wi && isKana(w[we - 1])) {
    const wHira = toHira(w[we - 1]);
    if (re > ri && r[re - 1] === wHira) {
      we--;
      re--;
    } else break;
  }

  // 3. Milieu = kanji (et éventuellement kana mélangés)
  const middle = w.slice(wi, we);
  const middleReading = r.slice(ri, re);

  if (middle.length > 0) {
    // Si le milieu est uniquement kanji, un seul segment ruby.
    const allKanji = [...middle].every(isKanji);
    if (allKanji) {
      segments.push({ k: middle, r: middleReading });
    } else {
      // Mélange kanji+kana au milieu : on découpe par run. Difficile sans
      // analyse morphologique pour aligner la lecture ; fallback = un seul
      // ruby couvrant tout.
      segments.push({ k: middle, r: middleReading });
    }
  }

  // 4. Suffixe kana
  for (let i = we; i < w.length; i++) segments.push({ t: w[i] });

  return segments;
}

/**
 * Construit le `kanjis` breakdown : pour chaque kanji du mot, le sens FR/EN
 * via kanjidic, et la lecture dans le mot (heuristique : on prend la portion
 * de lecture qui correspond aux runs kanji).
 */
export function buildKanjisBreakdown(word, reading, kanjidicIndex) {
  const out = [];
  const ruby = buildWordRuby(word, reading);
  // Pour chaque segment {k, r}, on décompose en kanji individuels.
  for (const seg of ruby) {
    if (!seg.k) continue;
    const chars = [...seg.k];
    if (chars.length === 1) {
      const info = kanjidicIndex.get(chars[0]);
      out.push({
        char: chars[0],
        meaning: info?.fr ?? info?.en ?? '—',
        readingInWord: seg.r,
      });
    } else {
      // Multi-kanji : on ne sait pas comment splitter la lecture finement.
      // On donne la lecture combinée au premier kanji et marque les autres.
      for (const c of chars) {
        const info = kanjidicIndex.get(c);
        out.push({
          char: c,
          meaning: info?.fr ?? info?.en ?? '—',
          readingInWord: seg.r,
        });
      }
    }
  }
  return out;
}
