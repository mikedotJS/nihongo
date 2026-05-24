import { ProgressDots } from '../components/ProgressDots';
import { RubyWord } from '../components/RubyWord';
import type { PaletteTokens, Word } from '../types';

interface Props {
  card: Word;
  deckIndex: number;
  deckTotal: number;
  palette: PaletteTokens;
  jaFont: string;
  revealMode: 'tap' | 'button';
  onReveal: () => void;
}

export function CardRecto({
  card,
  deckIndex,
  deckTotal,
  palette,
  jaFont,
  revealMode,
  onReveal,
}: Props) {
  const tappable = revealMode === 'tap';
  return (
    <div
      onClick={tappable ? onReveal : undefined}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: palette.bg,
        cursor: tappable ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '56px 28px 0',
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: palette.mute,
              marginBottom: 32,
            }}
          >
            {card.pos}
          </div>
          <RubyWord
            ruby={card.wordRuby}
            showFurigana={false}
            fontSize={96}
            weight={500}
            color={palette.ink}
            jaFont={jaFont}
          />
        </div>
      </div>

      <div style={{ padding: '0 24px 44px' }}>
        {revealMode === 'tap' ? (
          <div
            style={{
              textAlign: 'center',
              color: palette.mute,
              fontSize: 13,
              letterSpacing: '0.02em',
              animation: 'gentlePulse 2.4s ease-in-out infinite',
            }}
          >
            Toucher pour révéler
          </div>
        ) : (
          <button
            onClick={onReveal}
            style={{
              width: '100%',
              height: 52,
              borderRadius: 14,
              background: palette.ink,
              color: palette.bg,
              border: 'none',
              fontFamily: 'inherit',
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Révéler
          </button>
        )}
      </div>
    </div>
  );
}
