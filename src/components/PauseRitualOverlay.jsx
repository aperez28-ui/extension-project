import { motion } from 'framer-motion';

export function PauseRitualOverlay({ theme, driftMemorySoftness, onContinue }) {
  const opacityTarget = driftMemorySoftness ? 0.64 : 0.82;
  const fadeDuration = driftMemorySoftness ? 1.35 : 0.82;

  return (
    <motion.div
      className="absolute inset-0 z-20 flex items-center justify-center px-6 backdrop-blur-sm"
      style={{ background: theme.overlayScrim }}
      initial={{ opacity: 0, filter: 'blur(12px)' }}
      animate={{ opacity: opacityTarget, filter: 'blur(0px)' }}
      transition={{ duration: fadeDuration, ease: 'easeInOut' }}
    >
      <motion.div
        className="w-full rounded-[1.9rem] border p-7 text-left shadow-[0_20px_42px_rgba(62,50,40,0.18)]"
        style={{
          background: theme.overlayCardBg,
          borderColor: theme.overlayCardBorder,
        }}
        initial={{ opacity: 0.08, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.78 }}
      >
        <p className="text-[0.64rem] uppercase tracking-[0.22em] text-drift-500">
          {driftMemorySoftness ? 'Memory check-in' : 'Pause ritual'}
        </p>
        <h2 className="font-display mt-3 text-4xl leading-[0.95] text-drift-900">
          {driftMemorySoftness ? 'Checking in' : 'Still here?'}
        </h2>
        <p className="mt-4 max-w-[16rem] text-sm leading-relaxed text-drift-600">
          You&apos;ve been scrolling for a while. Want to continue intentionally?
        </p>
        <button
          className="mt-7 w-full rounded-2xl border px-4 py-3 text-sm text-drift-800 transition-colors duration-500"
          style={{
            borderColor: theme.overlayCardBorder,
            background: theme.overlayPrimary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme.overlayPrimaryHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = theme.overlayPrimary;
          }}
          onClick={onContinue}
        >
          Open reflection options
        </button>
      </motion.div>
    </motion.div>
  );
}
