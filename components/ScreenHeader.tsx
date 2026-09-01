/**
 * components/ScreenHeader.tsx — يقابل .pagehead (زرار رجوع + عنوان + زرار
 * يمين اختياري)، مستخدم في أغلب شاشات التطبيق تحت الـ status bar.
 *
 * بيحسب مساحة الـ safe area فوق (notch/status bar الحقيقية للجهاز) بنفسه
 * — مفيش حاجة تانية محتاجة SafeAreaView حواليه. ده تصحيح لباگ حقيقي كان
 * ظاهر على جهاز فعلي: العنوان وأيقونات الهيدر كانت بتتغطّى بساعة/بطارية
 * الجهاز لأن مفيش حد كان بيحسب المساحة دي.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';
import { IconButton } from './primitives/IconButton';

type Props = {
  title: string;
  onBack?: () => void; // لو مش موجودة وbackHref مش موجود، مفيش زرار رجوع
  showBack?: boolean;
  right?: React.ReactNode;
};

export function ScreenHeader({ title, onBack, showBack = true, right }: Props) {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s3,
        paddingHorizontal: spacing.s5,
        paddingTop: insets.top + spacing.s2,
        paddingBottom: spacing.s2,
      }}
    >
      {showBack ? (
        <IconButton onPress={onBack ?? (() => router.back())}>
          <Icon name="chev-r" color={colors.ink} />
        </IconButton>
      ) : null}
      <Text style={{ flex: 1, fontFamily: 'Cairo_800ExtraBold', fontSize: 18, color: colors.ink }}>
        {title}
      </Text>
      {right}
    </View>
  );
}

export default ScreenHeader;
