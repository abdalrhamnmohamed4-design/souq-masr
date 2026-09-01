/**
 * lib/rtl.ts
 *
 * بيظبط اتجاه I18nManager (RTL/LTR) قبل أول رندر عشان يطابق اللغة
 * المحفوظة فعليًا (عربي=RTL، إنجليزي=LTR) — مش RTL مفروض دايمًا زي
 * قبل ما اللغة بقت قابلة للتغيير. React Native بيطبّق forceRTL فعليًا
 * بس بعد إعادة تحميل الـJS bundle، فأول مرة التطبيق بيفتح على اتجاه
 * مختلف عن الاتجاه المطلوب بيحتاج reload واحد. الدالة دي idempotent:
 * لو الاتجاه مطابق خلاص بترجع false من غير أي reload.
 *
 * بتقرأ AsyncStorage مباشرة (بدل ما تستنى store/useLanguageStore.ts
 * يعمل hydrate) عشان القرار ده لازم يتاخد قبل أول رندر للتطبيق كله —
 * قبل ما أي كومبوننت (وبالتبعية أي zustand hook) يتركّب أصلًا.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { I18nManager } from 'react-native';
import { LANGUAGE_STORAGE_KEY, isRTLLanguage, type Language } from '@/store/useLanguageStore';

async function readPersistedLanguage(): Promise<Language> {
  try {
    const raw = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.language === 'en') return 'en';
    }
  } catch {
    // تجاهل — الافتراضي عربي.
  }
  return 'ar';
}

export async function ensureRTLMatchesLanguage(): Promise<boolean> {
  const lang = await readPersistedLanguage();
  const wantRTL = isRTLLanguage(lang);

  if (I18nManager.isRTL === wantRTL && I18nManager.getConstants().doLeftAndRightSwapInRTL === wantRTL) {
    return false;
  }
  I18nManager.allowRTL(wantRTL);
  I18nManager.forceRTL(wantRTL);
  try {
    // بيشتغل في build مستقل / dev client. في Expo Go ممكن ميكونش متاح —
    // بنبلعه بهدوء والمستخدم هيحتاج يعمل reload يدوي مرة واحدة بس (Shake → Reload).
    if (Updates.reloadAsync) {
      await Updates.reloadAsync();
      return true;
    }
  } catch {
    // Expo Go أو بيئة web — تجاهل، الاتجاه هيتفعّل تلقائيًا في الـ reload الجاي.
  }
  return false;
}
