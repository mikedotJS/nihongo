import { useState } from 'react';
import { SectionLabel } from '../components/SectionLabel';
import type { PaletteTokens } from '../types';

export type OnboardingChoice = 'beginner' | 'resumer';

interface Props {
  palette: PaletteTokens;
  jaFont: string;
  onPick: (choice: OnboardingChoice) => void;
}

interface OptionProps {
  id: OnboardingChoice;
  japanese: string;
  reading: string;
  title: string;
  sub: string;
  active: boolean;
  onPick: (id: OnboardingChoice) => void;
  onHover: (id: OnboardingChoice | null) => void;
  palette: PaletteTokens;
  jaFont: string;
}

function Option({
  id,
  japanese,
  reading,
  title,
  sub,
  active,
  onPick,
  onHover,
  palette,
  jaFont,
}: OptionProps) {
  return (
    <button
      onClick={() => onPick(id)}
      onPointerEnter={() => onHover(id)}
      onPointerLeave={() => onHover(null)}
      style={{
        display: 'block',
        width: '100%',
        padding: '28px 24px',
        background: active ? palette.surface : 'transparent',
        border: `1px solid ${active ? palette.ink2 : palette.line}`,
        borderRadius: 20,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'all 0.16s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div
        style={{
          fontFamily: jaFont,
          fontSize: 36,
          fontWeight: 500,
          color: palette.ink,
          letterSpacing: '0.02em',
          marginBottom: 4,
        }}
      >
        {japanese}
      </div>
      <div
        style={{
          fontFamily: jaFont,
          fontSize: 14,
          color: palette.mute,
          letterSpacing: '0.06em',
          marginBottom: 16,
        }}
      >
        {reading}
      </div>
      <div style={{ fontSize: 17, fontWeight: 500, color: palette.ink }}>
        {title}
      </div>
      <div
        style={{
          fontSize: 14,
          color: palette.mute,
          marginTop: 4,
          lineHeight: 1.4,
        }}
      >
        {sub}
      </div>
    </button>
  );
}

export function Onboarding({ palette, jaFont, onPick }: Props) {
  const [hover, setHover] = useState<OnboardingChoice | null>(null);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: palette.bg,
        padding: '88px 24px 32px',
      }}
    >
      <div style={{ marginBottom: 48 }}>
        <SectionLabel color={palette.mute}>Bienvenue</SectionLabel>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: palette.ink,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            margin: 0,
            textWrap: 'pretty',
          }}
        >
          Par où commençons-nous&nbsp;?
        </h1>
        <p
          style={{
            fontSize: 15,
            color: palette.mute,
            lineHeight: 1.5,
            margin: '14px 0 0',
            textWrap: 'pretty',
          }}
        >
          Le japonais s’apprend par couches. Choisis la tienne.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          flex: 1,
        }}
      >
        <Option
          id="beginner"
          japanese="はじめて"
          reading="hajimete · pour la première fois"
          title="Grand débutant"
          sub="Je commence par les hiragana et katakana, puis le vocabulaire."
          active={hover === 'beginner'}
          onPick={onPick}
          onHover={setHover}
          palette={palette}
          jaFont={jaFont}
        />
        <Option
          id="resumer"
          japanese="つづける"
          reading="tsuzukeru · continuer"
          title="J’ai déjà des bases"
          sub="Je connais les kana, je veux travailler le vocabulaire."
          active={hover === 'resumer'}
          onPick={onPick}
          onHover={setHover}
          palette={palette}
          jaFont={jaFont}
        />
      </div>
    </div>
  );
}
