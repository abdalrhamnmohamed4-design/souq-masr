/**
 * components/listing/FeaturedCard.tsx — يقابل .fcard في الشريط الأفقي
 * للإعلانات المميزة، مع علامة .fold الذهبية.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ThumbPlaceholder } from '@/components/primitives/ThumbPlaceholder';
import { useT } from '@/i18n';
import { formatListingPrice } from '@/lib/price';
import type { Listing } from '@/mock/listings';
import { useTheme } from '@/theme/ThemeProvider';

export function FeaturedCard({ listing }: { listing: Listing }) {
  const router = useRouter();
  const t = useT();
  const { colors, radius } = useTheme();
  const price = formatListingPrice(listing);

  return (
    <Pressable
      onPress={() => router.push(`/detail/${listing.id}`)}
      style={{
        width: 162,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.r3,
        overflow: 'hidden',
      }}
    >
      <ThumbPlaceholder variant={listing.thumb} photoUri={listing.photoUris?.[0]} height={104}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            borderTopWidth: 34,
            borderTopColor: colors.gold,
            borderRightWidth: 34,
            borderRightColor: 'transparent',
          }}
        />
        <Icon name="star" color="#fff" size={14} style={{ position: 'absolute', top: 5, left: 5 }} />
      </ThumbPlaceholder>
      <View style={{ padding: 10, paddingTop: 10 }}>
        <Text numberOfLines={2} style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink, lineHeight: 18, height: 36 }}>
          {listing.title}
        </Text>
        <Text style={{ fontFamily: 'Cairo_900Black', fontSize: price.isPlaceholder ? 12 : 15, color: price.isPlaceholder ? colors.signal2 : colors.ink, marginTop: 6 }}>
          {price.text}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
          {listing.isVerifiedSeller ? (
            <>
              <Icon name="shield" size={13} color={colors.verify} />
              <Text style={{ fontSize: 10, color: colors.ink3 }}>{t('listing.trustedSeller')} · {t('listing.views', { count: listing.views })}</Text>
            </>
          ) : (
            <>
              <Icon name="eye" size={13} color={colors.ink3} />
              <Text style={{ fontSize: 10, color: colors.ink3 }}>{t('listing.views', { count: listing.views })}</Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default FeaturedCard;
