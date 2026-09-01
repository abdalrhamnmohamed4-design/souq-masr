/**
 * store/useLanguageStore.ts — حالة اللغة العالمية (عربي افتراضيًا/إنجليزي)،
 * متخزّنة فعليًا (AsyncStorage عبر zustand persist) — نفس آلية باقي
 * الـstate في المشروع (شوف store/useAppStore.ts).
 *
 * تغيير اللغة بيعمل حاجتين مع بعض:
 *   1) بيحدّث الحالة فورًا — أي كومبوننت مستخدم useT()/useLanguageStore
 *      بيتغيّر نصه على طول (شوف i18n/index.ts).
 *   2) لو اتجاه اللغة الجديدة (RTL/LTR) مختلف عن I18nManager.isRTL
 *      الحالي، بيفرض الاتجاه الصح ويعمل reload — React Native بيطبّق
 *      forceRTL فعليًا بس بعد إعادة تحميل الـJS bundle (نفس القيد
 *      المشروح في lib/rtl.ts). ده اللي بيخلي التخطيط نفسه (مش بس النص)
 *      يتقلب RTL↔LTR فعليًا، مش بس ترجمة نص فوق تخطيط RTL ثابت.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Language = 'ar' | 'en';

/** مفتاح AsyncStorage — lib/rtl.ts بيقرأه مباشرة (من غير ما يستنى
 * hydration الـstore) عشان يظبط RTL قبل أول رندر. لو اتغيّر الاسم هنا
 * لازم يتغيّر هناك كمان. */
export const LANGUAGE_STORAGE_KEY = 'souq-masr-language';

export function isRTLLanguage(lang: Language): boolean {
  return lang === 'ar';
}

type LanguageState = {
  language: Language;
  /** بيحدّث الحالة + الـpersistence، وبيفرض إعادة تحميل التطبيق لو
   * الاتجاه (RTL/LTR) محتاج يتغيّر فعليًا. */
  setLanguage: (lang: Language) => Promise<void>;
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'ar',
      setLanguage: async (lang) => {
        if (get().language === lang) return;
        set({ language: lang });

        const wantRTL = isRTLLanguage(lang);
        if (I18nManager.isRTL === wantRTL) return; // مفيش تغيير اتجاه، مفيش reload لازم

        I18nManager.allowRTL(wantRTL);
        I18nManager.forceRTL(wantRTL);
        try {
          // بيشتغل في build مستقل / dev client. في Expo Go ممكن ميكونش
          // متاح — بنبلعه بهدوء والمستخدم هيحتاج reload يدوي واحد
          // (Shake → Reload) عشان الـlayout يتقلب فعليًا.
          if (Updates.reloadAsync) await Updates.reloadAsync();
        } catch {
          // تجاهل — هيتظبط تلقائيًا في أول reload جاي (نفس منطق lib/rtl.ts).
        }
      },
    }),
    {
      name: LANGUAGE_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

export default useLanguageStore;
