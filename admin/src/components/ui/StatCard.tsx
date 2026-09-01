import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';

type Props = {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  tone?: 'ink' | 'signal' | 'gold' | 'verify' | 'danger';
};

const TONE_BG: Record<NonNullable<Props['tone']>, string> = {
  ink: 'bg-ink/5 text-ink',
  signal: 'bg-signal-wash text-signal-2',
  gold: 'bg-gold-wash text-[#8A6300]',
  verify: 'bg-verify-wash text-verify',
  danger: 'bg-danger-wash text-danger',
};

export function StatCard({ label, value, icon: Icon, trend, tone = 'ink' }: Props) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-3">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONE_BG[tone]}`}>
          <Icon size={16} strokeWidth={2} />
        </div>
      </div>
      <div className="mt-2 font-display text-2xl font-extrabold text-ink">{value}</div>
      {trend ? (
        <div
          className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${
            trend.value >= 0 ? 'text-verify' : 'text-danger'
          }`}
        >
          {trend.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>
            {trend.value >= 0 ? '+' : ''}
            {trend.value}% {trend.label}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default StatCard;
