import { motion } from 'framer-motion';
import { ReflectionChoice } from '../state/driftMachine';

export function ReflectionPanel({ theme, onReflect }) {
  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-end px-5 pb-6"
      initial={{ opacity: 0, filter: 'blur(10px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.82, ease: 'easeOut' }}
    >
      <div
        className="w-full rounded-[1.8rem] border p-5 shadow-[0_18px_40px_rgba(71,60,49,0.14)] backdrop-blur-xs"
        style={{ background: theme.panelBg, borderColor: theme.panelBorder }}
      >
        <p className="text-[0.62rem] uppercase tracking-[0.22em] text-drift-500">Reflection</p>
        <h3 className="font-display mt-3 text-3xl leading-[0.98] text-drift-900">Still here?</h3>
        <p className="mt-3 text-sm leading-relaxed text-drift-600">
          You&apos;ve been scrolling for a while. Want to continue intentionally?
        </p>

        <div className="mt-6 space-y-3 text-sm">
          <button
            className="w-full rounded-2xl border px-4 py-3 text-left text-drift-800 transition duration-500"
            style={{ borderColor: theme.panelBorder, background: theme.panelStrong }}
            onClick={() => onReflect(ReflectionChoice.CONTINUE)}
          >
            Continue with awareness
          </button>
          <button
            className="w-full rounded-2xl border px-4 py-3 text-left text-drift-700 transition duration-500"
            style={{ borderColor: theme.panelBorder, background: theme.panelSoft }}
            onClick={() => onReflect(ReflectionChoice.RESET)}
          >
            Pause for 2 minutes
          </button>
          <button
            className="w-full rounded-2xl border px-4 py-3 text-left text-drift-600 transition duration-500"
            style={{ borderColor: theme.panelBorder, background: theme.panelGhost }}
            onClick={() => onReflect(ReflectionChoice.CLOSE)}
          >
            Close for now
          </button>
        </div>
      </div>
    </motion.div>
  );
}
