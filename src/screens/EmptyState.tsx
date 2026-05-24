import { PrimaryButton } from '../components/PrimaryButton';
import { SectionLabel } from '../components/SectionLabel';
import type { PaletteTokens } from '../types';

interface Props {
  palette: PaletteTokens;
  jaFont: string;
  onDone: () => void;
}

export function EmptyState({ palette, jaFont, onDone }: Props) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: palette.bg,
        padding: '56px 24px 28px',
      }}
    >
      <SectionLabel color={palette.mute}>Aujourd’hui</SectionLabel>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            fontFamily: jaFont,
            fontSize: 220,
            fontWeight: 300,
            color: palette.ink,
            opacity: 0.16,
            lineHeight: 0.85,
            letterSpacing: '0.02em',
            marginBottom: 8,
            marginLeft: -8,
          }}
        >
          休
        </div>
        <div
          style={{
            fontFamily: jaFont,
            fontSize: 13,
            fontWeight: 500,
            color: palette.mute,
            letterSpacing: '0.12em',
            marginBottom: 32,
          }}
        >
          yasumi · repos
        </div>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: palette.ink,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            margin: 0,
            textWrap: 'pretty',
          }}
        >
          Rien à réviser aujourd’hui.
        </h1>
        <p
          style={{
            fontSize: 15,
            color: palette.mute,
            lineHeight: 1.5,
            margin: '12px 0 0',
            maxWidth: 280,
            textWrap: 'pretty',
          }}
        >
          Reviens demain. La répétition espacée fonctionne mieux qu’une session
          forcée.
        </p>
      </div>

      <PrimaryButton
        label="Fermer"
        onClick={onDone}
        palette={palette}
        secondary
      />
    </div>
  );
}
