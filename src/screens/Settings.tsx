import { CustomSlider } from '../components/CustomSlider';
import { SectionLabel } from '../components/SectionLabel';
import { TopBar } from '../components/TopBar';
import type { PaletteTokens } from '../types';

interface Props {
  palette: PaletteTokens;
  newCardsPerDay: number;
  onChange: (v: number) => void;
  onBack: () => void;
}

export function Settings({ palette, newCardsPerDay, onChange, onBack }: Props) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: palette.bg,
      }}
    >
      <TopBar palette={palette} onBack={onBack} title="Paramètres" />

      <div style={{ padding: '8px 24px 0', flex: 1, overflowY: 'auto' }}>
        <SectionLabel color={palette.mute}>Apprentissage</SectionLabel>

        <div
          style={{
            padding: '20px 18px 18px',
            background: palette.surface,
            border: `1px solid ${palette.line}`,
            borderRadius: 16,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: palette.ink,
              marginBottom: 4,
            }}
          >
            Cartes neuves par jour
          </div>
          <div
            style={{
              fontSize: 13,
              color: palette.mute,
              marginBottom: 22,
              lineHeight: 1.45,
            }}
          >
            Le nombre de nouveaux mots introduits chaque jour, en plus des
            révisions dues.
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 52,
                fontWeight: 600,
                color: palette.ink,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {newCardsPerDay}
            </div>
            <div
              style={{
                fontSize: 14,
                color: palette.mute,
                fontWeight: 500,
              }}
            >
              cartes / jour
            </div>
          </div>

          <CustomSlider
            min={5}
            max={20}
            value={newCardsPerDay}
            onChange={onChange}
            palette={palette}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 8,
              fontSize: 11,
              color: palette.mute,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.04em',
            }}
          >
            <span>5</span>
            <span style={{ opacity: 0.5 }}>défaut · 10</span>
            <span>20</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: '12px 16px',
            borderLeft: `2px solid ${palette.line}`,
            fontSize: 12,
            color: palette.mute,
            lineHeight: 1.5,
          }}
        >
          C’est le seul réglage de l’app. Il ne peut pas être modifié pendant
          une session — aucun choix ne doit interrompre la révision.
        </div>

        <div style={{ height: 28 }} />
      </div>
    </div>
  );
}
