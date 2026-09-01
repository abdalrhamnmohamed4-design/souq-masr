import { categories } from './taxonomy/categories';
import { listings } from './listings';
import { payments } from './payments';
import { users } from './users';
import { formatDate, intBetween, resetSeed } from './utils';

resetSeed(707);

export type DailyPoint = { date: string; label: string; value: number };

function series(days: number, min: number, max: number, trendUp = true): DailyPoint[] {
  const out: DailyPoint[] = [];
  let base = intBetween(min, max);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const drift = trendUp ? intBetween(-2, 6) : intBetween(-6, 2);
    base = Math.max(min, Math.min(max, base + drift));
    out.push({ date: d.toISOString(), label: formatDate(d.toISOString()), value: base });
  }
  return out;
}

export const dau = series(30, 800, 2600, true);
export const newUsersDaily = series(30, 10, 90, true);
export const newListingsDaily = series(30, 20, 140, true);
export const revenueDaily = series(30, 500, 6000, true);

export function last(arr: DailyPoint[], n: number) {
  return arr.slice(-n);
}
export function sum(arr: DailyPoint[]) {
  return arr.reduce((s, p) => s + p.value, 0);
}

// أكتر التصنيفات مشاهدة (من بيانات الإعلانات الفعلية)
export const topCategories = categories
  .map((c) => ({
    name: c.name,
    views: listings.filter((l) => l.categoryId === c.id).reduce((s, l) => s + l.views, 0),
  }))
  .filter((c) => c.views > 0)
  .sort((a, b) => b.views - a.views)
  .slice(0, 6);

// أكتر البائعين نشاطًا (عدد إعلانات + إجمالي مشاهدات)
const sellerAgg = new Map<string, { name: string; listings: number; views: number }>();
for (const l of listings) {
  const e = sellerAgg.get(l.sellerId) ?? { name: l.sellerName, listings: 0, views: 0 };
  e.listings += 1;
  e.views += l.views;
  sellerAgg.set(l.sellerId, e);
}
export const topSellers = Array.from(sellerAgg.values())
  .sort((a, b) => b.views - a.views)
  .slice(0, 6);

// أفضل المحافظات أداءً (عدد إعلانات)
const locationAgg = new Map<string, number>();
for (const l of listings) locationAgg.set(l.location, (locationAgg.get(l.location) ?? 0) + 1);
export const topLocations = Array.from(locationAgg.entries())
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 6);

export const retention = {
  dau: dau[dau.length - 1].value,
  mau: users.filter((u) => new Date(u.lastActiveAt).getTime() > Date.now() - 30 * 86400000).length,
  newUsers30d: sum(newUsersDaily),
};

export const revenueByType = (() => {
  const map = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== 'success') continue;
    map.set(p.type, (map.get(p.type) ?? 0) + p.amount);
  }
  return Array.from(map.entries()).map(([type, total]) => ({ type, total }));
})();
