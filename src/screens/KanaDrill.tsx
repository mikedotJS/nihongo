import { useState } from 'react';
import { TopBar } from '../components/TopBar';
import { KANA_GRID, KANA_ROMAJI, KATAKANA_GRID } from '../data/kana';
import type { KanaItem } from '../data/kana';
import { log } from '../lib/log';
import type { KanaScript, PaletteTokens } from '../types';

interface Props {
  palette: PaletteTokens;
  jaFont: string;
  script: KanaScript;
  /** Index de la ligne kana à driller. Ignoré si `customQuestions` est défini. */
  lineIdx?: number;
  /**
   * Si défini, drill ciblé sur ces signes (mode re-drill après test) au lieu
   * d'une ligne entière. Les distracteurs sont pris dans la ligne d'origine
   * de chaque signe (so ら → distracteurs r-row, ぐ → distracteurs g-row).
   */
  customQuestions?: KanaItem[];
  /** Nombre de questions du drill. */
  total?: number;
  /** Titre affiché. Défaut dépend du mode. */
  title?: string;
  onComplete: () => void;
  onBack: () => void;
}

type Item = KanaItem;

interface DrillStep {
  q: Item;
  choices: Item[];
}

function gridFor(script: KanaScript) {
  return script === 'katakana' ? KATAKANA_GRID : KANA_GRID;
}

function itemsForLine(script: KanaScript, lineIdx: number): Item[] {
  const grid = gridFor(script);
  const out: Item[] = [];
  grid[lineIdx]?.forEach((ch, c) => {
    if (ch) {
      out.push({
        kana: ch,
        romaji: KANA_ROMAJI[lineIdx][c] as string,
        lineIdx,
      });
    }
  });
  return out;
}

function itemsThroughLine(script: KanaScript, throughLine: number): Item[] {
  const grid = gridFor(script);
  const out: Item[] = [];
  for (let r = 0; r <= throughLine; r++) {
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

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Choisit 3 distracteurs.
 *
 * Stratégie : on tire **en priorité dans la ligne en cours** (vraies
 * confusions : a/i/u/e/o, ka/ki/ku/ke/ko). C'est ça qui rend le drill
 * réellement testant — un distracteur d'une autre ligne est trop facile à
 * écarter, l'utilisateur sait qu'il drille K-row et écarte mentalement
 * tout ce qui ne ressemble pas à K-row.
 *
 * Fallback cross-line : pour les lignes courtes (わ, ん, ya), on complète
 * avec les lignes précédentes pour atteindre 4 choix.
 */
function pickDistractors(
  q: Item,
  sameLine: Item[],
  fallback: Item[],
): Item[] {
  const sameLineOthers = sameLine.filter((p) => p.romaji !== q.romaji);
  const fromSameLine = shuffled(sameLineOthers).slice(0, 3);

  if (fromSameLine.length >= 3) return fromSameLine;

  // Compléter avec les lignes précédentes (en excluant ce qu'on a déjà).
  const usedRomaji = new Set([q.romaji, ...fromSameLine.map((p) => p.romaji)]);
  const extras = shuffled(fallback.filter((p) => !usedRomaji.has(p.romaji))).slice(
    0,
    3 - fromSameLine.length,
  );
  return [...fromSameLine, ...extras];
}

/**
 * Drill par ligne (cas standard). Distracteurs same-line privilégiés, fallback
 * cross-line pour les lignes courtes.
 */
function buildDrill(
  script: KanaScript,
  lineIdx: number,
  total: number,
): DrillStep[] {
  const questions = itemsForLine(script, lineIdx);
  if (questions.length === 0) return [];

  const sameLinePool = questions;
  const crossLineFallback = itemsThroughLine(script, lineIdx);

  // Deck-shuffle : tirage sans remise dans un « sac » qui se recharge
  // quand il est vide. Garantit que chaque signe sort au moins ⌊total/pool⌋
  // fois — donc si total ≥ pool, aucun signe n'est jamais skip. Évite aussi
  // que le sac fraîchement rechargé démarre par le même signe qui vient de
  // sortir, pour ne pas avoir de répétition adjacente.
  let bag: Item[] = shuffled(questions);
  let lastDrawn: Item | null = null;

  return Array.from({ length: total }, () => {
    if (bag.length === 0) {
      bag = shuffled(questions);
      if (
        lastDrawn &&
        bag.length > 1 &&
        bag[bag.length - 1].romaji === lastDrawn.romaji
      ) {
        [bag[bag.length - 1], bag[bag.length - 2]] = [
          bag[bag.length - 2],
          bag[bag.length - 1],
        ];
      }
    }
    const q = bag.pop()!;
    lastDrawn = q;
    const distractors = pickDistractors(q, sameLinePool, crossLineFallback);
    return { q, choices: shuffled([...distractors, q]) };
  });
}

/**
 * Re-drill ciblé : pool = liste arbitraire de signes (typiquement les ratés
 * d'un test). Pour chaque question, les distracteurs sont d'abord pris dans
 * la **ligne d'origine** du signe (vraie confusion), fallback vers les
 * autres ratés puis vers la même ligne entière.
 */
function buildRedrill(
  script: KanaScript,
  questions: Item[],
  total: number,
): DrillStep[] {
  if (questions.length === 0) return [];

  let bag: Item[] = shuffled(questions);
  let lastDrawn: Item | null = null;

  return Array.from({ length: total }, () => {
    if (bag.length === 0) {
      bag = shuffled(questions);
      if (
        lastDrawn &&
        bag.length > 1 &&
        bag[bag.length - 1].romaji === lastDrawn.romaji
      ) {
        [bag[bag.length - 1], bag[bag.length - 2]] = [
          bag[bag.length - 2],
          bag[bag.length - 1],
        ];
      }
    }
    const q = bag.pop()!;
    lastDrawn = q;
    const sameLinePool = itemsForLine(script, q.lineIdx);
    // Fallback : autres ratés + ligne d'origine.
    const fallback = [...itemsThroughLine(script, q.lineIdx), ...questions];
    const distractors = pickDistractors(q, sameLinePool, fallback);
    return { q, choices: shuffled([...distractors, q]) };
  });
}

export function KanaDrill({
  palette,
  jaFont,
  script,
  lineIdx,
  customQuestions,
  total,
  title,
  onComplete,
  onBack,
}: Props) {
  const isRedrill = !!customQuestions;
  // Pour un re-drill on adapte le total : au moins 2 passages par signe, et
  // un minimum de 8 quand on a peu de signes ratés.
  const effectiveTotal =
    total ??
    (customQuestions
      ? Math.max(8, customQuestions.length * 2)
      : 8);

  const build = (): DrillStep[] => {
    if (customQuestions) return buildRedrill(script, customQuestions, effectiveTotal);
    return buildDrill(script, lineIdx ?? 0, effectiveTotal);
  };

  // Sequence pseudo-aléatoire générée une fois au mount (ou si les params
  // changent). useState init function = appelée une seule fois, donc
  // `Math.random` reste hors du rendu — purity rule satisfaite.
  const [drill, setDrill] = useState<DrillStep[]>(() => {
    const built = build();
    log.info('drill', 'mount', {
      script,
      mode: isRedrill ? 'redrill' : 'line',
      lineIdx,
      customCount: customQuestions?.length,
      total: effectiveTotal,
      built: built.length,
      sequence: built.map((s) => s.q.romaji),
      sampleChoices: built[0]?.choices.map((c) => c.romaji),
    });
    return built;
  });
  const customKey = customQuestions?.map((q) => q.kana).join('|') ?? '';
  const wantedKey = `${script}:${lineIdx ?? '-'}:${effectiveTotal}:${customKey}`;
  const [drillKey, setDrillKey] = useState(wantedKey);
  if (drillKey !== wantedKey) {
    const built = build();
    log.info('drill', 'rebuild (params changed)', {
      script,
      mode: isRedrill ? 'redrill' : 'line',
      lineIdx,
      customCount: customQuestions?.length,
      total: effectiveTotal,
      sequence: built.map((s) => s.q.romaji),
    });
    setDrill(built);
    setDrillKey(wantedKey);
  }

  const [questionIdx, setQuestionIdx] = useState(0);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    chosen: string;
  } | null>(null);
  const [streak, setStreak] = useState(0);

  const cur = drill[questionIdx];

  const choose = (c: Item) => {
    if (feedback || !cur) return;
    const correct = c.romaji === cur.q.romaji;
    log.debug('drill', 'choose', {
      qIdx: questionIdx,
      kana: cur.q.kana,
      expected: cur.q.romaji,
      chosen: c.romaji,
      correct,
      streak: correct ? streak + 1 : 0,
    });
    setFeedback({ correct, chosen: c.romaji });
    setStreak((s) => (correct ? s + 1 : 0));
    setTimeout(
      () => {
        if (questionIdx + 1 >= drill.length) {
          log.info('drill', 'complete', {
            mode: isRedrill ? 'redrill' : 'line',
            lineIdx,
            total: drill.length,
          });
          onComplete();
        } else {
          setQuestionIdx((i) => i + 1);
          setFeedback(null);
        }
      },
      correct ? 520 : 1100,
    );
  };

  if (!cur) return null;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: palette.bg,
      }}
    >
      <TopBar
        palette={palette}
        onBack={onBack}
        title={
          title ??
          (isRedrill
            ? `À revoir · ${script === 'katakana' ? 'Katakana' : 'Hiragana'}`
            : `Drill · ${script === 'katakana' ? 'Katakana' : 'Hiragana'}`)
        }
        right={
          streak >= 3 ? (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: palette.good,
                letterSpacing: '0.04em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              ×{streak}
            </div>
          ) : null
        }
      />

      <div style={{ padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: drill.length }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background:
                  i < questionIdx
                    ? palette.ink2
                    : i === questionIdx
                      ? palette.ink
                      : palette.line,
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
        }}
      >
        <div
          key={questionIdx}
          style={{
            fontFamily: jaFont,
            fontSize: 200,
            fontWeight: 500,
            color: feedback
              ? feedback.correct
                ? palette.good
                : palette.again
              : palette.ink,
            lineHeight: 1,
            letterSpacing: '0.02em',
            transition: 'color 0.18s',
            animation: 'fadeInUp 0.24s cubic-bezier(0.2, 0.7, 0.3, 1)',
          }}
        >
          {cur.q.kana}
        </div>
      </div>

      <div
        style={{
          padding: '0 24px 28px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
        {cur.choices.map((c, i) => {
          const isChosen = feedback && feedback.chosen === c.romaji;
          const isCorrect = c.romaji === cur.q.romaji;
          let bg = palette.surface,
            fg = palette.ink,
            bd = palette.line;
          if (feedback) {
            if (isCorrect) {
              bg = palette.goodSoft;
              fg = palette.good;
              bd = palette.good;
            } else if (isChosen) {
              bg = palette.againSoft;
              fg = palette.again;
              bd = palette.again;
            } else {
              fg = palette.mute;
            }
          }
          return (
            <button
              key={i}
              onClick={() => choose(c)}
              disabled={!!feedback}
              style={{
                height: 64,
                borderRadius: 14,
                background: bg,
                color: fg,
                border: `1px solid ${bd}`,
                fontFamily: 'inherit',
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: '-0.005em',
                cursor: feedback ? 'default' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.18s',
              }}
            >
              {c.romaji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
