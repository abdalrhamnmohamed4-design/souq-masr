/**
 * components/primitives/Pill.tsx — يقابل .pill / .pill-verify / .pill-gold
 * / .pill-signal في الموك اب.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export type PillTone = 'verify' | 'gold' | 'signal' | 'neutral';

type Props = {
  children: string;
  tone?: PillTone;
  icon?: React.ReactNode;
};

export function Pill({ children, tone = 'neutral', icon }: Props) {
  const { colors, radius } = useTheme();

  const tones: Record<PillTone, { bg: string; fg: string }> = {
    verify: { bg: colors.verifyWash, fg: colors.verify },
    gold: { bg: colors.goldWash, fg: '#8A6300' },
    signal: { bg: colors.signalWash, fg: colors.signal2 },
    neutral: { bg: colors.paper, fg: colors.ink2 },
  };
  const t = tones[tone];

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: t.bg,
          borderRadius: radius.rf,
          borderWidth: tone === 'neutral' ? 1 : 0,
          borderColor: colors.line,
        },
      ]}
    >
      {icon}
      <Text style={{ color: t.fg, fontSize: 10, fontWeight: '700' }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 9,
    alignSelf: 'flex-start',
  },
});

export default Pill;
