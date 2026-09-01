/**
 * app/favorites.tsx — قائمة المفضلة الحقيقية (كانت زرار ميت في البروفايل
 * وأيقونة القلب في الرئيسية). بتعرض الإعلانات الحقيقية اللي المستخدم
 * ضغط عليها heart، من نفس مصدر useAllListings.
 *
 * إصلاح QA: زرار المفضلة على صفحة تفاصيل الخدمة (services/[id].tsx)
 * بيستخدم نفس الـfavorites Record ده (بمفتاح service.id) — قبل الإصلاح
 * كانت الخدمة المفضّلة بتختفي تمامًا هنا (الشاشة كانت بتفلتر على
 * الإعلانات بس)، يعني القلب بيتلوّن بس مفيش مكان تلاقيها فيه تاني.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { RowCard } from '@/components/listing/RowCard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { getServiceCategory } from '@/mock/jobs/trades';
import { useAllListings, useAppStore } from '@/store/useAppStore';
import { useAllServices } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function Favorites() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const favorites = useAppStore((s) => s.favorites);
  const allListings = useAllListings();
  const allServices = useAllServices();
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف المفضلة', description: 'قائمة الإعلانات والخدمات اللي حفظتها متاحة بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const favIds = Object.keys(favorites);
  const favListings = allListings.filter((l) => favIds.includes(l.id));
  const favServices = allServices.filter((s) => favIds.includes(s.id));
  const isEmpty = favListings.length === 0 && favServices.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="المفضلة" />
      {isEmpty ? (
        <EmptyState
          icon={<Icon name="heart" color={colors.ink3} size={26} />}
          title="لسه مفيش حاجة في المفضلة"
          description="اضغط على أيقونة القلب في أي إعلان عشان تحفظه هنا وترجعله بسهولة."
          actionLabel="استكشف الإعلانات"
          onAction={() => router.push('/results')}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: spacing.s2, paddingBottom: 40 }}>
          {favListings.map((l) => (
            <RowCard key={l.id} listing={l} />
          ))}
          {favServices.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push(`/services/${s.id}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3, marginHorizontal: spacing.s5, marginBottom: spacing.s3 }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={getServiceCategory(s.categoryId)?.icon ?? 'box'} size={18} color={colors.signal2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{s.title}</Text>
                <Text style={{ fontSize: 10.5, color: colors.ink3, marginTop: 2 }}>خدمة{s.price ? ` · ${s.price.toLocaleString('en-US')} ج.م` : ''}</Text>
              </View>
              <Icon name="chev-l" size={15} color={colors.ink3} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
