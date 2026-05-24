import { Fragment } from 'react';
import type { RubySegment } from '../types';

interface Props {
  ruby: RubySegment[];
  showFurigana?: boolean;
  fontSize?: number;
  weight?: number;
  color: string;
  jaFont: string;
  /** Si fourni, chaque segment kanji devient tappable. */
  onKanjiTap?: (kanji: string, index: number) => void;
}

/** Mot avec furigana en `<ruby>`. Segments kanji optionnellement tappables. */
export function RubyWord({
  ruby,
  showFurigana = true,
  fontSize = 96,
  weight = 500,
  color,
  jaFont,
  onKanjiTap,
}: Props) {
  return (
    <ruby
      style={{
        fontFamily: jaFont,
        fontSize,
        fontWeight: weight,
        color,
        lineHeight: 1.1,
        letterSpacing: '0.02em',
        rubyPosition: 'over',
      }}
    >
      {ruby.map((seg, i) => {
        if ('t' in seg) {
          return (
            <Fragment key={i}>
              {seg.t}
              <rt style={{ visibility: 'hidden' }}></rt>
            </Fragment>
          );
        }
        const tappable = !!onKanjiTap;
        return (
          <Fragment key={i}>
            <span
              onClick={tappable ? () => onKanjiTap!(seg.k, i) : undefined}
              style={{
                cursor: tappable ? 'pointer' : 'default',
                position: 'relative',
                borderRadius: 6,
                transition: 'background 0.15s',
              }}
              onPointerDown={
                tappable
                  ? (e) =>
                      (e.currentTarget.style.background = 'rgba(127,127,127,0.12)')
                  : undefined
              }
              onPointerUp={
                tappable
                  ? (e) => (e.currentTarget.style.background = 'transparent')
                  : undefined
              }
              onPointerLeave={
                tappable
                  ? (e) => (e.currentTarget.style.background = 'transparent')
                  : undefined
              }
            >
              {seg.k}
            </span>
            <rt
              style={{
                fontSize: '0.4em',
                fontWeight: 400,
                opacity: showFurigana ? 0.62 : 0,
                letterSpacing: '0.08em',
                transition: 'opacity 0.25s',
              }}
            >
              {seg.r}
            </rt>
          </Fragment>
        );
      })}
    </ruby>
  );
}
