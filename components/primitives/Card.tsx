/**
 * components/primitives/Card.tsx — سطح عام (.card / بطاقات .sellercard,
 * .plan, .adcard...) — حاوية أساسية بس، كل شاشة بتضيف محتواها فوقيها.
 */
import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean; // .card { padding: s4 }
  elevated?: boolean; // e1 shadow زي أغلب البطاقات
};

export function Card({ children, onPress, style, padded = true, elevated = true }: Props) {
  const { colors, radius, spacing, elevation } = useTheme();
  const shell: StyleProp<ViewStyle> = [
    {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.r3,
      padding: padded ? spacing.s4 : 0,
    },
    elevated && {
      ...elevation.e1.ios,
      elevation: elevation.e1.android.elevation,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [shell, { opacity: pressed ? 0.92 : 1 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={shell}>{children}</View>;
}

export default Card;
