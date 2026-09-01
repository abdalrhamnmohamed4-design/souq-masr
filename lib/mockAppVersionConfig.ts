/**
 * lib/mockAppVersionConfig.ts — Config تجريبي بس، **Development فقط**
 * (يتستخدم بس لو config.allowDevMockBackend === true — مستحيل ينفّذ في
 * production build، شوف config/env.ts). ده بديل مؤقت لحد ما Frappe
 * bench حقيقي يتوصّل ويوفّر endpoint حقيقي — مش "قيمة افتراضية آمنة
 * للإنتاج"، ومعمول عليه علامة MOCK في كل مكان يتستخدم فيه.
 *
 * غيّر القيم هنا يدويًا وقت التطوير عشان تجرّب كل سيناريوهات مصفوفة
 * الاختبار (VERSION_CONTROL.md §12): مثلًا حط minimum_supported_version
 * أعلى من app.json's version عشان تشوف شاشة التحديث الإجباري، أو
 * maintenance_mode: true عشان تشوف شاشة الصيانة.
 */
import type { AppVersionConfig } from '@/types/appVersion';

export const MOCK_APP_VERSION_CONFIG: AppVersionConfig = {
  platform: 'ios',
  latest_version: '1.0.0',
  minimum_supported_version: '1.0.0',
  latest_build: 1,
  minimum_supported_build: 1,
  force_update: false,
  update_message_ar: 'لازم تحدّث التطبيق علشان تقدر تكمل',
  update_message_en: 'You must update the app to continue',
  // متعمّد فاضي — القسم 14 من الطلب: مفيش روابط store وهمية. تتحط هنا (أو
  // من الباك إند الحقيقي) لما الروابط الفعلية تبقى جاهزة.
  update_url_ios: '',
  update_url_android: '',
  active: true,
  maintenance_mode: false,
  maintenance_message_ar: 'سوق مصر تحت الصيانة حاليًا — هنرجع قريب.',
  maintenance_message_en: 'Souq Masr is under maintenance — we will be back soon.',
};
