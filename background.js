const SWITCH_WINDOW_MS = 90 * 1000;
const MAX_SITE_HISTORY = 3;
const RELAXING_VIDEO_URL = 'https://www.youtube.com/watch?v=lqxMyk31xII';
const RELAXING_VIDEO_ID = 'lqxMyk31xII';
const BREAK_VIDEO_5 = 'https://www.youtube.com/watch?v=40tPuU6jrgQ';
const BREAK_VIDEO_10 = 'https://www.youtube.com/watch?v=KNdjMEcG0mw';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    driftEvents: 0,
    intentionalResets: 0,
    ignoredPrompts: 0,
    switches: [],
    switchCountTotal: 0,
    siteHistory: [],
    currentSite: null,
    hudCollapsed: true,
    scrollEventTotal: 0,
    scrollEventsByHost: {},
    socialLockoutUntil: 0,
  });
});

function isTrackableUrl(url = '') {
  return url.startsWith('http://') || url.startsWith('https://');
}

function isSocialUrl(url = '') {
  try {
    const host = new URL(url).hostname;
    return [
      /(^|\.)youtube\.com$/,
      /(^|\.)tiktok\.com$/,
      /(^|\.)instagram\.com$/,
      /(^|\.)x\.com$/,
      /(^|\.)twitter\.com$/,
    ].some((pattern) => pattern.test(host));
  } catch {
    return false;
  }
}

function isRelaxingVideo(url = '') {
  try {
    const u = new URL(url);
    const vid = u.searchParams.get('v');
    const allowedIds = new Set([RELAXING_VIDEO_ID, new URL(BREAK_VIDEO_5).searchParams.get('v'), new URL(BREAK_VIDEO_10).searchParams.get('v')]);
    if (!(u.hostname.includes('youtube.com') && u.pathname === '/watch' && allowedIds.has(vid))) {
      return false;
    }
    // Treat only the canonical video URL as valid during lockout.
    const allowedParams = new Set(['v']);
    for (const [key] of u.searchParams.entries()) {
      if (!allowedParams.has(key)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

function notifyTab(tabId, payload) {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, payload, () => {
    void chrome.runtime.lastError;
  });
}

async function enforceSocialLockout(tab) {
  if (!tab || !tab.id || !tab.url || !isTrackableUrl(tab.url)) return;
  const { socialLockoutUntil = 0 } = await chrome.storage.local.get('socialLockoutUntil');
  if (!socialLockoutUntil || Date.now() >= socialLockoutUntil) return;

  if (isSocialUrl(tab.url) && !isRelaxingVideo(tab.url)) {
    chrome.tabs.update(tab.id, { url: RELAXING_VIDEO_URL });
  }
}

async function registerVisit(tab) {
  if (!tab || !isTrackableUrl(tab.url) || !isSocialUrl(tab.url)) return;

  const ts = Date.now();
  const currentSite = { host: hostFromUrl(tab.url), url: tab.url, ts };
  const { siteHistory = [] } = await chrome.storage.local.get('siteHistory');

  // Keep one entry per host so repeated visits to youtube.com do not duplicate.
  const withoutCurrent = siteHistory.filter((site) => site.host !== currentSite.host);
  const nextHistory = [currentSite, ...withoutCurrent].slice(0, MAX_SITE_HISTORY);

  await chrome.storage.local.set({
    currentSite,
    siteHistory: nextHistory,
  });

  notifyTab(tab.id, {
    type: 'SITE_CONTEXT',
    currentSite,
    siteHistory: nextHistory,
  });
}

async function recordSwitchAndNotify(tabId) {
  const now = Date.now();
  const { switches = [], switchCountTotal = 0 } = await chrome.storage.local.get([
    'switches',
    'switchCountTotal',
  ]);

  const recent = [...switches, now].filter((t) => now - t <= SWITCH_WINDOW_MS);
  const total = switchCountTotal + 1;
  await chrome.storage.local.set({ switches: recent, switchCountTotal: total });

  notifyTab(tabId, {
    type: 'SWITCH_UPDATE',
    recentSwitches: recent.length,
    totalSwitches: total,
  });
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await recordSwitchAndNotify(tabId);
  const tab = await chrome.tabs.get(tabId);
  await enforceSocialLockout(tab);
  await registerVisit(tab);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  await enforceSocialLockout(tab);
  await registerVisit(tab);
});

chrome.tabs.onCreated.addListener(async (tab) => {
  await enforceSocialLockout(tab);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'GET_CONTEXT') {
    chrome.storage.local
      .get([
        'switches',
        'switchCountTotal',
        'siteHistory',
        'currentSite',
        'hudCollapsed',
        'scrollEventTotal',
        'socialLockoutUntil',
      ])
      .then((data) => {
        const now = Date.now();
        const recentSwitches = (data.switches || []).filter((t) => now - t <= SWITCH_WINDOW_MS).length;
        const lockoutUntil = data.socialLockoutUntil || 0;
        sendResponse({
          recentSwitches,
          totalSwitches: data.switchCountTotal || 0,
          currentSite: data.currentSite || null,
          siteHistory: data.siteHistory || [],
          hudCollapsed: Boolean(data.hudCollapsed),
          scrollEventTotal: data.scrollEventTotal || 0,
          socialLockoutUntil: lockoutUntil,
        });
      });
    return true;
  }

  if (msg?.type === 'OPEN_URL') {
    const tabId = sender?.tab?.id;
    if (!tabId || !isTrackableUrl(msg.url)) return;
    chrome.storage.local.get('socialLockoutUntil').then((data) => {
      const socialLockoutUntil = data.socialLockoutUntil || 0;
      const lockoutActive = socialLockoutUntil && Date.now() < socialLockoutUntil;
      const target =
        lockoutActive && isSocialUrl(msg.url) && !isRelaxingVideo(msg.url) ? RELAXING_VIDEO_URL : msg.url;
      chrome.tabs.update(tabId, { url: target });
    });
    return;
  }

  if (msg?.type === 'OPEN_URL_NEW_TAB') {
    const url = msg.url;
    if (!isTrackableUrl(url)) return;
    chrome.tabs.create({ url });
    return;
  }

  if (msg?.type === 'SET_HUD_COLLAPSED') {
    chrome.storage.local.set({ hudCollapsed: Boolean(msg.value) });
  }

  if (msg?.type === 'CLOSE_ACTIVE_TAB') {
    const tabId = sender?.tab?.id;
    if (tabId) chrome.tabs.remove(tabId);
  }

  if (msg?.type === 'SCROLL_EVENT') {
    chrome.storage.local.get(['scrollEventTotal', 'scrollEventsByHost']).then((data) => {
      const host = msg.host || 'unknown';
      const byHost = data.scrollEventsByHost || {};
      byHost[host] = (byHost[host] || 0) + 1;
      chrome.storage.local.set({
        scrollEventTotal: (data.scrollEventTotal || 0) + 1,
        scrollEventsByHost: byHost,
      });
    });
  }

  if (msg?.type === 'START_SOCIAL_LOCKOUT') {
    const durationMs = Math.max(0, Number(msg.durationSeconds || 0)) * 1000;
    const until = Date.now() + durationMs;
    chrome.storage.local.set({ socialLockoutUntil: until }).then(async () => {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id) chrome.tabs.update(activeTab.id, { url: RELAXING_VIDEO_URL });
    });
  }
});
