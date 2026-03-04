import { motion } from 'framer-motion';

export function ClosedScreen({ theme }) {
  return (
    <motion.section
      className="flex h-full w-full items-center justify-center px-7 text-center"
      initial={{ opacity: 0, filter: 'blur(8px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.8 }}
    >
      <div
        className="max-w-[17rem] rounded-[1.6rem] border px-6 py-8 shadow-[0_14px_32px_rgba(83,70,54,0.12)]"
        style={{ background: theme.closedBg, borderColor: theme.closedBorder }}
      >
        <p className="text-[0.62rem] uppercase tracking-[0.22em] text-drift-500">Drift</p>
        <h2 className="font-display mt-4 text-[2rem] leading-[0.98] text-drift-900">Session closed for now</h2>
        <p className="mt-3 text-sm leading-relaxed text-drift-600">
          You stepped away with intention. This space will be here when you return.
        </p>
      </div>
    </motion.section>
  );
}
