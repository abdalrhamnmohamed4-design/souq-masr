/**
 * lib/soldIntent.ts — كشف "نية البيع" في رسالة شات (طلب Sold Confirmation
 * Flow §1/§5). عمدًا **مش** بس كلمة "اتباع" لوحدها — الطلب نص صراحة:
 * "Do NOT trigger the sold flow merely because the message contains the
 * word 'اتباع'" — لازم عبارة كاملة واضحة (فعل + إشارة اكتمال زي "خلاص"/
 * "تم")، مش substring واحد عام ممكن يظهر في جملة تانية خالص (زي "اتباع
 * ولا لسه؟" أو "هو ده بيتباع؟").
 */

const SOLD_INTENT_PHRASES = [
  'اتباع خلاص',
  'اتباعت خلاص',
  'اتبعت خلاص',
  'خلصت البيع',
  'تم البيع',
  'بيع خلاص',
  'اتباع بقا',
  'اتباع بقى',
  'المنتج اتباع',
  'الحاجة اتباعت',
];

export function looksLikeSoldIntent(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return SOLD_INTENT_PHRASES.some((phrase) => normalized.includes(phrase));
}
