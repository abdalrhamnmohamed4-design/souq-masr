/**
 * app/services/results.tsx — بحث/فلترة الخدمات والمحترفين (PART 28/30):
 * نتيجة البحث بتفرّق بوضوح بين "خدمات" و"محترفين" — قسمين منفصلين.
 *
 * توحيد شريط البحث/الفلترة (طلب UX §13): نفس شكل app/results.tsx و
 * app/jobs/results.tsx بالظبط — [رجوع] [بحث] [فلترة + عدّاد]، وكل عناصر
 * الفلترة (قسم/مهنة/ترتيب) بقت جوه sheet سفلي واحد بدل صفوف تشيبس ثابتة
 * فوق الشاشة، بنفس FilterGroup/FilterOpt المستخدمين في الشاشتين التانيين.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/primitives/Pill';
import { Button } from '@/components/primitives/Button';
import { getServiceCategories, getServiceCategory, getTradesForCategory } from '@/mock/jobs/trades';
import { matchesQuery } from '@/lib/search';
import { useAllServices, useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

const SORTS = ['الأحدث', 'الأقل سعرًا', 'الأعلى سعرًا'];

export default function ServicesResults() {
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const router = useRouter();
  const { colors, spacing, radius, brandDark } = useTheme();
  const insets = useSafeAreaInsets();
  const services = useAllServices();
  const myProfile = useJobsStore((s) => s.professionalProfile);

  const [query, setQuery] = useState(params.q ?? '');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(params.category ?? null);
  const [tradeId, setTradeId] = useState<string | null>(null);
  const [sort, setSort] = useState(SORTS[0]);
  const category = categoryId ? getServiceCategory(categoryId) : undefined;
  const trades = categoryId ? getTradesForCategory(categoryId) : [];

  const filteredServices = useMemo(() => {
    let r = services.filter((s) => s.status === 'active');
    if (categoryId) r = r.filter((s) => s.categoryId === categoryId);
    if (tradeId) r = r.filter((s) => s.tradeId === tradeId);
    if (query.trim()) r = r.filter((s) => matchesQuery(`${s.title} ${s.description}`, query));
    if (sort === 'الأقل سعرًا') r.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    else if (sort === 'الأعلى سعرًا') r.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    return r;
  }, [services, categoryId, tradeId, query, sort]);

  // محترفين حقيقيين مطابقين — حاليًا مصدرهم الوحيد هو نفس المستخدم (بدون
  // باك إند) لو عنده ملف محترف نشط ومهنته أو خدماته مطابقة للبحث.
  const matchingProfessional = useMemo(() => {
    if (!myProfile) return null;
    if (categoryId && !filteredServices.some((s) => s.professionalSellerId === 'me')) return null;
    if (
      query.trim() &&
      !matchesQuery(myProfile.name, query) &&
      !matchesQuery(myProfile.description, query) &&
      !myProfile.skills.some((sk) => matchesQuery(sk, query))
    )
      return null;
    return myProfile;
  }, [myProfile, query, categoryId, filteredServices]);

  const activeCount = (categoryId ? 1 : 0) + (tradeId ? 1 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, paddingHorizontal: spacing.s5, paddingTop: insets.top + spacing.s3, paddingBottom: spacing.s2 }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: radius.r2, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chev-r" color={colors.ink} />
        </Pressable>
        <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 17, color: colors.ink }}>{category ? category.name : 'كل الخدمات'}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.s2, paddingHorizontal: spacing.s5, paddingBottom: spacing.s3 }}>
        <View style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, paddingHorizontal: spacing.s3, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="search" size={16} color={colors.ink3} />
          <TextInput value={query} onChangeText={setQuery} placeholder="مهنة أو خدمة..." placeholderTextColor={colors.ink3} style={{ flex: 1, fontSize: 12.5, color: colors.ink, paddingVertical: 11 }} />
        </View>
        <Pressable onPress={() => setSheetOpen(true)} style={{ backgroundColor: brandDark, borderRadius: radius.r2, paddingHorizontal: spacing.s3, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name="sliders" size={14} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>فلترة</Text>
          {activeCount > 0 ? (
            <View style={{ backgroundColor: colors.signal, borderRadius: 999, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 9 }}>{activeCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <Text style={{ fontSize: 11, color: colors.ink3, paddingHorizontal: spacing.s5, paddingBottom: spacing.s3 }}>{filteredServices.length} خدمة</Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.s5, paddingBottom: 40 }}>
        {matchingProfessional ? (
          <>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: colors.ink, marginBottom: spacing.s2 }}>محترفون</Text>
            <Pressable onPress={() => router.push('/services/professional/me')} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3, marginBottom: spacing.s4 }}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="user" size={18} color={colors.signal2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{matchingProfessional.name}</Text>
                <Text style={{ fontSize: 11, color: colors.ink3, marginTop: 2 }}>{matchingProfessional.yearsExperience ? `${matchingProfessional.yearsExperience} سنين خبرة` : ''}</Text>
              </View>
            </Pressable>
          </>
        ) : null}

        {filteredServices.length === 0 ? (
          <Text style={{ fontSize: 12, color: colors.ink3, paddingVertical: 20, textAlign: 'center' }}>مفيش خدمات مطابقة.</Text>
        ) : (
          filteredServices.map((s) => (
            <Pressable key={s.id} onPress={() => router.push(`/services/${s.id}`)} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3, marginBottom: spacing.s3 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{s.title}</Text>
              <Text numberOfLines={2} style={{ fontSize: 11, color: colors.ink3, marginTop: 3, lineHeight: 17 }}>{s.description}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {s.price ? <Pill tone="signal">{`${s.priceType === 'starting_from' ? 'من ' : ''}${s.price.toLocaleString('en-US')} ج.م`}</Pill> : null}
                {s.serviceAreas.slice(0, 2).map((a) => <Pill key={a}>{a}</Pill>)}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,26,46,.5)', justifyContent: 'flex-end' }} onPress={() => setSheetOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 12, paddingBottom: 24 + insets.bottom, maxHeight: '85%' }}>
            <View style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: colors.line, alignSelf: 'center', marginBottom: spacing.s4 }} />
            <ScrollView>
              <FilterGroup title="القسم">
                {getServiceCategories().map((c) => (
                  <FilterOpt
                    key={c.id}
                    label={c.name}
                    active={categoryId === c.id}
                    onPress={() => { setCategoryId(categoryId === c.id ? null : c.id); setTradeId(null); }}
                  />
                ))}
              </FilterGroup>
              {trades.length > 0 ? (
                <FilterGroup title="المهنة بالتحديد">
                  {trades.map((t) => (
                    <FilterOpt key={t.id} label={t.name} active={tradeId === t.id} onPress={() => setTradeId(tradeId === t.id ? null : t.id)} />
                  ))}
                </FilterGroup>
              ) : null}
              <FilterGroup title="الترتيب">
                {SORTS.map((s) => (
                  <FilterOpt key={s} label={s} active={sort === s} onPress={() => setSort(s)} />
                ))}
              </FilterGroup>
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: spacing.s2, paddingHorizontal: spacing.s5, paddingTop: spacing.s3, borderTopWidth: 1, borderTopColor: colors.line }}>
              <Button variant="ghost" size="sm" style={{ flex: 0, width: 110 }} onPress={() => { setCategoryId(null); setTradeId(null); setSort(SORTS[0]); }}>
                امسح الكل
              </Button>
              <View style={{ flex: 1 }}>
                <Button onPress={() => setSheetOpen(false)}>اعرض {filteredServices.length} خدمة</Button>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ paddingHorizontal: spacing.s5, paddingBottom: spacing.s4 }}>
      {title ? <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 12.5, color: colors.ink, marginBottom: spacing.s3 }}>{title}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

function FilterOpt({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: active ? colors.ink : colors.card, borderWidth: 1, borderColor: active ? colors.ink : colors.line, borderRadius: radius.r1, paddingVertical: 8, paddingHorizontal: 13 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: active ? '#fff' : colors.ink }}>{label}</Text>
    </Pressable>
  );
}
