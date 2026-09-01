/**
 * components/primitives/IconButton.tsx — يقابل .iconbtn (زرار مربّع بأيقونة
 * فقط، مستخدم في كل الـ pageheads) مع دعم .dot badge الصغيرة.
 */
import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  showDot?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ children, onPress, showDot, style }: Props) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          borderRadius: radius.r2,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: pressed ? colors.ink3 : colors.line,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.ink,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 3,
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
      {showDot ? (
        <View
          style={{
            position: 'absolute',
            top: 7,
            left: 7,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.signal,
            borderWidth: 2,
            borderColor: colors.card,
          }}
        />
      ) : null}
    </Pressable>
  );
}

export default IconButton;
