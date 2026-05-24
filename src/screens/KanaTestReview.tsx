import { PrimaryButton } from '../components/PrimaryButton';
import { SectionLabel } from '../components/SectionLabel';
import { TopBar } from '../components/TopBar';
import type { KanaItem } from '../data/kana';
import type { PaletteTokens } from '../types';

interface Props {
  palette: PaletteTokens;
  jaFont: string;
  totalQuestions: number;
  /** Liste des signes ratés (dédupliquée par kana). */
  wrong: KanaItem[];
  /**
   * Si true, "Continuer" est caché : il faut passer par re-drill + mini-test
   * pour le débloquer. Si false, les deux boutons sont dispo.
   */
  gateActive: boolean;
  /**
   * Nombre de cycles re-drill + mini-test déjà effectués. Affiché pour
   * informer du progrès quand on est en consolidation.
   */
  cycle: number;
  /** Lance le re-drill ciblé sur les ratés. */
  onReview: () => void;
  /** Continue le flux normal (transition vers la suite). */
  onContinue: () => void;
  onBack: () => void;
}

export function KanaTestReview({
  palette,
  jaFont,
  totalQuestions,
  wrong,
  gateActive,
  cycle,
  onReview,
  onContinue,
  onBack,
}: Props) {
  const correct = totalQuestions - wrong.length;
  const pct = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: palette.bg,
      }}
    >
      <TopBar palette={palette} onBack={onBack} title="Récap" />

      <div style={{ padding: '8px 24px 0', flex: 1, overflowY: 'auto' }}>
        <SectionLabel color={palette.mute}>Résultat</SectionLabel>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              color: palette.ink,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {correct}
            <span
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: palette.mute,
                letterSpacing: '0',
              }}
            >
              {' '}
              / {totalQuestions}
            </span>
          </div>
          <div
            style={{
              fontSize: 14,
              color: palette.mute,
              fontWeight: 500,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {pct}%
          </div>
        </div>

        <p
          style={{
            fontSize: 14,
            color: palette.mute,
            lineHeight: 1.5,
            margin: '4px 0 28px',
            maxWidth: 320,
          }}
        >
          {wrong.length === 0
            ? 'Tout est passé. Tu peux continuer.'
            : gateActive
              ? `${wrong.length} signe${wrong.length > 1 ? 's' : ''} fragile${wrong.length > 1 ? 's' : ''} — on consolide avant d'ajouter du neuf, pour ne pas surcharger.`
              : `${wrong.length} signe${wrong.length > 1 ? 's' : ''} à revoir avant de continuer — ou pas, tu décides.`}
          {cycle > 0 && (
            <>
              <br />
              <span style={{ opacity: 0.7 }}>
                Cycle {cycle} de consolidation.
              </span>
            </>
          )}
        </p>

        {wrong.length > 0 && (
          <>
            <SectionLabel color={palette.mute}>À revoir</SectionLabel>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                marginBottom: 28,
              }}
            >
              {wrong.map((w) => (
                <div
                  key={w.kana}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 10,
                    padding: '10px 14px',
                    background: palette.surface,
                    border: `1px solid ${palette.line}`,
                    borderRadius: 12,
                    minWidth: 80,
                  }}
                >
                  <span
                    style={{
                      fontFamily: jaFont,
                      fontSize: 28,
                      fontWeight: 500,
                      color: palette.ink,
                      lineHeight: 1,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {w.kana}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: palette.mute,
                      fontWeight: 500,
                      letterSpacing: '-0.005em',
                    }}
                  >
                    {w.romaji}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 8,
            padding: '12px 16px',
            borderLeft: `2px solid ${palette.line}`,
            fontSize: 12,
            color: palette.mute,
            lineHeight: 1.5,
          }}
        >
          {gateActive
            ? 'Pousser de nouveaux signes sur du fragile sature la mémoire de travail (interférence). On reprend ce qui n’est pas encore acquis, puis on continue.'
            : 'Se tromper et corriger fait partie de l’apprentissage. Tu peux revoir les ratés maintenant ou continuer et y revenir plus tard.'}
        </div>

        <div style={{ height: 24 }} />
      </div>

      <div
        style={{
          padding: '12px 24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {wrong.length > 0 && (
          <PrimaryButton
            label={`Revoir ces ${wrong.length} signe${wrong.length > 1 ? 's' : ''}`}
            onClick={onReview}
            palette={palette}
          />
        )}
        {(!gateActive || wrong.length === 0) && (
          <PrimaryButton
            label="Continuer"
            onClick={onContinue}
            palette={palette}
            secondary={wrong.length > 0}
          />
        )}
      </div>
    </div>
  );
}
