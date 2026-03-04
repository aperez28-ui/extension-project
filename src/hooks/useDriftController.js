import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DRIFT_RULES,
  DriftState,
  ReflectionChoice,
  formatElapsed,
  isAfterNightlyCutoff,
  minutesBetween,
} from '../state/driftMachine';

function nowTs() {
  return Date.now();
}

export function useDriftController() {
  const [sessionStartTime] = useState(() => new Date());
  const [state, setState] = useState(DriftState.INTENTIONAL_USE);

  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);
  const [scrollActiveSeconds, setScrollActiveSeconds] = useState(0);
  const [appSwitchEvents, setAppSwitchEvents] = useState([]);

  const [driftEvents, setDriftEvents] = useState(0);
  const [intentionalResets, setIntentionalResets] = useState(0);
  const [nightlyUsageFlag, setNightlyUsageFlag] = useState(false);
  const [reflectionChoice, setReflectionChoice] = useState(ReflectionChoice.NONE);

  const [ignoredDriftPrompts, setIgnoredDriftPrompts] = useState(0);
  const [driftMemorySoftness, setDriftMemorySoftness] = useState(false);

  const [resetSecondsRemaining, setResetSecondsRemaining] = useState(DRIFT_RULES.RESET_DURATION_SECONDS);

  const [interactionLocked, setInteractionLocked] = useState(false);
  const [isAwarenessTone, setIsAwarenessTone] = useState(false);

  const [webSignals, setWebSignals] = useState({
    tabSwitches: 0,
    focusReturns: 0,
    lastInput: 'none',
  });

  const lastPromptTimestampRef = useRef(0);
  const resetTimerRef = useRef(null);
  const lastInteractionTsRef = useRef(nowTs());

  const promptCooldownSeconds = driftMemorySoftness
    ? DRIFT_RULES.MEMORY_PROMPT_COOLDOWN_SECONDS
    : DRIFT_RULES.BASE_PROMPT_COOLDOWN_SECONDS;

  useEffect(() => {
    const id = setInterval(() => {
      setSessionElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isAfterNightlyCutoff(new Date())) return;

    const minutesElapsed = minutesBetween(sessionStartTime, new Date());
    if (minutesElapsed >= DRIFT_RULES.NIGHTLY_OVERUSE_MINUTES) {
      setNightlyUsageFlag(true);
    }
  }, [sessionElapsedSeconds, sessionStartTime]);

  useEffect(() => {
    // Track interaction momentum rather than counting every second as scrolling.
    const activityTicker = setInterval(() => {
      const active = nowTs() - lastInteractionTsRef.current <= 3500;
      setScrollActiveSeconds((prev) => {
        if (active) return prev + 1;
        return Math.max(0, prev - 2);
      });
    }, 1000);

    return () => clearInterval(activityTicker);
  }, []);

  useEffect(() => {
    const cutoffMs = DRIFT_RULES.APP_SWITCH_WINDOW_SECONDS * 1000;
    const now = nowTs();
    setAppSwitchEvents((prev) => prev.filter((ts) => now - ts <= cutoffMs));
  }, [sessionElapsedSeconds]);

  useEffect(() => {
    const markInput = (type) => {
      lastInteractionTsRef.current = nowTs();
      setWebSignals((prev) => ({ ...prev, lastInput: type }));
    };

    const onVisibility = () => {
      if (document.hidden) {
        setAppSwitchEvents((prev) => [...prev, nowTs()]);
        setWebSignals((prev) => ({ ...prev, tabSwitches: prev.tabSwitches + 1 }));
      } else {
        lastInteractionTsRef.current = nowTs();
        setWebSignals((prev) => ({ ...prev, focusReturns: prev.focusReturns + 1, lastInput: 'focus' }));
      }
    };

    const onFocus = () => markInput('focus');
    const onWheel = () => markInput('scroll');
    const onTouchMove = () => markInput('touch');
    const onKeyDown = () => markInput('keyboard');
    const onPointer = () => markInput('pointer');

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointer);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, []);

  const canPromptForDrift = useMemo(() => {
    return (nowTs() - lastPromptTimestampRef.current) / 1000 >= promptCooldownSeconds;
  }, [sessionElapsedSeconds, promptCooldownSeconds]);

  const evaluateDriftConditions = () => {
    const rapidSwitch = appSwitchEvents.length > DRIFT_RULES.APP_SWITCH_THRESHOLD;
    const longScroll = scrollActiveSeconds >= DRIFT_RULES.SCROLL_THRESHOLD_SECONDS;
    const lateNight = nightlyUsageFlag;

    return {
      triggered: rapidSwitch || longScroll || lateNight,
      reason: rapidSwitch
        ? 'rapid_switching'
        : longScroll
          ? 'extended_scrolling'
          : lateNight
            ? 'late_night_drift'
            : null,
    };
  };

  useEffect(() => {
    if (state === DriftState.RESET_PAUSE || state === DriftState.CLOSED) return;

    const drift = evaluateDriftConditions();
    if (!drift.triggered || !canPromptForDrift) return;

    lastPromptTimestampRef.current = nowTs();
    setDriftEvents((prev) => prev + 1);
    setState(DriftState.DRIFT_DETECTION);

    const transition = setTimeout(() => {
      setState(DriftState.PAUSE_RITUAL);
    }, driftMemorySoftness ? 1200 : 700);

    return () => clearTimeout(transition);
  }, [
    appSwitchEvents.length,
    canPromptForDrift,
    driftMemorySoftness,
    nightlyUsageFlag,
    scrollActiveSeconds,
    state,
  ]);

  useEffect(() => {
    if (state !== DriftState.RESET_PAUSE) return;

    if (resetTimerRef.current) clearInterval(resetTimerRef.current);

    resetTimerRef.current = setInterval(() => {
      setResetSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(resetTimerRef.current);
          setInteractionLocked(false);
          setState(DriftState.INTENTIONAL_USE);
          setScrollActiveSeconds(0);
          setAppSwitchEvents([]);
          setReflectionChoice(ReflectionChoice.RESET);
          return DRIFT_RULES.RESET_DURATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (resetTimerRef.current) clearInterval(resetTimerRef.current);
    };
  }, [state]);

  useEffect(() => {
    if (state !== DriftState.PAUSE_RITUAL) return;

    // If the ritual goes unanswered, treat it as an ignored prompt and
    // return to intentional use with lower future interruption frequency.
    const unansweredTimeout = setTimeout(() => {
      setIgnoredDriftPrompts((prev) => {
        const next = prev + 1;
        if (next >= 3) setDriftMemorySoftness(true);
        return next;
      });
      setState(DriftState.INTENTIONAL_USE);
    }, 9000);

    return () => clearTimeout(unansweredTimeout);
  }, [state]);

  const onReflect = (choice) => {
    setReflectionChoice(choice);

    if (choice === ReflectionChoice.CONTINUE) {
      setIntentionalResets((prev) => prev + 1);
      setIsAwarenessTone(true);
      setState(DriftState.RE_ENTRY);

      setTimeout(() => {
        setState(DriftState.INTENTIONAL_USE);
        setScrollActiveSeconds(0);
        setAppSwitchEvents([]);
      }, 800);
      return;
    }

    if (choice === ReflectionChoice.RESET) {
      setInteractionLocked(true);
      setState(DriftState.RESET_PAUSE);
      setResetSecondsRemaining(DRIFT_RULES.RESET_DURATION_SECONDS);
      return;
    }

    if (choice === ReflectionChoice.CLOSE) {
      setState(DriftState.CLOSED);
    }
  };

  const acknowledgePause = () => {
    setState(DriftState.REFLECTION);
  };

  const simulateScrollBurst = () => {
    if (interactionLocked || state === DriftState.CLOSED) return;
    lastInteractionTsRef.current = nowTs();
    setScrollActiveSeconds((prev) => prev + 30);
  };

  const simulateAppSwitch = () => {
    if (interactionLocked || state === DriftState.CLOSED) return;
    setAppSwitchEvents((prev) => [...prev, nowTs()]);
    setWebSignals((prev) => ({ ...prev, tabSwitches: prev.tabSwitches + 1 }));
  };

  const simulateQuietMoment = () => {
    if (interactionLocked || state === DriftState.CLOSED) return;
    setScrollActiveSeconds((prev) => Math.max(0, prev - 15));
  };

  const mobileSessionDuration = formatElapsed(sessionElapsedSeconds);
  const resetDurationLabel = formatElapsed(resetSecondsRemaining);

  const dataModel = {
    sessionStartTime,
    driftEvents,
    intentionalResets,
    nightlyUsageFlag,
    reflectionChoice,
  };

  return {
    dataModel,
    driftMemorySoftness,
    interactionLocked,
    isAwarenessTone,
    mobileSessionDuration,
    resetDurationLabel,
    state,
    sessionElapsedSeconds,
    scrollActiveSeconds,
    appSwitchCount: appSwitchEvents.length,
    webSignals,
    acknowledgePause,
    onReflect,
    simulateAppSwitch,
    simulateQuietMoment,
    simulateScrollBurst,
  };
}
