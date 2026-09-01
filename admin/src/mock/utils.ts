/**
 * src/mock/utils.ts — أدوات صغيرة لتوليد بيانات وهمية واقعية ومتنوعة
 * (Seeded PRNG بسيط عشان النتائج تفضل ثابتة بين كل تشغيل للتطبيق).
 */

let seed = 42;
export function rand() {
  // mulberry32
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function resetSeed(n: number) {
  seed = n;
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

export function pickWeighted<T>(entries: [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

export function intBetween(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

export function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function money(n: number) {
  return n.toLocaleString('en-US') + ' ج.م';
}

const FIRST_NAMES = [
  'محمد', 'أحمد', 'محمود', 'عمر', 'يوسف', 'خالد', 'كريم', 'مصطفى', 'إبراهيم', 'حسن',
  'سارة', 'مريم', 'نور', 'هبة', 'ياسمين', 'ليلى', 'دينا', 'رنا', 'آية', 'فرح',
];
const LAST_NAMES = [
  'عادل', 'رضا', 'سالم', 'عبد الله', 'حسن', 'إبراهيم', 'فؤاد', 'شعبان', 'الشريف', 'منصور',
  'زكي', 'توفيق', 'جلال', 'نجيب', 'كامل',
];

export function randomName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

export function initialsOf(name: string) {
  return name.trim().slice(0, 2);
}

export function randomPhone() {
  return '010' + Array.from({ length: 8 }, () => intBetween(0, 9)).join('');
}
