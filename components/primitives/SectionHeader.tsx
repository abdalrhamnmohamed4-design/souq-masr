/**
 * components/primitives/SectionHeader.tsx — يقابل .sechead (عنوان قسم +
 * رابط اختياري "شاهد الكل").
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: Props) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.s5,
        paddingTop: spacing.s5,
        paddingBottom: spacing.s3,
      }}
    >
      <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 15, color: colors.ink }}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction}>
          <Text style={{ fontSize: 11, color: colors.signal, fontWeight: '600' }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default SectionHeader;
