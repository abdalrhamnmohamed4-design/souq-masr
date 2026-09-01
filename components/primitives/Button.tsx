/**
 * components/primitives/Button.tsx — يقابل .btn / .btn-primary / .btn-ghost
 * / .btn-danger / .btn-sm في الموك اب.
 */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export type ButtonVariant = 'primary' | 'ghost' | 'danger';
export type ButtonSize = 'default' | 'sm';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textColor?: string; // override — لازم لزرار .wel-alt الشفّاف فوق خلفية غامقة
  borderColor?: string;
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'default',
  icon,
  disabled,
  loading,
  style,
  textColor,
  borderColor,
}: Props) {
  const { colors, radius, type, spacing } = useTheme();

  const bg =
    variant === 'primary' ? colors.signal : variant === 'danger' ? colors.dangerWash : colors.card;
  const fg = textColor ?? (variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? colors.danger : colors.ink);
  const border = borderColor ?? (variant === 'ghost' ? colors.line : 'transparent');

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.full,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderRadius: size === 'sm' ? radius.r1 : radius.r2,
          paddingVertical: size === 'sm' ? spacing.s2 + 1 : 15,
          paddingHorizontal: size === 'sm' ? spacing.s4 - 2 : spacing.s3,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        variant === 'primary' && styles.primaryShadow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text
            style={{
              color: fg,
              fontFamily: 'Cairo_800ExtraBold',
              fontSize: size === 'sm' ? type.cap : type.bd,
            }}
          >
            {children}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  full: { width: '100%' },
  sm: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryShadow: {
    shadowColor: '#F4511E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
});

export default Button;
