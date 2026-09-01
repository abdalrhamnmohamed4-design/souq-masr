/**
 * lib/auth.ts — البوابة المركزية للتحكم في الوصول (Guest vs Authenticated).
 * "تصفّح من غير حساب حر تمامًا، تسجيل الدخول مطلوب بس لما هوية/بيانات/
 * تواصل/ملكية/فلوس تدخل في اللعبة" — القاعدة دي بتتطبّق من مكان واحد
 * هنا، مش بفحص `if (!user)` متبعتر في عشرات الشاشات.
 *
 * ملحوظة صادقة (القسم 10 من الطلب): ده تحقق محلي بس (onboarding.joinedAt
 * في AsyncStorage) — مش أمان حقيقي. أي مستخدم عنده وصول للجهاز نفسه
 * يقدر يتخطاه. الأمان الحقيقي الوحيد هيبقى من السيرفر لما Frappe يتوصّل
 * (يشوف lib/auth.ts's PUBLIC_API/PRIVATE_API classification تحت، ومطابق
 * لـsouq-masr-app/PHASE_1_MOBILE_API_MAPPING.md's public/private split).
 */
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { t } from '@/i18n';
import { showOfflineActionAlert } from '@/lib/connectivityGuard';
import { useAppGateStore } from '@/store/useAppGateStore';
import { useAppStore, type PendingAuthAction } from '@/store/useAppStore';
import { useJobsStore } from '@/store/useJobsStore';

/** الرسالة الموحّدة لأي إجراء اتقفل — نفس الصياغة في كل مكان بالتطبيق،
 * مش كل شاشة بتخترع نص لوحدها. */
export function showAuthPrompt(router: ReturnType<typeof useRouter>, pending?: PendingAuthAction) {
  const setPendingAuthAction = useAppStore.getState().setPendingAuthAction;
  Alert.alert(
    t('auth.authPromptTitle'),
    t('auth.authPromptMsg'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.createAccount'),
        onPress: () => {
          if (pending) setPendingAuthAction(pending);
          router.push('/signin');
        },
      },
      {
        text: t('auth.signIn'),
        onPress: () => {
          if (pending) setPendingAuthAction(pending);
          router.push('/signin');
        },
      },
    ],
  );
  // ملحوظة: "تسجيل الدخول" و"إنشاء حساب" بيروحوا لنفس /signin — التطبيق
  // مالوش تدفّق تسجيل منفصل عن الدخول أصلًا (قرار سابق في المشروع: اسم +
  // رقم موبايل بس، من غير OTP). عرض زرارين هنا مطابقة لصياغة الطلب
  // ومنطقي من ناحية المستخدم (بيفرّق بين "أنا جديد" و"أنا راجع")، حتى لو
  // التنفيذ التقني وراهم واحد فعليًا.
}

/** الاستخدام الأساسي: `requireAuth(() => toggleFavorite(id), { type: 'favorite_listing', listingId: id })`.
 * لو المستخدم داخل حسابه **ومتصل بالإنترنت**، الفعل بينفّذ فورًا وبيرجع
 * true. لو ضيف، بيظهر auth prompt. لو مسجّل بس أوفلاين، بيظهر تنبيه اتصال
 * (lib/connectivityGuard.ts) — في الحالتين الفعل نفسه ميتنفّذش خالص
 * (مفيش "نجاح وهمي"). فحص الهوية قبل الاتصال عمدًا: لو ضيف وأوفلاين
 * مع بعض، رسالة "سجّل دخولك" أكشن-إبل أكتر من "مفيش نت" كأول حاجة يشوفها. */
export function useRequireAuth() {
  const router = useRouter();
  const isAuthenticated = useAppStore((s) => !!s.onboarding.joinedAt);
  const isOnline = useAppGateStore((s) => s.isOnline);

  return function requireAuth(action: () => void, pending?: PendingAuthAction): boolean {
    if (!isAuthenticated) {
      showAuthPrompt(router, pending);
      return false;
    }
    if (!isOnline) {
      showOfflineActionAlert();
      return false;
    }
    action();
    return true;
  };
}

/** بتتنادى مرة واحدة بس من signin.tsx بعد ما تسجيل الدخول يخلص فعليًا.
 * لو كان فيه إجراء متقفل (pendingAuthAction)، بينفّذه دلوقتي (favorite/
 * saveJob) ويمسحه، والشاشة اللي فتحت منها /signin هي اللي router.back()
 * هيرجّعك ليها — نفس السياق اللي كنت فيه بالظبط، مش إعادة توجيه لمكان
 * تاني. لو مفيش إجراء متقفل (تسجيل دخول عادي أول مرة)، بيرجّع false
 * عشان signin.tsx يدخل المستخدم على طول لـ/home — مفيش خطوات onboarding
 * وسيطة (لا موقع ولا اهتمامات) بعد الاسم ورقم الموبايل.
 */
export function resolvePendingAuthAction(): boolean {
  const state = useAppStore.getState();
  const pending = state.pendingAuthAction;
  if (!pending) return false;

  state.setPendingAuthAction(null);

  if (pending.type === 'favorite_listing') {
    state.toggleFavorite(pending.listingId);
  } else if (pending.type === 'favorite_service') {
    state.toggleFavorite(pending.serviceId);
  } else if (pending.type === 'save_job') {
    useJobsStore.getState().toggleSaveJob(pending.jobId);
  }
  return true;
}

/**
 * تصنيف الـAPI (القسم 7 من الطلب) — للتوثيق ومرجع مستقبلي وقت ما
 * Frappe يتوصّل، مش منطق تنفيذي حاليًا (كل شيء لسه محلي). الشكل ده
 * لازم يتطابق حرفيًا مع نفس التصنيف في
 * souq-masr-app/PHASE_1_MOBILE_API_MAPPING.md ونظام الأدوار هناك.
 */
export const PUBLIC_API_SURFACE = [
  'categories', 'attributes', 'brands', 'models', 'locations',
  'listings.search', 'listings.get', 'jobs.search', 'jobs.get',
  'services.search', 'services.get', 'sellers.get_public_profile',
  'companies.get_public_profile', 'professionals.get_public_profile',
  // app_config.get_version_config لازم يكون public (allow_guest=True) —
  // فحص الإصدار بيحصل قبل أي مصادقة أصلًا (StartupGate بيسبق حتى شاشة
  // تسجيل الدخول)، شوف types/appVersion.ts وVERSION_CONTROL.md.
  'app_config.get_version_config',
] as const;

export const PRIVATE_API_SURFACE = [
  'listings.create', 'listings.update', 'listings.delete', 'listings.pause',
  'favorites.toggle', 'saved_searches.*', 'chat.*', 'offers.*',
  'jobs.apply', 'jobs.applications.*', 'jobs.create', 'jobs.update', 'jobs.delete',
  'candidate_profile.*', 'resumes.*', 'companies.create', 'companies.update',
  'services.create', 'services.update', 'services.delete',
  'professional_profile.*', 'reviews.*', 'reports.*', 'notifications.*',
  'wallet.*', 'payments.*', 'users.me', 'users.update',
] as const;
