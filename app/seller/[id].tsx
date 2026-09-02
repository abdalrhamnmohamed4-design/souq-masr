/**
 * app/seller/[id].tsx — جديدة (مفيش شاشة بروفايل بائع عامة في الموك اب)،
 * مبنية من تركيبة .sellercard الموسّعة + .statbar + شبكة .gcard من
 * #profile و#home بالظبط، من غير أقسام المحفظة/التوثيق الخاصة بصاحب الحساب.
 *
 * Reviews vertical (Phase 2B): id بائع حقيقي (مش 'me'، مش بائع mock —
 * mock/users.ts's sellers دايمًا فاضي أصلًا) معناه بروفايل حقيقي من
 * souq_masr.api.v1.sellers.get_seller_profile — قبل كده الشاشة دي كانت
 * ميتة لأي بائع حقيقي (app/detail/[id].tsx كان بيودّي ليها فعلًا، بس
 * مفيش endpoint يجيب بياناته، فكانت دايمًا تعرض "البائع مش موجود").
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiStateView } from '@/components/ApiStateView';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { GridCard } from '@/components/listing/GridCard';
import { Avatar } from '@/components/primitives/Avatar';
import { Button } from '@/components/primitives/Button';
import { combineApiResultsTuple, useApiResult } from '@/hooks/useApiResult';
import { useRequireAuth } from '@/lib/auth';
import { useRequireOnline } from '@/lib/connectivityGuard';
import { startConversation } from '@/services/chatService';
import { getSellerListings } from '@/services/listingService';
import { deleteReview, getSellerReviews, hasReviewed, isRealSellerId, submitReview, type RealReview } from '@/services/reviewService';
import { getSellerProfile, type RealSellerProfile } from '@/services/sellerService';
import { useAppStore, useDiscoverableListings, useSeller, useSellerReviews } from '@/store/useAppStore';
import type { Listing } from '@/mock/listings';
import { useTheme } from '@/theme/ThemeProvider';

export default function SellerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isReal = isRealSellerId(id);

  return isReal ? <RealSellerProfileScreen id={id!} /> : <MockSellerProfileScreen id={id} />;
}

// ============================================================ REAL (Reviews vertical)
function RealSellerProfileScreen({ id }: { id: string }) {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const requireAuth = useRequireAuth();
  const requireOnline = useRequireOnline();

  const [rateOpen, setRateOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [existingReviewLoaded, setExistingReviewLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const { state, refetch } = useApiResult(
    () =>
      Promise.all([getSellerProfile(id), getSellerListings(id, 1, 24), getSellerReviews(id, 1, 30)]).then(
        ([profile, listings, reviews]) => combineApiResultsTuple([profile, listings, reviews]),
      ),
    [id],
  );

  useEffect(() => {
    if (state.kind !== 'success') return;
    hasReviewed(id).then((r) => {
      if (r.status === 'success' && r.data.has_reviewed) {
        setStars(r.data.rating ?? 5);
        setComment(r.data.comment ?? '');
      }
      setExistingReviewLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, state.kind]);

  if (state.kind !== 'success') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <ScreenHeader title="الملف الشخصي" onBack={() => router.back()} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ApiStateView state={state} onRetry={refetch} />
        </View>
      </View>
    );
  }

  const [profile, listingsPage, reviewsPage] = state.data as [
    RealSellerProfile,
    { items: Listing[]; total: number },
    { items: RealReview[]; total: number },
  ];
  const ads = listingsPage.items;
  const reviews = reviewsPage.items;
  const isMe = profile.isMe;

  const openRate = () => requireAuth(() => setRateOpen(true));

  const doSubmitReview = () =>
    requireOnline(async () => {
      setSubmitting(true);
      const r = await submitReview(id, stars, comment.trim());
      setSubmitting(false);
      if (r.status !== 'success') {
        Alert.alert('تعذّر إرسال التقييم', 'حصلت مشكلة، جرّب تاني.');
        return;
      }
      setRateOpen(false);
      refetch();
    });

  const doDeleteReview = () =>
    Alert.alert('حذف التقييم', 'متأكد إنك عايز تمسح تقييمك؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () =>
          requireOnline(async () => {
            await deleteReview(id);
            setStars(5);
            setComment('');
            refetch();
          }),
      },
    ]);

  const messageSeller = () =>
    requireAuth(() => {
      if (!ads[0]) return;
      if (startingChat) return;
      setStartingChat(true);
      startConversation(ads[0].id).then((r) => {
        setStartingChat(false);
        if (r.status === 'success') router.push(`/chat/${r.data.id}`);
      });
    });

  const myReview = reviews.find((r) => r.isMine);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="الملف الشخصي" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={{ alignItems: 'center', paddingHorizontal: spacing.s5 }}>
          <Avatar initials={profile.name.slice(0, 2)} size="xl" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.s4 }}>
            <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 16, color: colors.ink }}>{profile.name}</Text>
            {profile.verified ? <Icon name="shield" size={16} color={colors.verify} /> : null}
          </View>
          <Text style={{ fontSize: 11, color: colors.ink3, marginTop: 5 }}>{profile.memberSince ? `عضو من ${profile.memberSince}` : ''}</Text>
        </View>

        <View style={{ flexDirection: 'row', marginHorizontal: spacing.s5, marginTop: spacing.s5, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16 }}>
          {[
            [String(profile.adsCount), 'إعلان'],
            [profile.rating > 0 ? String(profile.rating) : '—', `تقييم (${profile.reviewCount})`],
          ].map(([v, l], i) => (
            <View key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.s3, borderLeftWidth: i < 1 ? 1 : 0, borderLeftColor: colors.line2 }}>
              <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 16, color: colors.ink }}>{v}</Text>
              <Text style={{ fontSize: 9.5, color: colors.ink3 }}>{l}</Text>
            </View>
          ))}
        </View>

        <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 15, color: colors.ink, paddingHorizontal: spacing.s5, paddingTop: spacing.s5, paddingBottom: spacing.s3 }}>
          إعلانات {profile.name}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s3, paddingHorizontal: spacing.s5 }}>
          {ads.length === 0 ? (
            <Text style={{ color: colors.ink3, fontSize: 12 }}>مفيش إعلانات نشطة للبائع ده دلوقتي.</Text>
          ) : (
            ads.map((l) => <GridCard key={l.id} listing={l} />)
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.s5, paddingTop: spacing.s5, paddingBottom: spacing.s3 }}>
          <Text style={{ flex: 1, fontFamily: 'Cairo_800ExtraBold', fontSize: 15, color: colors.ink }}>التقييمات ({profile.reviewCount})</Text>
          {!isMe && existingReviewLoaded ? (
            <Pressable onPress={openRate} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="star" size={14} color={colors.gold} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.signal }}>{myReview ? 'عدّل تقييمك' : 'قيّم البائع'}</Text>
            </Pressable>
          ) : null}
        </View>
        {reviews.length === 0 ? (
          <View style={{ paddingHorizontal: spacing.s5 }}>
            <Text style={{ fontSize: 12, color: colors.ink3 }}>لسه معندوش تقييمات.</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.s5, gap: spacing.s3 }}>
            {reviews.map((r) => (
              <View key={r.id} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: r.isMine ? colors.signal : colors.line, borderRadius: radius.r3, padding: spacing.s3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>
                    {r.reviewerName}
                    {r.isMine ? ' (تقييمك)' : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Icon key={n} name="star" size={12} color={n <= r.rating ? colors.gold : colors.line} />
                    ))}
                  </View>
                </View>
                {r.comment ? <Text style={{ fontSize: 11.5, color: colors.ink2, marginTop: 6, lineHeight: 18 }}>{r.comment}</Text> : null}
                {r.isMine ? (
                  <Pressable onPress={doDeleteReview} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 10.5, color: colors.danger }}>حذف تقييمي</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={rateOpen} transparent animationType="fade" onRequestClose={() => setRateOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,26,46,.5)', justifyContent: 'center', padding: spacing.s5 }} onPress={() => setRateOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.paper, borderRadius: radius.r3, padding: spacing.s5 }}>
            <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 15, color: colors.ink, marginBottom: spacing.s3, textAlign: 'center' }}>
              قيّم {profile.name}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.s4 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setStars(n)}>
                  <Icon name="star" size={28} color={n <= stars ? colors.gold : colors.line} />
                </Pressable>
              ))}
            </View>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="اكتب تعليقك (اختياري)"
              placeholderTextColor={colors.ink3}
              multiline
              style={{ minHeight: 70, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: spacing.s3, fontSize: 12.5, color: colors.ink, textAlignVertical: 'top' }}
            />
            <View style={{ marginTop: spacing.s4 }}>
              <Button onPress={doSubmitReview} disabled={submitting}>
                إرسال التقييم
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {!isMe && ads.length > 0 ? (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s4, paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 + insets.bottom }}>
          <Button icon={<Icon name="chat" color="#fff" size={18} />} onPress={messageSeller}>
            راسل {profile.name}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

// ============================================================ MOCK (كان موجود قبل كده، من غير تغيير)
function MockSellerProfileScreen({ id }: { id: string | undefined }) {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const startChatForListing = useAppStore((s) => s.startChatForListing);
  const addReview = useAppStore((s) => s.addReview);
  const myName = useAppStore((s) => s.onboarding.name);
  const allListings = useDiscoverableListings();
  const requireAuth = useRequireAuth();
  const requireOnline = useRequireOnline();
  const [rateOpen, setRateOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');

  const seller = useSeller(id);
  const reviews = useSellerReviews(id);
  if (!seller) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <Text style={{ color: colors.ink3 }}>البائع مش موجود</Text>
      </View>
    );
  }
  const ads = allListings.filter((l) => l.sellerId === seller.id);
  const isMe = seller.id === 'me';

  const submitReviewMock = () =>
    requireOnline(() => {
      addReview({ sellerId: seller.id, raterName: myName || 'مستخدم سوق مصر', rating: stars, comment: comment.trim() });
      setComment('');
      setStars(5);
      setRateOpen(false);
    });
  const openRate = () => requireAuth(() => setRateOpen(true));
  const messageSeller = () =>
    requireAuth(() => {
      if (ads[0]) {
        const chatId = startChatForListing(ads[0].id, seller.id);
        router.push(`/chat/${chatId}`);
      }
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="الملف الشخصي" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={{ alignItems: 'center', paddingHorizontal: spacing.s5 }}>
          <Avatar initials={seller.initials} size="xl" color={seller.avatarColor} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.s4 }}>
            <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 16, color: colors.ink }}>{seller.name}</Text>
            {seller.verified ? <Icon name="shield" size={16} color={colors.verify} /> : null}
          </View>
          <Text style={{ fontSize: 11, color: colors.ink3, marginTop: 5 }}>{seller.memberSince}</Text>
        </View>

        <View style={{ flexDirection: 'row', marginHorizontal: spacing.s5, marginTop: spacing.s5, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16 }}>
          {[
            [String(seller.adsCount), 'إعلان'],
            [seller.rating > 0 ? String(seller.rating) : '—', `تقييم (${reviews.length})`],
            [reviews.length > 0 ? `${seller.responseRate}%` : '—', 'معدل الرد'],
          ].map(([v, l], i) => (
            <View key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.s3, borderLeftWidth: i < 2 ? 1 : 0, borderLeftColor: colors.line2 }}>
              <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 16, color: colors.ink }}>{v}</Text>
              <Text style={{ fontSize: 9.5, color: colors.ink3 }}>{l}</Text>
            </View>
          ))}
        </View>

        <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 15, color: colors.ink, paddingHorizontal: spacing.s5, paddingTop: spacing.s5, paddingBottom: spacing.s3 }}>
          إعلانات {seller.name}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s3, paddingHorizontal: spacing.s5 }}>
          {ads.length === 0 ? (
            <Text style={{ color: colors.ink3, fontSize: 12 }}>مفيش إعلانات نشطة للبائع ده دلوقتي.</Text>
          ) : (
            ads.map((l) => <GridCard key={l.id} listing={l} />)
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.s5, paddingTop: spacing.s5, paddingBottom: spacing.s3 }}>
          <Text style={{ flex: 1, fontFamily: 'Cairo_800ExtraBold', fontSize: 15, color: colors.ink }}>التقييمات ({reviews.length})</Text>
          {!isMe ? (
            <Pressable onPress={openRate} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="star" size={14} color={colors.gold} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.signal }}>قيّم البائع</Text>
            </Pressable>
          ) : null}
        </View>
        {reviews.length === 0 ? (
          <View style={{ paddingHorizontal: spacing.s5 }}>
            <Text style={{ fontSize: 12, color: colors.ink3 }}>لسه معندوش تقييمات.</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.s5, gap: spacing.s3 }}>
            {reviews.map((r) => (
              <View key={r.id} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{r.raterName}</Text>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Icon key={n} name="star" size={12} color={n <= r.rating ? colors.gold : colors.line} />
                    ))}
                  </View>
                </View>
                {r.comment ? <Text style={{ fontSize: 11.5, color: colors.ink2, marginTop: 6, lineHeight: 18 }}>{r.comment}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={rateOpen} transparent animationType="fade" onRequestClose={() => setRateOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,26,46,.5)', justifyContent: 'center', padding: spacing.s5 }} onPress={() => setRateOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.paper, borderRadius: radius.r3, padding: spacing.s5 }}>
            <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 15, color: colors.ink, marginBottom: spacing.s3, textAlign: 'center' }}>
              قيّم {seller.name}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.s4 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setStars(n)}>
                  <Icon name="star" size={28} color={n <= stars ? colors.gold : colors.line} />
                </Pressable>
              ))}
            </View>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="اكتب تعليقك (اختياري)"
              placeholderTextColor={colors.ink3}
              multiline
              style={{ minHeight: 70, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: spacing.s3, fontSize: 12.5, color: colors.ink, textAlignVertical: 'top' }}
            />
            <View style={{ marginTop: spacing.s4 }}>
              <Button onPress={submitReviewMock}>إرسال التقييم</Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s4, paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 + insets.bottom }}>
        <Button icon={<Icon name="chat" color="#fff" size={18} />} onPress={messageSeller}>
          راسل {seller.name}
        </Button>
      </View>
    </View>
  );
}
