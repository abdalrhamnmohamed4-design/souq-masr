/**
 * components/PriceGauge.tsx — مؤشر السعر (من مرجع mazadhome.html): شريط
 * تدرّج دلالي (رخيص→متوسط→غالي) مش تابع لهوية العلامة التجارية، فضل
 * زي ما هو (أخضر مائي→ذهبي→أحمر) حتى بعد ما اتغيّر اللون البرتقالي/الأحمر
 * بتاع الهوية — الاتنين أدوار مختلفة تمامًا.
 */
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Text, View } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  position: number; // 0 (أرخص) → 100 (أغلى)
  highLabel: string;
  lowLabel: string;
  note?: string;
  dark?: boolean; // نسخة .mp الغامقة (شريط أسمك وپين ذهبي)
};

export function PriceGauge({ position, highLabel, lowLabel, note, dark }: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ height: dark ? 8 : 6, borderRadius: 6, overflow: 'hidden' }}>
        <LinearGradient
          colors={['#16A085', '#F2B705', '#FF4D2E']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0 }}
          style={{ flex: 1 }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          top: dark ? -3 : -4,
          right: `${position}%`,
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: dark ? '#E0A106' : '#fff',
          borderWidth: 3,
          borderColor: dark ? '#fff' : colors.ink,
          transform: [{ translateX: 7 }],
        }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 9.5, fontWeight: '500', color: dark ? 'rgba(255,255,255,.62)' : colors.ink3 }}>
          {highLabel}
        </Text>
        <Text style={{ fontSize: 9.5, fontWeight: '500', color: dark ? 'rgba(255,255,255,.62)' : colors.ink3 }}>
          {lowLabel}
        </Text>
      </View>
      {note ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <Icon name="down" size={13} color={colors.signal} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.signal }}>{note}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default PriceGauge;
