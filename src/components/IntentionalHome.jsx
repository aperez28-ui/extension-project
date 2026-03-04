import { motion } from 'framer-motion';

export function IntentionalHome({
  isAwarenessTone,
  mobileSessionDuration,
  scrollActiveSeconds,
  appSwitchCount,
  webSignals,
  selectedThemeId,
  themes,
  onThemeChange,
  onScrollBurst,
  onAppSwitch,
  onQuietMoment,
}) {
  const theme = themes[selectedThemeId];

  return (
    <motion.section
      className="relative flex h-full w-full flex-col px-6 pb-6 pt-11"
      initial={{ opacity: 0, filter: 'blur(8px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.75, ease: 'easeOut' }}
    >
      <header className="z-10">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.28em] text-drift-500">Drift session</p>
            <h1 className="font-display mt-2 text-[2.1rem] leading-[1.03] text-drift-900">
              {isAwarenessTone ? 'Awareness mode' : 'Intentional use'}
            </h1>
          </div>
          <div className="rounded-xl border border-[#d9cdbb]/80 bg-[#f8f4eb]/90 p-1">
            <div className="flex gap-1">
              {Object.entries(themes).map(([id, option]) => (
                <button
                  key={id}
                  onClick={() => onThemeChange(id)}
                  className="h-6 w-6 rounded-md border transition duration-500"
                  style={{
                    borderColor: id === selectedThemeId ? '#8a7a63' : '#d5c8b5',
                    background: option.swatch,
                  }}
                  aria-label={`Use ${option.label} theme`}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-drift-600">
          Keep your attention where you choose it. Drift checks in softly when momentum takes over.
        </p>
      </header>

      <div className="relative mt-6 flex flex-1 items-center justify-center">
        <motion.div
          className="absolute h-64 w-64 rounded-full border"
          style={{ borderColor: theme.ringOuter }}
          animate={{ scale: [1, 1.035, 1], opacity: [0.45, 0.8, 0.45] }}
          transition={{ duration: 8.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute h-48 w-48 rounded-full border"
          style={{ borderColor: theme.ringInner }}
          animate={{ scale: [1.02, 0.95, 1.02], opacity: [0.4, 0.62, 0.4] }}
          transition={{ duration: 7.6, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="relative flex h-52 w-52 items-center justify-center rounded-full shadow-[0_14px_34px_rgba(73,61,49,0.23)]"
          style={{
            background: `linear-gradient(145deg, ${theme.ringA}, ${theme.ringB} 58%, ${theme.ringC})`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
        >
          <div className="flex h-[11.2rem] w-[11.2rem] flex-col items-center justify-center rounded-full border border-[#e3dbcf] bg-[#f8f5ef]/95">
            <p className="text-[0.6rem] uppercase tracking-[0.24em] text-drift-500">Intent ring</p>
            <p className="font-display mt-2 text-5xl leading-none text-drift-900">{mobileSessionDuration}</p>
          </div>
        </motion.div>
      </div>

      <div className="z-10 space-y-3">
        <div className="rounded-[1.35rem] border border-[#dacdb8] bg-[#f8f4ec]/92 p-4 shadow-[0_10px_26px_rgba(82,70,58,0.09)]">
          <p className="text-[0.62rem] uppercase tracking-[0.23em] text-drift-500">Current signals</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#e2d7c6] bg-[#fbf9f5] px-3 py-3">
              <p className="text-[0.62rem] uppercase tracking-[0.12em] text-drift-500">Scroll momentum</p>
              <p className="mt-1 text-lg text-drift-800">{scrollActiveSeconds}s</p>
            </div>
            <div className="rounded-xl border border-[#e2d7c6] bg-[#fbf9f5] px-3 py-3">
              <p className="text-[0.62rem] uppercase tracking-[0.12em] text-drift-500">Switches</p>
              <p className="mt-1 text-lg text-drift-800">{appSwitchCount}</p>
            </div>
            <div className="col-span-2 rounded-xl border border-[#e2d7c6] bg-[#fbf9f5] px-3 py-2">
              <p className="text-[0.62rem] uppercase tracking-[0.12em] text-drift-500">Web awareness</p>
              <p className="mt-1 text-[0.78rem] text-drift-700">
                Tab changes {webSignals.tabSwitches} • Focus returns {webSignals.focusReturns} • Last input {webSignals.lastInput}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[0.7rem]">
          <button
            onClick={onScrollBurst}
            className="rounded-xl border border-[#d7c9b4] px-2 py-2.5 text-drift-700 transition duration-500"
            style={{ background: theme.actionSoft }}
          >
            Scroll pulse
          </button>
          <button
            onClick={onAppSwitch}
            className="rounded-xl border border-[#d7c9b4] px-2 py-2.5 text-drift-700 transition duration-500"
            style={{ background: theme.actionSoft }}
          >
            App shift
          </button>
          <button
            onClick={onQuietMoment}
            className="rounded-xl border border-[#d7c9b4] px-2 py-2.5 text-drift-700 transition duration-500"
            style={{ background: theme.actionSoft }}
          >
            Quiet beat
          </button>
        </div>
      </div>
    </motion.section>
  );
}
