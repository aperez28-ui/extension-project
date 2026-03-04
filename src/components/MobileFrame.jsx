import { motion } from 'framer-motion';

export function MobileFrame({ children, tone = 'base', theme }) {
  const toneClass = tone === 'aware' ? 'opacity-95 saturate-[0.95]' : 'opacity-100 saturate-100';

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] items-center justify-center px-3 py-4 sm:py-6">
      <div
        className="relative h-[840px] max-h-[96vh] w-full overflow-hidden rounded-[2.2rem] border p-2 shadow-[0_30px_70px_rgba(64,56,45,0.2)]"
        style={{ borderColor: theme.shellBorder, background: theme.shellBg }}
      >
        <div className={`relative h-full w-full overflow-hidden rounded-[1.8rem] ${toneClass}`} style={{ background: theme.frameBg }}>
          <div className="pointer-events-none absolute left-1/2 top-2 z-40 h-5 w-28 -translate-x-1/2 rounded-full" style={{ background: theme.notch }} />
          <motion.div
            className="pointer-events-none absolute -left-20 top-28 h-52 w-52 rounded-full blur-2xl"
            style={{ background: theme.glowA }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.78, 0.5] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="pointer-events-none absolute -right-20 bottom-24 h-64 w-64 rounded-full blur-2xl"
            style={{ background: theme.glowB }}
            animate={{ scale: [1.03, 0.92, 1.03], opacity: [0.35, 0.56, 0.35] }}
            transition={{ duration: 12.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          {children}
        </div>
      </div>
    </div>
  );
}
