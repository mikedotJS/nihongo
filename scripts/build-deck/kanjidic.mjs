/**
 * Streaming parser pour kanjidic2.xml — index par kanji avec sens FR (sinon EN).
 *
 * Format XML (simplifié) :
 *   <character>
 *     <literal>食</literal>
 *     <reading_meaning>
 *       <rmgroup>
 *         <meaning>eat</meaning>
 *         <meaning m_lang="fr">manger</meaning>
 *       </rmgroup>
 *     </reading_meaning>
 *   </character>
 */
import sax from 'sax';
import { createReadStream } from 'node:fs';

export async function buildKanjidicIndex(xmlPath) {
  const out = new Map();
  const stream = createReadStream(xmlPath, { encoding: 'utf8' });
  const parser = sax.createStream(false, { trim: true, lowercase: true });

  let cur = null;
  let textBuf = '';
  let curMeaningLang = null;

  return await new Promise((resolve, reject) => {
    parser.on('error', reject);
    parser.on('opentag', (node) => {
      const name = node.name;
      textBuf = '';
      if (name === 'character') cur = { literal: null, fr: null, en: null };
      else if (name === 'meaning')
        curMeaningLang = node.attributes['m_lang'] || 'en';
    });
    parser.on('text', (t) => {
      textBuf += t;
    });
    parser.on('cdata', (t) => {
      textBuf += t;
    });
    parser.on('closetag', (name) => {
      const text = textBuf.trim();
      textBuf = '';
      if (!cur) return;
      if (name === 'literal') {
        cur.literal = text;
      } else if (name === 'meaning') {
        if (curMeaningLang === 'fr' && !cur.fr) cur.fr = text;
        else if (curMeaningLang === 'en' && !cur.en) cur.en = text;
        curMeaningLang = null;
      } else if (name === 'character') {
        if (cur.literal) out.set(cur.literal, { fr: cur.fr, en: cur.en });
        cur = null;
      }
    });
    parser.on('end', () => resolve(out));
    stream.pipe(parser);
  });
}
