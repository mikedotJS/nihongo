import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  color: string;
  marginBottom?: number;
}

export function SectionLabel({ children, color, marginBottom = 10 }: Props) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color,
        marginBottom,
      }}
    >
      {children}
    </div>
  );
}
