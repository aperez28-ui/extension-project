import { motion } from 'framer-motion';

function progressFromLabel(label) {
  const [mins, secs] = label.split(':').map((n) => Number(n));
  const remaining = mins * 60 + secs;
  return remaining / 120;
}

export function ResetPauseScreen({ theme, resetDurationLabel }) {
  const progress = progressFromLabel(resetDurationLabel);
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - progress * circumference;

  return (
    <motion.section
      className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0, filter: 'blur(8px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.92 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: theme.resetBg }}
        animate={{ opacity: [0.72, 0.95, 0.72] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 text-center">
        <p className="text-[0.62rem] uppercase tracking-[0.23em] text-drift-500">Two-minute reset</p>
        <h3 className="font-display mt-3 text-[2.1rem] leading-[0.98] text-drift-900">Breathe and return gently</h3>

        <div className="mt-8 flex items-center justify-center">
          <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" stroke={theme.resetTrack} strokeWidth="7" fill="none" />
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              stroke={theme.resetStroke}
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </svg>

          <div className="absolute text-center">
            <p className="text-[0.6rem] uppercase tracking-[0.17em] text-drift-500">Remaining</p>
            <p className="font-display mt-1 text-4xl leading-none text-drift-900">{resetDurationLabel}</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
