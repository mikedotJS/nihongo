import { useRef, useState } from 'react';
import type { PaletteTokens } from '../types';

interface Props {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  palette: PaletteTokens;
}

export function CustomSlider({ min, max, value, onChange, palette }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const update = (clientX: number) => {
    if (!trackRef.current) return;
    const r = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const v = Math.round(min + ratio * (max - min));
    onChange(v);
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    update(e.clientX);
    const move = (ev: PointerEvent) => update(ev.clientX);
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div
      ref={trackRef}
      onPointerDown={onDown}
      style={{
        position: 'relative',
        height: 22,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          height: 4,
          borderRadius: 2,
          background: palette.line,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          height: 4,
          borderRadius: 2,
          width: `${pct}%`,
          background: palette.ink,
          transition: dragging ? 'none' : 'width 0.15s',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `calc(${pct}% - 11px)`,
          width: 22,
          height: 22,
          borderRadius: 11,
          background: palette.surface,
          border: `1.5px solid ${palette.ink}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          transition: dragging ? 'none' : 'left 0.15s',
        }}
      />
    </div>
  );
}
