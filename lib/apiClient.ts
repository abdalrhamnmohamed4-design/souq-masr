/**
 * lib/apiClient.ts — عميل HTTP مركزي واحد لأي طلب مستقبلي لـFrappe
 * (القسم 10 من الطلب: "Do not rely exclusively on the mobile app to
 * enforce minimum versions... the backend should also be capable of
 * rejecting unsupported app versions for sensitive APIs").
 *
 * كل طلب بيعدّي من هنا بيحمل تلقائيًا:
 *   X-App-Version   → lib/appInfo.ts's getInstalledVersion()
 *   X-App-Build     → lib/appInfo.ts's getInstalledBuild()
 *   X-Platform      → 'ios' | 'android'
 * عشان الباك إند (لما يتوصّل فعليًا) يقدر يرفض أي endpoint حسّاس لو
 * الإصدار قديم، حتى لو الفحص المحلي في StartupGate اتخطّى بطريقة ما
 * (مثلًا الـconfig نفسه كان قديم في cache، أو تعديل مباشر في الجهاز —
 * القسم نفسه بيقول صراحة "do not rely exclusively on the mobile app").
 *
 * رد الباك إند بـ426 Upgrade Required (أو خطأ Frappe المكافئ اللي
 * PHASE_1_MOBILE_API_MAPPING.md's §6 هيوثّقه بالظبط لما endpoint حقيقي
 * يتبني) بيتحوّل هنا لمعالج مسجّل (onUpgradeRequired) — يعني حتى لو
 * الفحص وقت الإقلاع عدّى، أي رد 426 وسط الجلسة من أي طلب بيقفل التطبيق
 * فورًا بشاشة التحديث الإجباري (تغطية كاملة، مش بس وقت الإقلاع — القسم
 * 5 و16).
 *
 * الملف ده **متعمّد ميستوردش store/useAppGateStore.ts خالص** — لو عمل
 * كده، كان هيبقى فيه دورة استيراد حقيقية (useAppGateStore.ts →
 * services/appVersionService.ts → apiClient.ts → useAppGateStore.ts
 * تاني)، وده ظهر فعليًا كـ"Require cycle" warning حقيقي من Metro وقت
 * تشغيل التطبيق على جهاز حقيقي، مش نظري. الحل: apiClient.ts بيعرّف
 * معالج قابل للتسجيل بس (زي event bus صغير)، وuseAppGateStore.ts هو اللي
 * بيسجّله بنفسه بعد ما الـstore يتعرّف — الاتجاه بقى في اتجاه واحد بس
 * (الـstore بيعرف عن apiClient، مش العكس).
 *
 * ملحوظة صادقة: مفيش endpoint حقيقي بينادي الملف ده لسه غير
 * services/appVersionService.ts نفسه — باقي الأفعال في التطبيق (نشر
 * إعلان، شات، مفضلة...) لسه بتكتب محليًا بس (AsyncStorage/Zustand)، مش
 * عن طريق طلب HTTP حقيقي. الملف ده جاهز/موثّق لأي endpoint Frappe حقيقي
 * يتضاف لاحقًا (Phase 2)، مش بيتنادى من كل مكان دلوقتي.
 */
import { getCurrentPlatform, getInstalledBuild, getInstalledVersion } from '@/lib/appInfo';

export const UPGRADE_REQUIRED_STATUS = 426;

let onUpgradeRequired: (() => void) | null = null;

/** بتتنادى مرة واحدة بس، من store/useAppGateStore.ts بعد تعريف الـstore
 * (كسر دورة الاستيراد — شوف الملحوظة فوق). */
export function setUpgradeRequiredHandler(handler: () => void) {
  onUpgradeRequired = handler;
}

export class UpgradeRequiredError extends Error {
  constructor() {
    super('Server rejected this request: app version below minimum supported version (426).');
    this.name = 'UpgradeRequiredError';
  }
}

function versionHeaders(): Record<string, string> {
  const build = getInstalledBuild();
  return {
    'X-App-Version': getInstalledVersion(),
    'X-App-Build': build !== null ? String(build) : '',
    'X-Platform': getCurrentPlatform(),
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * `path` نسبي لـAPI_BASE_URL (مثلًا "/api/method/souq_masr.api.v1...").
 * بيرمي UpgradeRequiredError لو الباك إند رجّع 426 — الاستدعاء المسؤول
 * يقدر يـcatch يه لو عايز يتصرف محليًا، بس مفيش داعي لأن
 * markMandatoryUpdateRequired() خلاص قفل الـStartupGate قبل ما الـcatch
 * يتنفذ أصلًا.
 */
export async function apiFetch(baseUrl: string, path: string, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const res = await fetchWithTimeout(
    `${baseUrl}${path}`,
    { ...init, headers: { Accept: 'application/json', ...versionHeaders(), ...(init.headers ?? {}) } },
    timeoutMs,
  );

  if (res.status === UPGRADE_REQUIRED_STATUS) {
    onUpgradeRequired?.();
    throw new UpgradeRequiredError();
  }

  return res;
}
