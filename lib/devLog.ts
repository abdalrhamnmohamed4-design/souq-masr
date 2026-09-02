/**
 * lib/devLog.ts — تسجيل (logging) خاص بالتطوير بس (القسم 14 من طلب Phase 2:
 * "أضف logging مناسب للـdevelopment فقط. ممنوع تسريب passwords/API
 * secrets/tokens/personal user data في production logs").
 *
 * قاعدتين بسيطتين وصارمتين:
 *   1) مفيش أي إخراج فعلي (`console.*`) لو `isProduction` — الدالة بترجع
 *      فورًا، مش بس بتقلّل التفاصيل.
 *   2) `redact()` بتشيل أي مفتاح شكله حسّاس (password/token/secret/key/
 *      authorization) من أي object بيتم تمريره، قبل حتى ما نوصل لفحص
 *      isProduction — عشان لو حد استخدم devLog في مكان غلط ونسي يشيل
 *      حاجة حسّاسة، الحماية الافتراضية تفضل موجودة برضه.
 */
import { isProduction } from '@/config/env';

const SENSITIVE_KEY_PATTERN = /password|secret|token|api[_-]?key|authorization|auth[_-]?header/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY_PATTERN.test(k) ? '[REDACTED]' : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** تسجيل معلوماتي عادي (نداء API بدأ/خلص، حالة استجابة...). */
export function devLog(scope: string, message: string, data?: unknown) {
  if (isProduction) return;
  if (data !== undefined) {
    // eslint-disable-next-line no-console
    console.log(`[${scope}] ${message}`, redact(data));
  } else {
    // eslint-disable-next-line no-console
    console.log(`[${scope}] ${message}`);
  }
}

/** تسجيل خطأ — نفس قاعدة الإخفاء في production، بس بـconsole.warn عشان يبان مميّز. */
export function devLogError(scope: string, message: string, error?: unknown) {
  if (isProduction) return;
  // eslint-disable-next-line no-console
  console.warn(`[${scope}] ${message}`, error instanceof Error ? error.message : redact(error));
}
