/**
 * lib/validation.ts — تحقق مشترك من رقم الموبايل المصري. قبل الإصلاح
 * كانت كل فورم (تسجيل الدخول، تعديل البروفايل، تحويل رصيد، التقديم
 * على وظيفة) بتقبل أي نص طوله 10 خانات كـ"رقم صحيح" — يعني "aaaaaaaaaa"
 * كان بيعدّي validation عادي. دلوقتي في مكان واحد للتحقق الحقيقي.
 */

/**
 * رقم موبايل مصري حقيقي: 11 رقم يبدأ بـ010/011/012/015 — سواء بالشكل
 * المحلي ("01xxxxxxxxx") أو المطبّع دوليًا ("+201xxxxxxxxx"، اللي بقى
 * الشكل المخزّن فعليًا في onboarding.phone بعد إضافة اختيار كود الدولة).
 * القبول الاتنين مهم عشان الشاشات التانية (تعديل البروفايل، التقديم على
 * وظيفة...) اللي بتقرأ onboarding.phone كقيمة مبدئية تفضل شغالة زي ما هي.
 */
export function isValidEgyptianPhone(phone: string): boolean {
  const digitsOnly = phone.trim().replace(/[\s-]/g, '');
  const local = digitsOnly.replace(/^(\+20|0020|20)/, '');
  const withLeadingZero = local.startsWith('0') ? local : `0${local}`;
  return /^01[0125]\d{8}$/.test(withLeadingZero);
}

/**
 * تحقق عام (غير مصري): رقم محلي من 6 لـ14 رقم، أرقام بس بعد إزالة
 * المسافات/الشرطات. مفيش قاعدة دقيقة لكل دولة في العالم (200+ دولة)،
 * فده تحقق معقول بيمنع نصوص فاضية أو غير رقمية بس، مش تحقق شكل كامل
 * زي رقم مصر (اللي هو المحور الفعلي للتطبيق).
 */
export function isValidGenericLocalPhone(localNumber: string): boolean {
  const digitsOnly = localNumber.trim().replace(/[\s-]/g, '');
  return /^\d{6,14}$/.test(digitsOnly);
}

/** تحقق من رقم محلي حسب كود الدولة المختار — مصر بقاعدتها الدقيقة،
 * غيرها بالتحقق العام. */
export function isValidLocalPhoneForCountry(iso2: string, localNumber: string): boolean {
  if (iso2 === 'EG') return isValidEgyptianPhone(localNumber);
  return isValidGenericLocalPhone(localNumber);
}

/**
 * بيطبّع كود الدولة + الرقم المحلي لصيغة دولية واحدة مخزّنة فعليًا
 * ("+" + كود الدولة + الرقم بدون الصفر الأول) — نفس الصيغة اللي أي
 * باك إند (Frappe مستقبلًا) هيتوقعها. مثال: dial="20", local="01012345678"
 * → "+201012345678".
 */
export function normalizePhoneForStorage(dial: string, localNumber: string): string {
  const digitsOnly = localNumber.trim().replace(/[\s-]/g, '');
  const withoutLeadingZero = digitsOnly.replace(/^0+/, '');
  return `+${dial}${withoutLeadingZero}`;
}

/** شكل إيميل أساسي صحيح — تحقق بسيط، مش RFC كامل، بس كفاية لمنع
 * "asdasd" أو إيميل من غير @ من إنه يتسجّل كإيميل حقيقي. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** رقم صحيح موجب من نص خام — بيشيل أي حاجة مش رقم (زي إشارة السالب أو
 * حروف) قبل الـparse، مش بيعمل `Number(raw)` مباشرة. القيمة دي هي اللي
 * بتتحفظ فعليًا، مش النص الخام اللي المستخدم كتبه — فمينفعش سعر/راتب
 * سالب يتسجّل حتى لو المستخدم كتب "-500". يرجّع undefined لو مفيش رقم. */
export function toPositiveInt(raw: string): number | undefined {
  const digitsOnly = raw.replace(/[^0-9]/g, '');
  if (!digitsOnly) return undefined;
  return Number(digitsOnly);
}
