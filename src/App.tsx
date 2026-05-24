import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SEED_DECK } from './data/deck';
import { KANA_LINES, kanaItemsUpTo, type KanaItem } from './data/kana';
import { getJaFont, getPalette } from './lib/theme';
import {
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  clearSession,
  formatLocalDate,
  incrementDailyCount,
  kanaFailureId,
  loadAllReviewStates,
  loadLastNDays,
  loadProgress,
  loadSession,
  loadSettings,
  saveKanaFailure,
  saveProgress,
  saveReviewState,
  saveSession,
  saveSettings,
} from './lib/storage';
import {
  applyRating,
  buildSessionQueue,
  makeInitialReviewState,
  previewIntervals,
} from './lib/srs';
import {
  pullAndMerge,
  pushDailyRecord,
  pushKanaFailure,
  pushProgress,
  pushReviewState,
  pushSettings,
} from './lib/sync';
import { log } from './lib/log';
import { CardRecto } from './screens/CardRecto';
import { CardVerso } from './screens/CardVerso';
import { Dashboard, type DailyEntry } from './screens/Dashboard';
import { EmptyState } from './screens/EmptyState';
import { KanaDiscovery } from './screens/KanaDiscovery';
import { KanaDrill } from './screens/KanaDrill';
import { KanaIntro } from './screens/KanaIntro';
import { KanaTest } from './screens/KanaTest';
import { KanaTestReview } from './screens/KanaTestReview';
import { Onboarding } from './screens/Onboarding';
import { SessionEnd } from './screens/SessionEnd';
import { Settings as SettingsScreen } from './screens/Settings';
import type {
  KanaScript,
  Progress,
  RatingLabel,
  ReviewState,
  Settings,
} from './types';

type Screen =
  | 'loading'
  | 'onboarding'
  | 'kana-intro'
  | 'kana-discovery'
  | 'kana-drill'
  | 'kana-test'
  | 'kana-test-review'
  | 'kana-redrill'
  | 'kana-mini-test'
  | 'dashboard'
  | 'settings'
  | 'recto'
  | 'verso'
  | 'end'
  | 'empty';

const EMPTY_RATINGS: Record<RatingLabel, number> = {
  Encore: 0,
  Difficile: 0,
  Correct: 0,
  Facile: 0,
};

/** Test intermédiaire toutes les N lignes drillées (cf. discussion). */
const INTERMEDIATE_TEST_EVERY = 5;
/** Si ≥ ce nombre d'erreurs dans un drill de 8 questions, on redrill la
 *  même ligne au lieu d'avancer (charge cognitive : ne pas empiler du neuf
 *  sur du fragile). */
const DRILL_FAIL_THRESHOLD = 3;
/** Cap d'auto-redrill d'une même ligne pour ne pas bloquer indéfiniment. */
const DRILL_MAX_ATTEMPTS = 3;
/** Au-dessus de ce taux d'erreur sur un test, on gate "Continuer" et on
 *  oblige à passer par un cycle re-drill + mini-test. */
const TEST_GATE_ERROR_RATIO = 0.3;
/** Après N cycles consécutifs sans débloquer le gate, on relâche
 *  ("Continuer quand même") pour ne pas bloquer l'utilisateur. */
const TEST_GATE_MAX_CYCLES = 3;

export default function App() {
  // ─── State persisté ─────────────────────────────────────────────────────
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<Progress>(DEFAULT_PROGRESS);
  const [reviewStates, setReviewStates] = useState<Record<string, ReviewState>>(
    {},
  );
  const [hydrated, setHydrated] = useState(false);

  // ─── Préférence système pour le thème (cf. §7 du brief : pas configurable) ─
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const m = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);

  const palette = getPalette(settings.paletteId, systemDark);
  const jaFont = getJaFont(settings.jaFont);

  // ─── Navigation ─────────────────────────────────────────────────────────
  const [screen, setScreenRaw] = useState<Screen>('loading');
  const setScreen = (next: Screen) => {
    log.debug('app', 'screen →', next);
    setScreenRaw(next);
  };
  const [kanaScript, setKanaScript] = useState<KanaScript>('hiragana');
  // Index de la ligne kana en cours. Lifté hors de KanaDiscovery pour que
  // le drill sache *quelle* ligne vient d'être apprise.
  const [kanaLine, setKanaLine] = useState(0);
  // Si défini, le prochain `kana-test` est intermédiaire (récap des lignes
  // 0..N drillées jusqu'ici). Sinon, test de sortie sur tout le script.
  const [kanaTestThroughLine, setKanaTestThroughLine] = useState<number | null>(
    null,
  );
  // Résultat du dernier test (intermédiaire ou final) — alimente l'écran
  // de review et le re-drill ciblé.
  const [kanaTestResult, setKanaTestResult] = useState<{
    total: number;
    wrong: KanaItem[];
    /** true si c'était le test final (déclenche finishKana au "Continuer"). */
    isFinal: boolean;
    /** Tant que true, "Continuer" est caché : il faut passer par re-drill + mini-test. */
    gateActive: boolean;
    /** Nombre de cycles re-drill+mini-test déjà tentés. Au-delà de
     *  TEST_GATE_MAX_CYCLES, on lâche le gate (escape valve). */
    cycle: number;
  } | null>(null);
  /** Tentative courante sur un drill de ligne — change la `key` pour forcer
   *  un re-mount fresh quand on relance après échec. */
  const [drillAttempt, setDrillAttempt] = useState(0);

  // ─── État de session ────────────────────────────────────────────────────
  const [queue, setQueue] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [ratings, setRatings] = useState<Record<RatingLabel, number>>(EMPTY_RATINGS);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [lastSessionDurationMin, setLastSessionDurationMin] = useState<number | undefined>(
    undefined,
  );
  const [last7Days, setLast7Days] = useState<DailyEntry[]>([]);
  const sessionRefreshing = useRef(false);
  // Skip le premier push de chaque entité après hydration — c'est juste la
  // lecture initiale, ça écraserait inutilement le remote (et parfois une
  // donnée plus fraîche qu'on s'apprête à pull-merger).
  const initialPushSkipped = useRef({ settings: false, progress: false });

  const currentWord = useMemo(() => {
    const id = queue[cursor];
    return id ? SEED_DECK.find((w) => w.id === id) : undefined;
  }, [queue, cursor]);

  const currentState = currentWord ? reviewStates[currentWord.id] : undefined;

  const hints = useMemo<Record<RatingLabel, string>>(() => {
    if (!currentState)
      return { Encore: '1m', Difficile: '6m', Correct: '10m', Facile: '4j' };
    return previewIntervals(currentState);
  }, [currentState]);

  // ─── Hydratation initiale ───────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    void (async () => {
      const [s, p, allStates, snapshot, days] = await Promise.all([
        loadSettings(),
        loadProgress(),
        loadAllReviewStates(),
        loadSession(),
        loadLastNDays(7),
      ]);
      if (!alive) return;
      setSettings(s);
      setProgress(p);
      setReviewStates(allStates);
      setLast7Days(days);
      // Reprise kana : restaure la position et le script en cours.
      setKanaScript(p.kanaScript);
      setKanaLine(p.kanaLine);

      if (!p.onboardingDone) {
        setScreen('onboarding');
      } else if (!p.kanaCompleted) {
        setScreen('kana-intro');
      } else if (snapshot && snapshot.queue.length > 0) {
        // Reprise de session interrompue.
        setQueue(snapshot.queue);
        setCursor(snapshot.cursor);
        setRatings({
          Encore: snapshot.ratings.Encore ?? 0,
          Difficile: snapshot.ratings.Difficile ?? 0,
          Correct: snapshot.ratings.Correct ?? 0,
          Facile: snapshot.ratings.Facile ?? 0,
        });
        setStartedAt(snapshot.startedAt);
        setScreen('recto');
      } else {
        const built = buildSessionQueue({
          words: SEED_DECK,
          reviewStates: allStates,
          settings: s,
        });
        setScreen(built.queue.length === 0 ? 'empty' : 'dashboard');
      }
      setHydrated(true);
      log.info('app', 'hydrated', {
        words: SEED_DECK.length,
        reviewStates: Object.keys(allStates).length,
        last7DaysTotal: days.reduce((s, d) => s + d.count, 0),
        onboardingDone: p.onboardingDone,
        kanaCompleted: p.kanaCompleted,
        resumingSession: !!(snapshot && snapshot.queue.length > 0),
      });

      // Synchro `based` : pull en arrière-plan. Si le remote est plus récent,
      // on patch le state local sans flash (l'UI affiche déjà le state local).
      // Erreurs réseau silencieuses — l'app reste pleinement fonctionnelle.
      void (async () => {
        const merged = await pullAndMerge();
        if (!alive) return;
        if (merged.settings) setSettings(merged.settings);
        if (merged.progress) {
          const remoteP = merged.progress;
          setProgress((prev) => ({
            ...prev,
            ...remoteP,
            // activeSessionStartedAt reste local (jamais synchro).
            activeSessionStartedAt: prev.activeSessionStartedAt,
          }));
          // Propage aussi vers les états locaux dérivés. Sans ça, le pull
          // mettrait à jour progress mais l'écran resterait sur l'ancien
          // script/ligne (ils étaient lus à l'hydration et figés).
          setKanaScript(remoteP.kanaScript);
          setKanaLine(remoteP.kanaLine);
          // Réoriente l'écran si on était sur kana-intro hiragana et que
          // le remote nous a poussé sur katakana (par ex. autre device qui
          // a fini hiragana entre-temps).
          if (!remoteP.kanaCompleted && !remoteP.onboardingDone) {
            // pas concerné
          }
        }
        if (Object.keys(merged.reviewStates).length > 0) {
          setReviewStates((prev) => ({ ...prev, ...merged.reviewStates }));
        }
        if (Object.keys(merged.daily).length > 0) {
          // Re-lit les 7 derniers jours après le merge.
          const days = await loadLastNDays(7);
          if (alive) setLast7Days(days);
        }
      })();
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ─── Persistance opportuniste (local + sync `based`) ────────────────────
  useEffect(() => {
    if (!hydrated) return;
    void saveSettings(settings);
    if (initialPushSkipped.current.settings) {
      pushSettings(settings);
    } else {
      initialPushSkipped.current.settings = true;
    }
  }, [settings, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void saveProgress(progress);
    if (initialPushSkipped.current.progress) {
      pushProgress(progress);
    } else {
      initialPushSkipped.current.progress = true;
    }
  }, [progress, hydrated]);

  // Snapshot de session pour interruptibilité — sauvegarde à chaque rate.
  useEffect(() => {
    if (!hydrated) return;
    if (startedAt && queue.length > 0 && cursor < queue.length) {
      void saveSession({ startedAt, queue, cursor, ratings });
    }
  }, [hydrated, queue, cursor, ratings, startedAt]);

  // Sync du curseur kana (ligne + script) dans `progress` pour reprise
  // entre sessions. Le test d'égalité empêche les renders en cascade
  // (setProgress retourne le même objet si rien n'a changé).
  useEffect(() => {
    if (!hydrated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress((p) => {
      if (p.kanaLine === kanaLine && p.kanaScript === kanaScript) return p;
      return { ...p, kanaLine, kanaScript, updatedAt: Date.now() };
    });
  }, [hydrated, kanaLine, kanaScript]);

  // ─── Démarrage / fin de session ─────────────────────────────────────────
  const buildAndCounts = useCallback(() => {
    return buildSessionQueue({
      words: SEED_DECK,
      reviewStates,
      settings,
    });
  }, [reviewStates, settings]);

  const counts = buildAndCounts();

  const startSession = () => {
    const built = buildAndCounts();
    log.info('session', 'start', {
      total: built.queue.length,
      dues: built.duesCount,
      news: built.newsCount,
      suspendedNews: built.suspendedNews,
    });
    if (built.queue.length === 0) {
      setScreen('empty');
      return;
    }
    // S'assurer que chaque mot a un ReviewState (pour les news jamais vues).
    const now = new Date();
    const next: Record<string, ReviewState> = { ...reviewStates };
    for (const id of built.queue) {
      if (!next[id]) {
        const w = SEED_DECK.find((w) => w.id === id);
        if (w) next[id] = makeInitialReviewState(w, now);
      }
    }
    setReviewStates(next);
    setQueue(built.queue);
    setCursor(0);
    setRatings(EMPTY_RATINGS);
    setStartedAt(now.toISOString());
    setScreen('recto');
  };

  const handleRate = (label: RatingLabel) => {
    if (!currentWord || !currentState || sessionRefreshing.current) return;
    sessionRefreshing.current = true;

    const now = new Date();
    const updated = applyRating(currentState, label, now);
    log.debug('session', 'rate', {
      wordId: currentWord.id,
      word: currentWord.word,
      label,
      cursor,
      total: queue.length,
      nextDue: updated.fsrs.due.toISOString(),
      state: updated.fsrs.state,
      phase: updated.phase,
    });

    setReviewStates((prev) => ({ ...prev, [currentWord.id]: updated }));
    void saveReviewState(updated);
    pushReviewState(updated);

    // Compteur quotidien pour le Dashboard « 7 derniers jours ».
    const todayKey = formatLocalDate(now);
    setLast7Days((prev) => {
      const next = [...prev];
      const idx = next.findIndex((d) => d.date === todayKey);
      if (idx >= 0) next[idx] = { ...next[idx], count: next[idx].count + 1 };
      return next;
    });
    void (async () => {
      const record = await incrementDailyCount(now);
      pushDailyRecord(record);
    })();

    const nextRatings = { ...ratings, [label]: ratings[label] + 1 };
    setRatings(nextRatings);

    if (cursor + 1 >= queue.length) {
      void clearSession();
      const durMs = startedAt ? now.getTime() - new Date(startedAt).getTime() : 0;
      setLastSessionDurationMin(Math.max(1, Math.round(durMs / 60000)));
      setStartedAt(null);
      setScreen('end');
    } else {
      setCursor((c) => c + 1);
      setScreen('recto');
    }
    sessionRefreshing.current = false;
  };

  // ─── Aiguillage onboarding → kana / dashboard ───────────────────────────
  const onboardingPick = (choice: 'beginner' | 'resumer') => {
    if (choice === 'beginner') {
      setProgress((p) => ({
        ...p,
        onboardingDone: true,
        kanaCompleted: false,
        updatedAt: Date.now(),
      }));
      setKanaScript('hiragana');
      setScreen('kana-intro');
    } else {
      setProgress((p) => ({
        ...p,
        onboardingDone: true,
        kanaCompleted: true,
        updatedAt: Date.now(),
      }));
      const built = buildSessionQueue({
        words: SEED_DECK,
        reviewStates,
        settings,
      });
      setScreen(built.queue.length === 0 ? 'empty' : 'dashboard');
    }
  };

  const finishKana = () => {
    if (kanaScript === 'hiragana') {
      setKanaScript('katakana');
      setKanaLine(0); // sinon on reprend là où le hiragana s'était arrêté (ligne 10)
      setScreen('kana-intro');
    } else {
      setProgress((p) => ({
        ...p,
        kanaCompleted: true,
        updatedAt: Date.now(),
      }));
      const built = buildSessionQueue({
        words: SEED_DECK,
        reviewStates,
        settings,
      });
      setScreen(built.queue.length === 0 ? 'empty' : 'dashboard');
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  if (screen === 'loading' || !hydrated) {
    return (
      <div
        style={{
          flex: 1,
          background: palette.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: jaFont,
          fontSize: 32,
          color: palette.mute,
          letterSpacing: '0.04em',
        }}
      >
        日本語
      </div>
    );
  }

  if (screen === 'onboarding') {
    return <Onboarding palette={palette} jaFont={jaFont} onPick={onboardingPick} />;
  }

  if (screen === 'kana-intro') {
    return (
      <KanaIntro
        palette={palette}
        jaFont={jaFont}
        script={kanaScript}
        onScriptChange={setKanaScript}
        onStart={() => setScreen('kana-discovery')}
      />
    );
  }

  if (screen === 'kana-discovery') {
    return (
      <KanaDiscovery
        palette={palette}
        jaFont={jaFont}
        script={kanaScript}
        onScriptChange={(s) => {
          setKanaScript(s);
          setKanaLine(0);
        }}
        line={kanaLine}
        onLineChange={setKanaLine}
        onNext={(next) => setScreen(next === 'test' ? 'kana-test' : 'kana-drill')}
        onBack={() => setScreen('kana-intro')}
      />
    );
  }

  if (screen === 'kana-drill') {
    return (
      <KanaDrill
        // Forcer un remount frais à chaque tentative (ou changement de ligne).
        key={`drill-${kanaScript}-${kanaLine}-${drillAttempt}`}
        palette={palette}
        jaFont={jaFont}
        script={kanaScript}
        lineIdx={kanaLine}
        onComplete={(wrong) => {
          const drilledLine = kanaLine;
          const drillFailed =
            wrong.length >= DRILL_FAIL_THRESHOLD &&
            drillAttempt < DRILL_MAX_ATTEMPTS - 1;

          if (drillFailed) {
            log.info('app', 'drill failed → redrill same line', {
              line: drilledLine,
              attempt: drillAttempt + 1,
              wrongCount: wrong.length,
            });
            setDrillAttempt((a) => a + 1);
            // On reste sur kana-drill, la nouvelle key déclenchera un re-mount.
            return;
          }

          // Reset le compteur pour la prochaine ligne.
          setDrillAttempt(0);

          const isLast = drilledLine >= KANA_LINES.length - 1;
          if (isLast) {
            log.info('app', 'last drill → final test');
            setKanaTestThroughLine(null);
            setScreen('kana-test');
            return;
          }

          setKanaLine(drilledLine + 1);

          if ((drilledLine + 1) % INTERMEDIATE_TEST_EVERY === 0) {
            log.info('app', 'intermediate test', {
              throughLine: drilledLine,
            });
            setKanaTestThroughLine(drilledLine);
            setScreen('kana-test');
          } else {
            setScreen('kana-discovery');
          }
        }}
        onBack={() => setScreen('kana-discovery')}
      />
    );
  }

  if (screen === 'kana-test') {
    const isIntermediate = kanaTestThroughLine !== null;
    // Le total réel du test = taille du pool ; on le recalcule ici pour
    // l'envoyer à l'écran review. La source de vérité reste KanaTest.
    return (
      <KanaTest
        palette={palette}
        jaFont={jaFont}
        script={kanaScript}
        throughLine={kanaTestThroughLine ?? undefined}
        onComplete={(wrong) => {
          // Le total réel = taille du pool du test (même fonction que
          // KanaTest utilise en interne via itemsUpTo).
          const total = kanaItemsUpTo(
            kanaScript,
            kanaTestThroughLine ?? undefined,
          ).length;
          const errorRatio = total > 0 ? wrong.length / total : 0;
          const gateActive = errorRatio > TEST_GATE_ERROR_RATIO;
          log.info('app', 'test → review', {
            total,
            wrongCount: wrong.length,
            errorRatio: Math.round(errorRatio * 100) + '%',
            isIntermediate,
            gateActive,
          });
          setKanaTestResult({
            total,
            wrong,
            isFinal: !isIntermediate,
            gateActive,
            cycle: 0,
          });
          // Persiste chaque kana raté — accessible en re-exposition future,
          // synchronisé via `based` (table `kana_failures`).
          const now = Date.now();
          for (const w of wrong) {
            const failure = {
              id: kanaFailureId(kanaScript, w.kana),
              script: kanaScript,
              kana: w.kana,
              romaji: w.romaji,
              lineIdx: w.lineIdx,
              updatedAt: now,
            };
            void saveKanaFailure(failure);
            pushKanaFailure(failure);
          }
          setScreen('kana-test-review');
        }}
        onBack={() => setScreen('kana-discovery')}
      />
    );
  }

  if (screen === 'kana-test-review' && kanaTestResult) {
    return (
      <KanaTestReview
        palette={palette}
        jaFont={jaFont}
        totalQuestions={kanaTestResult.total}
        wrong={kanaTestResult.wrong}
        gateActive={kanaTestResult.gateActive}
        cycle={kanaTestResult.cycle}
        onReview={() => {
          log.info('app', 'review → redrill', {
            count: kanaTestResult.wrong.length,
            cycle: kanaTestResult.cycle,
          });
          setScreen('kana-redrill');
        }}
        onContinue={() => {
          const wasFinal = kanaTestResult.isFinal;
          log.info('app', 'review → continue', { wasFinal });
          setKanaTestResult(null);
          if (wasFinal) {
            finishKana();
          } else {
            setKanaTestThroughLine(null);
            setScreen('kana-discovery');
          }
        }}
        onBack={() => setScreen('kana-test-review')}
      />
    );
  }

  if (screen === 'kana-mini-test' && kanaTestResult) {
    return (
      <KanaTest
        // Force un re-mount par cycle pour ne pas garder l'état de l'instance précédente.
        key={`mini-${kanaTestResult.cycle}`}
        palette={palette}
        jaFont={jaFont}
        script={kanaScript}
        customQuestions={kanaTestResult.wrong}
        onComplete={(stillWrong) => {
          const nextCycle = kanaTestResult.cycle + 1;
          const escape = nextCycle >= TEST_GATE_MAX_CYCLES;
          // Gate levé si plus aucune erreur, OU si on a épuisé les cycles
          // (escape valve pour ne pas bloquer indéfiniment).
          const gateStillActive = stillWrong.length > 0 && !escape;
          log.info('app', 'mini-test done', {
            stillWrongCount: stillWrong.length,
            nextCycle,
            escape,
            gateStillActive,
          });
          setKanaTestResult({
            ...kanaTestResult,
            wrong: stillWrong,
            cycle: nextCycle,
            gateActive: gateStillActive,
          });
          setScreen('kana-test-review');
        }}
        onBack={() => setScreen('kana-test-review')}
      />
    );
  }

  if (screen === 'kana-redrill' && kanaTestResult) {
    return (
      <KanaDrill
        palette={palette}
        jaFont={jaFont}
        script={kanaScript}
        customQuestions={kanaTestResult.wrong}
        onComplete={() => {
          // Wrong list du re-drill ignorée ici — on enchaîne sur un mini-test
          // qui sera la vraie ré-évaluation (cf. phase mini-test).
          log.info('app', 'redrill done → mini-test');
          setScreen('kana-mini-test');
        }}
        onBack={() => setScreen('kana-test-review')}
      />
    );
  }

  if (screen === 'dashboard') {
    return (
      <Dashboard
        palette={palette}
        jaFont={jaFont}
        dues={counts.duesCount}
        newCards={counts.newsCount}
        onStart={startSession}
        onSettings={() => setScreen('settings')}
        lastDays={last7Days}
      />
    );
  }

  if (screen === 'settings') {
    return (
      <SettingsScreen
        palette={palette}
        newCardsPerDay={settings.newCardsPerDay}
        onChange={(v) =>
          setSettings((s) => ({ ...s, newCardsPerDay: v, updatedAt: Date.now() }))
        }
        onBack={() => setScreen('dashboard')}
      />
    );
  }

  if (screen === 'recto' && currentWord) {
    return (
      <CardRecto
        card={currentWord}
        deckIndex={cursor}
        deckTotal={queue.length}
        palette={palette}
        jaFont={jaFont}
        revealMode="tap"
        onReveal={() => setScreen('verso')}
      />
    );
  }

  if (screen === 'verso' && currentWord && currentState) {
    return (
      <CardVerso
        card={currentWord}
        deckIndex={cursor}
        deckTotal={queue.length}
        palette={palette}
        jaFont={jaFont}
        ratingLayout="hierarchical"
        hints={hints}
        onRate={handleRate}
      />
    );
  }

  if (screen === 'end') {
    return (
      <SessionEnd
        palette={palette}
        jaFont={jaFont}
        ratings={ratings}
        durationMinutes={lastSessionDurationMin}
        onDone={() => {
          setQueue([]);
          setCursor(0);
          setRatings(EMPTY_RATINGS);
          const built = buildSessionQueue({
            words: SEED_DECK,
            reviewStates,
            settings,
          });
          setScreen(built.queue.length === 0 ? 'empty' : 'dashboard');
        }}
      />
    );
  }

  if (screen === 'empty') {
    return (
      <EmptyState
        palette={palette}
        jaFont={jaFont}
        onDone={() => setScreen('dashboard')}
      />
    );
  }

  // Fallback de sécurité — ne devrait jamais arriver.
  return (
    <Dashboard
      palette={palette}
      jaFont={jaFont}
      dues={counts.duesCount}
      newCards={counts.newsCount}
      onStart={startSession}
      onSettings={() => setScreen('settings')}
      lastDays={last7Days}
    />
  );
}
