/**
 * theme/decorative.ts
 *
 * ألوان تزيينية بحتة من mazad-v2.html — مش جزء من نظام :root الأساسي
 * (مفيش لها --variable)، لكنها لازم تتحفظ حرفيًا لأنها المرجع البصري
 * الوحيد لأشكال الـ thumbnails الهندسية (بدل صور حقيقية). متفصولة عن
 * theme/tokens.ts عشان الأخير يفضل ممثّل لنظام التوكنز الرسمي بس.
 *
 * ملاحظة: `categoryColors` القديمة (تصنيفات ثابتة بألوان يدوية) اتشالت
 * من هنا — التصنيفات بقت مصدرها الوحيد `mock/taxonomy/categories.ts`
 * (شجرة ديناميكية حقيقية، جزء من نظام التصنيفات الكامل).
 */

// ============================================================
// أشكال الـ thumbnail البديلة (.thumb.th-a .. .th-f)
// كل واحدة عبارة عن مستطيلين ملوّنين فوق بعض (i:nth-child(1/2))
// بنسب inset مختلفة. القيم هنا بتمثّل الألوان بس — الـ inset/shape
// (مربع/دائرة) هيتترجم لمكوّن <ThumbPlaceholder variant="a" /> في
// Phase 2 باستخدام View مش صور فعلية.
// ============================================================
export type ThumbVariant = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';

export const thumbVariants: Record<
  ThumbVariant,
  { primary: string; secondary: string; secondaryShape?: 'circle' }
> = {
  a: { primary: '#5B7FB8', secondary: '#9FB8DC' },
  b: { primary: '#C97B4A', secondary: '#E2AA83' }, // border-radius أعلى شكل بيت خفيف في الأصل
  c: { primary: '#7C9A6B', secondary: '#AEC29F' },
  // th-d: العنصر الأول دائرة (border-radius:50%) مش مستطيل
  d: { primary: '#B08AB5', secondary: '#D6BEDA', secondaryShape: 'circle' },
  e: { primary: '#4E7A93', secondary: '#9CBCCE' },
  f: { primary: '#C2A35A', secondary: '#E0CE9A' },
};

export default { thumbVariants };
