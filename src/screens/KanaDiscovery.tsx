import { useState } from 'react';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScriptToggle } from '../components/ScriptToggle';
import { SectionLabel } from '../components/SectionLabel';
import { TopBar } from '../components/TopBar';
import {
  KANA_GRID,
  KANA_LINES,
  KANA_ROMAJI,
  KATAKANA_GRID,
  romajiSampleFr,
} from '../data/kana';
import type { KanaScript, PaletteTokens } from '../types';

interface Props {
  palette: PaletteTokens;
  jaFont: string;
  script: KanaScript;
  onScriptChange?: (s: KanaScript) => void;
  onNext: (next: 'drill' | 'test') => void;
  onBack: () => void;
}

export function KanaDiscovery({
  palette,
  jaFont,
  script,
  onScriptChange,
  onNext,
  onBack,
}: Props) {
  const [line, setLine] = useState(0);
  const cur = KANA_LINES[line];
  const grid = script === 'katakana' ? KATAKANA_GRID : KANA_GRID;
  const items = grid[cur.idx]
    .map((ch, i) =>
      ch ? { ch, romaji: KANA_ROMAJI[cur.idx][i] as string } : null,
    )
    .filter((x): x is { ch: string; romaji: string } => x !== null);

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
        title={`Découverte · ${line + 1}/${KANA_LINES.length}`}
      />

      {onScriptChange && (
        <div
          style={{
            padding: '0 24px 12px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <ScriptToggle
            value={script}
            onChange={onScriptChange}
            palette={palette}
            jaFont={jaFont}
          />
        </div>
      )}

      <div style={{ padding: '4px 24px 0' }}>
        <div style={{ display: 'flex', gap: 3, marginBottom: 22 }}>
          {KANA_LINES.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= line ? palette.ink : palette.line,
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ padding: '0 24px 0' }}>
        <SectionLabel color={palette.mute}>Phase 1 · Découverte</SectionLabel>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
            marginBottom: 4,
          }}
        >
          <h2
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: palette.ink,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            {cur.name}
          </h2>
          <span
            style={{
              fontFamily: jaFont,
              fontSize: 16,
              color: palette.mute,
              letterSpacing: '0.04em',
            }}
          >
            {cur.jaLabel}
          </span>
        </div>
        <p
          style={{
            fontSize: 14,
            color: palette.mute,
            margin: '0 0 18px',
            lineHeight: 1.5,
          }}
        >
          Cinq nouveaux signes. Prends ton temps — il n’y a rien à valider.
        </p>
      </div>

      <div style={{ flex: 1, padding: '0 24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: '10px 14px',
                borderTop: i === 0 ? 'none' : `1px solid ${palette.line}`,
              }}
            >
              <div
                style={{
                  fontFamily: jaFont,
                  fontSize: 56,
                  fontWeight: 500,
                  color: palette.ink,
                  lineHeight: 1,
                  width: 64,
                  textAlign: 'center',
                  letterSpacing: '0.02em',
                }}
              >
                {it.ch}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    color: palette.ink,
                    letterSpacing: '-0.005em',
                  }}
                >
                  {it.romaji}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: palette.mute,
                    marginTop: 2,
                  }}
                >
                  comme dans «&nbsp;{romajiSampleFr(it.romaji)}&nbsp;»
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: '12px 24px 28px',
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          onClick={() => setLine((l) => Math.max(0, l - 1))}
          disabled={line === 0}
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'transparent',
            border: `1px solid ${palette.line}`,
            color: palette.ink,
            cursor: line === 0 ? 'default' : 'pointer',
            opacity: line === 0 ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M9 2L4 7l5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <PrimaryButton
            label={
              line < KANA_LINES.length - 1 ? 'Drill cette ligne' : 'Passer au test'
            }
            onClick={() => {
              if (line < KANA_LINES.length - 1) {
                onNext('drill');
                setLine((l) => Math.min(KANA_LINES.length - 1, l + 1));
              } else {
                onNext('test');
              }
            }}
            palette={palette}
          />
        </div>
      </div>
    </div>
  );
}
