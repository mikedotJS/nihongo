import { PrimaryButton } from '../components/PrimaryButton';
import { SectionLabel } from '../components/SectionLabel';
import type { PaletteTokens, RatingLabel } from '../types';

interface Props {
  palette: PaletteTokens;
  jaFont: string;
  ratings: Record<RatingLabel, number>;
  /** Minutes écoulées de session, optionnel. */
  durationMinutes?: number;
  onDone: () => void;
}

export function SessionEnd({
  palette,
  jaFont,
  ratings,
  durationMinutes,
  onDone,
}: Props) {
  const total =
    ratings.Encore + ratings.Difficile + ratings.Correct + ratings.Facile;
  const items: { label: RatingLabel; n: number; color: string }[] = [
    { label: 'Encore', n: ratings.Encore, color: palette.again },
    { label: 'Difficile', n: ratings.Difficile, color: palette.ink2 },
    { label: 'Correct', n: ratings.Correct, color: palette.good },
    { label: 'Facile', n: ratings.Facile, color: palette.accent },
  ];

  const next = ratings.Encore > 0 ? '10 min' : 'demain';

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
      <SectionLabel color={palette.mute}>Session terminée</SectionLabel>

      <div style={{ marginTop: 6, marginBottom: 36 }}>
        <div
          style={{
            fontFamily: jaFont,
            fontSize: 30,
            fontWeight: 500,
            color: palette.ink,
            letterSpacing: '0.02em',
            lineHeight: 1.3,
            animation: 'fadeInUp 0.45s 0.05s both cubic-bezier(0.2, 0.7, 0.3, 1)',
          }}
        >
          <ruby>
            お疲れ
            <rt
              style={{
                fontSize: '0.4em',
                fontWeight: 400,
                opacity: 0.6,
                letterSpacing: '0.06em',
              }}
            >
              おつかれ
            </rt>
          </ruby>
          <ruby>
            様
            <rt
              style={{
                fontSize: '0.4em',
                fontWeight: 400,
                opacity: 0.6,
                letterSpacing: '0.06em',
              }}
            >
              さま
            </rt>
          </ruby>
          <span>。</span>
        </div>
        <div
          style={{
            fontSize: 14,
            color: palette.mute,
            marginTop: 12,
            lineHeight: 1.5,
            animation: 'fadeInUp 0.45s 0.12s both cubic-bezier(0.2, 0.7, 0.3, 1)',
          }}
        >
          « Merci pour ton effort. »
        </div>
      </div>

      <div
        style={{
          padding: '20px 18px',
          background: palette.surface,
          borderRadius: 18,
          border: `1px solid ${palette.line}`,
          animation: 'fadeInUp 0.45s 0.18s both cubic-bezier(0.2, 0.7, 0.3, 1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <span style={{ fontSize: 15, color: palette.ink, fontWeight: 500 }}>
            {total} cartes révisées
          </span>
          {typeof durationMinutes === 'number' && (
            <span
              style={{
                fontSize: 12,
                color: palette.mute,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              en {durationMinutes} min
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            width: '100%',
            height: 8,
            borderRadius: 4,
            overflow: 'hidden',
            marginBottom: 18,
          }}
        >
          {items.map((it, i) =>
            it.n > 0 ? (
              <div
                key={i}
                style={{
                  flex: it.n,
                  background: it.color,
                  opacity: 0.85,
                  marginRight: 2,
                }}
              />
            ) : null,
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 14,
                color: palette.ink2,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: it.color,
                  opacity: 0.85,
                }}
              />
              <span style={{ flex: 1 }}>{it.label}</span>
              <span
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  color: palette.mute,
                }}
              >
                {it.n}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          fontSize: 13,
          color: palette.mute,
          textAlign: 'center',
          marginBottom: 18,
          lineHeight: 1.5,
          animation: 'fadeIn 0.45s 0.32s both',
        }}
      >
        Prochaine carte dans{' '}
        <strong style={{ color: palette.ink2, fontWeight: 600 }}>{next}</strong>
        .
      </div>

      <PrimaryButton label="Terminer" onClick={onDone} palette={palette} />
    </div>
  );
}
