import { useMemo, useState } from 'react';
import { SectionLabel } from '../components/SectionLabel';
import { TopBar } from '../components/TopBar';
import { KANA_GRID, KANA_ROMAJI, KATAKANA_GRID } from '../data/kana';
import type { KanaScript, PaletteTokens } from '../types';

interface Props {
  palette: PaletteTokens;
  jaFont: string;
  script: KanaScript;
  /** Brief : « les 46 signes ». Maintenu configurable pour la démo. */
  total?: number;
  onComplete: () => void;
  onBack: () => void;
}

interface Item {
  kana: string;
  romaji: string;
}

export function KanaTest({
  palette,
  jaFont,
  script,
  total = 10,
  onComplete,
  onBack,
}: Props) {
  const grid = script === 'katakana' ? KATAKANA_GRID : KANA_GRID;
  const pool: Item[] = useMemo(() => {
    const all: Item[] = [];
    grid.forEach((row, r) => {
      row.forEach((ch, c) => {
        if (ch) all.push({ kana: ch, romaji: KANA_ROMAJI[r][c] as string });
      });
    });
    return all;
  }, [grid]);

  const [qIdx, setQIdx] = useState(0);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    chosen: string;
  } | null>(null);

  const seq: Item[] = useMemo(() => {
    const seeded = (i: number) =>
      Math.floor(((i * 16807) % 2147483647) / 2147483647 * pool.length);
    return Array.from({ length: total }, (_, i) => pool[seeded(i + 1)]);
  }, [pool, total]);

  const cur = seq[qIdx];

  const choices: Item[] = useMemo(() => {
    if (!cur) return [];
    const others = pool.filter((p) => p.romaji !== cur.romaji);
    const seed = qIdx * 53;
    const picks: Item[] = [];
    for (let i = 0; i < 3; i++) {
      const idx = (seed + i * 11) % others.length;
      const pick = others[idx];
      if (!picks.find((p) => p.romaji === pick.romaji)) picks.push(pick);
      else picks.push(others[(idx + 1) % others.length]);
    }
    return [...picks, cur].sort((a, b) => a.romaji.localeCompare(b.romaji));
  }, [qIdx, cur, pool]);

  const choose = (c: Item) => {
    if (feedback) return;
    const correct = c.romaji === cur.romaji;
    setFeedback({ correct, chosen: c.romaji });
    setTimeout(
      () => {
        if (qIdx + 1 >= total) onComplete();
        else {
          setQIdx((i) => i + 1);
          setFeedback(null);
        }
      },
      correct ? 460 : 1000,
    );
  };

  if (!cur) return null;
  const pct = Math.round((qIdx / total) * 100);

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
        title={script === 'katakana' ? 'Test · Katakana' : 'Test · Hiragana'}
        right={
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: palette.mute,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {qIdx}/{total}
          </span>
        }
      />

      <div style={{ padding: '0 24px' }}>
        <div
          style={{
            width: '100%',
            height: 4,
            borderRadius: 2,
            background: palette.line,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: palette.ink,
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      <div style={{ padding: '20px 24px 0' }}>
        <SectionLabel color={palette.mute}>Phase 3 · Test de sortie</SectionLabel>
        <p
          style={{
            fontSize: 13,
            color: palette.mute,
            margin: '4px 0 0',
            lineHeight: 1.4,
          }}
        >
          {script === 'katakana'
            ? 'Une seule passe. Le vocabulaire s’ouvre ensuite.'
            : 'Une seule passe. Les katakana suivent.'}
        </p>
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
          key={qIdx}
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
