/**
 * components/LanguageSwitcher.tsx — الزرار اللي بيبدّل لغة التطبيق كله.
 * شكله بيوضّح اللغة الحالية دايمًا (اللي شغّالة فعلًا هي اللي جنب أيقونة
 * الترجمة، والتانية باهتة جنبها) — عربي: "العربية / English"،
 * إنجليزي: "English / العربية". الضغط بيبدّل اللغة العالمية فورًا
 * (store/useLanguageStore.ts بيتكفّل بالـpersistence وبإعادة تحميل
 * التطبيق لو الاتجاه RTL/LTR محتاج يتغيّر).
 */
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';

export function LanguageSwitcher() {
  const { colors, spacing, radius } = useTheme();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const [switching, setSwitching] = React.useState(false);

  const onPress = async () => {
    if (switching) return;
    setSwitching(true);
    try {
      await setLanguage(language === 'ar' ? 'en' : 'ar');
    } finally {
      setSwitching(false);
    }
  };

  const isAr = language === 'ar';

  return (
    <Pressable
      onPress={onPress}
      disabled={switching}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: radius.r2,
          paddingVertical: 13,
          paddingHorizontal: spacing.s4,
          opacity: pressed || switching ? 0.7 : 1,
        },
      ]}
    >
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="globe" size={17} color={colors.signal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
          {isAr ? 'العربية' : 'English'}
          <Text style={{ color: colors.ink3, fontWeight: '500' }}> / {isAr ? 'English' : 'العربية'}</Text>
        </Text>
      </View>
      {switching ? <ActivityIndicator size="small" color={colors.signal} /> : <Icon name="chev-l" size={15} color={colors.ink3} />}
    </Pressable>
  );
}

export default LanguageSwitcher;
