/**
 * services/authService.ts — Phase 2B: الطبقة الوحيدة اللي بتنادي
 * souq_masr.api.v1.auth.signin الحقيقي وتخزّن الاعتماد الراجع (api_key/
 * api_secret) عبر lib/authCredentials.ts. أي شاشة/سيرفس تانية محتاجة
 * تتأكد إن فيه مستخدم حقيقي مسجّل قبل نداء endpoint محمي (زي
 * listingService.ts's createListing) لازم تعدّي من هنا، مش تتعامل مع
 * SecureStore مباشرة.
 *
 * لاحظ: ده أول نداء شبكة حقيقي من app/signin.tsx على الإطلاق — قبل
 * كده كان تسجيل الدخول محلي بالكامل (onboarding.joinedAt بس). الشاشة
 * والـUI فضلوا زي ما هما بالظبط؛ اللي اتغيّر هو إن زرار "دخول" بقى
 * بيعمل نداء حقيقي كمان قبل ما يكمّل نفس التدفق المحلي القديم.
 */
import { frappePost } from '@/lib/apiClient';
import {
  clearStoredCredentials,
  getStoredCredentials,
  hydrateCredentialsCache,
  setStoredCredentials,
  type StoredCredentials,
} from '@/lib/authCredentials';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.auth';

type RawSigninResponse = {
  user: { id: string; name: string; phone: string };
  api_key: string;
  api_secret: string;
};

/** signin حقيقي — find-or-create على السيرفر بالتليفون (نفس قرار
 * المنتج القائم: اسم + تليفون، من غير OTP، شوف app/signin.tsx). بترجع
 * اعتماد جديد (api_secret جديد في كل نداء — الباك إند بيولّده تاني كل
 * مرة، زي Frappe core's generate_keys) وبتخزّنه فورًا عبر SecureStore. */
export async function signin(name: string, phone: string, countryIso: string): Promise<ApiResult<StoredCredentials>> {
  const r = await frappePost<RawSigninResponse>(`${NS}.signin`, { name, phone, country_iso: countryIso });
  if (r.status !== 'success') return r;
  const creds: StoredCredentials = {
    userId: r.data.user.id,
    name: r.data.user.name,
    phone: r.data.user.phone,
    apiKey: r.data.api_key,
    apiSecret: r.data.api_secret,
  };
  await setStoredCredentials(creds);
  return { status: 'success', data: creds };
}

/**
 * لو فيه اعتماد حقيقي مخزّن بالفعل، بترجعه فورًا من غير نداء شبكة. لو
 * المستخدم "مسجّل دخول" محليًا (onboarding.name/phone موجودين — زي
 * مستخدم قديم سجّل قبل ما endpoint الـauth الحقيقي يتبني، أو التخزين
 * الآمن اتمسح لأي سبب) بس مفيش اعتماد، بتعمل signin() بصمت بنفس البيانات
 * المحلية الموجودة أصلًا — آمن لأن signin على السيرفر idempotent (نفس
 * رقم الموبايل = نفس اليوزر، مفيش حساب مكرر). دي نقطة الدخول اللي
 * app/post/index.tsx بينادي منها قبل create_listing، مش signin() مباشرة.
 */
export async function ensureCredentials(name: string, phone: string, countryIso: string): Promise<ApiResult<StoredCredentials>> {
  const existing = await getStoredCredentials();
  if (existing) return { status: 'success', data: existing };
  return signin(name, phone, countryIso);
}

export async function signOut(): Promise<void> {
  await clearStoredCredentials();
}

export { hydrateCredentialsCache };
export type { StoredCredentials };
