/**
 * components/listing/GridCard.tsx — يقابل .gcard (شبكة عمودين) مع زرار
 * المفضلة .fav فوق الصورة.
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

export function GridCard({ listing }: { listing: Listing }) {
  const router = useRouter();
  const { colors, radius } = useTheme();
  const isFav = useAppStore((s) => s.isFavorite(listing.id));
  const toggleFav = useAppStore((s) => s.toggleFavorite);
  const requireAuth = useRequireAuth();
  const price = formatListingPrice(listing);

  return (
    <Pressable
      onPress={() => router.push(`/detail/${listing.id}`)}
      style={{
        width: '48%',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.r3,
        overflow: 'hidden',
      }}
    >
      <ThumbPlaceholder variant={listing.thumb} photoUri={listing.photoUris?.[0]} height={112}>
        <Pressable
          onPress={() => requireAuth(() => toggleFav(listing.id), { type: 'favorite_listing', listingId: listing.id })}
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: 'rgba(255,255,255,.94)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="heart" size={16} color={isFav ? colors.signal : colors.ink2} />
        </Pressable>
      </ThumbPlaceholder>
      <View style={{ padding: 10 }}>
        <Text numberOfLines={2} style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink, lineHeight: 18, height: 36 }}>
          {listing.title}
        </Text>
        <Text style={{ fontFamily: 'Cairo_900Black', fontSize: price.isPlaceholder ? 12.5 : 15, color: price.isPlaceholder ? colors.signal2 : colors.ink, marginTop: 6 }}>
          {price.text}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ fontSize: 9.5, color: colors.ink3 }}>{listing.postedAt}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icon name="pin" size={12} color={colors.ink3} />
            <Text style={{ fontSize: 9.5, color: colors.ink3 }}>{listing.city}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default GridCard;
