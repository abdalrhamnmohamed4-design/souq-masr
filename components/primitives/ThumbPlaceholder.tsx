/**
 * components/primitives/ThumbPlaceholder.tsx — يقابل .thumb.th-a..th-f:
 * شكل هندسي تجريدي بديل عن صورة حقيقية. لو الإعلان عنده صورة حقيقية
 * فعلاً (photoUri — من expo-image-picker وقت النشر) بيتعرض بدل الشكل
 * الزخرفي؛ الشكل الزخرفي يفضل fallback بس للإعلانات اللي لسه من غير صور.
 * الألوان مطابقة حرفيًا لـ theme/decorative.ts؛ التموضع (inset الدقيق
 * لكل متغيّر في CSS) مبسّط هنا لتركيبة عامة بنفس الإحساس (مستطيلين
 * متراكبين، أو دائرة لمتغيّر d) بدل نسخ كل إحداثيات inset بالبكسل.
 */
import React from 'react';
import { Image, View, type DimensionValue } from 'react-native';
import { thumbVariants, type ThumbVariant } from '@/theme/decorative';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  variant: ThumbVariant;
  photoUri?: string;
  height?: DimensionValue;
  width?: DimensionValue;
  radius?: number;
  children?: React.ReactNode; // overlay زي .fold أو .fav
};

export function ThumbPlaceholder({ variant, photoUri, height = 112, width = '100%', radius = 0, children }: Props) {
  const { colors } = useTheme();
  const v = thumbVariants[variant];

  return (
    <View
      style={{
        height,
        width,
        borderRadius: radius,
        backgroundColor: colors.line2,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <>
          <View
            style={{
              position: 'absolute',
              top: '28%',
              left: '20%',
              width: '46%',
              height: '46%',
              backgroundColor: v.primary,
              borderRadius: v.secondaryShape === 'circle' ? 999 : 6,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: '18%',
              right: '18%',
              width: '30%',
              height: '26%',
              backgroundColor: v.secondary,
              borderRadius: v.secondaryShape === 'circle' ? 999 : 5,
              opacity: 0.9,
            }}
          />
        </>
      )}
      {children}
    </View>
  );
}

export default ThumbPlaceholder;
