/**
 * services/connectivityService.ts — فحص اتصال الجهاز الحقيقي بالإنترنت
 * (مستقل عن فحص "الباك إند متاح؟" اللي هو مسؤولية appVersionService —
 * القسم 15 سيناريو H/I بيفرّقوا بين الاتنين عمدًا: "مفيش إنترنت خالص" ≠
 * "الإنترنت شغّال بس Frappe نفسه واقع"، ولازم رسالتين مختلفتين).
 */
import * as Network from 'expo-network';

export type DeviceConnectivity = {
  isConnected: boolean;
  /** true لو النظام قادر يأكّد فعليًا إن فيه وصول للإنترنت (مش بس متوصّل
   * بشبكة واي فاي من غير إنترنت فعلي). لو undefined (بعض المنصات مبترجعش
   * القيمة دي بثقة)، بنتعامل معاها زي isConnected. */
  isInternetReachable: boolean;
};

export async function checkDeviceConnectivity(): Promise<DeviceConnectivity> {
  try {
    const state = await Network.getNetworkStateAsync();
    const isConnected = !!state.isConnected;
    const isInternetReachable = state.isInternetReachable ?? isConnected;
    return { isConnected, isInternetReachable };
  } catch {
    // فشل السؤال نفسه (نادر) — أأمن نتعامل معاه كـ"مفيش اتصال" بدل ما
    // نفترض العكس بصمت.
    return { isConnected: false, isInternetReachable: false };
  }
}
