/**
 * types/frappeApi.ts — أنواع مشتركة لأي نداء لـFrappe API (Phase 2 —
 * MOBILE_BACKEND_INTEGRATION_REPORT.md's البنية الأساسية).
 *
 * كل whitelisted method في Frappe بيلف قيمة الرجوع في envelope ثابت:
 *   { "message": <القيمة الحقيقية> }
 * وأي خطأ بيرجع شكل تاني فيه exc_type/exception (شوف
 * BACKEND_PRODUCTION_READINESS.md §7/§9 — traceback كامل كان بيتسرّب هنا
 * قبل ما نقفله من System Settings، فمينفعش نعتمد على شكل exception ثابت
 * تمامًا، بس exc_type غالبًا موجود).
 */

/** شكل رد Frappe الناجح — أي whitelisted method برجّع القيمة داخل message. */
export type FrappeEnvelope<T> = { message: T };

export type FrappeErrorBody = {
  exc_type?: string;
  exception?: string;
  _server_messages?: string;
};

/**
 * نتيجة موحّدة لأي نداء API في التطبيق كله — نفس نمط
 * types/appVersion.ts's BackendFetchResult بالظبط، بس مُعمَّم (generic)
 * ومع تمييز أدق لحالات الخطأ (401/403/404/422/429/5xx) بدل "خطأ عام" واحد،
 * عشان الشاشات تقدر تفرّق "مفيش نتيجة" عن "ممنوع" عن "السيرفر واقع".
 */
export type ApiResult<T> =
  | { status: 'success'; data: T }
  | { status: 'no_internet' }
  | { status: 'backend_unavailable'; detail?: string }
  | { status: 'not_found' }
  | { status: 'unauthorized' } // 401 — محتاج تسجيل دخول
  | { status: 'forbidden' } // 403 — مسجّل دخول بس مالوش صلاحية
  | { status: 'validation_error'; detail?: string } // 422
  | { status: 'rate_limited' } // 429
  | { status: 'server_error'; httpStatus: number; detail?: string } // 5xx غير متوقع
  | { status: 'timeout' };

export function isApiSuccess<T>(r: ApiResult<T>): r is { status: 'success'; data: T } {
  return r.status === 'success';
}
