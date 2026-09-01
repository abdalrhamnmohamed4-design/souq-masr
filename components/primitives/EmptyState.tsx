/**
 * components/primitives/EmptyState.tsx — يقابل .empty (أيقونة دائرية + عنوان
 * + وصف + CTA اختياري)، ومستخدم برضه لحالة "done" في onboarding بلون verify.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from './Button';

type Props = {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'success';
};

export function EmptyState({ icon, title, description, actionLabel, onAction, tone = 'neutral' }: Props) {
  const { colors, spacing } = useTheme();
  const bubbleBg = tone === 'success' ? colors.verifyWash : colors.card;
  const bubbleBorder = tone === 'success' ? colors.verify : colors.line;

  return (
    <View style={{ paddingVertical: 60, paddingHorizontal: spacing.s6, alignItems: 'center' }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 24,
          backgroundColor: bubbleBg,
          borderWidth: 1,
          borderColor: bubbleBorder,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.s4,
        }}
      >
        {icon}
      </View>
      <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.ink, textAlign: 'center' }}>
        {title}
      </Text>
      <Text
        style={{
          fontSize: 12.5,
          color: colors.ink3,
          textAlign: 'center',
          marginTop: spacing.s2,
          marginBottom: spacing.s5,
          lineHeight: 20,
        }}
      >
        {description}
      </Text>
      {actionLabel ? (
        <View style={{ maxWidth: 240, width: '100%' }}>
          <Button onPress={onAction}>{actionLabel}</Button>
        </View>
      ) : null}
    </View>
  );
}

export default EmptyState;
