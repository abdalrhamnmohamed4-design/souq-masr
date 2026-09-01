import type { PromoCode } from '@/types';
import { daysAgo } from './utils';

export const promoCodes: PromoCode[] = [
  { id: 'pc-1', code: 'WELCOME50', discountType: 'percent', value: 50, expiresAt: daysAgo(-20), maxUses: 500, usedCount: 312, scope: 'all', active: true },
  { id: 'pc-2', code: 'BOOST20', discountType: 'percent', value: 20, expiresAt: daysAgo(-10), maxUses: 200, usedCount: 88, scope: 'boost', active: true },
  { id: 'pc-3', code: 'FEATURED25OFF', discountType: 'fixed', value: 25, expiresAt: daysAgo(-45), maxUses: 100, usedCount: 41, scope: 'featured', active: true },
  { id: 'pc-4', code: 'RAMADAN30', discountType: 'percent', value: 30, expiresAt: daysAgo(15), maxUses: 1000, usedCount: 940, scope: 'all', active: false },
  { id: 'pc-5', code: 'BIZPRO100', discountType: 'fixed', value: 100, expiresAt: daysAgo(-60), maxUses: 50, usedCount: 12, scope: 'subscription', active: true },
  { id: 'pc-6', code: 'EIDGIFT', discountType: 'percent', value: 15, expiresAt: daysAgo(5), maxUses: 300, usedCount: 300, scope: 'all', active: false },
];

export default promoCodes;
