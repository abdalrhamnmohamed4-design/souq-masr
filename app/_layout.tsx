// لازم يكون أول import في الملف عشان react-native-gesture-handler يشتغل صح.
import 'react-native-gesture-handler';

// Phase 2B Slice 4B — لازم تتنادى مرة واحدة بس، قبل أي استخدام لـLiveKit
// في أي شاشة، عشان تسجّل الـglobals اللي WebRTC محتاجاها في JS (نفس
// اللي LiveKit's Expo quickstart بيطلبه بالظبط). صوت بس هنا فعليًا —
// الـregistration دي مستوى transport عام، مش هي اللي بتحدد صوت/فيديو
// (ده بيتحدد في app/call/[id].tsx وtoken الباك إند، شوف calls.py's
// get_rtc_token).
import { registerGlobals } from '@livekit/react-native';
registerGlobals();

import {
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  Cairo_900Black,
} from '@expo-google-fonts/cairo';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { I18nManager, Text, TextInput } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StartupGate } from '@/components/StartupGate';
import { hydrateCredentialsCache } from '@/lib/authCredentials';
import { ensureRTLMatchesLanguage } from '@/lib/rtl';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

// النص الأساسي في كل التطبيق IBM Plex Sans Arabic (زي body{} في الأصل)،
// عناصر Cairo بتحدد فونتها بنفسها (العناوين والأزرار). بنعمل الضبط ده
// مرة واحدة هنا بدل ما نكرر fontFamily في كل Text.
function applyDefaultFonts() {
  // @ts-expect-error defaultProps مش في types الرسمية بس ده النمط المعتاد
  Text.defaultProps = Text.defaultProps || {};
  // @ts-expect-error
  Text.defaultProps.style = [{ fontFamily: 'IBMPlexSansArabic_400Regular' }, Text.defaultProps.style];
  // @ts-expect-error
  TextInput.defaultProps = TextInput.defaultProps || {};
  // @ts-expect-error
  TextInput.defaultProps.style = [
    { fontFamily: 'IBMPlexSansArabic_400Regular' },
    // @ts-expect-error
    TextInput.defaultProps.style,
  ];
}

function RootStack() {
  const { colors, isDark } = useTheme();
  return (
    <>
      {/* الأساس الافتراضي: أيقونات الـ status bar تتبع وضع التطبيق (فاتح/غامق) —
          الشاشات اللي عندها هيدر غامق/ملوّن ثابت بغض النظر عن الوضع (الاستقبال،
          الترحيب، الرئيسية، المكالمة) بتفرض style="light" بتاعها هي عشان تفضل
          واضحة فوق خلفيتها. */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
          // RTL (عربي): "من الشمال" اتجاه الدخول الطبيعي. LTR (إنجليزي):
          // بالعكس، "من اليمين" — I18nManager.isRTL بيتظبط قبل أول رندر
          // (lib/rtl.ts's ensureRTLMatchesLanguage)، فالقيمة هنا صح من
          // أول لحظة، مش محتاجة إعادة حساب لاحقًا.
          animation: I18nManager.isRTL ? 'slide_from_left' : 'slide_from_right',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [rtlReady, setRtlReady] = useState(false);
  const [fontsLoaded, fontsError] = useFonts({
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
    Cairo_900Black,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  useEffect(() => {
    ensureRTLMatchesLanguage().finally(() => setRtlReady(true));
    // بيسخّن كاش الاعتماد الحقيقي (lib/authCredentials.ts's peekStoredCredentials
    // بتحتاجه sync) بدري في حياة التطبيق — Fire-and-forget، مش بوابة
    // (مفيش تعطيل لرندر أي شاشة عشانه، بعكس StartupGate).
    hydrateCredentialsCache();
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontsError) && rtlReady) {
      applyDefaultFonts();
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontsError, rtlReady]);

  if ((!fontsLoaded && !fontsError) || !rtlReady) {
    return null; // شاشة الـ splash الأصلية (app.json) لسه ظاهرة
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          {/* StartupGate بيغلّف الـStack كله — القسم 16 من طلب Force
              Update/Online-Only: "Do not allow individual screens to
              bypass these gates". لو الفحص رجّع أي حاجة غير 'ready'، ولا
              route (حتى لو المستخدم عمل deep link مباشر) بيترندر أصلًا،
              لأن <Stack /> نفسه مش بيتركّب. */}
          <StartupGate>
            <RootStack />
          </StartupGate>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
