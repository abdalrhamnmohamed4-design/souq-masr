/**
 * i18n/index.ts — نقطة الدخول الوحيدة للترجمة. مفيش أي API خارجي ومفيش
 * ترجمة آلية وقت التشغيل — قاموسين ثابتين (ar.ts/en.ts) مبندولين مع
 * التطبيق، والاختيار بينهم بس حسب store/useLanguageStore.ts.
 *
 * الاستخدام:
 *   - جوه كومبوننت: `const t = useT(); ... t('common.search')` — بيعمل
 *     re-render لما اللغة تتغيّر (مش محتاج انتظار الـreload الكامل).
 *   - برّه كومبوننت (جوه store action أو دالة عادية): `t('common.search')`
 *     مباشرة (نفس الاسم، export منفصل) — بيقرأ اللغة الحالية من الـstore
 *     مباشرة، من غير subscribe.
 */
import { useCallback } from 'react';
import { useLanguageStore } from '@/store/useLanguageStore';
import ar from './ar';
import en from './en';

/** بيحوّل أي شكل متداخل لنفس الشكل بس كل قيمة نهائية `string` — عشان
 * en.ts يتفرض عليه نفس مفاتيح ar.ts بالظبط (مش نفس القيم الحرفية). */
type DeepStringShape<T> = { [K in keyof T]: T[K] extends string ? string : DeepStringShape<T[K]> };

export type TranslationShape = DeepStringShape<typeof ar>;

const DICTS = { ar, en } as const;

// ---- توليد نوع "مسار.نقطي" لكل مفتاح نهائي (auto-complete + أمان وقت
// الترجمة) — مش string عام، عشان أي غلطة إملائية في مفتاح تتمسك وقت
// الـtype-check بدل ما تظهر كمفتاح خام على الشاشة وقت التشغيل بس. ----
type PathsOf<T> = T extends string
  ? never
  : { [K in Extract<keyof T, string>]: T[K] extends string ? `${K}` : `${K}.${PathsOf<T[K]>}` }[Extract<keyof T, string>];

export type TranslationKey = PathsOf<TranslationShape>;

function resolve(lang: 'ar' | 'en', key: string): string {
  const parts = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = DICTS[lang];
  for (const part of parts) {
    node = node?.[part];
  }
  if (typeof node !== 'string') {
    if (__DEV__) console.warn(`[i18n] missing key "${key}" for "${lang}"`);
    return key;
  }
  return node;
}

/** ترجمة مباشرة برّه الكومبوننتات — بتاخد اللغة الحالية من الـstore
 * لحظة النداء، من غير أي subscribe/re-render. */
export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  const lang = useLanguageStore.getState().language;
  let str = resolve(lang, key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.split(`{${k}}`).join(String(v));
    }
  }
  return str;
}

/** hook الترجمة داخل الكومبوننتات — بيعمل subscribe للغة، فأي كومبوننت
 * مستخدمه بيتعاد رندره فورًا لما المستخدم يغيّر اللغة (مش بعد الـreload
 * الكامل بس؛ الانطباع فوري، والـRTL/LTR الحقيقي هو اللي محتاج الـreload). */
export function useT() {
  const language = useLanguageStore((s) => s.language);
  return useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => t(key, vars),
    [language],
  );
}

export default t;
