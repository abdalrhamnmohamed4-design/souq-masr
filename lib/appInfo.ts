/**
 * lib/appInfo.ts — مصدر واحد لثلاث قيم لازم نفرّق بينهم بوضوح (القسم 2 من
 * الطلب: "the system must clearly distinguish app version / build number /
 * minimum supported version / latest version"):
 *
 *   1. installedVersion — الإصدار المثبّت فعليًا على جهاز المستخدم (major.minor.patch).
 *   2. installedBuild    — رقم البناء المثبّت (build number، مختلف عن الإصدار —
 *                          نفس الـversion ممكن يتبني كذا build مرة أثناء التطوير).
 *   3. minimum_supported_version / latest_version — مش من الجهاز خالص،
 *      جايين من AppVersionConfig (الباك إند) — شوف types/appVersion.ts.
 *
 * القيمة المستخدمة فعليًا للمنع (enforcement) هي installedVersion (+
 * installedBuild كـtie-breaker لو الـmajor.minor.patch متساويين تمامًا —
 * شوف lib/semver.ts's compareVersions) مقابل minimum_supported_version/build
 * القادمين من الباك إند. latest_version بيتستخدم بس لقرار "تحديث اختياري".
 *
 * `expo-application`'s nativeApplicationVersion/nativeBuildVersion بيقروا
 * القيمة الحقيقية من الـbinary المثبّت فعليًا (زي ما الـApp Store/Play
 * Store شايفينها) — ده المصدر الصحيح في build حقيقي. جوه Expo Go وقت
 * التطوير، القيمتين دول بيرجعوا بيانات Expo Go نفسه مش تطبيقنا، فبنرجع
 * لقيم app.json (expo-constants) كـfallback تطويري بس — الفرق ده متعمّد
 * وموثّق هنا عشان محدش يتفاجئ إن الرقم مختلف بين Expo Go وbuild حقيقي.
 */
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { AppPlatform } from '@/types/appVersion';

export function getCurrentPlatform(): AppPlatform {
  return Platform.OS === 'android' ? 'android' : 'ios';
}

export function getInstalledVersion(): string {
  return (
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    '0.0.0'
  );
}

export function getInstalledBuild(): number | null {
  const native = Application.nativeBuildVersion;
  if (native && /^\d+$/.test(native)) return Number(native);

  const fallback =
    Platform.OS === 'android'
      ? Constants.expoConfig?.android?.versionCode
      : Constants.expoConfig?.ios?.buildNumber;
  if (fallback === undefined || fallback === null) return null;
  const n = Number(fallback);
  return Number.isFinite(n) ? n : null;
}
