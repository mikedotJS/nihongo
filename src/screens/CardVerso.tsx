import { useMemo, useState } from 'react';
import { KanjiPopover } from '../components/KanjiPopover';
import { ProgressDots } from '../components/ProgressDots';
import { RatingButtons, type RatingLayout } from '../components/RatingButtons';
import { RubySentence } from '../components/RubySentence';
import { RubyWord } from '../components/RubyWord';
import type { KanjiEntry, PaletteTokens, RatingLabel, Word } from '../types';

interface Props {
  card: Word;
  deckIndex: number;
  deckTotal: number;
  palette: PaletteTokens;
  jaFont: string;
  ratingLayout: RatingLayout;
  hints: Record<RatingLabel, string>;
  onRate: (label: RatingLabel) => void;
}

export function CardVerso({
  card,
  deckIndex,
  deckTotal,
  palette,
  jaFont,
  ratingLayout,
  hints,
  onRate,
}: Props) {
  const [showSentenceFuri, setShowSentenceFuri] = useState(true);
  const [showFr, setShowFr] = useState(false);
  const [kanjiOpen, setKanjiOpen] = useState<KanjiEntry | null>(null);

  const kanjiMap = useMemo(() => {
    const m: Record<string, KanjiEntry> = {};
    for (const k of card.kanjis) m[k.char] = k;
    return m;
  }, [card]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: palette.bg,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '56px 28px 0',
          flexShrink: 0,
        }}
      >
        <ProgressDots total={deckTotal} current={deckIndex} palette={palette} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: palette.mute,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.02em',
          }}
        >
          {deckIndex + 1} / {deckTotal}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px 28px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            animation: 'fadeInUp 0.36s 0.0s both cubic-bezier(0.2, 0.7, 0.3, 1)',
          }}
        >
          <RubyWord
            ruby={card.wordRuby}
            showFurigana
            fontSize={72}
            weight={500}
            color={palette.ink}
            jaFont={jaFont}
            onKanjiTap={(char) => {
              const k = kanjiMap[char];
              if (k) setKanjiOpen(k);
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            paddingBottom: 6,
            animation: 'fadeInUp 0.36s 0.08s both cubic-bezier(0.2, 0.7, 0.3, 1)',
          }}
        >
          <div
            style={{
              fontFamily: jaFont,
              fontSize: 24,
              fontWeight: 400,
              color: palette.ink2,
              letterSpacing: '0.06em',
            }}
          >
            {card.reading}
          </div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 400,
              color: palette.mute,
              letterSpacing: '-0.005em',
            }}
          >
            {card.meaning}
          </div>
        </div>

        <div
          style={{
            height: 1,
            background: palette.line,
            margin: '0 auto',
            width: 40,
            animation: 'fadeIn 0.4s 0.14s both',
          }}
        />

        <div
          style={{
            animation: 'fadeInUp 0.36s 0.16s both cubic-bezier(0.2, 0.7, 0.3, 1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: palette.mute,
              }}
            >
              Exemple
            </div>
            <button
              onClick={() => setShowSentenceFuri((s) => !s)}
              style={{
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                color: palette.mute,
                fontSize: 12,
                fontFamily: 'inherit',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '4px 10px',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <circle
                  cx="5.5"
                  cy="5.5"
                  r="4.5"
                  stroke="currentColor"
                  strokeWidth="1"
                  opacity={showSentenceFuri ? 1 : 0.4}
                />
                {showSentenceFuri && (
                  <circle cx="5.5" cy="5.5" r="2" fill="currentColor" />
                )}
              </svg>
              <span>Furigana</span>
            </button>
          </div>
          <div
            style={{
              padding: '20px 18px 18px',
              background: palette.surface,
              borderRadius: 16,
            }}
          >
            <RubySentence
              segments={card.sentence}
              showFurigana={showSentenceFuri}
              fontSize={24}
              color={palette.ink}
              jaFont={jaFont}
            />
            <button
              onClick={() => setShowFr((s) => !s)}
              style={{
                marginTop: 14,
                appearance: 'none',
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 14,
                color: palette.mute,
                fontStyle: showFr ? 'normal' : 'italic',
                fontWeight: 400,
                letterSpacing: '-0.005em',
                textAlign: 'left',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {showFr ? card.sentenceFr : 'Voir la traduction'}
            </button>
          </div>
        </div>

        <div
          style={{
            animation: 'fadeInUp 0.36s 0.22s both cubic-bezier(0.2, 0.7, 0.3, 1)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: palette.mute,
              marginBottom: 14,
            }}
          >
            Kanji
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {card.kanjis.map((k) => (
              <button
                key={k.char}
                onClick={() => setKanjiOpen(k)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '12px 14px',
                  background: 'transparent',
                  border: `1px solid ${palette.line}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background 0.12s',
                }}
                onPointerEnter={(e) =>
                  (e.currentTarget.style.background = palette.faint)
                }
                onPointerLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <span
                  style={{
                    fontFamily: jaFont,
                    fontSize: 32,
                    fontWeight: 500,
                    color: palette.ink,
                    lineHeight: 1,
                    width: 36,
                    textAlign: 'center',
                  }}
                >
                  {k.char}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      color: palette.ink,
                      marginBottom: 2,
                    }}
                  >
                    {k.meaning}
                  </div>
                  <div
                    style={{
                      fontFamily: jaFont,
                      fontSize: 13,
                      color: palette.mute,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {k.readingInWord}
                  </div>
                </div>
                <svg
                  width="6"
                  height="10"
                  viewBox="0 0 6 10"
                  fill="none"
                  style={{ opacity: 0.4 }}
                >
                  <path
                    d="M1 1l4 4-4 4"
                    stroke={palette.ink}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: 8 }} />
      </div>

      <div
        style={{
          padding: '16px 24px 28px',
          background: palette.bg,
          borderTop: `1px solid ${palette.line}`,
          flexShrink: 0,
          animation: 'fadeInUp 0.36s 0.3s both cubic-bezier(0.2, 0.7, 0.3, 1)',
        }}
      >
        <RatingButtons
          palette={palette}
          layout={ratingLayout}
          hints={hints}
          onRate={onRate}
        />
      </div>

      {kanjiOpen && (
        <KanjiPopover
          kanji={kanjiOpen}
          palette={palette}
          jaFont={jaFont}
          onClose={() => setKanjiOpen(null)}
        />
      )}
    </div>
  );
}
