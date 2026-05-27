/**
 * Streaming parser pour JMdict.xml — construit un index par (keb/reb) pour
 * récupérer rapidement le sens FR (fallback EN) + POS d'une entrée donnée.
 *
 * Le fichier fait ~120 MB ; on streame avec sax. Les entity refs (&v1;, &n;…)
 * sont préservées par sax dans le texte ; on les normalise via un petit map.
 */
import sax from 'sax';
import { createReadStream, readFileSync } from 'node:fs';

const POS_MAP = {
  // Verbes
  v1: 'verbe',
  v5b: 'verbe',
  v5g: 'verbe',
  v5k: 'verbe',
  'v5k-s': 'verbe',
  v5m: 'verbe',
  v5n: 'verbe',
  v5r: 'verbe',
  'v5r-i': 'verbe',
  v5s: 'verbe',
  v5t: 'verbe',
  v5u: 'verbe',
  'v5u-s': 'verbe',
  v5aru: 'verbe',
  vk: 'verbe',
  vs: 'verbe',
  'vs-c': 'verbe',
  'vs-i': 'verbe',
  'vs-s': 'verbe',
  vt: 'verbe trans.',
  vi: 'verbe intrans.',
  vz: 'verbe',
  // Adjectifs
  'adj-i': 'adjectif',
  'adj-na': 'adjectif',
  'adj-no': 'adjectif',
  'adj-pn': 'adjectif',
  'adj-t': 'adjectif',
  'adj-f': 'adjectif',
  'adj-ix': 'adjectif',
  'adj-kari': 'adjectif',
  'adj-ku': 'adjectif',
  'adj-nari': 'adjectif',
  'adj-shiku': 'adjectif',
  // Adverbes
  adv: 'adverbe',
  'adv-to': 'adverbe',
  // Noms
  n: 'nom',
  'n-pref': 'nom',
  'n-suf': 'nom',
  'n-t': 'nom',
  'n-adv': 'nom',
  'n-pr': 'nom propre',
  // Particules / mots grammaticaux (à filtrer côté pipeline)
  prt: 'particule',
  conj: 'conjonction',
  int: 'interjection',
  aux: 'auxiliaire',
  'aux-v': 'auxiliaire',
  'aux-adj': 'auxiliaire',
  pn: 'pronom',
  num: 'numéral',
  ctr: 'compteur',
  cop: 'copule',
  exp: 'expression',
  unc: 'inconnu',
  pref: 'préfixe',
  suf: 'suffixe',
};

/** Catégories qu'on garde pour le deck SRS — pas les particules, pas les
 *  copules etc. */
const CONTENT_POS = new Set([
  'nom',
  'nom propre',
  'verbe',
  'verbe trans.',
  'verbe intrans.',
  'adjectif',
  'adverbe',
  'pronom',
  'expression',
]);

export function isContentPos(label) {
  return CONTENT_POS.has(label);
}

/**
 * Renvoie une Map indexée par (surface OR reading) ; chaque clé pointe sur
 * **toutes** les entrées JMdict qui partagent ce surface/reading. Le caller
 * choisit la meilleure candidate (cf. `pickBest`).
 */
export async function buildJmdictIndex(xmlPath, neededKeys) {
  const wantedSet = neededKeys instanceof Set ? neededKeys : new Set(neededKeys);
  const stream = createReadStream(xmlPath, { encoding: 'utf8' });
  // strict=false → tolère les entity refs DTD (&v1;, &n;…) comme texte brut.
  // On les normalise via POS_MAP plus tard.
  const parser = sax.createStream(false, { trim: true, lowercase: true });

  const out = new Map();
  let curEntry = null;
  let textBuf = '';
  let openTags = [];

  return await new Promise((resolve, reject) => {
    parser.on('error', reject);
    parser.on('opentag', (node) => {
      const name = node.name;
      openTags.push(name);
      if (name === 'entry') {
        curEntry = { kebs: [], rebs: [], senses: [] };
      } else if (name === 'k_ele') {
        if (curEntry) curEntry._kele = { keb: null };
      } else if (name === 'r_ele') {
        if (curEntry) curEntry._rele = { reb: null };
      } else if (name === 'sense') {
        if (curEntry)
          curEntry._sense = { pos: [], glossEn: null, glossFr: null };
      } else if (name === 'gloss') {
        if (curEntry?._sense) {
          curEntry._sense._curLang =
            node.attributes['xml:lang'] || 'eng';
        }
      }
      textBuf = '';
    });
    parser.on('text', (t) => {
      textBuf += t;
    });
    parser.on('cdata', (t) => {
      textBuf += t;
    });
    parser.on('closetag', (name) => {
      openTags.pop();
      if (!curEntry) {
        textBuf = '';
        return;
      }
      const text = textBuf.trim();
      textBuf = '';
      if (name === 'keb') {
        if (curEntry._kele) curEntry._kele.keb = text;
      } else if (name === 'k_ele') {
        if (curEntry._kele?.keb) curEntry.kebs.push(curEntry._kele.keb);
        curEntry._kele = null;
      } else if (name === 'reb') {
        if (curEntry._rele) curEntry._rele.reb = text;
      } else if (name === 'r_ele') {
        if (curEntry._rele?.reb) curEntry.rebs.push(curEntry._rele.reb);
        curEntry._rele = null;
      } else if (name === 'pos') {
        if (curEntry._sense && text) curEntry._sense.pos.push(text);
      } else if (name === 'gloss') {
        if (curEntry._sense) {
          const lang = curEntry._sense._curLang || 'eng';
          if (lang === 'fre' && !curEntry._sense.glossFr)
            curEntry._sense.glossFr = text;
          else if (lang === 'eng' && !curEntry._sense.glossEn)
            curEntry._sense.glossEn = text;
          curEntry._sense._curLang = null;
        }
      } else if (name === 'sense') {
        if (curEntry._sense) {
          curEntry.senses.push({
            pos: curEntry._sense.pos,
            glossEn: curEntry._sense.glossEn,
            glossFr: curEntry._sense.glossFr,
          });
        }
        curEntry._sense = null;
      } else if (name === 'entry') {
        const allKeys = [...curEntry.kebs, ...curEntry.rebs];
        const interesting = allKeys.some((k) => wantedSet.has(k));
        if (interesting && curEntry.senses.length > 0) {
          // POS = premier sens qui en a (JMdict hérite le POS des sens
          // précédents quand omis).
          const stripEntity = (s) => s.replace(/^&/, '').replace(/;$/, '');
          let pos = 'inconnu';
          for (const s of curEntry.senses) {
            if (s.pos.length > 0) {
              pos = POS_MAP[stripEntity(s.pos[0])] ?? stripEntity(s.pos[0]);
              break;
            }
          }
          // Glosses : premier non-null de chaque langue.
          const glossFr = curEntry.senses.find((s) => s.glossFr)?.glossFr ?? null;
          const glossEn = curEntry.senses.find((s) => s.glossEn)?.glossEn ?? null;
          const entry = {
            surfaces: curEntry.kebs,
            readings: curEntry.rebs,
            pos,
            glossFr,
            glossEn,
          };
          for (const k of allKeys) {
            let arr = out.get(k);
            if (!arr) {
              arr = [];
              out.set(k, arr);
            }
            arr.push(entry);
          }
        }
        curEntry = null;
      }
    });
    parser.on('end', () => resolve(out));
    stream.pipe(parser);
  });
}

/**
 * Choisit la meilleure entrée JMdict pour un mot BCCWJ donné.
 * Critères (par ordre de priorité) :
 *   1. surface = mot BCCWJ ET reading = lecture BCCWJ (match exact paire)
 *   2. surface = mot BCCWJ (kanji match, peu importe lecture)
 *   3. reading = lecture BCCWJ (kana match)
 * Parmi les candidates, préfère celles avec glossFr + POS de contenu.
 */
export function pickBestJmdictEntry(idx, word, reading) {
  const fromWord = idx.get(word) ?? [];
  const fromReading = word === reading ? [] : (idx.get(reading) ?? []);

  // Tier 1 : surface+reading correspondent à la paire BCCWJ.
  const exactPair = fromWord.filter(
    (e) => e.surfaces.includes(word) && e.readings.includes(reading),
  );
  // Tier 2 : surface correspond.
  const surfaceMatch = fromWord.filter((e) => e.surfaces.includes(word));
  // Tier 3 : reading correspond (utile pour les mots écrits uniquement en kana).
  const readingMatch = fromReading.filter((e) => e.readings.includes(reading));

  const tiers = [exactPair, surfaceMatch, readingMatch];
  for (const tier of tiers) {
    if (tier.length === 0) continue;
    // Dans chaque tier, préfère content POS + FR.
    const best =
      tier.find((e) => e.glossFr && isContentPos(e.pos)) ??
      tier.find((e) => isContentPos(e.pos)) ??
      tier.find((e) => e.glossFr) ??
      tier[0];
    if (best) return best;
  }
  return null;
}

export { POS_MAP };
