/**
 * components/primitives/Avatar.tsx — يقابل .avatar / .avatar.s / .avatar.xl.
 * بيعرض حروف اسم بس (نفس أسلوب الموك اب)، مفيش صور أو إيموچي.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Size = 's' | 'default' | 'xl';

type Props = {
  initials: string;
  size?: Size;
  color?: string; // خلفية مخصّصة (زي ألوان البائعين المختلفة في الرسائل)
};

const DIMENSIONS: Record<Size, { box: number; radius: number; font: number }> = {
  s: { box: 30, radius: 8, font: 11 },
  default: { box: 40, radius: 12, font: 14 },
  xl: { box: 88, radius: 28, font: 30 },
};

export function Avatar({ initials, size = 'default', color }: Props) {
  const { colors } = useTheme();
  const d = DIMENSIONS[size];
  return (
    <View
      style={{
        width: d.box,
        height: d.box,
        borderRadius: d.radius,
        backgroundColor: color ?? colors.ink,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Text style={{ color: '#fff', fontFamily: 'Cairo_800ExtraBold', fontSize: d.font }}>{initials}</Text>
    </View>
  );
}

export default Avatar;
