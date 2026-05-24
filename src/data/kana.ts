/**
 * Hiragana en gojūon order (a, ka, sa, ta, na, ha, ma, ya, ra, wa, n).
 * `null` = case vide du tableau.
 */
export const KANA_GRID: ReadonlyArray<ReadonlyArray<string | null>> = [
  ['あ', 'い', 'う', 'え', 'お'],
  ['か', 'き', 'く', 'け', 'こ'],
  ['さ', 'し', 'す', 'せ', 'そ'],
  ['た', 'ち', 'つ', 'て', 'と'],
  ['な', 'に', 'ぬ', 'ね', 'の'],
  ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ['ま', 'み', 'む', 'め', 'も'],
  ['や', null, 'ゆ', null, 'よ'],
  ['ら', 'り', 'る', 'れ', 'ろ'],
  ['わ', null, null, null, 'を'],
  ['ん', null, null, null, null],
];

export const KATAKANA_GRID: ReadonlyArray<ReadonlyArray<string | null>> = [
  ['ア', 'イ', 'ウ', 'エ', 'オ'],
  ['カ', 'キ', 'ク', 'ケ', 'コ'],
  ['サ', 'シ', 'ス', 'セ', 'ソ'],
  ['タ', 'チ', 'ツ', 'テ', 'ト'],
  ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
  ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'],
  ['マ', 'ミ', 'ム', 'メ', 'モ'],
  ['ヤ', null, 'ユ', null, 'ヨ'],
  ['ラ', 'リ', 'ル', 'レ', 'ロ'],
  ['ワ', null, null, null, 'ヲ'],
  ['ン', null, null, null, null],
];

export const KANA_ROMAJI: ReadonlyArray<ReadonlyArray<string | null>> = [
  ['a', 'i', 'u', 'e', 'o'],
  ['ka', 'ki', 'ku', 'ke', 'ko'],
  ['sa', 'shi', 'su', 'se', 'so'],
  ['ta', 'chi', 'tsu', 'te', 'to'],
  ['na', 'ni', 'nu', 'ne', 'no'],
  ['ha', 'hi', 'fu', 'he', 'ho'],
  ['ma', 'mi', 'mu', 'me', 'mo'],
  ['ya', null, 'yu', null, 'yo'],
  ['ra', 'ri', 'ru', 're', 'ro'],
  ['wa', null, null, null, 'wo'],
  ['n', null, null, null, null],
];

export const KANA_LINES = [
  { idx: 0, name: 'Voyelles', jaLabel: 'あ行' },
  { idx: 1, name: 'Ligne K', jaLabel: 'か行' },
  { idx: 2, name: 'Ligne S', jaLabel: 'さ行' },
  { idx: 3, name: 'Ligne T', jaLabel: 'た行' },
  { idx: 4, name: 'Ligne N', jaLabel: 'な行' },
  { idx: 5, name: 'Ligne H', jaLabel: 'は行' },
  { idx: 6, name: 'Ligne M', jaLabel: 'ま行' },
  { idx: 7, name: 'Ligne Y', jaLabel: 'や行' },
  { idx: 8, name: 'Ligne R', jaLabel: 'ら行' },
  { idx: 9, name: 'Ligne W', jaLabel: 'わ行' },
  { idx: 10, name: 'N final', jaLabel: 'ん' },
] as const;

/** Petits exemples français pour ancrer la prononciation. */
export function romajiSampleFr(r: string): string {
  const map: Record<string, string> = {
    a: 'papa', i: 'lit', u: 'roue', e: 'thé', o: 'eau',
    ka: 'cas', ki: 'qui', ku: 'cou', ke: 'képi', ko: 'col',
    sa: 'sa', shi: 'chic', su: 'sou', se: 'ces', so: 'sceau',
    ta: 'tas', chi: 'tchic', tsu: 'tsé-tsé', te: 'thé', to: 'tôt',
    na: 'na', ni: 'nid', nu: 'nous', ne: 'né', no: 'nos',
    ha: 'ha', hi: 'hi (anglais)', fu: 'fou (proche)', he: 'hé', ho: 'ho',
    ma: 'ma', mi: 'mi', mu: 'mou', me: 'mes', mo: 'mot',
    ya: 'ya', yu: 'you', yo: 'yo',
    ra: 'ra (roulé léger)', ri: 'ri', ru: 'rou', re: 'ré', ro: 'ro',
    wa: 'oua', wo: 'o',
    n: 'n final',
  };
  return map[r] ?? r;
}
