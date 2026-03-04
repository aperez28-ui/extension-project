import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { ClosedScreen } from './components/ClosedScreen';
import { IntentionalHome } from './components/IntentionalHome';
import { MobileFrame } from './components/MobileFrame';
import { PauseRitualOverlay } from './components/PauseRitualOverlay';
import { ReflectionPanel } from './components/ReflectionPanel';
import { ResetPauseScreen } from './components/ResetPauseScreen';
import { useDriftController } from './hooks/useDriftController';
import { DriftState } from './state/driftMachine';

const THEMES = {
  dune: {
    label: 'Dune',
    swatch: 'linear-gradient(145deg, #9b8a73, #d2c1a9)',
    shellBg: '#f8f4ec',
    shellBorder: '#dbd2c4',
    frameBg: 'linear-gradient(180deg, #f9f6f1 0%, #f3ede2 54%, #efe7da 100%)',
    notch: 'rgba(216, 208, 195, 0.9)',
    glowA: 'rgba(214, 197, 170, 0.48)',
    glowB: 'rgba(190, 169, 139, 0.32)',
    ringA: '#857663',
    ringB: '#a69782',
    ringC: '#cab9a0',
    ringOuter: 'rgba(216, 205, 189, 0.78)',
    ringInner: 'rgba(202, 188, 170, 0.74)',
    actionSoft: '#f7f2e9',
    overlayScrim: 'rgba(59, 52, 43, 0.22)',
    overlayCardBg: 'rgba(251, 248, 242, 0.92)',
    overlayCardBorder: 'rgba(221, 207, 187, 0.85)',
    overlayPrimary: '#f0e7da',
    overlayPrimaryHover: '#e8dccb',
    panelBg: 'rgba(250, 247, 241, 0.95)',
    panelBorder: 'rgba(218, 205, 185, 0.85)',
    panelStrong: '#ede2d3',
    panelSoft: '#f7f1e7',
    panelGhost: '#fbf8f2',
    resetBg:
      'radial-gradient(circle at 20% 20%,rgba(185,169,145,0.28),transparent 42%),radial-gradient(circle at 82% 84%,rgba(153,134,112,0.2),transparent 42%),linear-gradient(180deg,#f4ede1 0%,#efe7d8 100%)',
    resetTrack: 'rgba(136,124,106,0.22)',
    resetStroke: 'rgba(92,79,64,0.72)',
    closedBg: 'rgba(249, 245, 238, 0.9)',
    closedBorder: 'rgba(221, 207, 190, 1)',
  },
  fog: {
    label: 'Fog',
    swatch: 'linear-gradient(145deg, #78818b, #c4ced7)',
    shellBg: '#eef2f5',
    shellBorder: '#cfd8df',
    frameBg: 'linear-gradient(180deg, #f4f7f9 0%, #e9eff3 52%, #e2e9ef 100%)',
    notch: 'rgba(203, 213, 221, 0.95)',
    glowA: 'rgba(171, 189, 204, 0.43)',
    glowB: 'rgba(149, 167, 184, 0.3)',
    ringA: '#677683',
    ringB: '#8393a1',
    ringC: '#a8b7c4',
    ringOuter: 'rgba(195, 208, 219, 0.82)',
    ringInner: 'rgba(175, 190, 202, 0.76)',
    actionSoft: '#edf3f7',
    overlayScrim: 'rgba(45, 56, 66, 0.22)',
    overlayCardBg: 'rgba(245, 249, 252, 0.92)',
    overlayCardBorder: 'rgba(199, 212, 222, 0.9)',
    overlayPrimary: '#dfeaf2',
    overlayPrimaryHover: '#d2e1ec',
    panelBg: 'rgba(243, 248, 252, 0.95)',
    panelBorder: 'rgba(197, 209, 220, 0.9)',
    panelStrong: '#d8e5ef',
    panelSoft: '#e9f1f7',
    panelGhost: '#f6fafd',
    resetBg:
      'radial-gradient(circle at 20% 20%,rgba(164,185,201,0.28),transparent 42%),radial-gradient(circle at 82% 84%,rgba(141,166,185,0.2),transparent 42%),linear-gradient(180deg,#eaf1f6 0%,#dfe8ef 100%)',
    resetTrack: 'rgba(121,141,160,0.28)',
    resetStroke: 'rgba(84,105,123,0.72)',
    closedBg: 'rgba(241, 247, 252, 0.92)',
    closedBorder: 'rgba(196, 210, 222, 1)',
  },
  grove: {
    label: 'Grove',
    swatch: 'linear-gradient(145deg, #6f7f71, #bcc8b8)',
    shellBg: '#eef2ec',
    shellBorder: '#ced7cb',
    frameBg: 'linear-gradient(180deg, #f4f7f2 0%, #e9efe7 52%, #e1e9dd 100%)',
    notch: 'rgba(203, 212, 196, 0.95)',
    glowA: 'rgba(171, 191, 165, 0.42)',
    glowB: 'rgba(151, 171, 143, 0.3)',
    ringA: '#667862',
    ringB: '#879784',
    ringC: '#afbdab',
    ringOuter: 'rgba(196, 209, 186, 0.8)',
    ringInner: 'rgba(176, 193, 169, 0.74)',
    actionSoft: '#edf4ea',
    overlayScrim: 'rgba(47, 59, 46, 0.22)',
    overlayCardBg: 'rgba(245, 249, 243, 0.92)',
    overlayCardBorder: 'rgba(199, 211, 191, 0.9)',
    overlayPrimary: '#dfeadd',
    overlayPrimaryHover: '#d1e1cf',
    panelBg: 'rgba(244, 248, 242, 0.95)',
    panelBorder: 'rgba(198, 210, 190, 0.9)',
    panelStrong: '#dae6d6',
    panelSoft: '#e8f2e4',
    panelGhost: '#f6faf4',
    resetBg:
      'radial-gradient(circle at 20% 20%,rgba(163,186,156,0.28),transparent 42%),radial-gradient(circle at 82% 84%,rgba(138,163,132,0.2),transparent 42%),linear-gradient(180deg,#eaf1e7 0%,#dde8d8 100%)',
    resetTrack: 'rgba(115,138,109,0.28)',
    resetStroke: 'rgba(79,103,73,0.72)',
    closedBg: 'rgba(242, 248, 240, 0.92)',
    closedBorder: 'rgba(196, 210, 188, 1)',
  },
};

function DataModelBridge({ dataModel }) {
  return (
    <div className="pointer-events-none absolute bottom-1 left-1 right-1 z-0 opacity-0" aria-hidden="true">
      <pre>{JSON.stringify(dataModel)}</pre>
    </div>
  );
}

export default function App() {
  const {
    dataModel,
    driftMemorySoftness,
    interactionLocked,
    isAwarenessTone,
    mobileSessionDuration,
    resetDurationLabel,
    state,
    scrollActiveSeconds,
    appSwitchCount,
    webSignals,
    acknowledgePause,
    onReflect,
    simulateAppSwitch,
    simulateQuietMoment,
    simulateScrollBurst,
  } = useDriftController();

  const [selectedThemeId, setSelectedThemeId] = useState('dune');
  const activeTheme = useMemo(() => THEMES[selectedThemeId] ?? THEMES.dune, [selectedThemeId]);

  const showPauseOverlay = state === DriftState.PAUSE_RITUAL || state === DriftState.DRIFT_DETECTION;
  const showReflection = state === DriftState.REFLECTION;
  const showReset = state === DriftState.RESET_PAUSE;
  const showClosed = state === DriftState.CLOSED;

  return (
    <MobileFrame tone={isAwarenessTone ? 'aware' : 'base'} theme={activeTheme}>
      <AnimatePresence mode="wait">
        {!showClosed ? (
          <motion.div key="intentional-shell" className="h-full w-full">
            <IntentionalHome
              isAwarenessTone={isAwarenessTone}
              mobileSessionDuration={mobileSessionDuration}
              scrollActiveSeconds={scrollActiveSeconds}
              appSwitchCount={appSwitchCount}
              webSignals={webSignals}
              selectedThemeId={selectedThemeId}
              themes={THEMES}
              onThemeChange={setSelectedThemeId}
              onScrollBurst={simulateScrollBurst}
              onAppSwitch={simulateAppSwitch}
              onQuietMoment={simulateQuietMoment}
            />

            <AnimatePresence>
              {showPauseOverlay && (
                <PauseRitualOverlay
                  theme={activeTheme}
                  driftMemorySoftness={driftMemorySoftness}
                  onContinue={acknowledgePause}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showReflection && <ReflectionPanel theme={activeTheme} onReflect={onReflect} />}
            </AnimatePresence>

            <AnimatePresence>
              {showReset && <ResetPauseScreen theme={activeTheme} resetDurationLabel={resetDurationLabel} />}
            </AnimatePresence>
          </motion.div>
        ) : (
          <ClosedScreen key="closed" theme={activeTheme} />
        )}
      </AnimatePresence>

      {interactionLocked && (
        <div className="absolute inset-0 z-50 cursor-not-allowed bg-transparent" aria-hidden="true" />
      )}

      {/* Keeps required behavioral data model in-app without exposing analytics UI. */}
      <DataModelBridge dataModel={dataModel} />
    </MobileFrame>
  );
}
