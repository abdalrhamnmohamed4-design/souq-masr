/**
 * lib/authCredentials.ts — تخزين آمن لبيانات اعتماد Frappe الحقيقية
 * (api_key/api_secret الراجعين من souq_masr.api.v1.auth.signin — Phase
 * 2B). منفصل عمدًا عن lib/apiClient.ts (بديل استيراد دائري: apiClient
 * محتاج يقرأ الاعتماد عشان يحقن Authorization header، والاعتماد نفسه
 * محتاج مفيش علاقة بمنطق الطلبات) — نفس نمط تفادي الدورة الموثّق في
 * أول تعليق في apiClient.ts بالظبط.
 *
 * expo-secure-store (Keychain على iOS / Keystore-backed EncryptedSharedPreferences
 * على أندرويد) — مش AsyncStorage العادي، لأن api_secret فعليًا بيدّي وصول
 * كامل لحساب المستخدم على السيرفر (زي كلمة سر) لحد ما يتغيّر، مش مجرد
 * تفضيل UI بسيط.
 */
import * as SecureStore from 'expo-secure-store';
import { devLog, devLogError } from '@/lib/devLog';

const KEY = 'souqmasr_frappe_credentials_v1';

export type StoredCredentials = {
  userId: string; // Frappe User.name (docname) — "01xxxxxxxxx@phone.souqmasr.local"
  name: string;
  phone: string;
  apiKey: string;
  apiSecret: string;
};

let cache: StoredCredentials | null | undefined; // undefined = لسه ما قرأناش من SecureStore

export async function getStoredCredentials(): Promise<StoredCredentials | null> {
  if (cache !== undefined) return cache;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    cache = raw ? (JSON.parse(raw) as StoredCredentials) : null;
  } catch (err) {
    // جهاز/محاكي من غير Keychain شغّال، أو بيانات تالفة — بنتعامل معاه
    // كـ"مفيش اعتماد مخزّن" بدل ما نكسر التطبيق كله على شاشة واحدة.
    devLogError('authCredentials', 'failed to read stored credentials', err);
    cache = null;
  }
  return cache;
}

export async function setStoredCredentials(creds: StoredCredentials): Promise<void> {
  cache = creds;
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(creds));
  } catch (err) {
    devLogError('authCredentials', 'failed to persist credentials', err);
  }
}

export async function clearStoredCredentials(): Promise<void> {
  cache = null;
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch (err) {
    devLogError('authCredentials', 'failed to clear credentials', err);
  }
}

/** Synchronous read من الكاش بس — مستخدمة جوه apiClient.ts عشان تحقن
 * الـheader من غير ما تحوّل frappeGet/frappePost لدالتين (واحدة sync
 * وواحدة async) — لازم getStoredCredentials() تتنادى مرة على الأقل قبل
 * كده (بيحصل تلقائيًا وقت فتح التطبيق، شوف services/authService.ts's
 * hydrateCredentialsOnStartup). لو لسه ما اتقرتش، بترجع null (يعني
 * الطلب هيتبعت كـGuest — نفس سلوك "مفيش اعتماد" الآمن).
 */
export function peekStoredCredentials(): StoredCredentials | null {
  return cache ?? null;
}

export function buildAuthHeader(creds: StoredCredentials): Record<string, string> {
  return { Authorization: `token ${creds.apiKey}:${creds.apiSecret}` };
}

export async function hydrateCredentialsCache(): Promise<void> {
  await getStoredCredentials();
  devLog('authCredentials', peekStoredCredentials() ? 'credentials present' : 'no stored credentials');
}
