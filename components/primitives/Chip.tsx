/**
 * components/primitives/Chip.tsx — يقابل .chip / .chip.on و .fopt / .fopt.on
 * (نفس الشكل، استخدامين مختلفين: تصنيفات الرئيسية وخيارات الفلترة).
 */
import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  compact?: boolean; // .fopt أصغر شوية من .chip
};

export function Chip({ label, active, onPress, compact }: Props) {
  const { colors, radius, type, brandDark } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        // brandDark ثابتة (مش colors.ink) — الشريحة النشطة لازم تفضل غامقة
        // بنص أبيض واضح في الوضعين، مش تتقلب لفاتح مع نص أبيض فوقها.
        backgroundColor: active ? brandDark : colors.card,
        borderWidth: 1,
        borderColor: active ? brandDark : colors.line,
        borderRadius: compact ? radius.r1 : radius.rf,
        paddingVertical: compact ? 8 : 9,
        paddingHorizontal: compact ? 13 : 14,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          color: active ? '#fff' : colors.ink,
          fontSize: compact ? type.cap : type.sm,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default Chip;
