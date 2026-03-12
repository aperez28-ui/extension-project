const DRIFT = {
  SCROLL_THRESHOLD_SECONDS: 120,
  APP_SWITCH_THRESHOLD: 5,
  NIGHTLY_OVERUSE_SECONDS: 20 * 60,
  BASE_PROMPT_COOLDOWN_SECONDS: 45,
  MEMORY_PROMPT_COOLDOWN_SECONDS: 75,
  RESET_DURATION_SECONDS: 120,
  CLOSE_LOCKOUT_SECONDS: 10 * 60,
  IGNORE_TIMEOUT_SECONDS: 9,
  YT_SHORTS_CHECKUP_SECONDS: 10 * 60,
};

const RELAXING_VIDEO_URL = 'https://www.youtube.com/watch?v=lqxMyk31xII';
const SOCIAL_HOST_PATTERNS = [
  /(^|\.)youtube\.com$/,
  /(^|\.)tiktok\.com$/,
  /(^|\.)instagram\.com$/,
  /(^|\.)x\.com$/,
  /(^|\.)twitter\.com$/,
];

let sessionStartTs = Date.now();
let scrollMomentumSeconds = 0;
let lastScrollTs = 0;
let lastPromptTs = 0;
let recentSwitches = 0;
let totalSwitches = 0;
let totalScrollEvents = 0;
let driftEvents = 0;
let intentionalResets = 0;
let ignoredPrompts = 0;
let reflectionChoice = 'none';
let sessionFeedbackLog = [];

let focusTimerDurationSeconds = 0;
let focusTimerEndTs = null;
let socialLockoutUntil = 0;

let currentSite = { host: location.hostname, url: location.href };
let siteHistory = [{ host: location.hostname, url: location.href }];

let overlayOpen = false;
let interactionLocked = false;
let closedForNow = false;
let ignoreTimer = null;
let hud = null;

if (isSocialSite()) {
  if (window.top !== window.self) {
    cleanupInjectedUi();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }
} else {
  cleanupInjectedUi();
}

function init() {
  if (!document.documentElement) return;
  resetSessionState();
  hud = createHud();
  // Default to minimized HUD unless user has chosen otherwise.
  hud.classList.add('drift-collapsed');
  const toggleBtn = hud.querySelector('[data-act="toggle"]');
  if (toggleBtn) toggleBtn.textContent = '+';
  chrome.runtime.sendMessage({ type: 'SET_HUD_COLLAPSED', value: true });
  wireHudInteractions();
  hydrateContext();
  updateHud();

  window.addEventListener('wheel', () => handleScrollEvent('wheel'), { passive: true });
  window.addEventListener('touchmove', () => handleScrollEvent('touchmove'), { passive: true });
  window.addEventListener('keydown', (e) => {
    const scrollKeys = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Spacebar', 'Home', 'End', 'j', 'k'];
    if (scrollKeys.includes(e.key)) handleScrollEvent(`key:${e.key}`);
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SWITCH_UPDATE') {
      recentSwitches = msg.recentSwitches ?? recentSwitches;
      totalSwitches = msg.totalSwitches ?? totalSwitches;
      updateHud();
      return;
    }

    if (msg.type === 'SITE_CONTEXT') {
      currentSite = msg.currentSite || currentSite;
      siteHistory = msg.siteHistory || siteHistory;
      updateHud();
      return;
    }

    if (msg.type === 'SHOW_DRIFT_PROMPT') {
      recentSwitches = msg.recentSwitches ?? recentSwitches;
      triggerPrompt(msg.reason || 'rapid_switching');
    }
  });

  setInterval(() => {
    if (closedForNow) {
      updateHud();
      return;
    }

    const active = Date.now() - lastScrollTs <= 1500;
    if (active) scrollMomentumSeconds += 1;
    else scrollMomentumSeconds = Math.max(0, scrollMomentumSeconds - 2);

    if (focusTimerEndTs && Date.now() >= focusTimerEndTs) {
      focusTimerEndTs = null;
      triggerPrompt('focus_timer_complete', true);
    }

    updateHud();
    evaluateDrift();
  }, 1000);
}

function hydrateContext() {
  chrome.runtime.sendMessage({ type: 'GET_CONTEXT' }, (ctx) => {
    if (chrome.runtime.lastError || !ctx) return;

    // Reload resets local counters/timer state for the active page session.
    recentSwitches = 0;
    totalSwitches = 0;
    totalScrollEvents = 0;

    currentSite = ctx.currentSite || currentSite;
    siteHistory = ctx.siteHistory?.length ? ctx.siteHistory : siteHistory;
    socialLockoutUntil = ctx.socialLockoutUntil || 0;
    const collapsed = ctx.hudCollapsed === undefined ? true : Boolean(ctx.hudCollapsed);
    hud.classList.toggle('drift-collapsed', collapsed);

    const toggleBtn = hud.querySelector('[data-act="toggle"]');
    if (toggleBtn) toggleBtn.textContent = collapsed ? '+' : '−';

    updateHud();
  });
}

function createHud() {
  const el = document.createElement('aside');
  el.id = 'drift-hud';
  el.innerHTML = `
    <div class="drift-hud-head">
      <div class="drift-hud-brand">
        <div class="drift-hud-title">Drift</div>
        <div class="drift-hud-site" data-k="site">${location.hostname}</div>
      </div>
      <div class="drift-hud-status" data-k="status-pill">Drift on</div>
      <div class="drift-hud-head-time" data-k="head-time">00:00</div>
      <button class="drift-hud-toggle" data-act="toggle" aria-label="Toggle Drift HUD">−</button>
    </div>

    <div class="drift-hud-body" data-k="body">
      <div class="drift-hud-row"><span>Session</span><strong data-k="session">00:00</strong></div>
      <div class="drift-hud-row"><span>Scroll momentum</span><strong data-k="scroll">0s</strong></div>
      <div class="drift-hud-row"><span>Scroll events</span><strong data-k="scroll-events">0</strong></div>
      <div class="drift-hud-row"><span>Switches</span><strong data-k="switches">0</strong></div>
      <div class="drift-hud-row"><span>Status</span><strong data-k="status">Intentional</strong></div>
      <div class="drift-hud-row"><span>Focus timer</span><strong data-k="focus">Off</strong></div>

      <div class="drift-hud-actions">
        <button data-act="set-timer">Set timer</button>
        <button data-act="clear-timer">Clear</button>
        <button data-act="end-session" class="drift-end-btn">End session</button>
      </div>

      <div class="drift-sites-wrap">
        <p>Recent sites</p>
        <div class="drift-sites" data-k="sites"></div>
      </div>
    </div>
  `;
  document.documentElement.appendChild(el);
  return el;
}

function wireHudInteractions() {
  hud.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('[data-act="toggle"]');
    if (toggleBtn) {
      const next = !hud.classList.contains('drift-collapsed');
      hud.classList.toggle('drift-collapsed', next);
      toggleBtn.textContent = next ? '+' : '−';
      chrome.runtime.sendMessage({ type: 'SET_HUD_COLLAPSED', value: next });
      return;
    }

    const setTimerBtn = e.target.closest('[data-act="set-timer"]');
    if (setTimerBtn) {
      openTimerModal();
      return;
    }

    const clearTimerBtn = e.target.closest('[data-act="clear-timer"]');
    if (clearTimerBtn) {
      focusTimerDurationSeconds = 0;
      focusTimerEndTs = null;
      updateHud();
      return;
    }

    const endSessionBtn = e.target.closest('[data-act="end-session"]');
    if (endSessionBtn) {
      openSessionFeedbackModal();
      return;
    }

    const siteBtn = e.target.closest('[data-url]');
    if (siteBtn) {
      chrome.runtime.sendMessage({ type: 'OPEN_URL', url: siteBtn.dataset.url });
    }
  });
}

function handleScrollEvent(source) {
  lastScrollTs = Date.now();
  totalScrollEvents += 1;
  updateHud();
  chrome.runtime.sendMessage({
    type: 'SCROLL_EVENT',
    host: location.hostname,
    url: location.href,
    source,
    ts: Date.now(),
  });
}

function formatClock(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function getSessionSeconds() {
  return Math.max(0, Math.floor((Date.now() - sessionStartTs) / 1000));
}

function getFocusRemainingSeconds() {
  if (!focusTimerEndTs) return 0;
  return Math.max(0, Math.floor((focusTimerEndTs - Date.now()) / 1000));
}

function getLockoutRemainingSeconds() {
  if (!socialLockoutUntil) return 0;
  return Math.max(0, Math.floor((socialLockoutUntil - Date.now()) / 1000));
}

function isAfterNightCutoff() {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setHours(23, 30, 0, 0);
  return now >= cutoff;
}

function isYouTubeShorts() {
  return location.hostname.includes('youtube.com') && location.pathname.startsWith('/shorts');
}

function isSocialSite() {
  return SOCIAL_HOST_PATTERNS.some((pattern) => pattern.test(location.hostname));
}

function getScrollCheckupSeconds() {
  if (focusTimerDurationSeconds > 0) return focusTimerDurationSeconds;
  if (isYouTubeShorts()) return DRIFT.YT_SHORTS_CHECKUP_SECONDS;
  return DRIFT.SCROLL_THRESHOLD_SECONDS;
}

function canPrompt() {
  const cooldown = ignoredPrompts >= 3 ? DRIFT.MEMORY_PROMPT_COOLDOWN_SECONDS : DRIFT.BASE_PROMPT_COOLDOWN_SECONDS;
  return (Date.now() - lastPromptTs) / 1000 >= cooldown;
}

function evaluateDrift() {
  if (overlayOpen || interactionLocked || closedForNow || getLockoutRemainingSeconds() > 0) return;

  const longScroll = scrollMomentumSeconds >= getScrollCheckupSeconds();
  const lateNight = isAfterNightCutoff() && getSessionSeconds() >= DRIFT.NIGHTLY_OVERUSE_SECONDS;

  if (!canPrompt()) return;

  if (longScroll && focusTimerDurationSeconds > 0) triggerPrompt('focus_timer_check');
  else if (longScroll && isYouTubeShorts()) triggerPrompt('shorts_checkup');
  else if (longScroll) triggerPrompt('extended_scrolling');
  else if (lateNight) triggerPrompt('late_night_drift');
}

function triggerPrompt(reason, force = false) {
  if (overlayOpen || closedForNow) return;
  if (!force && !canPrompt()) return;

  overlayOpen = true;
  driftEvents += 1;
  lastPromptTs = Date.now();

  const memorySoft = ignoredPrompts >= 3;
  const title = memorySoft ? 'Checking in' : 'Still here?';
  const lastSite = siteHistory[1];

  const overlay = document.createElement('div');
  overlay.id = 'drift-overlay';
  overlay.className = memorySoft ? 'drift-soft' : '';
  overlay.innerHTML = `
    <div class="drift-card">
      <p class="drift-chip">Pause ritual</p>
      <h2>${title}</h2>
      <p>You have been scrolling for a while. Want to continue intentionally?</p>

      <label class="drift-field">
        <span>How are you feeling right now?</span>
        <select data-k="feeling">
          <option value="">Select</option>
          <option value="calm">Calm</option>
          <option value="restless">Restless</option>
          <option value="overwhelmed">Overwhelmed</option>
          <option value="tired">Tired</option>
          <option value="focused">Focused</option>
        </select>
      </label>

      <label class="drift-field">
        <span>What do you need right now?</span>
        <input data-k="intent" type="text" placeholder="Finish a task, rest, reconnect" />
      </label>

      <label class="drift-field">
        <span>Quick note (optional)</span>
        <textarea data-k="note" rows="2" placeholder="Write how this moment feels"></textarea>
      </label>
      <p class="drift-error" data-k="error" hidden>Please complete feeling and what you need before continuing.</p>

      <button data-act="continue">Continue session</button>
      <button data-act="pause">Pause for 2 minutes</button>
      <button data-act="close">Close for now</button>
      <button data-act="feedback" class="drift-prev">Write feedback</button>
      <small>Trigger: ${humanReason(reason)} • Site: ${escapeHtml(currentSite.host || location.hostname)}</small>
    </div>
  `;

  document.documentElement.appendChild(overlay);
  updateHud();

  const ignoreSeconds =
    reason === 'focus_timer_complete' || reason === 'focus_timer_check' ? 60 : DRIFT.IGNORE_TIMEOUT_SECONDS;

  ignoreTimer = setTimeout(() => {
    if (!overlayOpen) return;
    const checkin = collectCheckin(overlay);
    // Do not auto-close once required answers are complete.
    if (checkin.feeling && checkin.intent) return;
    ignoredPrompts += 1;
    closeOverlay(overlay);
  }, ignoreSeconds * 1000);

  const cancelIgnoreOnInput = () => {
    if (ignoreTimer) {
      clearTimeout(ignoreTimer);
      ignoreTimer = null;
    }
  };

  overlay.querySelectorAll('select, input, textarea').forEach((el) => {
    el.addEventListener('input', cancelIgnoreOnInput, { once: true });
    el.addEventListener('change', cancelIgnoreOnInput, { once: true });
    el.addEventListener('focus', cancelIgnoreOnInput, { once: true });
  });

  overlay.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-act]');
    if (!actionEl) return;
    e.preventDefault();
    e.stopPropagation();

    const action = actionEl.getAttribute('data-act');
    if (!action) return;

    const checkin = collectCheckin(overlay);
    if (!validateRequiredCheckin(overlay, checkin)) return;

    if (action === 'continue') {
      reflectionChoice = 'continue_intentionally';
      intentionalResets += 1;
      scrollMomentumSeconds = 0;
      closeOverlay(overlay);
      return;
    }

    if (action === 'pause') {
      reflectionChoice = 'pause_two_minutes';
      socialLockoutUntil = Date.now() + DRIFT.RESET_DURATION_SECONDS * 1000;
      chrome.runtime.sendMessage({
        type: 'START_SOCIAL_LOCKOUT',
        durationSeconds: DRIFT.RESET_DURATION_SECONDS,
      });
      closeOverlay(overlay);
      return;
    }

    if (action === 'close') {
      reflectionChoice = 'close_for_now';
      closedForNow = true;
      socialLockoutUntil = Date.now() + DRIFT.CLOSE_LOCKOUT_SECONDS * 1000;
      chrome.runtime.sendMessage({
        type: 'START_SOCIAL_LOCKOUT',
        durationSeconds: DRIFT.CLOSE_LOCKOUT_SECONDS,
      });
      chrome.runtime.sendMessage({ type: 'CLOSE_ACTIVE_TAB' });
      closeOverlay(overlay);
      return;
    }

    if (action === 'feedback') {
      openRelaxingVideo();
    }
  });

}

function collectCheckin(overlay) {
  const feeling = overlay.querySelector('[data-k="feeling"]')?.value || '';
  const intent = overlay.querySelector('[data-k="intent"]')?.value?.trim() || '';
  const note = overlay.querySelector('[data-k="note"]')?.value?.trim() || '';

  sessionFeedbackLog.push({
    at: Date.now(),
    feeling,
    intent,
    note,
  });

  return {
    feeling,
    intent,
    note,
    triggerChoice: reflectionChoice,
    site: currentSite?.host || location.hostname,
    previous: siteHistory[1]?.host || '',
  };
}

function validateRequiredCheckin(overlay, checkin) {
  const errorEl = overlay.querySelector('[data-k="error"]');
  const feelingEl = overlay.querySelector('[data-k="feeling"]');
  const intentEl = overlay.querySelector('[data-k="intent"]');
  const valid = Boolean(checkin.feeling && checkin.intent);

  if (errorEl) errorEl.hidden = valid;
  if (feelingEl) feelingEl.classList.toggle('drift-field-invalid', !checkin.feeling);
  if (intentEl) intentEl.classList.toggle('drift-field-invalid', !checkin.intent);
  return valid;
}

function openRelaxingVideo() {
  chrome.runtime.sendMessage({ type: 'OPEN_URL', url: RELAXING_VIDEO_URL });
}

function openTimerModal() {
  if (document.getElementById('drift-timer-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'drift-timer-modal';
  modal.className = 'drift-inline-overlay';
  modal.innerHTML = `
    <div class="drift-card drift-modal-card">
      <p class="drift-chip">Focus timer</p>
      <h2>Set session timer</h2>
      <p>Choose minutes for intentional use before the next check-in.</p>
      <label class="drift-field">
        <span>Minutes</span>
        <input data-k="timer-minutes" type="number" min="1" max="180" value="25" />
      </label>
      <p class="drift-error" data-k="timer-error" hidden>Enter a number from 1 to 180.</p>
      <div class="drift-modal-actions">
        <button data-act="timer-save">Start timer</button>
        <button data-act="timer-cancel" class="drift-prev">Cancel</button>
      </div>
    </div>
  `;

  document.documentElement.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('[data-act="timer-cancel"]').onclick = closeModal;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  modal.querySelector('[data-act="timer-save"]').onclick = () => {
    const input = modal.querySelector('[data-k="timer-minutes"]');
    const errorEl = modal.querySelector('[data-k="timer-error"]');
    const mins = Number(input?.value);
    const valid = Number.isFinite(mins) && mins >= 1 && mins <= 180;

    if (!valid) {
      if (errorEl) errorEl.hidden = false;
      if (input) input.classList.add('drift-field-invalid');
      return;
    }

    focusTimerDurationSeconds = Math.round(mins) * 60;
    focusTimerEndTs = Date.now() + focusTimerDurationSeconds * 1000;
    scrollMomentumSeconds = 0;
    updateHud();
    closeModal();
  };
}

function openSessionFeedbackModal() {
  if (document.getElementById('drift-session-feedback')) return;
  if (overlayOpen) {
    const existing = document.getElementById('drift-overlay');
    if (existing) closeOverlay(existing);
  }

  const elapsed = getSessionSeconds();
  const minutes = Math.max(1, Math.floor(elapsed / 60));
  const checkins = sessionFeedbackLog.length;
  const topFeeling = mostFrequent(sessionFeedbackLog.map((x) => x.feeling).filter(Boolean));

  const feedback = [];
  if (driftEvents === 0) feedback.push('You stayed steady with no drift interruptions.');
  else if (driftEvents <= 2) feedback.push('You had a few drift moments and recovered quickly.');
  else feedback.push('There were frequent drift moments today, which is useful awareness data.');

  if (intentionalResets > 0) feedback.push(`You chose awareness reset ${intentionalResets} time(s).`);
  if (topFeeling) feedback.push(`Most reported feeling: ${topFeeling}.`);
  if (totalScrollEvents > 300) feedback.push('Scroll volume was high; consider a shorter next session.');
  else feedback.push('Scroll volume stayed moderate this session.');

  const modal = document.createElement('div');
  modal.id = 'drift-session-feedback';
  modal.className = 'drift-inline-overlay';
  modal.innerHTML = `
    <div class="drift-card drift-modal-card">
      <p class="drift-chip">Session feedback</p>
      <h2>Session complete</h2>
      <p>Time ${formatClock(elapsed)} • Check-ins ${checkins} • Prompts ${driftEvents}</p>
      <ul class="drift-feedback-list">
        ${feedback.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
      </ul>
      <div class="drift-modal-actions">
        <button data-act="restart-session">Start new session</button>
        <button data-act="close-feedback" class="drift-prev">Close</button>
      </div>
    </div>
  `;

  document.documentElement.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('[data-act="close-feedback"]').onclick = closeModal;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  modal.querySelector('[data-act="restart-session"]').onclick = () => {
    resetSessionState();
    updateHud();
    closeModal();
  };
}

function mostFrequent(list) {
  const counts = new Map();
  for (const value of list) counts.set(value, (counts.get(value) || 0) + 1);
  let top = '';
  let topCount = 0;
  for (const [key, count] of counts.entries()) {
    if (count > topCount) {
      top = key;
      topCount = count;
    }
  }
  return top;
}

function closeOverlay(overlay) {
  overlayOpen = false;
  if (ignoreTimer) {
    clearTimeout(ignoreTimer);
    ignoreTimer = null;
  }
  overlay.remove();
  updateHud();
}

function humanReason(reason) {
  if (reason === 'rapid_switching') return 'rapid app switching';
  if (reason === 'late_night_drift') return 'late-night use';
  if (reason === 'shorts_checkup') return 'YouTube Shorts 10-minute checkup';
  if (reason === 'focus_timer_check') return 'focus timer checkup';
  if (reason === 'focus_timer_complete') return 'focus timer complete';
  return 'long scrolling';
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function updateHud() {
  if (!hud) return;

  const sessionClock = formatClock(getSessionSeconds());
  const focusRemaining = getFocusRemainingSeconds();
  const lockoutRemaining = getLockoutRemainingSeconds();

  hud.querySelector('[data-k="session"]').textContent = sessionClock;
  hud.querySelector('[data-k="head-time"]').textContent = sessionClock;
  hud.querySelector('[data-k="scroll"]').textContent = `${scrollMomentumSeconds}s`;
  hud.querySelector('[data-k="scroll-events"]').textContent = String(totalScrollEvents);
  hud.querySelector('[data-k="switches"]').textContent = String(totalSwitches);
  hud.querySelector('[data-k="site"]').textContent = currentSite?.host || location.hostname;
  hud.querySelector('[data-k="focus"]').textContent =
    lockoutRemaining > 0
      ? `Lock ${formatClock(lockoutRemaining)}`
      : focusRemaining > 0
        ? formatClock(focusRemaining)
        : 'Off';

  let status = 'Intentional';
  if (closedForNow) status = 'Closed for now';
  else if (lockoutRemaining > 0) status = 'Break lockout';
  else if (interactionLocked) status = 'Reset ritual';
  else if (overlayOpen) status = 'Reflection';
  else if (focusRemaining > 0) status = 'Focus timer active';
  hud.querySelector('[data-k="status"]').textContent = status;

  const sitesEl = hud.querySelector('[data-k="sites"]');
  const recent = (siteHistory || []).slice(0, 3);
  sitesEl.innerHTML = recent
    .map(
      (site) =>
        `<button class="drift-site-btn" data-url="${escapeHtml(site.url)}" title="Open ${escapeHtml(site.host)}">${escapeHtml(site.host)}</button>`
    )
    .join('');
}

function resetSessionState() {
  sessionStartTs = Date.now();
  scrollMomentumSeconds = 0;
  lastScrollTs = 0;
  lastPromptTs = 0;
  recentSwitches = 0;
  totalSwitches = 0;
  totalScrollEvents = 0;
  driftEvents = 0;
  intentionalResets = 0;
  ignoredPrompts = 0;
  reflectionChoice = 'none';
  sessionFeedbackLog = [];
  focusTimerDurationSeconds = 0;
  focusTimerEndTs = null;
  overlayOpen = false;
  interactionLocked = false;
  closedForNow = false;
}

function cleanupInjectedUi() {
  const ids = ['drift-hud', 'drift-overlay', 'drift-timer-modal'];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}
