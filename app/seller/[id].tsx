/**
 * app/seller/[id].tsx — جديدة (مفيش شاشة بروفايل بائع عامة في الموك اب)،
 * مبنية من تركيبة .sellercard الموسّعة + .statbar + شبكة .gcard من
 * #profile و#home بالظبط، من غير أقسام المحفظة/التوثيق الخاصة بصاحب الحساب.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { GridCard } from '@/components/listing/GridCard';
import { Avatar } from '@/components/primitives/Avatar';
import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { useRequireAuth } from '@/lib/auth';
import { useRequireOnline } from '@/lib/connectivityGuard';
import { useAppStore, useDiscoverableListings, useSeller, useSellerReviews } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function SellerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  const submitReview = () =>
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
              <Button onPress={submitReview}>إرسال التقييم</Button>
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
