import type { KanjiEntry, PaletteTokens } from '../types';

interface Props {
  kanji: KanjiEntry;
  palette: PaletteTokens;
  jaFont: string;
  onClose: () => void;
}

export function KanjiPopover({ kanji, palette, jaFont, onClose }: Props) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.32)',
        display: 'flex',
        alignItems: 'flex-end',
        animation: 'fadeIn 0.18s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          background: palette.surface,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: '12px 24px 44px',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
          animation: 'slideUp 0.24s cubic-bezier(0.2, 0.7, 0.3, 1)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: palette.line,
            margin: '0 auto 18px',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          <div
            style={{
              fontFamily: jaFont,
              fontSize: 96,
              fontWeight: 500,
              color: palette.ink,
              lineHeight: 1,
              letterSpacing: '0.02em',
              marginTop: -4,
            }}
          >
            {kanji.char}
          </div>
          <div style={{ flex: 1, paddingTop: 6 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: palette.mute,
                marginBottom: 4,
              }}
            >
              sens
            </div>
            <div
              style={{
                fontSize: 18,
                color: palette.ink,
                lineHeight: 1.35,
                marginBottom: 18,
              }}
            >
              {kanji.meaning}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: palette.mute,
                marginBottom: 4,
              }}
            >
              lecture dans ce mot
            </div>
            <div
              style={{
                fontFamily: jaFont,
                fontSize: 24,
                fontWeight: 500,
                color: palette.ink,
                letterSpacing: '0.04em',
              }}
            >
              {kanji.readingInWord}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
