#!/usr/bin/env node
/**
 * Pipeline complet : BCCWJ → JMdict → kanjidic2 → Tatoeba → deck.
 *
 * Usage : node scripts/build-deck/index.mjs [--top N] [--out path]
 *
 * Sortie : un fichier JSON `src/data/deck.generated.json` consommé par
 * `src/data/deck.ts`. Le seed manuel reste en fallback.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadBccwjEntries } from './bccwj.mjs';
import {
  buildJmdictIndex,
  isContentPos,
  pickBestJmdictEntry,
} from './jmdict.mjs';
import { buildKanjidicIndex } from './kanjidic.mjs';
import { loadTatoeba, findExample } from './tatoeba.mjs';
import { buildWordRuby, buildKanjisBreakdown } from './wordruby.mjs';

const args = process.argv.slice(2);
const argTop = args.indexOf('--top');
const argOut = args.indexOf('--out');
const TARGET_COUNT = argTop >= 0 ? Number(args[argTop + 1]) : 1000;
const OUT_PATH =
  argOut >= 0
    ? args[argOut + 1]
    : 'src/data/deck.generated.json';

// On scanne large dans BCCWJ pour filtrer ensuite par POS de contenu.
const SCAN_DEPTH = TARGET_COUNT * 5;

function log(...a) {
  console.log('[build-deck]', ...a);
}

function slugId(word, reading) {
  // ID stable et lisible : `w-{romaji-ish}` — on simplifie en remplaçant
  // les caractères non-ASCII par leur code hexadécimal.
  const key = `${word}:${reading}`;
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  return `w-${(h >>> 0).toString(36)}`;
}

async function main() {
  log('1/5 BCCWJ :', SCAN_DEPTH, 'entrées scannées (target =', TARGET_COUNT, ')');
  const bccwj = loadBccwjEntries('data/raw/bccwj-suw', SCAN_DEPTH);

  log('2/5 JMdict : indexation des candidats…');
  const keys = new Set(bccwj.flatMap((e) => [e.word, e.reading]));
  const jmdict = await buildJmdictIndex('data/raw/JMdict', keys);

  log('3/5 kanjidic2 : indexation…');
  const kanjidic = await buildKanjidicIndex('data/raw/kanjidic2.xml');

  log('4/5 Tatoeba : chargement des paires JP↔FR…');
  const pairs = loadTatoeba('data/raw');

  log('5/5 Construction des Word…');
  const seen = new Set();
  const deck = [];
  let scanned = 0;
  let kept = 0;
  let withExample = 0;
  let withFrSense = 0;

  for (const e of bccwj) {
    scanned++;
    if (deck.length >= TARGET_COUNT) break;
    const dictHit = pickBestJmdictEntry(jmdict, e.word, e.reading);
    if (!dictHit || !isContentPos(dictHit.pos)) continue;
    const dedupeKey = `${e.word}:${e.reading}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const meaning =
      dictHit.glossFr ?? dictHit.glossEn ?? '—';
    if (dictHit.glossFr) withFrSense++;

    const wordRuby = buildWordRuby(e.word, e.reading);
    const kanjis = buildKanjisBreakdown(e.word, e.reading, kanjidic);

    const ex = findExample(pairs, e.word);
    if (ex) withExample++;
    const sentence = ex ? [{ t: ex.ja }] : [];
    const sentenceFr = ex?.fr ?? '';

    deck.push({
      id: slugId(e.word, e.reading),
      frequencyRank: e.rank,
      word: e.word,
      reading: e.reading,
      meaning,
      pos: dictHit.pos,
      wordRuby,
      sentence,
      sentenceFr,
      kanjis,
    });
    kept++;
  }

  log('Stats :', {
    scanned,
    kept,
    withFrSense,
    withExample,
    targetReached: kept >= TARGET_COUNT,
  });

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(deck, null, 2), 'utf8');
  log('Écrit :', OUT_PATH, '(', deck.length, 'entrées )');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
