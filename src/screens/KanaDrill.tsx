import { useMemo, useState } from 'react';
import { TopBar } from '../components/TopBar';
import { KANA_GRID, KANA_ROMAJI, KATAKANA_GRID } from '../data/kana';
import type { KanaScript, PaletteTokens } from '../types';

interface Props {
  palette: PaletteTokens;
  jaFont: string;
  script: KanaScript;
  /** Nombre de questions du drill. */
  total?: number;
  /** Nombre de lignes du tableau couvertes par le pool. */
  poolLines?: number;
  onComplete: () => void;
  onBack: () => void;
}

interface Item {
  kana: string;
  romaji: string;
}

export function KanaDrill({
  palette,
  jaFont,
  script,
  total = 8,
  poolLines = 3,
  onComplete,
  onBack,
}: Props) {
  const grid = script === 'katakana' ? KATAKANA_GRID : KANA_GRID;
  const pool: Item[] = useMemo(() => {
    const all: Item[] = [];
    for (let r = 0; r < poolLines; r++) {
      grid[r].forEach((ch, c) => {
        if (ch) all.push({ kana: ch, romaji: KANA_ROMAJI[r][c] as string });
      });
    }
    return all;
  }, [grid, poolLines]);

  const [questionIdx, setQuestionIdx] = useState(0);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    chosen: string;
  } | null>(null);
  const [streak, setStreak] = useState(0);

  const seq: Item[] = useMemo(() => {
    const seeded = (i: number) =>
      Math.floor((((i * 9301 + 49297) % 233280) / 233280) * pool.length);
    return Array.from({ length: total }, (_, i) => pool[seeded(i)]);
  }, [pool, total]);

  const cur = seq[questionIdx] ?? seq[0];

  const choices: Item[] = useMemo(() => {
    if (!cur) return [];
    const others = pool.filter((p) => p.romaji !== cur.romaji);
    const seed = questionIdx * 31;
    const picks: Item[] = [];
    for (let i = 0; i < 3; i++) {
      const idx = (seed + i * 7) % others.length;
      const pick = others[idx];
      if (!picks.find((p) => p.romaji === pick.romaji)) picks.push(pick);
      else picks.push(others[(idx + 1) % others.length]);
    }
    return [...picks, cur].sort((a, b) => a.romaji.localeCompare(b.romaji));
  }, [questionIdx, cur, pool]);

  const choose = (c: Item) => {
    if (feedback) return;
    const correct = c.romaji === cur.romaji;
    setFeedback({ correct, chosen: c.romaji });
    setStreak((s) => (correct ? s + 1 : 0));
    setTimeout(
      () => {
        if (questionIdx + 1 >= total) {
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
        title={script === 'katakana' ? 'Drill · Katakana' : 'Drill · Hiragana'}
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
          {Array.from({ length: total }).map((_, i) => (
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
          {cur.kana}
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
        {choices.map((c, i) => {
          const isChosen = feedback && feedback.chosen === c.romaji;
          const isCorrect = c.romaji === cur.romaji;
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
