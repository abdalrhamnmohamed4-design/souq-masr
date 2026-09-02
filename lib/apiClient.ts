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
import { buildAuthHeader, peekStoredCredentials } from '@/lib/authCredentials';
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
/**
 * منطق مشترك بين frappeGet وfrappePost — فحص الاتصال، dev-mock
 * short-circuit، بناء الطلب، تفسير الرد. الاتنين بيرجعوا لنفس الشكل
 * ApiResult<T> بالظبط، الفرق الوحيد هو method HTTP ومكان الباراميترز
 * (query string لـGET، JSON body لـPOST — نفس تصنيف REST القياسي في
 * Frappe نفسه: القراءة GET، أي حاجة بتغيّر حالة POST).
 *
 * `authenticated: true` بتحقن Authorization: token <api_key>:<api_secret>
 * لو فيه اعتماد حقيقي مخزّن (lib/authCredentials.ts، من
 * souq_masr.api.v1.auth.signin — Phase 2B) — ده اللي بيفرّق طلب Guest عن
 * طلب مستخدم حقيقي من ناحية الباك إند، مش أي حقل تاني في الـbody. لو
 * مفيش اعتماد مخزّن، الطلب بيتبعت من غير الـheader ده (كـGuest عاديةً —
 * الباك إند هو اللي هيرفضه بـ403/401 لو الـmethod محتاج مصادقة).
 */
async function frappeRequest<T>(
  method: string,
  httpMethod: 'GET' | 'POST',
  params: Record<string, string | number | boolean | undefined> | undefined,
  authenticated: boolean,
  timeoutMs: number,
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

  const cleanParams = params
    ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
    : {};

  const authHeader = authenticated ? (() => {
    const creds = peekStoredCredentials();
    return creds ? buildAuthHeader(creds) : {};
  })() : {};

  let path: string;
  let init: RequestInit;
  if (httpMethod === 'GET') {
    const qs = Object.keys(cleanParams).length
      ? '?' + Object.entries(cleanParams).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
      : '';
    path = `/api/method/${method}${qs}`;
    init = { method: 'GET', headers: { ...authHeader } };
  } else {
    path = `/api/method/${method}`;
    init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify(cleanParams),
    };
  }

  try {
    const res = await apiFetch(API_BASE_URL, path, init, timeoutMs);
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

export async function frappeGet<T>(
  method: string,
  params?: Record<string, string | number | undefined>,
  timeoutMs = 10000,
): Promise<ApiResult<T>> {
  return frappeRequest<T>(method, 'GET', params, /* authenticated */ true, timeoutMs);
}

/**
 * نداء POST لأي `whitelisted` method بيغيّر حالة (إنشاء/تعديل/حذف إعلان
 * مثلًا) — Phase 2B. بيحقن Authorization header تلقائيًا لو فيه اعتماد
 * حقيقي مخزّن (معظم استخدامات POST محتاجة مصادقة أصلًا)؛ الباك إند نفسه
 * هو اللي بيرفض 403/401 لو المستخدم Guest أو مش صاحب المورد — مفيش فحص
 * صلاحيات هنا في العميل، القسم 10 من الطلب بيمنع الاعتماد على فحص
 * frontend-only.
 */
export async function frappePost<T>(
  method: string,
  params?: Record<string, string | number | boolean | undefined>,
  timeoutMs = 15000,
): Promise<ApiResult<T>> {
  return frappeRequest<T>(method, 'POST', params, /* authenticated */ true, timeoutMs);
}

export type LocalFileUpload = { uri: string; name: string; mimeType: string };

/**
 * رفع ملف حقيقي (صورة إعلان، أو ملف خاص زي CV) لـFrappe's core
 * /api/method/upload_file — مش whitelisted method خاص بينا، ده endpoint
 * جاهز أصلًا في Frappe نفسه (شوف MOBILE_BACKEND_GAPS.md's Phase 2F note
 * القديمة). Multipart، مش JSON body زي frappePost العادية، فمحتاج منطق
 * منفصل بسيط هنا بدل ما نلوي frappeRequest عشانه.
 *
 * `isPrivate` دايمًا `false` افتراضيًا (نفس السلوك القديم بالظبط لصور
 * الإعلانات — لازم تتعرض لأي Guest بيشوف إعلان عام من غير token). Jobs
 * vertical's CV upload هو أول مستهلك بيمرّر `isPrivate: true` صراحة —
 * لما يبقى `true`، الـfile_url الراجع بيبقى `/private/files/...` مش
 * قابل للوصول المباشر من غير auth، وميتخزّنش/يتعرض زي أي صورة إعلان
 * عادية؛ الملف الخاص ده لازم يتقرا بس عن طريق endpoint مخصص بيعمل فحص
 * صلاحية صريح (زي get_application_resume في jobs.py)، مش رابط مباشر.
 */
export async function frappeUploadFile(
  file: LocalFileUpload,
  timeoutMs = 30000,
  options?: { isPrivate?: boolean },
): Promise<ApiResult<{ fileUrl: string }>> {
  const device = await checkDeviceConnectivity();
  if (!device.isInternetReachable) return { status: 'no_internet' };
  if (allowDevMockBackend) return { status: 'backend_unavailable', detail: 'API_BASE_URL not configured (dev mock mode)' };
  if (!API_BASE_URL) return { status: 'backend_unavailable', detail: 'API_BASE_URL is not configured' };

  const creds = peekStoredCredentials();
  if (!creds) return { status: 'unauthorized' };

  const form = new FormData();
  // React Native's fetch/FormData بتقبل شكل {uri,name,type} ده تحديدًا
  // لملف محلي حقيقي من الجهاز (مش File/Blob زي المتصفح العادي).
  form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  form.append('is_private', options?.isPrivate ? '1' : '0');

  try {
    const res = await apiFetch(
      API_BASE_URL,
      '/api/method/upload_file',
      { method: 'POST', headers: { ...buildAuthHeader(creds) }, body: form },
      timeoutMs,
    );
    devLog('apiClient', `upload_file -> HTTP ${res.status}`);

    if (res.status === 401) return { status: 'unauthorized' };
    if (res.status === 403) return { status: 'forbidden' };
    if (res.status === 422) return { status: 'validation_error' };
    if (res.status === 429) return { status: 'rate_limited' };
    if (!res.ok) return { status: 'server_error', httpStatus: res.status };

    const body = await res.json();
    const fileUrl = body?.message?.file_url;
    if (!fileUrl) return { status: 'server_error', httpStatus: res.status };
    return { status: 'success', data: { fileUrl } };
  } catch (err) {
    if (err instanceof UpgradeRequiredError) throw err;
    const isAbort = err instanceof Error && err.name === 'AbortError';
    devLogError('apiClient', 'upload_file failed', err);
    if (isAbort) return { status: 'timeout' };
    return { status: 'backend_unavailable', detail: err instanceof Error ? err.message : String(err) };
  }
}
