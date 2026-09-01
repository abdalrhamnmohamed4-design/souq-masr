/**
 * components/listing/RowCard.tsx — يقابل .rowcard في شاشة نتائج البحث.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ThumbPlaceholder } from '@/components/primitives/ThumbPlaceholder';
import { formatListingPrice } from '@/lib/price';
import { useRequireAuth } from '@/lib/auth';
import type { Listing } from '@/mock/listings';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export function RowCard({ listing }: { listing: Listing }) {
  const router = useRouter();
  const { colors, radius, spacing, elevation } = useTheme();
  const isFav = useAppStore((s) => s.isFavorite(listing.id));
  const toggleFav = useAppStore((s) => s.toggleFavorite);
  const requireAuth = useRequireAuth();
  const price = formatListingPrice(listing);

  return (
    <Pressable
      onPress={() => router.push(`/detail/${listing.id}`)}
      style={{
        flexDirection: 'row',
        gap: spacing.s3,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.r3,
        padding: 10,
        marginHorizontal: spacing.s5,
        marginBottom: spacing.s3,
        ...elevation.e1.ios,
        elevation: elevation.e1.android.elevation,
      }}
    >
      <ThumbPlaceholder variant={listing.thumb} photoUri={listing.photoUris?.[0]} width={92} height={92} radius={radius.r2}>
        {listing.isFeatured ? (
          <>
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 0,
                height: 0,
                borderTopWidth: 26,
                borderTopColor: colors.gold,
                borderRightWidth: 26,
                borderRightColor: 'transparent',
              }}
            />
            <Icon name="star" color="#fff" size={11} style={{ position: 'absolute', top: 4, left: 4 }} />
          </>
        ) : null}
      </ThumbPlaceholder>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <Text numberOfLines={2} style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink, lineHeight: 19 }}>
          {listing.title}
        </Text>
        <Text style={{ fontFamily: 'Cairo_900Black', fontSize: price.isPlaceholder ? 12.5 : 15, color: price.isPlaceholder ? colors.signal2 : colors.ink }}>
          {price.text}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icon name="pin" size={12} color={colors.ink3} />
            <Text style={{ fontSize: 9.5, color: colors.ink3 }}>{listing.city}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icon name="clock" size={12} color={colors.ink3} />
            <Text style={{ fontSize: 9.5, color: colors.ink3 }}>{listing.postedAt}</Text>
          </View>
        </View>
      </View>
      <Pressable
        onPress={() => requireAuth(() => toggleFav(listing.id), { type: 'favorite_listing', listingId: listing.id })}
        style={{ position: 'absolute', top: 10, left: 10 }}
      >
        <Icon name="heart" size={16} color={isFav ? colors.signal : colors.ink3} />
      </Pressable>
    </Pressable>
  );
}

export default RowCard;
