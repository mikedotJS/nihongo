import { Fragment } from 'react';
import type { RubySegment } from '../types';

interface Props {
  segments: RubySegment[];
  showFurigana: boolean;
  fontSize?: number;
  color: string;
  jaFont: string;
}

export function RubySentence({
  segments,
  showFurigana,
  fontSize = 26,
  color,
  jaFont,
}: Props) {
  return (
    <ruby
      style={{
        fontFamily: jaFont,
        fontSize,
        fontWeight: 400,
        color,
        lineHeight: 1.6,
        letterSpacing: '0.01em',
        rubyPosition: 'over',
      }}
    >
      {segments.map((seg, i) => {
        if ('t' in seg) {
          return (
            <Fragment key={i}>
              {seg.t}
              <rt style={{ visibility: 'hidden' }}></rt>
            </Fragment>
          );
        }
        return (
          <Fragment key={i}>
            {seg.k}
            <rt
              style={{
                fontSize: '0.42em',
                fontWeight: 400,
                opacity: showFurigana ? 0.55 : 0,
                letterSpacing: '0.06em',
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
