/**
 * lib/connectivityGuard.ts — نفس فكرة lib/auth.ts's useRequireAuth، بس
 * للاتصال بدل الهوية (القسم 8/9 من طلب Force Update/Online-Only): "Do
 * not allow actions that require backend connectivity to pretend that
 * they succeeded... No fake success alerts."
 *
 * ملحوظة صادقة: مفيش باك إند حقيقي دلوقتي (شوف VERSION_CONTROL.md). اللي
 * الحارس ده بيضمنه فعليًا: العملية متتنفّذش وتظهر رسالة نجاح وهي offline —
 * مش إن نجاحها لما تتنفّذ بقى "مؤكَّد من سيرفر حقيقي" (لسه محلي لحد
 * Phase 2). الفرق مهم: قبل كده كانت هتنجح محليًا سواء متصل أو لأ، من غير
 * أي فرق محسوس؛ دلوقتي على الأقل الحالتين مبقوش سايبين بصمت.
 *
 * `useRequireAuth()` (lib/auth.ts) بينادي نفس فكرة الفحص ده تلقائيًا
 * كخطوة تانية بعد التأكد من تسجيل الدخول — عشان Favorite/Save-job/
 * Report/Review (اللي أصلًا بتعدّي من requireAuth) ياخدوا الحماية دي من
 * غير ما نلمس مواقع النداء بتاعتهم تاني. `useRequireOnline()` هنا
 * لمواقع تانية على شاشات أصلًا محمية بـuseAuthGuard (مش محتاجة فحص هوية
 * تاني) بس محتاجة فحص اتصال بس: نشر/تعديل/حذف إعلان، إرسال رسالة شات،
 * التقديم على وظيفة، حفظ/توليد سيرة ذاتية، تأكيد دفع/تحويل/تمييز.
 */
import { Alert } from 'react-native';
import { useAppGateStore } from '@/store/useAppGateStore';

export function showOfflineActionAlert() {
  Alert.alert(
    'لا يوجد اتصال بالإنترنت',
    'الإجراء ده محتاج اتصال بالإنترنت والسيرفر. اتأكد من اتصالك وحاول تاني.',
  );
}

/** الاستخدام: `requireOnline(() => submitListing())`. لو أوفلاين، بيظهر
 * تنبيه صادق ومترجعش الفعل خالص — مفيش "نجاح" وهمي. */
export function useRequireOnline() {
  const isOnline = useAppGateStore((s) => s.isOnline);

  return function requireOnline(action: () => void): boolean {
    if (!isOnline) {
      showOfflineActionAlert();
      return false;
    }
    action();
    return true;
  };
}
