/**
 * components/primitives/Skeleton.tsx — يقابل .sk / shimmer animation، بيحترم
 * إعدادات تقليل الحركة (reduceMotion) بإيقاف التحريك والاكتفاء بلون ثابت.
 */
import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, type DimensionValue } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: object;
};

export function Skeleton({ width = '100%', height = 12, radius = 4, style }: Props) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    let mounted = true;
    let loop: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!mounted || reduced) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.5, duration: 650, easing: Easing.ease, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });

    return () => {
      mounted = false;
      loop?.stop();
    };
  }, [pulse]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.line2, opacity: pulse },
        style,
      ]}
    />
  );
}

export default Skeleton;
