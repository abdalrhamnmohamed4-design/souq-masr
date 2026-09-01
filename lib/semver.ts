/**
 * lib/semver.ts — مقارنة إصدارات رقمية حقيقية (مش string compare). لازم
 * نضمن: "1.0.9" < "1.0.10" (لو قارنّا كـstrings، "1.0.9" > "1.0.10" غلط
 * لأن '9' > '1' حرفيًا) و"1.0.10" > "1.0.9". بيدعم بناء رقم إضافي زي
 * "1.0.10+15" (الجزء بعد "+" = رقم البناء/build number، مش جزء من
 * الـsemver نفسه — بيتقارن بس لو الـmajor.minor.patch متساويين تمامًا).
 */

export type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
  /** رقم البناء لو موجود بعد "+" (زي "1.0.10+15" → build = 15)، أو null لو مفيش. */
  build: number | null;
  raw: string;
};

/**
 * "1.0.10+15" → { major: 1, minor: 0, patch: 10, build: 15 }.
 * "1.0" → { major: 1, minor: 0, patch: 0, build: null } (أجزاء ناقصة = صفر).
 * قيمة مش قابلة للتحليل خالص (فاضية/مش رقمية) → null، الاستدعاء المسؤول
 * عن قرار إيه اللي يحصل (عادةً: يتعامل معاها كأنها "مش مدعومة" بأمان).
 */
export function parseVersion(input: string | null | undefined): ParsedVersion | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const [versionPart, buildPart] = trimmed.split('+');
  const parts = versionPart.split('.');
  if (parts.length === 0 || parts.some((p) => p === '' || !/^\d+$/.test(p))) return null;

  const major = Number(parts[0] ?? 0);
  const minor = Number(parts[1] ?? 0);
  const patch = Number(parts[2] ?? 0);
  if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) return null;

  let build: number | null = null;
  if (buildPart !== undefined) {
    if (!/^\d+$/.test(buildPart)) return null;
    build = Number(buildPart);
  }

  return { major, minor, patch, build, raw: trimmed };
}

/**
 * مقارنة عددية بحتة: -1 (a أقل)، 0 (متساويين)، 1 (a أكبر). بتقارن
 * major→minor→patch بالترتيب، وبس لو التلاتة متساويين بالظبط بتقارن الـbuild
 * (لو الاتنين عندهم واحد) كـtie-breaker أخير. القيمة الافتراضية للـbuild
 * الناقص = 0 عشان "1.0.10" (من غير build) تتقارن كـ"1.0.10+0" — منطقي لأن
 * إصدار من غير رقم بناء معلن ميتفضّلش تلقائيًا على واحد له.
 */
export function compareVersions(a: ParsedVersion, b: ParsedVersion): -1 | 0 | 1 {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  const aBuild = a.build ?? 0;
  const bBuild = b.build ?? 0;
  if (aBuild !== bBuild) return aBuild < bBuild ? -1 : 1;
  return 0;
}

/** true لو installed < minimum — الاستخدام الوحيد اللي بيقرر "امنع التطبيق". */
export function isBelowMinimum(installed: ParsedVersion, minimum: ParsedVersion): boolean {
  return compareVersions(installed, minimum) < 0;
}

/** true لو فيه إصدار أحدث متاح (installed < latest) — للتحديث الاختياري بس. */
export function isBelowLatest(installed: ParsedVersion, latest: ParsedVersion): boolean {
  return compareVersions(installed, latest) < 0;
}
