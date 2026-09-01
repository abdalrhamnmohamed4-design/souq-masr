/**
 * components/gates/MandatoryUpdateScreen.tsx — شاشة التحديث الإجباري
 * (القسم 1 من الطلب). عمدًا **مفيش** ScreenHeader (يعني مفيش زرار رجوع)،
 * ومفيش أي زرار "لاحقًا/تخطي/إلغاء/X" — الزرار الوحيد بيفتح الـstore
 * الحقيقي. الشاشة دي بتحل محل الـStack كله (StartupGate) مش شاشة جوّاه،
 * يعني مفيش "رجوع" أصلًا يتنقل لمكان تاني.
 */
import React from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/primitives/Button';
import { useAppGateStore } from '@/store/useAppGateStore';
import { useTheme } from '@/theme/ThemeProvider';

export function MandatoryUpdateScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const config = useAppGateStore((s) => s.config);

  const messageAr = config?.update_message_ar || 'لازم تحدّث التطبيق علشان تقدر تكمل';
  const storeUrl = Platform.OS === 'android' ? config?.update_url_android : config?.update_url_ios;

  const openStore = () => {
    if (storeUrl) Linking.openURL(storeUrl).catch(() => {});
    // مفيش رابط متظبط من الباك إند لسه (القسم 14 — مفيش روابط وهمية) —
    // الزرار بيفضل ظاهر لأن ده الفعل الوحيد المسموح، بس من غير ما يعمل
    // حاجة لو الرابط فاضي، بدل ما يفتح رابط store مؤلَّف.
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.s6, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ width: 84, height: 84, borderRadius: 26, backgroundColor: colors.signalWash, borderWidth: 1, borderColor: colors.signal, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.s5 }}>
        <Icon name="rocket" size={32} color={colors.signal2} />
      </View>
      <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 17, color: colors.ink, textAlign: 'center' }}>
        {messageAr}
      </Text>
      <Text style={{ fontSize: 12.5, color: colors.ink3, textAlign: 'center', marginTop: spacing.s2, marginBottom: spacing.s6, lineHeight: 20 }}>
        الإصدار اللي عندك أقدم من إن سوق مصر يقدر يشتغل بيه بأمان — محتاج تحدّثه الأول.
      </Text>
      <View style={{ maxWidth: 260, width: '100%' }}>
        <Button icon={<Icon name="refresh" color="#fff" size={16} />} onPress={openStore}>
          تحديث التطبيق
        </Button>
      </View>
    </View>
  );
}

export default MandatoryUpdateScreen;
