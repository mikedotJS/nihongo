import type { PaletteTokens, RatingLabel } from '../types';

export type RatingLayout = 'hierarchical' | 'grid' | 'row';

interface RateButtonProps {
  label: RatingLabel;
  hint?: string;
  onClick: () => void;
  variant: 'dominant' | 'soft';
  palette: PaletteTokens;
  fullWidth?: boolean;
}

function RateButton({
  label,
  hint,
  onClick,
  variant,
  palette,
  fullWidth = false,
}: RateButtonProps) {
  const isAgain = label === 'Encore';
  const isGood = label === 'Correct';
  let bg: string, fg: string, bd: string;
  if (variant === 'dominant') {
    if (isAgain) {
      bg = palette.again;
      fg = palette.onAccent;
      bd = 'transparent';
    } else if (isGood) {
      bg = palette.good;
      fg = palette.onAccent;
      bd = 'transparent';
    } else {
      bg = palette.accent;
      fg = palette.onAccent;
      bd = 'transparent';
    }
  } else {
    bg = 'transparent';
    fg = palette.ink2;
    bd = palette.line;
  }
  return (
    <button
      onClick={onClick}
      style={{
        flex: fullWidth ? undefined : 1,
        width: fullWidth ? '100%' : undefined,
        height: variant === 'dominant' ? 56 : 44,
        padding: '0 14px',
        borderRadius: 14,
        background: bg,
        color: fg,
        border: `1px solid ${bd}`,
        fontFamily: 'inherit',
        fontSize: variant === 'dominant' ? 17 : 15,
        fontWeight: variant === 'dominant' ? 600 : 500,
        letterSpacing: '-0.01em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        cursor: 'pointer',
        transition: 'transform 0.08s, filter 0.12s',
        WebkitTapHighlightColor: 'transparent',
      }}
      onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <span>{label}</span>
      {hint && variant === 'dominant' && (
        <span
          style={{
            opacity: 0.6,
            fontSize: 12,
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {hint}
        </span>
      )}
    </button>
  );
}

interface Props {
  palette: PaletteTokens;
  layout: RatingLayout;
  hints: Record<RatingLabel, string>;
  onRate: (label: RatingLabel) => void;
}

export function RatingButtons({ palette, layout, hints, onRate }: Props) {
  const ALL: RatingLabel[] = ['Encore', 'Difficile', 'Correct', 'Facile'];

  if (layout === 'row') {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {ALL.map((l) => (
          <RateButton
            key={l}
            label={l}
            hint={hints[l]}
            variant="dominant"
            palette={palette}
            onClick={() => onRate(l)}
          />
        ))}
      </div>
    );
  }

  if (layout === 'grid') {
    return (
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
      >
        {ALL.map((l) => (
          <RateButton
            key={l}
            label={l}
            hint={hints[l]}
            variant="dominant"
            palette={palette}
            onClick={() => onRate(l)}
          />
        ))}
      </div>
    );
  }

  // 'hierarchical' — Encore + Correct dominants, Difficile + Facile en soft
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <RateButton
          label="Encore"
          hint={hints.Encore}
          variant="dominant"
          palette={palette}
          onClick={() => onRate('Encore')}
        />
        <RateButton
          label="Correct"
          hint={hints.Correct}
          variant="dominant"
          palette={palette}
          onClick={() => onRate('Correct')}
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <RateButton
          label="Difficile"
          variant="soft"
          palette={palette}
          onClick={() => onRate('Difficile')}
        />
        <RateButton
          label="Facile"
          variant="soft"
          palette={palette}
          onClick={() => onRate('Facile')}
        />
      </div>
    </div>
  );
}
