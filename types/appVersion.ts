/**
 * types/appVersion.ts — شكل الـApp Version Configuration، لازم يتطابق
 * حرفيًا مع حقول DocType "Souq Masr App Version Config" في
 * souq-masr-app (souq_masr/setup/doctype/app_version_config/) ومع رد
 * endpoint الـFrappe المستقبلي `souq_masr.api.v1.app_config.get_version_config`
 * — أي حقل يتضاف هنا لازم يتضاف هناك بنفس الاسم، مش العكس (الموبايل بيقرأ
 * شكل رد السيرفر، مش العكس).
 */

export type AppPlatform = 'ios' | 'android';

export type AppVersionConfig = {
  platform: AppPlatform;
  /** أحدث إصدار متاح — لو installed أقل منه بس ≥ minimum: تحديث اختياري بس. */
  latest_version: string;
  /** أقل إصدار مسموح باستخدامه — لو installed أقل منه: منع كامل. */
  minimum_supported_version: string;
  /** رقم البناء المقابل لـlatest_version (اختياري — لو مش موجود بيتجاهل في المقارنة). */
  latest_build?: number | null;
  /** رقم البناء المقابل لـminimum_supported_version. */
  minimum_supported_build?: number | null;
  /**
   * true = التحديث إجباري بغض النظر عن نتيجة مقارنة الأرقام (حتى لو
   * installed >= minimum_supported_version). الاستخدام: عيب أمني عاجل في
   * كل الإصدارات الحالية، أو قرار عمل يستوجب توقف كامل مؤقت.
   */
  force_update: boolean;
  update_message_ar: string;
  update_message_en: string;
  update_url_ios: string;
  update_url_android: string;
  /** false = تجاهل الـconfig ده كليًا (يسمح بإيقاف نظام فحص الإصدار مركزيًا من الباك إند وقت الحاجة). */
  active: boolean;
  maintenance_mode: boolean;
  maintenance_message_ar?: string;
  maintenance_message_en?: string;
};

/** نتيجة عملية فحص الإصدار الفعلية بعد تطبيق منطق المقارنة (lib/semver.ts)
 * على installed vs الـconfig اللي رجع من الباك إند. */
export type VersionCheckOutcome =
  | { kind: 'maintenance' }
  | { kind: 'mandatory_update' }
  | { kind: 'soft_update' }
  | { kind: 'ok' };

/** نتيجة محاولة الوصول للباك إند نفسه (منفصلة عن نتيجة فحص الإصدار). */
export type BackendFetchResult =
  | { status: 'success'; config: AppVersionConfig }
  | { status: 'no_internet' }
  | { status: 'backend_unavailable'; detail?: string };
