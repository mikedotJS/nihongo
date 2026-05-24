import type { KanaScript, PaletteTokens } from '../types';

interface Props {
  value: KanaScript;
  onChange: (v: KanaScript) => void;
  palette: PaletteTokens;
  jaFont: string;
}

export function ScriptToggle({ value, onChange, palette, jaFont }: Props) {
  const items: { id: KanaScript; label: string; ja: string }[] = [
    { id: 'hiragana', label: 'Hiragana', ja: 'あ' },
    { id: 'katakana', label: 'Katakana', ja: 'ア' },
  ];
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 3,
        background: palette.surface2,
        border: `1px solid ${palette.line}`,
        borderRadius: 12,
      }}
    >
      {items.map((it) => {
        const active = value === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 9,
              background: active ? palette.surface : 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: active ? palette.ink : palette.mute,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '-0.005em',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              WebkitTapHighlightColor: 'transparent',
              transition: 'all 0.16s',
            }}
          >
            <span style={{ fontFamily: jaFont, fontSize: 14, fontWeight: 500 }}>
              {it.ja}
            </span>
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
