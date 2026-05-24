/**
 * Hiragana en gojūon order (a, ka, sa, ta, na, ha, ma, ya, ra, wa, n).
 * Puis dakuten (ga, za, da, ba) et handakuten (pa).
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
  // ─── dakuten + handakuten ─────────────────────────────────────────────
  ['が', 'ぎ', 'ぐ', 'げ', 'ご'],
  ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
  ['だ', 'ぢ', 'づ', 'で', 'ど'],
  ['ば', 'び', 'ぶ', 'べ', 'ぼ'],
  ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'],
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
  ['ガ', 'ギ', 'グ', 'ゲ', 'ゴ'],
  ['ザ', 'ジ', 'ズ', 'ゼ', 'ゾ'],
  ['ダ', 'ヂ', 'ヅ', 'デ', 'ド'],
  ['バ', 'ビ', 'ブ', 'ベ', 'ボ'],
  ['パ', 'ピ', 'プ', 'ペ', 'ポ'],
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
  // ぢ et づ sont graphiquement distincts de じ et ず mais sonnent pareil ;
  // on les distingue par le kana, pas par le romaji (et le pool de
  // distracteurs filtre par romaji — donc on n'en mettra jamais 2 dans les
  // mêmes choix avec des labels identiques).
  ['ga', 'gi', 'gu', 'ge', 'go'],
  ['za', 'ji', 'zu', 'ze', 'zo'],
  ['da', 'ji', 'zu', 'de', 'do'],
  ['ba', 'bi', 'bu', 'be', 'bo'],
  ['pa', 'pi', 'pu', 'pe', 'po'],
];

export interface KanaLine {
  idx: number;
  name: string;
  jaLabel: string;
  /** Texte d'intro affiché sur la page Découverte. Optionnel. */
  note?: string;
}

/** Une unité kana atomique : caractère + romaji + ligne d'origine. */
export interface KanaItem {
  kana: string;
  romaji: string;
  lineIdx: number;
}

export const KANA_LINES: ReadonlyArray<KanaLine> = [
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
  {
    idx: 11,
    name: 'Ligne G',
    jaLabel: 'が行',
    note: 'Dakuten ゛ sur la ligne K — même tracé, son voisé (g).',
  },
  {
    idx: 12,
    name: 'Ligne Z',
    jaLabel: 'ざ行',
    note: 'Dakuten ゛ sur la ligne S. Note : し devient じ (« ji »).',
  },
  {
    idx: 13,
    name: 'Ligne D',
    jaLabel: 'だ行',
    note: 'Dakuten ゛ sur la ligne T. ぢ se prononce « ji » et づ « zu » — identiques à じ et ず, mais avec un kana différent.',
  },
  {
    idx: 14,
    name: 'Ligne B',
    jaLabel: 'ば行',
    note: 'Dakuten ゛ sur la ligne H — son voisé (b).',
  },
  {
    idx: 15,
    name: 'Ligne P',
    jaLabel: 'ぱ行',
    note: 'Handakuten ゜ (le petit rond) sur la ligne H — son « p ».',
  },
];

/**
 * Renvoie tous les signes d'un script jusqu'à `throughLine` inclus.
 * Si `throughLine` est omis, renvoie tous les signes du script.
 */
export function kanaItemsUpTo(
  script: 'hiragana' | 'katakana',
  throughLine?: number,
): KanaItem[] {
  const grid = script === 'katakana' ? KATAKANA_GRID : KANA_GRID;
  const limit = throughLine ?? grid.length - 1;
  const out: KanaItem[] = [];
  for (let r = 0; r <= limit; r++) {
    grid[r]?.forEach((ch, c) => {
      if (ch) {
        out.push({
          kana: ch,
          romaji: KANA_ROMAJI[r][c] as string,
          lineIdx: r,
        });
      }
    });
  }
  return out;
}

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
    // dakuten / handakuten
    ga: 'gare', gi: 'gui', gu: 'gourde', ge: 'gué', go: 'goal',
    za: 'zazou', ji: 'jeu', zu: 'zou', ze: 'zèbre', zo: 'zoo',
    da: 'dame', de: 'dé', do: 'dos',
    ba: 'bas', bi: 'bi', bu: 'bouh', be: 'bé', bo: 'bo',
    pa: 'pas', pi: 'pi', pu: 'pou', pe: 'pé', po: 'pot',
  };
  return map[r] ?? r;
}
