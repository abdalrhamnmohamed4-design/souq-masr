/**
 * config/env.ts — الفرق الصريح بين Development / Staging / Production
 * (القسم 13 من طلب Force Update/Online-Only). القرار بيتاخد من متغير بيئة
 * واحد بس (`EXPO_PUBLIC_APP_ENV`)، من غير أي "استثناء مخفي" في الكود
 * لبيئة الإنتاج — أي bypass موجود هنا بيبان بوضوح إنه Dev-only، ومقفول
 * تلقائيًا (`isProduction === true`) لو الكود بيتشغل كـproduction build.
 *
 * `EXPO_PUBLIC_*` هو الشكل الرسمي اللي Expo بيقرأه وقت الـbuild ويحطه في
 * `process.env` — مفيش حاجة إضافية لازم تتظبط في app.json عشان كده يشتغل.
 */

export type AppEnv = 'development' | 'staging' | 'production';

function resolveEnv(): AppEnv {
  const raw = (process.env.EXPO_PUBLIC_APP_ENV ?? '').trim().toLowerCase();
  if (raw === 'production' || raw === 'staging') return raw;
  if (raw === 'development') return 'development';
  // من غير قيمة صريحة: __DEV__ (Metro dev server / expo start) = development،
  // وأي بناء تاني (npx expo export, EAS build من غير env محدد) = production
  // كافتراضي أأمن — "ماينفعش نبني production build وهو فاضي من كل الحمايات
  // دي بالغلط" أهم من راحة اختبار محلي.
  return __DEV__ ? 'development' : 'production';
}

export const APP_ENV: AppEnv = resolveEnv();
export const isDevelopment = APP_ENV === 'development';
export const isStaging = APP_ENV === 'staging';
export const isProduction = APP_ENV === 'production';

/**
 * رابط الـFrappe API الحقيقي — من غير bench حقيقي دلوقتي، القيمة دي فاضية
 * افتراضيًا. لما الباك إند الحقيقي يتوصّل، تتحط هنا (أو أفضل: كـ
 * EXPO_PUBLIC_API_BASE_URL وقت الـbuild) — ومفيش قيمة "افتراضية" مكتوبة
 * جوه الكود عمدًا، عشان منمنعش حد يـship نسخة production وهي شايلة
 * endpoint وهمي من غير ما يلاحظ.
 */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim();

/**
 * Dev-only bypass: لو مفيش API_BASE_URL متظبط ومحنا في development، بدل ما
 * نقفل التطبيق بالكامل كل مرة (مفيش bench أصلًا دلوقتي)، AppVersionService
 * بيستخدم config محلي تجريبي معلّم بوضوح إنه mock (lib/mockAppVersionConfig.ts).
 * الشرط ده **مستحيل يتحقق في production** حتى لو حد قصّر ومنساش يظبط
 * API_BASE_URL، لأن isProduction بيبقى true ساعتها ويفضل يعرض شاشة
 * "مفيش اتصال بالباك إند" الحقيقية بدل ما يستخدم mock بصمت.
 */
export const allowDevMockBackend = isDevelopment && !API_BASE_URL;

/** أقصى وقت انتظار لطلب فحص الإصدار/الاتصال وقت الإقلاع (مللي ثانية). */
export const STARTUP_CHECK_TIMEOUT_MS = 8000;
