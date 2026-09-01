import type { BoostService } from '@/types';

export const boostServices: BoostService[] = [
  { id: 'boost-24h', type: 'boost', name: 'رفع الإعلان — 24 ساعة', durationLabel: '24 ساعة', priceEGP: 25, active: true },
  { id: 'boost-3d', type: 'boost', name: 'رفع الإعلان — 3 أيام', durationLabel: '3 أيام', priceEGP: 60, active: true },
  { id: 'boost-7d', type: 'boost', name: 'رفع الإعلان — أسبوع', durationLabel: '7 أيام', priceEGP: 120, active: true },
  { id: 'featured-3d', type: 'featured', name: 'إعلان مميز', durationLabel: '3 أيام', priceEGP: 90, active: true },
  { id: 'vip-7d', type: 'vip', name: 'عضوية VIP', durationLabel: '7 أيام', priceEGP: 200, active: true },
  { id: 'pinned-24h', type: 'pinned', name: 'تثبيت أعلى القسم', durationLabel: '24 ساعة', priceEGP: 40, active: false },
];

export default boostServices;
