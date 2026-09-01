/**
 * components/StartupGate.tsx — البوابة المركزية اللي القسم 16 من الطلب
 * طلبها بالحرف:
 *
 *   START APP → CONNECTIVITY CHECK → BACKEND CHECK → VERSION CHECK →
 *   MAINTENANCE CHECK → AUTH/GUEST ACCESS → APPLICATION
 *
 * متركّبة في app/_layout.tsx **فوق** <RootStack /> (اللي بيحمل كل الـ
 * routes)، يعني ولا شاشة — حتى لو المستخدم عدّل الرابط يدويًا أو عمل
 * deep link مباشر — تقدر ترندر أصلًا لحد ما phase يبقى 'ready'. مفيش
 * "تخطي" تقني ممكن لأن مفيش Stack اتركّب أصلًا وقت الحجب، مش لأن كل شاشة
 * عاملة فحص بنفسها (بالظبط عكس "scattered checks" اللي الطلب رفضها).
 *
 * إعادة الفحص وقت الرجوع للتطبيق (AppState → 'active'): مش بس عند
 * الإقلاع الأول — لو التطبيق فضل شغّال في الخلفية وportsBackend نزّل
 * force_update أو maintenance_mode وقت كده، المستخدم هيتوقف لما يرجع
 * للتطبيق، مش لما يقفله ويفتحه تاني بس. تحديث الاتصال بس (recheckConnectivity)
 * بيحصل كمان بشكل أخف (من غير يعيد فحص الإصدار كامل) في أي وقت
 * requireOnline() بيتنادى — شوف lib/connectivityGuard.ts.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { BrandSplash, SPLASH_MIN_DURATION } from '@/components/BrandSplash';
import { MaintenanceScreen } from '@/components/gates/MaintenanceScreen';
import { MandatoryUpdateScreen } from '@/components/gates/MandatoryUpdateScreen';
import { OfflineScreen } from '@/components/gates/OfflineScreen';
import { SoftUpdateModal } from '@/components/gates/SoftUpdateModal';
import { useAppGateStore } from '@/store/useAppGateStore';

export function StartupGate({ children }: { children: React.ReactNode }) {
  const phase = useAppGateStore((s) => s.phase);
  const config = useAppGateStore((s) => s.config);
  const softUpdateAvailable = useAppGateStore((s) => s.softUpdateAvailable);
  const runStartupCheck = useAppGateStore((s) => s.runStartupCheck);
  const [softUpdateDismissed, setSoftUpdateDismissed] = useState(false);
  const [minSplashDone, setMinSplashDone] = useState(false);
  const didInitialCheck = useRef(false);

  // حد أدنى لعرض شاشة البداية عشان حركة كشف الاسم تكمّل طبيعي بدل ما
  // تتقطع في نصها لما الفحص يخلص بسرعة (في التطوير بيخلص في <200ms).
  // ده **بيضيف** وقت عرض للعلامة بس — عمره ما بيتخطى بوابة: كل فروع
  // phase تحت لسه بتتقيّم زي ما هي، فالتحديث الإجباري/الصيانة/انقطاع
  // الاتصال بيفضلوا حاجبين التطبيق بالظبط زي الأول، بس بيبانوا بعد
  // الحركة بدل ما يقطعوها.
  useEffect(() => {
    const t = setTimeout(() => setMinSplashDone(true), SPLASH_MIN_DURATION);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (didInitialCheck.current) return;
    didInitialCheck.current = true;
    runStartupCheck();
  }, [runStartupCheck]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && didInitialCheck.current) runStartupCheck();
    });
    return () => sub.remove();
  }, [runStartupCheck]);

  if (phase === 'checking' || !minSplashDone) {
    // شاشة البداية الحقيقية للعلامة (components/BrandSplash.tsx) — نفس
    // خلفية وعلامة الـsplash الأصلي في app.json بالظبط عشان مفيش "فلاش"
    // لوني وسط اختفاء الـsplash الأصلي وظهور نتيجة الفحص. مفيش منطق
    // بوابة هنا خالص: الشرط ده لسه هو نفسه، وBrandSplash بترسم بس.
    return <BrandSplash />;
  }

  if (phase === 'no_internet') return <OfflineScreen variant="no_internet" />;
  if (phase === 'backend_unavailable') return <OfflineScreen variant="backend_unavailable" />;
  if (phase === 'mandatory_update') return <MandatoryUpdateScreen />;
  if (phase === 'maintenance') return <MaintenanceScreen />;

  // phase === 'ready'
  return (
    <>
      {children}
      <SoftUpdateModal
        visible={softUpdateAvailable && !softUpdateDismissed}
        config={config}
        onDismiss={() => setSoftUpdateDismissed(true)}
      />
    </>
  );
}

export default StartupGate;
