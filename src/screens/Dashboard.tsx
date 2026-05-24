import { PrimaryButton } from '../components/PrimaryButton';
import { SectionLabel } from '../components/SectionLabel';
import type { PaletteTokens } from '../types';

/** Cartes révisées sur les 7 derniers jours, du plus ancien au plus récent. */
export interface DailyEntry {
  /** ISO local "YYYY-MM-DD". */
  date: string;
  count: number;
}

interface Props {
  palette: PaletteTokens;
  jaFont: string;
  dues: number;
  newCards: number;
  onStart: () => void;
  onSettings: () => void;
  /** Les 7 dernières journées, du plus ancien au plus récent (le dernier = aujourd'hui). */
  lastDays: DailyEntry[];
}

// L M M J V S D — initiales françaises, indexées sur Date.getDay() (0=dim).
const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export function Dashboard({
  palette,
  jaFont,
  dues,
  newCards,
  onStart,
  onSettings,
  lastDays,
}: Props) {
  const total = dues + newCards;
  const lastDaysTotal = lastDays.reduce((s, e) => s + e.count, 0);
  // L'intensité de chaque barre est relative au max de la fenêtre — comme ça
  // une « petite » journée reste lisible dans un contexte de gros volumes.
  const maxCount = Math.max(1, ...lastDays.map((e) => e.count));
  const lastIndex = lastDays.length - 1;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: palette.bg,
      }}
    >
      <div
        style={{
          padding: '56px 24px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: jaFont,
              fontSize: 22,
              fontWeight: 500,
              color: palette.ink,
              letterSpacing: '0.04em',
            }}
          >
            日本語
          </div>
        </div>
        <button
          onClick={onSettings}
          aria-label="Paramètres"
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
            color: palette.mute,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle
              cx="10"
              cy="10"
              r="2.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M10 1.5v2.4M10 16.1v2.4M3.5 10H1.1M18.9 10h-2.4M5.4 5.4 3.7 3.7M16.3 16.3l-1.7-1.7M5.4 14.6l-1.7 1.7M16.3 3.7l-1.7 1.7"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 24px',
        }}
      >
        <div>
          <div style={{ marginBottom: 14 }}>
            <SectionLabel color={palette.mute}>Aujourd’hui</SectionLabel>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                fontSize: 112,
                fontWeight: 600,
                color: palette.ink,
                letterSpacing: '-0.04em',
                lineHeight: 0.95,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {total}
            </div>
            <div
              style={{
                fontSize: 18,
                color: palette.mute,
                fontWeight: 500,
              }}
            >
              cartes aujourd’hui
            </div>
          </div>
          <div
            style={{
              fontSize: 14,
              color: palette.mute,
              marginBottom: 14,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span style={{ color: palette.ink2, fontWeight: 500 }}>{dues}</span>{' '}
            révisions ·{' '}
            <span style={{ color: palette.ink2, fontWeight: 500 }}>{newCards}</span>{' '}
            nouvelles
          </div>
          <div
            style={{
              fontSize: 15,
              color: palette.mute,
              lineHeight: 1.5,
              maxWidth: 280,
            }}
          >
            Quinze minutes, à ton rythme. Pas plus.
          </div>
        </div>

        <div style={{ height: 32 }} />

        <div
          style={{
            padding: '18px 16px',
            background: palette.surface,
            borderRadius: 16,
            border: `1px solid ${palette.line}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: palette.mute,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              7 derniers jours
            </span>
            <span
              style={{
                fontSize: 12,
                color: palette.mute,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {lastDaysTotal} cartes
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 6,
              justifyContent: 'space-between',
            }}
          >
            {lastDays.map((entry, i) => {
              const isToday = i === lastIndex;
              // Date.parse('YYYY-MM-DD') interprète UTC ; on reconstruit local
              // pour avoir le bon jour de la semaine.
              const [y, m, d] = entry.date.split('-').map(Number);
              const dow = new Date(y, m - 1, d).getDay();
              return (
                <div
                  key={entry.date}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: 28,
                      borderRadius: 4,
                      background: entry.count === 0 ? palette.faint : palette.ink2,
                      opacity:
                        entry.count === 0 ? 1 : 0.3 + (entry.count / maxCount) * 0.7,
                      border: isToday ? `1px dashed ${palette.mute}` : 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      color: palette.mute,
                      fontWeight: 500,
                    }}
                  >
                    {DAY_LETTERS[dow]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 24px 28px' }}>
        <PrimaryButton
          label={total === 0 ? 'Aucune révision' : 'Commencer la révision'}
          onClick={onStart}
          palette={palette}
        />
      </div>
    </div>
  );
}
