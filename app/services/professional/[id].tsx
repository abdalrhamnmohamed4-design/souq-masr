/**
 * app/services/professional/[id].tsx — صفحة المحترف العامة (PART 26).
 * 'me' بيرجع بروفايل المستخدم الحالي (المصدر الحقيقي الوحيد المتاح من
 * غير باك إند متعدد المستخدمين). مراجعة QA لقيت: مفيش مشاركة/مفضلة/بلاغ،
 * والشريط السفلي مكنش بيحسب safe-area، وكان ممكن تقيّم نفسك — كلهم اتصلحوا.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking } from 'react-native';
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/primitives/Button';
import { Pill } from '@/components/primitives/Pill';
import { getTrade } from '@/mock/jobs/trades';
import { useRequireAuth } from '@/lib/auth';
import { useRequireOnline } from '@/lib/connectivityGuard';
import type { JobsReportReason } from '@/mock/jobs/types';
import { useAllServices, useJobsReviewsFor, useJobsStore } from '@/store/useJobsStore';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

const REPORT_REASONS: { key: JobsReportReason; label: string }[] = [
  { key: 'fake', label: 'ملف وهمي' },
  { key: 'scam', label: 'نصب' },
  { key: 'spam', label: 'سبام' },
  { key: 'abusive', label: 'سلوك مسيء' },
  { key: 'incorrect_info', label: 'معلومات غلط' },
];

export default function ProfessionalProfilePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const storeProfile = useJobsStore((s) => s.professionalProfile);
  const services = useAllServices();
  const addReview = useJobsStore((s) => s.addJobsReview);
  const reportJobsTarget = useJobsStore((s) => s.reportJobsTarget);
  const hasReported = useJobsStore((s) => s.hasReportedJobsTarget);
  const isFav = useAppStore((s) => s.isFavorite);
  const toggleFav = useAppStore((s) => s.toggleFavorite);
  const requireAuth = useRequireAuth();
  const requireOnline = useRequireOnline();
  const [rateOpen, setRateOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');

  const profile = id === 'me' ? storeProfile : undefined;
  const reviews = useJobsReviewsFor('professional', id);

  if (!profile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <Text style={{ color: colors.ink3 }}>الملف مش موجود</Text>
      </View>
    );
  }

  const isMe = id === 'me';
  const trade = profile.tradeId ? getTrade(profile.tradeId) : undefined;
  const myServices = services.filter((s) => s.professionalSellerId === 'me' && s.status === 'active');
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const alreadyReported = hasReported('professional', id!);

  const shareProfile = () => Share.share({ message: `${profile.name} — محترف ${trade?.name ?? ''}\nعلى سوق مصر` });
  const toggleFavGuarded = () => requireAuth(() => toggleFav(`pro-${id}`), { type: 'favorite_service', serviceId: `pro-${id}` });
  const reportProfile = () =>
    requireAuth(() => {
      if (alreadyReported) {
        Alert.alert('اتبلّغ عن الملف ده', 'شكرًا، البلاغ بتاعك اتسجّل وهيتراجع.');
        return;
      }
      Alert.alert('بلّغ عن المحترف', 'اختار السبب', [
        ...REPORT_REASONS.map((r) => ({
          text: r.label,
          onPress: () => { reportJobsTarget('professional', id!, r.key); Alert.alert('شكرًا', 'اتسجّل البلاغ وهنراجعه.'); },
        })),
        { text: 'إلغاء', style: 'cancel' as const },
      ]);
    });
  const openRate = () => requireAuth(() => setRateOpen((v) => !v));

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader
        title="ملف المحترف"
        onBack={() => router.back()}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={shareProfile}>
              <Icon name="share" color={colors.ink} size={18} />
            </Pressable>
            {!isMe ? (
              <Pressable onPress={toggleFavGuarded}>
                <Icon name="heart" color={isFav(`pro-${id}`) ? colors.signal : colors.ink} size={18} />
              </Pressable>
            ) : null}
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 60 + insets.bottom }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 76, height: 76, borderRadius: 22, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {profile.photoUri ? <Image source={{ uri: profile.photoUri }} style={{ width: 76, height: 76 }} /> : <Icon name="user" size={28} color={colors.signal2} />}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.s3 }}>
            <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 16, color: colors.ink }}>{profile.name}</Text>
            {profile.verification === 'verified' ? <Icon name="shield" size={15} color={colors.verify} /> : null}
          </View>
          {trade ? <Text style={{ fontSize: 12, color: colors.ink3, marginTop: 2 }}>{trade.name}{profile.yearsExperience ? ` · ${profile.yearsExperience} سنين خبرة` : ''}</Text> : null}
          {avgRating ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Icon name="star" size={13} color={colors.gold} />
              <Text style={{ fontSize: 11.5, color: colors.ink3 }}>{avgRating} · {reviews.length} تقييم</Text>
            </View>
          ) : null}
        </View>

        <Text style={{ fontSize: 12.5, color: colors.ink2, lineHeight: 21, marginTop: spacing.s4, textAlign: 'center' }}>{profile.description}</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: spacing.s4 }}>
          {profile.serviceAreas.map((a) => <Pill key={a} icon={<Icon name="pin" size={11} color={colors.ink2} />}>{a}</Pill>)}
        </View>

        {profile.skills.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: spacing.s3 }}>
            {profile.skills.map((s) => <Pill key={s} tone="signal">{s}</Pill>)}
          </View>
        ) : null}

        {profile.priceStartingFrom ? (
          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s4, marginTop: spacing.s5, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: colors.ink3 }}>الأسعار تبدأ من</Text>
            <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 20, color: colors.ink, marginTop: 3 }}>{profile.priceStartingFrom.toLocaleString('en-US')} ج.م</Text>
          </View>
        ) : null}

        {myServices.length > 0 ? (
          <>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.ink, marginTop: spacing.s6, marginBottom: spacing.s3 }}>الخدمات ({myServices.length})</Text>
            {myServices.map((s) => (
              <Pressable key={s.id} onPress={() => router.push(`/services/${s.id}`)} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: spacing.s3, marginBottom: spacing.s2 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{s.title}</Text>
              </Pressable>
            ))}
          </>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.s6, marginBottom: spacing.s3 }}>
          <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.ink, flex: 1 }}>التقييمات ({reviews.length})</Text>
          {!isMe ? (
            <Pressable onPress={openRate}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.signal }}>قيّم المحترف</Text>
            </Pressable>
          ) : null}
        </View>
        {rateOpen ? (
          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3, marginBottom: spacing.s3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.s3 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setStars(n)}>
                  <Icon name="star" size={24} color={n <= stars ? colors.gold : colors.line} />
                </Pressable>
              ))}
            </View>
            <TextInput value={comment} onChangeText={setComment} placeholder="اكتب تجربتك (اختياري)" placeholderTextColor={colors.ink3} multiline style={{ minHeight: 60, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: spacing.s3, fontSize: 12, color: colors.ink, textAlignVertical: 'top', marginBottom: spacing.s3 }} />
            <Button
              size="sm"
              onPress={() =>
                requireOnline(() => {
                  addReview({ targetType: 'professional', targetId: id!, rating: stars, comment: comment.trim(), reviewerName: 'مستخدم سوق مصر' });
                  setComment('');
                  setStars(5);
                  setRateOpen(false);
                })
              }
            >
              إرسال التقييم
            </Button>
          </View>
        ) : null}
        {reviews.length === 0 ? <Text style={{ fontSize: 11.5, color: colors.ink3 }}>لسه معندوش تقييمات.</Text> : reviews.map((r) => (
          <View key={r.id} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: spacing.s3, marginBottom: spacing.s2 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{r.reviewerName}</Text>
            {r.comment ? <Text style={{ fontSize: 11, color: colors.ink2, marginTop: 5 }}>{r.comment}</Text> : null}
          </View>
        ))}

        {!isMe ? (
          <Pressable onPress={reportProfile} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: spacing.s4 }}>
            <Icon name="flag" size={13} color={alreadyReported ? colors.danger : colors.ink3} />
            <Text style={{ fontSize: 11, color: alreadyReported ? colors.danger : colors.ink3 }}>{alreadyReported ? 'اتبلّغ عن الملف ده' : 'بلّغ عن المحترف ده'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {profile.phone ? (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s4, paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 + insets.bottom, flexDirection: 'row', gap: spacing.s2 }}>
          <View style={{ flex: 1 }}>
            <Button icon={<Icon name="phone" color="#fff" size={16} />} onPress={() => Linking.openURL(`tel:${profile.phone}`)}>اتصال</Button>
          </View>
          {profile.whatsapp ? (
            <Pressable onPress={() => Linking.openURL(`https://wa.me/${profile.whatsapp}`)} style={{ width: 52, borderRadius: radius.r2, backgroundColor: colors.verify, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="wa" color="#fff" />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
