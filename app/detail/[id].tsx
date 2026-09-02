/**
 * app/detail/[id].tsx — يقابل #detail: معرض صور + سعر + مواصفات + بطاقة
 * بائع + تنبيه أمان + وصف + CTA لاصق.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Image, Pressable, Share, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiStateView } from '@/components/ApiStateView';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/primitives/Avatar';
import { Button } from '@/components/primitives/Button';
import { Pill } from '@/components/primitives/Pill';
import { useApiResult } from '@/hooks/useApiResult';
import { getBrand } from '@/mock/taxonomy/brands';
import { getCategory, getPath } from '@/mock/taxonomy/categories';
import { getModel } from '@/mock/taxonomy/models';
import { SELLING_TYPE_LABELS } from '@/mock/taxonomy/types';
import { BrandLogo } from '@/components/BrandLogo';
import { formatListingPrice } from '@/lib/price';
import { useRequireAuth } from '@/lib/auth';
import type { ProductVariant } from '@/mock/listings';
import {
  getListing as getRealListing,
  incrementListingViews as incrementListingViewsBackend,
  isRealListingId,
} from '@/services/listingService';
import { useAppStore, useListingById, useSeller, type ReportReason } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

const REPORT_REASONS: { key: ReportReason; label: string }[] = [
  { key: 'fake', label: 'إعلان وهمي' },
  { key: 'scam', label: 'نصب' },
  { key: 'wrong_category', label: 'تصنيف غلط' },
  { key: 'duplicate', label: 'إعلان مكرر' },
  { key: 'prohibited', label: 'منتج ممنوع' },
  { key: 'spam', label: 'سبام' },
  { key: 'abusive_seller', label: 'بائع مسيء' },
  { key: 'incorrect_info', label: 'معلومات غلط' },
];

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const startChatForListing = useAppStore((s) => s.startChatForListing);
  const isFav = useAppStore((s) => s.isFavorite);
  const toggleFav = useAppStore((s) => s.toggleFavorite);
  const reportListing = useAppStore((s) => s.reportListing);
  const hasReported = useAppStore((s) => s.hasReported);
  const incrementListingViews = useAppStore((s) => s.incrementListingViews);
  const requireAuth = useRequireAuth();
  const { width: screenWidth } = useWindowDimensions();
  const [galleryIndex, setGalleryIndex] = React.useState(0);
  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariant | undefined>(undefined);

  // Phase 2B: id بتاع LST-##### معناه إعلان حقيقي من الباك إند (نشر
  // فعلي من app/post/index.tsx's create_listing) — بديل بحث محلي في
  // userListings/mock/listings.ts. أي id تاني (my-new-N وغيره) لسه بيتقرا
  // محليًا زي ما كان بالظبط، مفيش تغيير هناك خالص.
  const isReal = isRealListingId(id);
  const { state: realState, refetch: refetchReal } = useApiResult(
    () => (isReal && id ? getRealListing(id) : Promise.resolve({ status: 'success' as const, data: null })),
    [id, isReal],
  );

  const mockListing = useListingById(id);
  const mockSeller = useSeller(mockListing?.sellerId);

  const listing = isReal ? (realState.kind === 'success' ? realState.data?.listing : undefined) : mockListing;
  const seller = isReal ? (realState.kind === 'success' ? realState.data?.seller : undefined) : mockSeller;

  React.useEffect(() => {
    setSelectedVariant(listing?.variants?.find((v) => v.stock > 0) ?? listing?.variants?.[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.id]);

  React.useEffect(() => {
    if (!listing) return;
    if (isReal) incrementListingViewsBackend(listing.id);
    else incrementListingViews(listing.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.id]);

  if (isReal && realState.kind !== 'success') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, justifyContent: 'center' }}>
        <ApiStateView state={realState} onRetry={refetchReal} />
      </View>
    );
  }

  if (!listing || !seller) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <Text style={{ color: colors.ink3 }}>الإعلان مش موجود</Text>
      </View>
    );
  }

  const activeDiscount = !!listing.discountPrice && (!listing.discountEndsAt || new Date(listing.discountEndsAt) > new Date());
  const price = formatListingPrice(listing);
  const brand = listing.brandId ? getBrand(listing.brandId) : undefined;
  const model = listing.modelId ? getModel(listing.modelId) : undefined;

  const openChat = () =>
    requireAuth(() => {
      const chatId = startChatForListing(listing.id, listing.sellerId);
      router.push(`/chat/${chatId}`);
    });

  const shareListing = () => {
    Share.share({ message: `${listing.title} — ${price.text}\nعلى سوق مصر` });
  };

  const toggleFavGuarded = () => requireAuth(() => toggleFav(listing.id), { type: 'favorite_listing', listingId: listing.id });

  const openReport = () =>
    requireAuth(() => {
      if (hasReported(listing.id)) {
        Alert.alert('اتبلّغ عن الإعلان ده', 'شكرًا، البلاغ بتاعك اتسجّل وهيتراجع.');
        return;
      }
      Alert.alert(
        'بلّغ عن الإعلان',
        'اختار السبب',
        [
          ...REPORT_REASONS.map((r) => ({ text: r.label, onPress: () => { reportListing(listing.id, r.key); Alert.alert('شكرًا', 'اتسجّل البلاغ وهنراجعه.'); } })),
          { text: 'إلغاء', style: 'cancel' as const },
        ],
      );
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        <View style={{ height: 250 }}>
          {listing.photoUris && listing.photoUris.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setGalleryIndex(Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width))}
              style={{ flex: 1 }}
            >
              {listing.photoUris.map((uri) => (
                <Image key={uri} source={{ uri }} style={{ width: screenWidth, height: 250 }} />
              ))}
            </ScrollView>
          ) : (
            <LinearGradient colors={['#1B2C4B', '#2E4A70']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 150, height: 150 }}>
                <View style={{ position: 'absolute', top: '14%', left: '30%', right: '30%', bottom: '10%', backgroundColor: '#7A9BC9', borderRadius: 8 }} />
                <View style={{ position: 'absolute', top: '24%', left: '36%', right: '36%', bottom: '22%', backgroundColor: '#B9CDE6', borderRadius: 8 }} />
              </View>
            </LinearGradient>
          )}
          <View style={{ position: 'absolute', top: insets.top + spacing.s2, left: spacing.s4, right: spacing.s4, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Pressable onPress={() => router.back()} style={glassBtn}>
              <Icon name="chev-r" color="#fff" />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={shareListing} style={glassBtn}>
                <Icon name="share" color="#fff" />
              </Pressable>
              <Pressable onPress={toggleFavGuarded} style={glassBtn}>
                <Icon name="heart" color={isFav(listing.id) ? colors.signal : '#fff'} />
              </Pressable>
            </View>
          </View>
          <View style={{ position: 'absolute', bottom: spacing.s4, right: spacing.s4, backgroundColor: 'rgba(15,26,46,.6)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{galleryIndex + 1} / {listing.images}</Text>
          </View>
        </View>

        <View style={{ padding: spacing.s5, paddingBottom: 0 }}>
          {listing.isFeatured || listing.brandName || brand || (listing.sellingType && listing.sellingType !== 'sale') ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {listing.isFeatured ? (
                <Pill tone="gold" icon={<Icon name="star" size={12} color="#8A6300" />}>
                  إعلان مميز
                </Pill>
              ) : null}
              {listing.sellingType && listing.sellingType !== 'sale' ? (
                <Pill tone="signal">{SELLING_TYPE_LABELS[listing.sellingType]}</Pill>
              ) : null}
              {listing.brandName ? (
                <Pill icon={<Icon name="office" size={12} color={colors.ink2} />}>{listing.brandName}</Pill>
              ) : brand ? (
                <Pill icon={<BrandLogo brandId={brand.id} size={14} />}>{model ? `${brand.name} · ${model.name}` : brand.name}</Pill>
              ) : null}
            </View>
          ) : null}
          <Text style={{ fontSize: 10.5, color: colors.ink3, fontWeight: '600', marginBottom: 4 }}>
            {getPath(listing.categoryKey).map((p) => p.name).join(' ← ') || getCategory(listing.categoryKey)?.name}
          </Text>
          <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 16, color: colors.ink, lineHeight: 26 }}>
            {listing.title}
          </Text>
          {activeDiscount ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: spacing.s3 }}>
              <Text style={{ fontFamily: 'Cairo_900Black', fontSize: 26, color: colors.signal }}>
                {listing.discountPrice!.toLocaleString('en-US')} <Text style={{ fontSize: 12, color: colors.ink3 }}>ج.م</Text>
              </Text>
              <Text style={{ fontSize: 14, color: colors.ink3, textDecorationLine: 'line-through' }}>{listing.price.toLocaleString('en-US')}</Text>
            </View>
          ) : (
            <Text style={{ fontFamily: 'Cairo_900Black', fontSize: price.isPlaceholder ? 18 : 26, color: price.isPlaceholder ? colors.signal2 : colors.ink, marginTop: spacing.s3 }}>
              {price.text}
            </Text>
          )}
          {listing.priceType === 'negotiable' ? (
            <Text style={{ fontSize: 10.5, color: colors.ink3, marginTop: 3 }}>قابل للتفاوض</Text>
          ) : null}
          {activeDiscount ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Icon name="flame" size={12} color={colors.signal} />
              <Text style={{ fontSize: 10.5, color: colors.signal2 }}>
                عرض لحد {new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long' }).format(new Date(listing.discountEndsAt!))}
              </Text>
            </View>
          ) : null}
          {listing.wholesalePrice ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, paddingVertical: 8, paddingHorizontal: 11, marginTop: spacing.s3, alignSelf: 'flex-start' }}>
              <Icon name="box" size={13} color={colors.ink3} />
              <Text style={{ fontSize: 11, color: colors.ink2 }}>
                سعر الجملة {listing.wholesalePrice.toLocaleString('en-US')} ج.م{listing.minWholesaleQty ? ` (${listing.minWholesaleQty}+ قطعة)` : ''}
              </Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: spacing.s4, marginTop: spacing.s3 }}>
            <MetaItem icon="pin" text={listing.city + (listing.district ? `، ${listing.district}` : '')} />
            <MetaItem icon="eye" text={String(listing.views)} />
            <MetaItem icon="clock" text={listing.postedAt} />
          </View>
        </View>

        {listing.specs.length > 0 ? (
          <View style={{ marginHorizontal: spacing.s5, marginTop: spacing.s4, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, overflow: 'hidden' }}>
            {listing.specs.map((s, i) => (
              <View
                key={s.label}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 11,
                  paddingHorizontal: spacing.s4,
                  borderBottomWidth: i < listing.specs.length - 1 ? 1 : 0,
                  borderBottomColor: colors.line2,
                }}
              >
                <Text style={{ fontSize: 12.5, color: colors.ink3 }}>{s.label}</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }}>{s.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {listing.variants && listing.variants.length > 0 ? (
          <View style={{ marginHorizontal: spacing.s5, marginTop: spacing.s4 }}>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: colors.ink, marginBottom: spacing.s2 }}>اختار النسخة</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {listing.variants.map((v) => {
                const label = [v.size, v.color].filter(Boolean).join(' · ') || 'نسخة';
                const active = selectedVariant?.id === v.id;
                const outOfStock = v.stock <= 0;
                return (
                  <Pressable
                    key={v.id}
                    disabled={outOfStock}
                    onPress={() => setSelectedVariant(v)}
                    style={{
                      backgroundColor: active ? colors.ink : colors.card,
                      borderWidth: 1,
                      borderColor: active ? colors.ink : colors.line,
                      borderRadius: radius.r1,
                      paddingVertical: 8,
                      paddingHorizontal: 13,
                      opacity: outOfStock ? 0.4 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: active ? '#fff' : colors.ink }}>
                      {label}{outOfStock ? ' — خلص' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {selectedVariant ? (
              <Text style={{ fontSize: 10.5, color: colors.ink3, marginTop: spacing.s2 }}>متاح: {selectedVariant.stock} قطعة</Text>
            ) : null}
          </View>
        ) : null}

        <Pressable
          onPress={() => router.push(`/seller/${seller.id}`)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.s3,
            marginHorizontal: spacing.s5,
            marginTop: spacing.s4,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: radius.r3,
            padding: spacing.s3,
          }}
        >
          <Avatar initials={seller.initials} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{seller.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              {seller.verified ? <Icon name="shield" size={12} color={colors.verify} /> : null}
              <Text style={{ fontSize: 10, color: colors.ink3 }}>
                {seller.verified ? 'موثّق · ' : ''}
                {seller.memberSince} · {seller.adsCount} إعلان
              </Text>
            </View>
          </View>
          <Icon name="chev-r" color={colors.ink3} />
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: spacing.s5, marginTop: spacing.s3, backgroundColor: colors.signalWash, borderWidth: 1, borderColor: '#FFD9C8', borderRadius: radius.r2, padding: spacing.s3 }}>
          <Icon name="shield" size={16} color={colors.signal2} />
          <Text style={{ flex: 1, fontSize: 11, color: colors.signal2, lineHeight: 19 }}>
            اتقابل في مكان عام وافحص المنتج قبل ما تدفع. سوق مصر ما بياخدش عمولة ولا بيتدخل في الدفع.
          </Text>
        </View>

        <View style={{ padding: spacing.s5 }}>
          <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.ink, marginBottom: spacing.s2 }}>
            الوصف
          </Text>
          <Text style={{ fontSize: 12.5, color: colors.ink2, lineHeight: 24 }}>{listing.description}</Text>
        </View>

        <View style={{ alignItems: 'center', paddingBottom: spacing.s6 }}>
          <Pressable onPress={openReport} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="flag" size={14} color={hasReported(listing.id) ? colors.danger : colors.ink3} />
            <Text style={{ fontSize: 11, color: hasReported(listing.id) ? colors.danger : colors.ink3 }}>
              {hasReported(listing.id) ? 'اتبلّغ عن الإعلان ده' : 'بلّغ عن الإعلان ده'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s4, paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 + insets.bottom, flexDirection: 'row', gap: spacing.s2 }}>
        <View style={{ flex: 1 }}>
          <Button icon={<Icon name="chat" color="#fff" size={18} />} onPress={openChat}>
            راسل البائع
          </Button>
        </View>
        <Pressable
          onPress={() => router.push(`/call/${seller.id}`)}
          style={{ width: 52, height: 52, borderRadius: radius.r2, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="phone" color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

function MetaItem({ icon, text }: { icon: 'pin' | 'eye' | 'clock'; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name={icon} size={13} color={colors.ink3} />
      <Text style={{ fontSize: 11, color: colors.ink3 }}>{text}</Text>
    </View>
  );
}

const glassBtn = {
  width: 38,
  height: 38,
  borderRadius: 12,
  backgroundColor: 'rgba(255,255,255,.16)',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
