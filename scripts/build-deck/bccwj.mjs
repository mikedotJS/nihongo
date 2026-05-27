/**
 * Lit les banques Yomichan BCCWJ-SUW et renvoie les N premières entrées
 * triées par rang de fréquence.
 *
 * Format Yomichan term_meta_bank_*.json :
 *   [["word", "freq", { reading: "kana", frequency: rankNumber }], ...]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function loadBccwjEntries(dir, topN = 5000) {
  const files = readdirSync(dir)
    .filter((f) => /^term_meta_bank_\d+\.json$/.test(f))
    .sort((a, b) => {
      const na = Number(a.match(/(\d+)/)[1]);
      const nb = Number(b.match(/(\d+)/)[1]);
      return na - nb;
    });

  const all = [];
  for (const f of files) {
    const arr = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    for (const row of arr) {
      const [word, _kind, meta] = row;
      if (!meta || typeof meta !== 'object') continue;
      all.push({ word, reading: meta.reading, rank: meta.frequency });
    }
  }
  all.sort((a, b) => a.rank - b.rank);
  return all.slice(0, topN);
}
