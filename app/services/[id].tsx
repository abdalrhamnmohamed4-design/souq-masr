/**
 * app/services/[id].tsx — تفاصيل الخدمة (PART 27). مراجعة QA لقيت: مفيش
 * مشاركة ولا مفضلة ولا بلاغ خالص هنا (موجودين في تفاصيل الإعلان العادي
 * والوظيفة بس مش هنا) + الشريط السفلي مكنش بيحسب safe-area — الاتنين
 * اتصلحوا.
 */
import { Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/primitives/Button';
import { Pill } from '@/components/primitives/Pill';
import { getServiceCategory, getTrade } from '@/mock/jobs/trades';
import { useRequireAuth } from '@/lib/auth';
import type { JobsReportReason } from '@/mock/jobs/types';
import { useJobsStore, useServiceById } from '@/store/useJobsStore';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

const PRICE_TYPE_LABEL = { fixed: '', starting_from: 'يبدأ من', hourly: '/ساعة', negotiable: 'قابل للتفاوض' } as const;

const REPORT_REASONS: { key: JobsReportReason; label: string }[] = [
  { key: 'fake', label: 'خدمة وهمية' },
  { key: 'scam', label: 'نصب' },
  { key: 'wrong_category', label: 'تصنيف غلط' },
  { key: 'duplicate', label: 'خدمة مكررة' },
  { key: 'prohibited', label: 'محتوى ممنوع' },
  { key: 'spam', label: 'سبام' },
  { key: 'abusive', label: 'مقدّم خدمة مسيء' },
  { key: 'incorrect_info', label: 'معلومات غلط' },
];

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const service = useServiceById(id);
  const myProfile = useJobsStore((s) => s.professionalProfile);
  const reportJobsTarget = useJobsStore((s) => s.reportJobsTarget);
  const hasReported = useJobsStore((s) => s.hasReportedJobsTarget);
  const isFav = useAppStore((s) => s.isFavorite);
  const toggleFav = useAppStore((s) => s.toggleFavorite);
  const requireAuth = useRequireAuth();

  if (!service) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <Text style={{ color: colors.ink3 }}>الخدمة مش موجودة</Text>
      </View>
    );
  }

  const category = getServiceCategory(service.categoryId);
  const trade = service.tradeId ? getTrade(service.tradeId) : undefined;
  const provider = service.professionalSellerId === 'me' ? myProfile : undefined;
  const activeOffer = !!service.offerPrice && (!service.offerEndsAt || new Date(service.offerEndsAt) > new Date());
  const alreadyReported = hasReported('service', service.id);

  const shareService = () => Share.share({ message: `${service.title}\nعلى سوق مصر` });
  const toggleFavGuarded = () => requireAuth(() => toggleFav(service.id), { type: 'favorite_service', serviceId: service.id });
  const reportService = () =>
    requireAuth(() => {
      if (alreadyReported) {
        Alert.alert('اتبلّغ عن الخدمة دي', 'شكرًا، البلاغ بتاعك اتسجّل وهيتراجع.');
        return;
      }
      Alert.alert('بلّغ عن الخدمة', 'اختار السبب', [
        ...REPORT_REASONS.map((r) => ({
          text: r.label,
          onPress: () => { reportJobsTarget('service', service.id, r.key); Alert.alert('شكرًا', 'اتسجّل البلاغ وهنراجعه.'); },
        })),
        { text: 'إلغاء', style: 'cancel' as const },
      ]);
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader
        title="تفاصيل الخدمة"
        onBack={() => router.back()}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={shareService}>
              <Icon name="share" color={colors.ink} size={18} />
            </Pressable>
            <Pressable onPress={toggleFavGuarded}>
              <Icon name="heart" color={isFav(service.id) ? colors.signal : colors.ink} size={18} />
            </Pressable>
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 110 + insets.bottom }}>
        {service.imageUris.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: spacing.s4 }}>
            {service.imageUris.map((uri) => <Image key={uri} source={{ uri }} style={{ width: 160, height: 120, borderRadius: radius.r2 }} />)}
          </ScrollView>
        ) : null}

        <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 17, color: colors.ink }}>{service.title}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.s2 }}>
          {category ? <Pill>{category.name}</Pill> : null}
          {trade ? <Pill>{trade.name}</Pill> : null}
        </View>

        {activeOffer ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: spacing.s4 }}>
              <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 22, color: colors.signal }}>
                {service.offerPrice!.toLocaleString('en-US')} <Text style={{ fontSize: 12, color: colors.ink3 }}>ج.م</Text>
              </Text>
              <Text style={{ fontSize: 13, color: colors.ink3, textDecorationLine: 'line-through' }}>{service.price!.toLocaleString('en-US')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Icon name="flame" size={12} color={colors.signal} />
              <Text style={{ fontSize: 10.5, color: colors.signal2 }}>
                عرض لحد {new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long' }).format(new Date(service.offerEndsAt!))}
              </Text>
            </View>
          </>
        ) : service.price ? (
          <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 22, color: colors.ink, marginTop: spacing.s4 }}>
            {PRICE_TYPE_LABEL[service.priceType] && service.priceType !== 'hourly' ? `${PRICE_TYPE_LABEL[service.priceType]} ` : ''}
            {service.price.toLocaleString('en-US')} <Text style={{ fontSize: 12, color: colors.ink3 }}>ج.م{service.priceType === 'hourly' ? '/ساعة' : ''}</Text>
          </Text>
        ) : (
          <Text style={{ fontSize: 13, color: colors.ink3, marginTop: spacing.s4 }}>السعر بعد المعاينة</Text>
        )}

        <Text style={{ fontSize: 12.5, color: colors.ink2, lineHeight: 22, marginTop: spacing.s4 }}>{service.description}</Text>

        {service.serviceAreas.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.s4 }}>
            {service.serviceAreas.map((a) => <Pill key={a} icon={<Icon name="pin" size={11} color={colors.ink2} />}>{a}</Pill>)}
          </View>
        ) : null}

        {provider ? (
          <Pressable onPress={() => router.push(`/services/professional/${service.professionalSellerId}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3, marginTop: spacing.s5 }}>
            <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="user" size={18} color={colors.signal2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{provider.name}</Text>
              <Text style={{ fontSize: 10.5, color: colors.ink3, marginTop: 2 }}>عرض الملف الكامل</Text>
            </View>
            <Icon name="chev-l" size={15} color={colors.ink3} />
          </Pressable>
        ) : null}

        <Pressable onPress={reportService} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: spacing.s4 }}>
          <Icon name="flag" size={13} color={alreadyReported ? colors.danger : colors.ink3} />
          <Text style={{ fontSize: 11, color: alreadyReported ? colors.danger : colors.ink3 }}>{alreadyReported ? 'اتبلّغ عن الخدمة دي' : 'بلّغ عن الخدمة دي'}</Text>
        </Pressable>
      </ScrollView>

      {provider?.phone ? (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s4, paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 + insets.bottom }}>
          <Button icon={<Icon name="phone" color="#fff" size={16} />} onPress={() => Linking.openURL(`tel:${provider.phone}`)}>
            اتصال بمقدّم الخدمة
          </Button>
        </View>
      ) : null}
    </View>
  );
}
