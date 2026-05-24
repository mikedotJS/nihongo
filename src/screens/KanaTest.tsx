import { useState } from 'react';
import { SectionLabel } from '../components/SectionLabel';
import { TopBar } from '../components/TopBar';
import { KANA_GRID, KANA_ROMAJI, KATAKANA_GRID } from '../data/kana';
import type { KanaItem } from '../data/kana';
import { log } from '../lib/log';
import type { KanaScript, PaletteTokens } from '../types';

interface Props {
  palette: PaletteTokens;
  jaFont: string;
  script: KanaScript;
  /**
   * Nombre de questions du test. Défaut = taille du pool.
   */
  total?: number;
  /**
   * Si défini, limite le pool aux lignes 0..throughLine (inclusif).
   * Utilisé pour les **tests intermédiaires** (récap de ce qu'on vient
   * d'apprendre). Si non défini → test de sortie sur tous les signes.
   */
  throughLine?: number;
  /**
   * Si défini, ignore throughLine et utilise *exactement* ces signes comme
   * pool de questions. Utilisé pour le **mini-test** après re-drill — on
   * teste précisément ce qu'on vient de revoir. Distracteurs same-line.
   */
  customQuestions?: KanaItem[];
  /** Titre custom (sinon dérivé du mode). */
  title?: string;
  /** Sous-titre custom (sinon dérivé du mode). */
  subtitle?: string;
  /**
   * Reçoit la liste des kana ratés en fin de test (dédupliquée).
   * Vide si tout est correct.
   */
  onComplete: (wrong: KanaItem[]) => void;
  onBack: () => void;
}

type Item = KanaItem;

interface TestStep {
  q: Item;
  choices: Item[];
}

function gridFor(script: KanaScript) {
  return script === 'katakana' ? KATAKANA_GRID : KANA_GRID;
}

function itemsUpTo(script: KanaScript, throughLine?: number): Item[] {
  const grid = gridFor(script);
  const limit = throughLine ?? grid.length - 1;
  const out: Item[] = [];
  for (let r = 0; r <= limit; r++) {
    grid[r]?.forEach((ch, c) => {
      if (ch) {
        out.push({
          kana: ch,
          romaji: KANA_ROMAJI[r][c] as string,
          lineIdx: r,
        });
      }
    });
  }
  return out;
}

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function itemsForLine(script: KanaScript, lineIdx: number): Item[] {
  const grid = gridFor(script);
  const out: Item[] = [];
  grid[lineIdx]?.forEach((ch, c) => {
    if (ch) {
      out.push({
        kana: ch,
        romaji: KANA_ROMAJI[lineIdx][c] as string,
        lineIdx,
      });
    }
  });
  return out;
}

function buildTest(
  script: KanaScript,
  total: number,
  throughLine?: number,
): TestStep[] {
  const pool = itemsUpTo(script, throughLine);
  if (pool.length === 0) return [];

  // Sans répétition tant qu'on a assez de pool. Si total > pool.length on
  // wrap (rare en pratique : pool = 71, demande typique ≤ 71).
  const questions: Item[] = [];
  let bag = shuffled(pool);
  for (let i = 0; i < total; i++) {
    if (bag.length === 0) bag = shuffled(pool);
    questions.push(bag.pop()!);
  }

  return questions.map((q) => {
    const others = pool.filter((p) => p.romaji !== q.romaji);
    const distractors = shuffled(others).slice(0, 3);
    return { q, choices: shuffled([...distractors, q]) };
  });
}

/**
 * Mini-test : pool = liste arbitraire de signes (typiquement les ratés du
 * test précédent, post re-drill). Chaque signe est testé exactement une
 * fois (pas de wrap). Distracteurs same-line en priorité (vraies
 * confusions), fallback sur les autres candidats du mini-pool ou la ligne.
 */
function buildMiniTest(script: KanaScript, items: Item[]): TestStep[] {
  if (items.length === 0) return [];
  const questions = shuffled(items);
  return questions.map((q) => {
    const sameLine = itemsForLine(script, q.lineIdx);
    const sameLineOthers = sameLine.filter((p) => p.romaji !== q.romaji);
    let distractors = shuffled(sameLineOthers).slice(0, 3);
    if (distractors.length < 3) {
      const used = new Set([q.romaji, ...distractors.map((p) => p.romaji)]);
      const extras = shuffled(
        items.filter((p) => !used.has(p.romaji)),
      ).slice(0, 3 - distractors.length);
      distractors = [...distractors, ...extras];
    }
    return { q, choices: shuffled([...distractors, q]) };
  });
}

export function KanaTest({
  palette,
  jaFont,
  script,
  total,
  throughLine,
  customQuestions,
  title,
  subtitle,
  onComplete,
  onBack,
}: Props) {
  const isMini = !!customQuestions;
  const isIntermediate = !isMini && throughLine !== undefined;
  const effectiveTotal = isMini
    ? customQuestions!.length
    : (total ?? itemsUpTo(script, throughLine).length);

  const build = (): TestStep[] => {
    if (isMini) return buildMiniTest(script, customQuestions!);
    return buildTest(script, effectiveTotal, throughLine);
  };

  const [test, setTest] = useState<TestStep[]>(() => {
    const built = build();
    log.info('test', 'mount', {
      script,
      mode: isMini ? 'mini' : isIntermediate ? 'intermediate' : 'final',
      total: effectiveTotal,
      throughLine,
      customCount: customQuestions?.length,
      built: built.length,
      sequence: built.map((s) => s.q.romaji),
    });
    return built;
  });
  const customKey = customQuestions?.map((q) => q.kana).join('|') ?? '';
  const wantedKey = `${script}:${effectiveTotal}:${throughLine ?? 'all'}:${customKey}`;
  const [testKey, setTestKey] = useState(wantedKey);
  if (testKey !== wantedKey) {
    const built = build();
    log.info('test', 'rebuild (params changed)', {
      script,
      mode: isMini ? 'mini' : isIntermediate ? 'intermediate' : 'final',
      total: effectiveTotal,
      throughLine,
      customCount: customQuestions?.length,
      sequence: built.map((s) => s.q.romaji),
    });
    setTest(built);
    setTestKey(wantedKey);
  }

  const [qIdx, setQIdx] = useState(0);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    chosen: string;
  } | null>(null);
  // Map kana→Item des items ratés. On dédoublonne par kana (le même signe
  // peut tomber 2× dans la séquence ; un seul échec suffit pour le marquer
  // comme à revoir).
  const [wrong, setWrong] = useState<Record<string, Item>>({});

  const cur = test[qIdx];

  const choose = (c: Item) => {
    if (feedback || !cur) return;
    const correct = c.romaji === cur.q.romaji;
    log.debug('test', 'choose', {
      qIdx,
      kana: cur.q.kana,
      expected: cur.q.romaji,
      chosen: c.romaji,
      correct,
    });
    setFeedback({ correct, chosen: c.romaji });
    let nextWrong = wrong;
    if (!correct) {
      nextWrong = { ...wrong, [cur.q.kana]: cur.q };
      setWrong(nextWrong);
    }
    setTimeout(
      () => {
        if (qIdx + 1 >= test.length) {
          const wrongList = Object.values(nextWrong);
          log.info('test', 'complete', {
            total: test.length,
            wrong: wrongList.length,
            wrongKanas: wrongList.map((w) => w.kana),
          });
          onComplete(wrongList);
        } else {
          setQIdx((i) => i + 1);
          setFeedback(null);
        }
      },
      correct ? 460 : 1000,
    );
  };

  if (!cur) return null;
  const pct = Math.round((qIdx / test.length) * 100);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: palette.bg,
      }}
    >
      <TopBar
        palette={palette}
        onBack={onBack}
        title={
          title ??
          (isMini
            ? `Mini-test · ${script === 'katakana' ? 'Katakana' : 'Hiragana'}`
            : isIntermediate
              ? `Récap · ${script === 'katakana' ? 'Katakana' : 'Hiragana'}`
              : `Test · ${script === 'katakana' ? 'Katakana' : 'Hiragana'}`)
        }
        right={
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: palette.mute,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {qIdx}/{test.length}
          </span>
        }
      />

      <div style={{ padding: '0 24px' }}>
        <div
          style={{
            width: '100%',
            height: 4,
            borderRadius: 2,
            background: palette.line,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: palette.ink,
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      <div style={{ padding: '20px 24px 0' }}>
        <SectionLabel color={palette.mute}>
          {isMini
            ? 'Mini-test de consolidation'
            : isIntermediate
              ? 'Test intermédiaire'
              : 'Phase 3 · Test de sortie'}
        </SectionLabel>
        <p
          style={{
            fontSize: 13,
            color: palette.mute,
            margin: '4px 0 0',
            lineHeight: 1.4,
          }}
        >
          {subtitle ??
            (isMini
              ? `Re-test sur les ${effectiveTotal} signes que tu viens de revoir. Zéro erreur = on continue.`
              : isIntermediate
                ? `Récap de ce que tu viens d’apprendre — ${effectiveTotal} signes.`
                : script === 'katakana'
                  ? 'Une seule passe. Le vocabulaire s’ouvre ensuite.'
                  : 'Une seule passe. Les katakana suivent.')}
        </p>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
        }}
      >
        <div
          key={qIdx}
          style={{
            fontFamily: jaFont,
            fontSize: 200,
            fontWeight: 500,
            color: feedback
              ? feedback.correct
                ? palette.good
                : palette.again
              : palette.ink,
            lineHeight: 1,
            letterSpacing: '0.02em',
            transition: 'color 0.18s',
            animation: 'fadeInUp 0.24s cubic-bezier(0.2, 0.7, 0.3, 1)',
          }}
        >
          {cur.q.kana}
        </div>
      </div>

      <div
        style={{
          padding: '0 24px 28px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
        {cur.choices.map((c, i) => {
          const isChosen = feedback && feedback.chosen === c.romaji;
          const isCorrect = c.romaji === cur.q.romaji;
          let bg = palette.surface,
            fg = palette.ink,
            bd = palette.line;
          if (feedback) {
            if (isCorrect) {
              bg = palette.goodSoft;
              fg = palette.good;
              bd = palette.good;
            } else if (isChosen) {
              bg = palette.againSoft;
              fg = palette.again;
              bd = palette.again;
            } else {
              fg = palette.mute;
            }
          }
          return (
            <button
              key={i}
              onClick={() => choose(c)}
              disabled={!!feedback}
              style={{
                height: 64,
                borderRadius: 14,
                background: bg,
                color: fg,
                border: `1px solid ${bd}`,
                fontFamily: 'inherit',
                fontSize: 22,
                fontWeight: 500,
                cursor: feedback ? 'default' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.18s',
              }}
            >
              {c.romaji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
