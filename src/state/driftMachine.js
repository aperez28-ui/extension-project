export const DriftState = Object.freeze({
  INTENTIONAL_USE: 'intentional_use',
  DRIFT_DETECTION: 'drift_detection',
  PAUSE_RITUAL: 'pause_ritual',
  REFLECTION: 'reflection',
  RESET_PAUSE: 'reset_pause',
  RE_ENTRY: 're_entry',
  CLOSED: 'closed',
});

export const ReflectionChoice = Object.freeze({
  CONTINUE: 'continue_intentionally',
  RESET: 'pause_two_minutes',
  CLOSE: 'close_for_now',
  NONE: 'none',
});

export const DRIFT_RULES = Object.freeze({
  SCROLL_THRESHOLD_SECONDS: 120,
  APP_SWITCH_THRESHOLD: 5,
  APP_SWITCH_WINDOW_SECONDS: 90,
  NIGHTLY_OVERUSE_MINUTES: 20,
  NIGHTLY_CUTOFF_HOUR: 23,
  NIGHTLY_CUTOFF_MINUTE: 30,
  BASE_PROMPT_COOLDOWN_SECONDS: 45,
  MEMORY_PROMPT_COOLDOWN_SECONDS: 75,
  RESET_DURATION_SECONDS: 120,
});

export function isAfterNightlyCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setHours(DRIFT_RULES.NIGHTLY_CUTOFF_HOUR, DRIFT_RULES.NIGHTLY_CUTOFF_MINUTE, 0, 0);
  return now >= cutoff;
}

export function minutesBetween(start, end) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
}

export function formatElapsed(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
