/**
 * app/analytics.tsx — لوحة تحليلات البائع (PART 33، جزء "Seller"). أرقام
 * حقيقية بس: المشاهدات بتزيد فعليًا كل ما حد يفتح صفحة تفاصيل إعلانك
 * (useAppStore → incrementListingViews)، والمحادثات من نفس سجل الشات
 * الحقيقي. مفيش "المفضلة اللي جاتلك" هنا لأن ده رقم مش هيبقى له معنى
 * حقيقي غير لما يبقى فيه مستخدمين حقيقيين تانيين (بعد الـERP).
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function Analytics() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const myAds = useAppStore((s) => s.myAds);
  const conversations = useAppStore((s) => s.conversations);
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف التحليلات', description: 'تحليلات إعلاناتك (المشاهدات والمحادثات) متاحة بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const totalViews = myAds.reduce((sum, a) => sum + a.views, 0);
  const activeCount = myAds.filter((a) => a.status === 'active').length;
  const featuredCount = myAds.filter((a) => a.isFeatured).length;
  const adsWithChat = myAds.filter((a) => conversations.some((c) => c.listingId === a.id));

  if (myAds.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <ScreenHeader title="تحليلات إعلاناتي" onBack={() => router.back()} />
        <EmptyState
          icon={<Icon name="info" color={colors.ink3} size={26} />}
          title="لسه معندكش إعلانات"
          description="أول ما تنشر إعلان، هتلاقي هنا مشاهداته ومحادثاته لحظة بلحظة."
          actionLabel="انشر إعلان"
          onAction={() => router.push('/post')}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="تحليلات إعلاناتي" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s3 }}>
          <StatCard icon="eye" label="إجمالي المشاهدات" value={totalViews} color={colors.signal} />
          <StatCard icon="box" label="إعلانات نشطة" value={activeCount} color={colors.verify} />
          <StatCard icon="chat" label="إعلانات فيها محادثات" value={adsWithChat.length} color={colors.gold} />
          <StatCard icon="star" label="إعلانات مميزة" value={featuredCount} color={colors.signal2} />
        </View>

        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.ink, marginTop: spacing.s6, marginBottom: spacing.s3 }}>
          الأداء لكل إعلان
        </Text>
        {myAds.map((ad) => {
          const conv = conversations.find((c) => c.listingId === ad.id);
          return (
            <View key={ad.id} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3, marginBottom: spacing.s3 }}>
              <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{ad.title}</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                <MetricInline icon="eye" value={ad.views} label="مشاهدة" />
                <MetricInline icon="chat" value={conv?.bubbles.length ?? 0} label="رسالة" />
                {ad.isFeatured ? <MetricInline icon="star" value={1} label="مميز" color={colors.gold} /> : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, color }: { icon: IconName; label: string; value: number; color: string }) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ width: '47%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: 14 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: `${color}1A`, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <Icon name={icon} size={17} color={color} />
      </View>
      <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 20, color: colors.ink, fontVariant: ['tabular-nums'] }}>{value.toLocaleString('en-US')}</Text>
      <Text style={{ fontSize: 10.5, color: colors.ink3, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function MetricInline({ icon, value, label, color }: { icon: IconName; value: number; label: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name={icon} size={13} color={color ?? colors.ink3} />
      <Text style={{ fontSize: 11, color: colors.ink3, fontVariant: ['tabular-nums'] }}>{value} {label}</Text>
    </View>
  );
}
