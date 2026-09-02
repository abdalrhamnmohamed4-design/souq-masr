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
import { devLog, devLogError } from '@/lib/devLog';
import { checkDeviceConnectivity } from '@/services/connectivityService';
import { allowDevMockBackend, API_BASE_URL } from '@/config/env';
import type { ApiResult } from '@/types/frappeApi';

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

/**
 * نداء عام لأي `whitelisted` method في Frappe — نقطة الدخول الوحيدة اللي
 * أي service layer (services/taxonomyService.ts وأي حاجة بعدها في Phase
 * 2B-2F) المفروض ينادي منها، بدل ما كل شاشة تستدعي fetch مباشرة (القسم
 * 11 من طلب Phase 2). بيتكفّل بـ:
 *   - فحص الاتصال بالإنترنت أولًا (no_internet مختلف عن backend_unavailable)
 *   - عدم وجود API_BASE_URL أصلًا (staging/production من غير config)
 *   - فك غلاف Frappe's {"message": ...} تلقائيًا
 *   - تمييز أكواد الحالة (401/403/404/422/429/5xx/timeout) بدل خطأ عام واحد
 *   - devLog لكل نداء في development بس (lib/devLog.ts بيرفض production تلقائيًا)
 *
 * `path` نسبي (زي "souq_masr.api.v1.taxonomy.get_children")، `params`
 * بيتحوّل لـquery string تلقائيًا.
 */
export async function frappeGet<T>(
  method: string,
  params?: Record<string, string | number | undefined>,
  timeoutMs = 10000,
): Promise<ApiResult<T>> {
  const device = await checkDeviceConnectivity();
  if (!device.isInternetReachable) {
    devLog('apiClient', `${method} skipped — no internet`);
    return { status: 'no_internet' };
  }

  if (allowDevMockBackend) {
    // نفس قرار services/appVersionService.ts — Dev-only، مستحيل يتحقق في
    // production. الدالة دي مبترجعش mock بنفسها (مالهاش فكرة عن شكل
    // البيانات المتوقع لكل method)؛ الاستدعاء المسؤول (service layer)
    // هو اللي بيقرر يرجع mock بنفسه لو شاف الحالة دي، مش هنا.
    return { status: 'backend_unavailable', detail: 'API_BASE_URL not configured (dev mock mode)' };
  }
  if (!API_BASE_URL) {
    return { status: 'backend_unavailable', detail: 'API_BASE_URL is not configured' };
  }

  const qs = params
    ? '?' +
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const path = `/api/method/${method}${qs}`;

  try {
    const res = await apiFetch(API_BASE_URL, path, {}, timeoutMs);
    devLog('apiClient', `${method} -> HTTP ${res.status}`);

    if (res.status === 401) return { status: 'unauthorized' };
    if (res.status === 403) return { status: 'forbidden' };
    if (res.status === 404) return { status: 'not_found' };
    if (res.status === 422) return { status: 'validation_error' };
    if (res.status === 429) return { status: 'rate_limited' };
    if (!res.ok) return { status: 'server_error', httpStatus: res.status };

    const body = await res.json();
    return { status: 'success', data: (body?.message ?? body) as T };
  } catch (err) {
    if (err instanceof UpgradeRequiredError) throw err;
    const isAbort = err instanceof Error && err.name === 'AbortError';
    devLogError('apiClient', `${method} failed`, err);
    if (isAbort) return { status: 'timeout' };
    return { status: 'backend_unavailable', detail: err instanceof Error ? err.message : String(err) };
  }
}
