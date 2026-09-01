/**
 * components/BrandLogo.tsx
 *
 * شعار براند حقيقي (SVG من simple-icons عبر jsDelivr) بدل شكل هندسي أو
 * مربع فاضي — مستخدم في خطوة اختيار البراند بنموذج النشر. خلفية بيضا
 * ثابتة دايمًا (بغض النظر عن الوضع الليلي) لأن شعارات البراندات سوداء
 * بيفترض إنها على خلفية فاتحة. لو مفيش شعار موثّق للبراند ده، بيرجع
 * لأيقونة التصنيف العادية بدل رابط مكسور.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Icon, type IconName } from './Icon';
import { getBrandLogoUrl } from '@/mock/taxonomy/brandLogos';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  brandId: string;
  size?: number;
  fallbackIcon?: IconName;
};

export function BrandLogo({ brandId, size = 44, fallbackIcon = 'box' }: Props) {
  const { colors, radius } = useTheme();
  const [failed, setFailed] = useState(false);
  const url = getBrandLogoUrl(brandId);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.r2,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.line,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {url && !failed ? (
        <SvgUri width={size * 0.58} height={size * 0.58} uri={url} onError={() => setFailed(true)} />
      ) : (
        <Icon name={fallbackIcon} color={colors.ink3} size={size * 0.5} />
      )}
    </View>
  );
}

export default BrandLogo;
