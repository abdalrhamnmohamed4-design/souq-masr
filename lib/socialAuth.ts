/**
 * lib/socialAuth.ts — تسجيل الدخول بجوجل/آبل/فيسبوك.
 *
 * ⚠️ حالة صادقة: المزوّدين دول **مش موصولين فعليًا** لحد دلوقتي، ومش
 * ممكن يشتغلوا في الوضع الحالي لأسباب حقيقية مش كسل:
 *
 *   1) OAuth محتاج **باك إند** يستقبل الـtoken ويتحقق منه ويطلّع جلسة.
 *      مفيش Frappe متوصّل لسه (شوف VERSION_CONTROL.md §4) — يعني حتى لو
 *      جبنا token من جوجل، مفيش حد يتحقق منه ولا يعمل حساب حقيقي.
 *   2) كل مزوّد محتاج **client IDs** حقيقية مسجّلة باسم التطبيق
 *      (Google Cloud / Apple Developer / Meta for Developers) —
 *      وأرقام مخترعة هنا هتفشل وقت التشغيل.
 *   3) `expo-apple-authentication` و`@react-native-google-signin` مش
 *      شغّالين في Expo Go أصلًا — محتاجين development build.
 *
 * فالأزرار موجودة كواجهة حقيقية جاهزة، لكن الضغط عليها **بيقول الحقيقة**
 * ومبيعملش تسجيل دخول وهمي. لما الباك إند يجهز، الحاجة الوحيدة اللي
 * هتتغير هي جوّه `signInWithProvider` — مواقع النداء في الواجهة مش
 * هتتلمس.
 *
 * خطوات التفعيل الحقيقي لاحقًا (Phase 2):
 *   • `npx expo install expo-auth-session expo-apple-authentication expo-crypto`
 *   • تسجيل client IDs وحطّها في config/env.ts كـEXPO_PUBLIC_*
 *   • endpoint في Frappe: souq_masr.api.v1.auth.social_login(provider, id_token)
 *     يتحقق من الـtoken ويرجّع جلسة.
 */
import { Alert } from 'react-native';
import type { SocialProvider } from '@/components/SocialIcon';
import { t } from '@/i18n';

export type { SocialProvider };

export function socialProviderLabel(provider: SocialProvider): string {
  return t(`auth.provider${provider === 'google' ? 'Google' : provider === 'apple' ? 'Apple' : 'Facebook'}`);
}

export type SocialSignInResult =
  | { status: 'not_configured'; provider: SocialProvider }
  | { status: 'success'; provider: SocialProvider; idToken: string };

/**
 * بترجع `not_configured` دلوقتي — **مبتسجّلش دخول** ومبتغيّرش أي حالة.
 * لما الباك إند يتوصّل، ده المكان الوحيد اللي بيتغيّر.
 */
export async function signInWithProvider(provider: SocialProvider): Promise<SocialSignInResult> {
  return { status: 'not_configured', provider };
}

/** رسالة صريحة للمستخدم — من غير أي إيحاء إن الدخول نجح. */
export function showProviderUnavailable(provider: SocialProvider) {
  Alert.alert(
    t('auth.providerUnavailableTitle', { provider: socialProviderLabel(provider) }),
    t('auth.providerUnavailableMsg'),
    [{ text: t('common.ok') }],
  );
}
