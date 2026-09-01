/**
 * store/useAppGateStore.ts — حالة بوابة الإقلاع الحيّة (Connectivity →
 * Backend → Version → Maintenance → Auth/Guest، القسم 16 من الطلب).
 * **من غير persist عمدًا** — على عكس useAppStore/useJobsStore (بيانات
 * دومين محفوظة)، دي حالة جلسة حيّة لازم تتفحص من جديد كل مرة التطبيق
 * يفتح (ده بالظبط معنى "Online-Only": متفتكرش آخر نتيجة فحص وتفترض
 * إنها لسه صحيحة).
 *
 * enforcement الفعلي (القسم 2 من الطلب — "document exactly which value is
 * used"): installedVersion + installedBuild (كـtie-breaker بس لو
 * major.minor.patch متساويين بالظبط) بيتقارنوا بـminimum_supported_version
 * + minimum_supported_build القادمين من الباك إند، عن طريق
 * lib/semver.ts's compareVersions. latest_version/latest_build بيتستخدموا
 * بس لقرار "فيه تحديث اختياري"، مش للمنع.
 */
import { create } from 'zustand';
import { fetchAppVersionConfig } from '@/services/appVersionService';
import { checkDeviceConnectivity } from '@/services/connectivityService';
import { getInstalledBuild, getInstalledVersion } from '@/lib/appInfo';
import { setUpgradeRequiredHandler } from '@/lib/apiClient';
import { isBelowLatest, isBelowMinimum, parseVersion } from '@/lib/semver';
import type { AppVersionConfig } from '@/types/appVersion';

export type GatePhase =
  | 'checking'
  | 'no_internet'
  | 'backend_unavailable'
  | 'maintenance'
  | 'mandatory_update'
  | 'ready';

type GateState = {
  phase: GatePhase;
  config: AppVersionConfig | null;
  softUpdateAvailable: boolean;
  /** آخر نتيجة معروفة لاتصال الجهاز — بيتحدّث بره الفحص الكامل عن طريق
   * recheckConnectivity()، ومستخدم من useRequireOnline() عشان الأفعال
   * اللي محتاجة اتصال مش تنجح وهمي وهي offline (القسم 8/9). */
  isOnline: boolean;
  installedVersion: string;
  installedBuild: number | null;
  errorDetail: string | null;
  runStartupCheck: () => Promise<void>;
  retry: () => Promise<void>;
  recheckConnectivity: () => Promise<boolean>;
  /** بينادَه lib/apiClient.ts لو أي طلب رجّع 426 Upgrade Required وسط
   * الجلسة (القسم 10) — مش بس وقت الإقلاع، أي وقت الباك إند يقرر إن
   * النسخة بقت غير مدعومة. */
  markMandatoryUpdateRequired: () => void;
};

export const useAppGateStore = create<GateState>((set, get) => ({
  phase: 'checking',
  config: null,
  softUpdateAvailable: false,
  isOnline: true,
  installedVersion: getInstalledVersion(),
  installedBuild: getInstalledBuild(),
  errorDetail: null,

  runStartupCheck: async () => {
    set({ phase: 'checking', errorDetail: null });

    const result = await fetchAppVersionConfig();

    if (result.status === 'no_internet') {
      set({ phase: 'no_internet', isOnline: false });
      return;
    }
    if (result.status === 'backend_unavailable') {
      // ملحوظة: لو apiFetch (lib/apiClient.ts) استقبل 426 وسط نفس الطلب،
      // هو نفسه نادى markMandatoryUpdateRequired() خلاص (phase =
      // 'mandatory_update') قبل ما يرمي الخطأ اللي فضّى هنا لـ
      // backend_unavailable — منسيبش الاستبدال ده يبطّل قرار أهم اتاخد
      // فعلًا. أي phase تاني (أول فحص، أو backend_unavailable من غير
      // 426) بيتحدّث عادي.
      const current = get().phase;
      if (current === 'mandatory_update') {
        set({ isOnline: true, errorDetail: result.detail ?? null });
      } else {
        set({ phase: 'backend_unavailable', isOnline: true, errorDetail: result.detail ?? null });
      }
      return;
    }

    const { config } = result;
    set({ isOnline: true, config });

    if (!config.active) {
      // active: false = تجاهل الـconfig كليًا (القسم 11) — يسمح للباك إند
      // يوقف نظام الفحص مركزيًا من غير ما يحتاج نسخة تطبيق جديدة.
      set({ phase: 'ready', softUpdateAvailable: false });
      return;
    }

    const installed = parseVersion(get().installedVersion);
    const installedBuild = get().installedBuild;
    const minimum = parseVersion(config.minimum_supported_version);
    const latest = parseVersion(config.latest_version);

    // installed غير قابل للتحليل (نظريًا مستحيل بعد lib/appInfo.ts's
    // fallback لـ'0.0.0'، بس بنتعامل معاه بأمان لو حصل): امنع بدل ما نفترض.
    if (!installed || !minimum) {
      set({ phase: 'mandatory_update' });
      return;
    }

    const installedWithBuild = { ...installed, build: installedBuild };
    const minimumWithBuild = { ...minimum, build: config.minimum_supported_build ?? null };

    const belowMinimum = isBelowMinimum(installedWithBuild, minimumWithBuild);

    if (belowMinimum || config.force_update) {
      set({ phase: 'mandatory_update' });
      return;
    }

    if (config.maintenance_mode) {
      set({ phase: 'maintenance' });
      return;
    }

    const soft = latest
      ? isBelowLatest(installedWithBuild, { ...latest, build: config.latest_build ?? null })
      : false;

    set({ phase: 'ready', softUpdateAvailable: soft });
  },

  retry: async () => {
    await get().runStartupCheck();
  },

  recheckConnectivity: async () => {
    const device = await checkDeviceConnectivity();
    set({ isOnline: device.isInternetReachable });
    return device.isInternetReachable;
  },

  markMandatoryUpdateRequired: () => {
    set({ phase: 'mandatory_update' });
  },
}));

// تسجيل معالج الـ426 هنا (مش جوه apiClient.ts نفسه) — كسر دورة استيراد
// حقيقية كانت ظاهرة فعليًا كـ"Require cycle" warning من Metro وقت
// التشغيل الحقيقي. شوف lib/apiClient.ts's شرح فوق setUpgradeRequiredHandler.
setUpgradeRequiredHandler(() => useAppGateStore.getState().markMandatoryUpdateRequired());
