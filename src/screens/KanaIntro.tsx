import { PrimaryButton } from '../components/PrimaryButton';
import { ScriptToggle } from '../components/ScriptToggle';
import { SectionLabel } from '../components/SectionLabel';
import type { KanaScript, PaletteTokens } from '../types';

interface Props {
  palette: PaletteTokens;
  jaFont: string;
  script: KanaScript;
  onScriptChange?: (s: KanaScript) => void;
  onStart: () => void;
}

const PHASES = [
  {
    num: '1',
    ja: '発見',
    jaR: 'hakken',
    title: 'Découverte',
    sub: 'Une ligne à la fois, cinq signes. Forme et son, sans test.',
  },
  {
    num: '2',
    ja: '練習',
    jaR: 'renshū',
    title: 'Drill',
    sub: 'Reconnaissance immédiate, lignes mélangées au fur et à mesure.',
  },
  {
    num: '3',
    ja: '通過',
    jaR: 'tsūka',
    title: 'Test de sortie',
    sub: 'Tous les signes — base + dakuten/handakuten. Le vocabulaire s’ouvre ensuite.',
  },
];

export function KanaIntro({ palette, jaFont, script, onScriptChange, onStart }: Props) {
  const isKata = script === 'katakana';
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
      <SectionLabel color={palette.mute}>
        {isKata ? 'Étape 2 · Katakana' : 'Étape 1 · Hiragana'}
      </SectionLabel>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: palette.ink,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          margin: '4px 0 6px',
          textWrap: 'pretty',
        }}
      >
        71 signes. Une à deux semaines.
      </h1>
      <p
        style={{
          fontSize: 15,
          color: palette.mute,
          lineHeight: 1.5,
          margin: 0,
          textWrap: 'pretty',
        }}
      >
        {isKata
          ? 'Mêmes sons que les hiragana, traits plus anguleux. Surtout pour les mots étrangers.'
          : 'Un sas, traversé une seule fois. Trois phases courtes.'}
      </p>

      {onScriptChange && (
        <div style={{ marginTop: 18 }}>
          <ScriptToggle
            value={script}
            onChange={onScriptChange}
            palette={palette}
            jaFont={jaFont}
          />
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginTop: 28,
          marginBottom: 'auto',
        }}
      >
        {PHASES.map((p, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 18,
              padding: '18px 16px',
              background: palette.surface,
              border: `1px solid ${palette.line}`,
              borderRadius: 16,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                background: palette.ink,
                color: palette.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 600,
                flexShrink: 0,
                marginTop: 2,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {p.num}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: palette.ink,
                  }}
                >
                  {p.title}
                </div>
                <div
                  style={{
                    fontFamily: jaFont,
                    fontSize: 13,
                    color: palette.mute,
                    letterSpacing: '0.04em',
                  }}
                >
                  {p.ja} <span style={{ opacity: 0.7 }}>· {p.jaR}</span>
                </div>
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: palette.ink2,
                  lineHeight: 1.45,
                }}
              >
                {p.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <PrimaryButton label="Commencer" onClick={onStart} palette={palette} />
      </div>
    </div>
  );
}
