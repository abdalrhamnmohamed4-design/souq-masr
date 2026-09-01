/**
 * app/services/index.tsx — رئيسية "المهن والخدمات" (PART 25/43): تجربة
 * منفصلة تمامًا عن سوق الوظائف — حرفيين وخدمات، مش شركات.
 */
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/primitives/EmptyState';
import { Pill } from '@/components/primitives/Pill';
import { getServiceCategories } from '@/mock/jobs/trades';
import { useAllServices, useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function ServicesHome() {
  const router = useRouter();
  const { colors, spacing, radius, brandDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const services = useAllServices();
  const myProfessionalProfile = useJobsStore((s) => s.professionalProfile);

  const active = services.filter((s) => s.status === 'active');

  const submitSearch = () => router.push(query.trim() ? `/services/results?q=${encodeURIComponent(query.trim())}` : '/services/results');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ paddingBottom: 140 }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: brandDark, paddingTop: insets.top + spacing.s3, paddingBottom: spacing.s5, paddingHorizontal: spacing.s4, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chev-r" color="#fff" />
          </Pressable>
          <Text style={{ flex: 1, fontFamily: 'Cairo_800ExtraBold', fontSize: 19, color: '#fff' }}>المهن والخدمات</Text>
        </View>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 6 }}>لاقي حرفي أو خدمة قريبة منك</Text>

        <View style={{ marginTop: spacing.s4, backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.s3 }}>
          <Icon name="search" size={16} color={colors.signal} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            placeholder="كهربائي، سباك، تنظيف..."
            placeholderTextColor={colors.ink3}
            returnKeyType="search"
            style={{ flex: 1, fontSize: 13.5, color: colors.ink, paddingVertical: 12 }}
          />
        </View>
      </View>

      <SectionHead title="المهن" onMore={() => router.push('/services/results')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.s4 }}>
        {getServiceCategories().map((c) => (
          <Pressable key={c.id} onPress={() => router.push(`/services/results?category=${c.id}`)} style={{ width: '31%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
            <Icon name={c.icon} color={colors.ink2} />
            <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '600', color: colors.ink2, marginTop: 6, textAlign: 'center' }}>{c.name}</Text>
          </Pressable>
        ))}
      </View>

      {active.length === 0 ? (
        <View style={{ marginTop: spacing.s5 }}>
          <EmptyState
            icon={<Icon name="tool" color={colors.ink3} size={26} />}
            title="لسه مفيش خدمات منشورة"
            description="لو بتقدّم خدمة أو مهنة، اعمل ملفك المهني وابدأ تستقبل عملاء."
            actionLabel="أنا محترف — ابدأ"
            onAction={() => router.push('/services/profile')}
          />
        </View>
      ) : (
        <>
          <SectionHead title="أحدث الخدمات" moreLabel="الكل" onMore={() => router.push('/services/results')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: spacing.s4, alignItems: 'flex-start' }}>
            {active.slice(0, 10).map((s) => (
              <Pressable key={s.id} onPress={() => router.push(`/services/${s.id}`)} style={{ width: 180, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}>
                <Text numberOfLines={2} style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink, height: 34 }}>{s.title}</Text>
                {s.price ? (
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.signal, marginTop: 6 }}>
                    {s.priceType === 'starting_from' ? 'يبدأ من ' : ''}{s.price.toLocaleString('en-US')} ج.م
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {s.serviceAreas.slice(0, 1).map((a) => <Pill key={a}>{a}</Pill>)}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      <View style={{ paddingHorizontal: spacing.s4, marginTop: spacing.s5, gap: spacing.s2 }}>
        <Pressable onPress={() => router.push('/services/profile')} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s4, flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}>
          <Icon name="id" color={colors.ink2} />
          <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: colors.ink2 }}>{myProfessionalProfile ? 'ملفي كمحترف' : 'إنشاء ملف محترف'}</Text>
          <Icon name="chev-l" size={15} color={colors.ink3} />
        </Pressable>
        {myProfessionalProfile ? (
          <>
            <Pressable onPress={() => router.push('/services/professional/me')} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s4, flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}>
              <Icon name="eye" color={colors.ink2} />
              <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: colors.ink2 }}>عرض ملفي العام</Text>
              <Icon name="chev-l" size={15} color={colors.ink3} />
            </Pressable>
            <Pressable onPress={() => router.push('/services/my-services')} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s4, flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}>
              <Icon name="tool" color={colors.ink2} />
              <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: colors.ink2 }}>إدارة خدماتي</Text>
              <Icon name="chev-l" size={15} color={colors.ink3} />
            </Pressable>
          </>
        ) : null}
        <Pressable onPress={() => router.push('/services/post')} style={{ backgroundColor: colors.signalWash, borderWidth: 1, borderColor: colors.signal, borderRadius: radius.r3, padding: spacing.s4, flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}>
          <Icon name="plus" color={colors.signal2} />
          <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: colors.signal2 }}>أضف خدمة جديدة</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function SectionHead({ title, moreLabel, onMore }: { title: string; moreLabel?: string; onMore?: () => void }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: spacing.s4, paddingTop: 18, paddingBottom: 10 }}>
      <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16, color: colors.ink }}>{title}</Text>
      {moreLabel ? (
        <Pressable onPress={onMore} style={{ marginLeft: 'auto' }}>
          <Text style={{ fontSize: 12, color: colors.signal, fontWeight: '600' }}>{moreLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
