import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'verify' | 'gold' | 'danger' | 'signal' | 'info';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-line-2 text-ink-2',
  verify: 'bg-verify-wash text-verify',
  gold: 'bg-gold-wash text-[#8A6300]',
  danger: 'bg-danger-wash text-danger',
  signal: 'bg-signal-wash text-signal-2',
  info: 'bg-info-wash text-info',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export default Badge;
