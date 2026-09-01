/**
 * lib/search.ts — مطابقة نص بحث موحّدة. قبل الإصلاح كل شاشة نتائج
 * (السوق العام، الوظائف، الخدمات، الشات) كانت بتستخدم `.includes()` خام
 * حساس لحالة الأحرف — يعني البحث بـ"iphone" (كتابة طبيعية بحروف صغيرة)
 * مكنش بيلاقي إعلان عنوانه "iPhone 15 Pro Max" (بحرف I كابيتال) خالص.
 * العربي مش بيتأثر (مفيش حالة أحرف) بس الإنجليزي/أرقام الموديلات كانت
 * بتفشل بصمت.
 */

/** true لو `needle` موجودة جوه `haystack` من غير التفات لحالة الأحرف. */
export function matchesQuery(haystack: string, needle: string): boolean {
  const q = needle.trim().toLowerCase();
  if (!q) return true;
  return haystack.toLowerCase().includes(q);
}
