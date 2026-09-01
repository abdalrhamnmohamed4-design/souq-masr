/**
 * services/appVersionService.ts — جلب AppVersionConfig من الباك إند
 * (endpoint حقيقي مستقبلي: `GET /api/method/souq_masr.api.v1.app_config
 * .get_version_config?platform=ios|android`، شوف souq-masr-app's
 * souq_masr/api/v1/app_config.py و PHASE_1_MOBILE_API_MAPPING.md's §6).
 *
 * ملحوظة صادقة: مفيش bench Frappe حقيقي شغّال دلوقتي. في development
 * (ومفيش EXPO_PUBLIC_API_BASE_URL متظبط)، الدالة دي بترجع mock config
 * محلي معلّم بوضوح (lib/mockAppVersionConfig.ts) بدل ما تحاول تتصل
 * بحاجة مش موجودة. في staging/production، بتعمل fetch حقيقي على طول —
 * لو فشل، بترجع backend_unavailable بصراحة، من غير أي fallback لبيانات
 * وهمية (config/env.ts's allowDevMockBackend بيضمن الفرق ده مستحيل
 * يتقلب في production).
 */
import { checkDeviceConnectivity } from '@/services/connectivityService';
import { getCurrentPlatform } from '@/lib/appInfo';
import { apiFetch } from '@/lib/apiClient';
import { MOCK_APP_VERSION_CONFIG } from '@/lib/mockAppVersionConfig';
import { allowDevMockBackend, API_BASE_URL, STARTUP_CHECK_TIMEOUT_MS } from '@/config/env';
import type { AppVersionConfig, BackendFetchResult } from '@/types/appVersion';

function isValidConfig(x: unknown): x is AppVersionConfig {
  if (!x || typeof x !== 'object') return false;
  const c = x as Record<string, unknown>;
  return (
    typeof c.minimum_supported_version === 'string' &&
    typeof c.latest_version === 'string' &&
    typeof c.force_update === 'boolean' &&
    typeof c.active === 'boolean'
  );
}

export async function fetchAppVersionConfig(): Promise<BackendFetchResult> {
  const platform = getCurrentPlatform();

  const device = await checkDeviceConnectivity();
  if (!device.isInternetReachable) {
    return { status: 'no_internet' };
  }

  if (allowDevMockBackend) {
    // Dev-only — لا يحدث خالص في production (config/env.ts).
    return { status: 'success', config: { ...MOCK_APP_VERSION_CONFIG, platform } };
  }

  if (!API_BASE_URL) {
    // مفيش endpoint متظبط أصلًا (staging/production من غير config) — ده
    // "الباك إند مش متاح" بصدق، مش خطأ نتجاهله.
    return { status: 'backend_unavailable', detail: 'API_BASE_URL is not configured' };
  }

  try {
    const path = `/api/method/souq_masr.api.v1.app_config.get_version_config?platform=${platform}`;
    const res = await apiFetch(API_BASE_URL, path, {}, STARTUP_CHECK_TIMEOUT_MS);
    if (!res.ok) {
      return { status: 'backend_unavailable', detail: `HTTP ${res.status}` };
    }
    const body = await res.json();
    // Frappe's /api/method wraps whitelisted-method return values in {"message": ...}.
    const config = body?.message ?? body;
    if (!isValidConfig(config)) {
      return { status: 'backend_unavailable', detail: 'malformed version config response' };
    }
    return { status: 'success', config };
  } catch (err) {
    return { status: 'backend_unavailable', detail: err instanceof Error ? err.message : String(err) };
  }
}
