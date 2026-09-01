/**
 * theme/ThemeProvider.tsx
 *
 * سياق الثيم — بيتابع نظام التشغيل بشكل افتراضي (زي .phone.dark في
 * الموك اب اللي كان بيتفعّل بمفتاح واحد)، مع إمكانية override يدوي من
 * شاشة الإعدادات، محفوظ في AsyncStorage عشان يفضل بعد إعادة فتح التطبيق.
 * الوضع الليلي شغّال من أول launch مش حاجة اتضافت بعدين.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import {
  brandDark,
  darkColors,
  elevation,
  fontFamilies,
  heroGradient,
  lightColors,
  radius,
  spacing,
  typeScale,
} from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

// اسم الـkey ده متعمّد من غير تغيير بعد إعادة تسمية العلامة التجارية —
// نفس السبب اللي في store/useAppStore.ts: مفتاح تخزين محلي غير مرئي
// للمستخدم، وتغييره ممكن يفقد تفضيل الوضع الليلي/النهاري المحفوظ فعليًا
// على أي جهاز حقيقي. قرار متعمّد.
const STORAGE_KEY = 'mazad.themeMode';

type ThemeContextValue = {
  colors: typeof lightColors;
  spacing: typeof spacing;
  radius: typeof radius;
  type: typeof typeScale;
  elevation: typeof elevation;
  fonts: typeof fontFamilies;
  brandDark: string;
  heroGradient: typeof heroGradient;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
      setLoaded(true);
    });
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m);
  };

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      spacing,
      radius,
      type: typeScale,
      elevation,
      fonts: fontFamilies,
      brandDark,
      heroGradient,
      isDark,
      mode,
      setMode,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDark, mode],
  );

  // من غير ما نستنى التحميل من AsyncStorage بنستخدم قيمة افتراضية (system)
  // فورًا — مفيش شاشة فاضية قبل الثيم، بس بمجرد ما القيمة المحفوظة توصل
  // بتتحدث القيمة تلقائيًا عن طريق الـ state.
  void loaded;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme لازم يتنادى جوه <ThemeProvider>');
  return ctx;
}

// مساعد لمن يحتاج قراءة الثيم الحالي برّه شجرة React (نادرًا)
export function getSystemIsDark() {
  return Appearance.getColorScheme() === 'dark';
}
