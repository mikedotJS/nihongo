import type { PaletteTokens } from '../types';

interface Props {
  total: number;
  current: number;
  palette: PaletteTokens;
}

export function ProgressDots({ total, current, palette }: Props) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 18 : 6,
            height: 3,
            borderRadius: 2,
            background:
              i < current
                ? palette.ink2
                : i === current
                  ? palette.ink
                  : palette.line,
            transition: 'all 0.25s',
          }}
        />
      ))}
    </div>
  );
}
