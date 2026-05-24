import type { PaletteTokens } from '../types';

interface Props {
  label: string;
  onClick: () => void;
  palette: PaletteTokens;
  secondary?: boolean;
}

export function PrimaryButton({ label, onClick, palette, secondary = false }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        height: 56,
        borderRadius: 16,
        background: secondary ? 'transparent' : palette.ink,
        color: secondary ? palette.ink : palette.bg,
        border: secondary ? `1px solid ${palette.line}` : 'none',
        fontFamily: 'inherit',
        fontSize: 17,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'transform 0.08s',
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {label}
    </button>
  );
}
