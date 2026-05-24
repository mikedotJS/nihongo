import type { ReactNode } from 'react';
import type { PaletteTokens } from '../types';

interface Props {
  palette: PaletteTokens;
  onBack: () => void;
  title: string;
  right?: ReactNode;
}

export function TopBar({ palette, onBack, title, right }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '52px 20px 14px',
        gap: 8,
      }}
    >
      <button
        onClick={onBack}
        aria-label="Retour"
        style={{
          appearance: 'none',
          border: 'none',
          background: 'transparent',
          width: 36,
          height: 36,
          borderRadius: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: palette.ink,
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
      <div
        style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 600,
          color: palette.ink,
          letterSpacing: '-0.005em',
        }}
      >
        {title}
      </div>
      <div
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        {right}
      </div>
    </div>
  );
}
