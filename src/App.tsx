import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SEED_DECK } from './data/deck';
import { getJaFont, getPalette } from './lib/theme';
import {
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  clearSession,
  formatLocalDate,
  incrementDailyCount,
  loadAllReviewStates,
  loadLastNDays,
  loadProgress,
  loadSession,
  loadSettings,
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
  pushProgress,
  pushReviewState,
  pushSettings,
} from './lib/sync';
import { CardRecto } from './screens/CardRecto';
import { CardVerso } from './screens/CardVerso';
import { Dashboard, type DailyEntry } from './screens/Dashboard';
import { EmptyState } from './screens/EmptyState';
import { KanaDiscovery } from './screens/KanaDiscovery';
import { KanaDrill } from './screens/KanaDrill';
import { KanaIntro } from './screens/KanaIntro';
import { KanaTest } from './screens/KanaTest';
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
  const [screen, setScreen] = useState<Screen>('loading');
  const [kanaScript, setKanaScript] = useState<KanaScript>('hiragana');

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

      // Synchro `based` : pull en arrière-plan. Si le remote est plus récent,
      // on patch le state local sans flash (l'UI affiche déjà le state local).
      // Erreurs réseau silencieuses — l'app reste pleinement fonctionnelle.
      void (async () => {
        const merged = await pullAndMerge();
        if (!alive) return;
        if (merged.settings) setSettings(merged.settings);
        if (merged.progress)
          setProgress((prev) => ({
            ...prev,
            ...merged.progress!,
            // activeSessionStartedAt reste local (jamais synchro).
            activeSessionStartedAt: prev.activeSessionStartedAt,
          }));
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
    pushSettings(settings);
  }, [settings, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void saveProgress(progress);
    pushProgress(progress);
  }, [progress, hydrated]);

  // Snapshot de session pour interruptibilité — sauvegarde à chaque rate.
  useEffect(() => {
    if (!hydrated) return;
    if (startedAt && queue.length > 0 && cursor < queue.length) {
      void saveSession({ startedAt, queue, cursor, ratings });
    }
  }, [hydrated, queue, cursor, ratings, startedAt]);

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
        onScriptChange={setKanaScript}
        onNext={(next) => setScreen(next === 'test' ? 'kana-test' : 'kana-drill')}
        onBack={() => setScreen('kana-intro')}
      />
    );
  }

  if (screen === 'kana-drill') {
    return (
      <KanaDrill
        palette={palette}
        jaFont={jaFont}
        script={kanaScript}
        onComplete={() => setScreen('kana-discovery')}
        onBack={() => setScreen('kana-discovery')}
      />
    );
  }

  if (screen === 'kana-test') {
    return (
      <KanaTest
        palette={palette}
        jaFont={jaFont}
        script={kanaScript}
        onComplete={finishKana}
        onBack={() => setScreen('kana-discovery')}
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
