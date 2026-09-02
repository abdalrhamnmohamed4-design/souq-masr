/**
 * app/saved-searches.tsx — عمليات بحث حقيقية بيحفظها المستخدم من شيت
 * الفلاتر في /results (احفظ عملية البحث دي). Phase 2B Slice 3: بقت
 * بتتخزّن على الباك إند الحقيقي (souq_masr.api.v1.saved_searches) —
 * السيرفر مصدر الحقيقة، مش store/useAppStore.ts's savedSearches المحلي
 * (لسه موجود في الـstore بنفسه، بس الشاشة دي مبقتش بتقرا منه).
 *
 * إصلاح (القسم 5 من الطلب: "Do not silently drop filters"): الاسترجاع
 * قبل كده كان بيبعت category/q بس لـ/results، وconditionFilter/
 * fieldFilters كانوا بيتفقدوا صامتين. دلوقتي بيتبعتوا كـquery params
 * إضافية (condition/filters) وresults.tsx بيقراهم على أول render.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { ApiStateView } from '@/components/ApiStateView';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { useApiResult } from '@/hooks/useApiResult';
import { deleteSavedSearch, getMySavedSearches } from '@/services/savedSearchService';
import { useTheme } from '@/theme/ThemeProvider';

export default function SavedSearches() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { state, refetch } = useApiResult(() => getMySavedSearches(), []);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف عمليات البحث المحفوظة', description: 'احفظ فلاتر بحثك المفضّلة وارجعلها بسهولة بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const savedSearches = state.kind === 'success' ? state.data : [];

  const activeFiltersCount = (s: (typeof savedSearches)[number]) =>
    (s.conditionFilter ? 1 : 0) + Object.keys(s.fieldFilters).length;

  const restore = (s: (typeof savedSearches)[number]) => {
    const params = new URLSearchParams();
    if (s.categoryId) params.set('category', s.categoryId);
    if (s.query) params.set('q', s.query);
    if (s.conditionFilter) params.set('condition', s.conditionFilter);
    if (Object.keys(s.fieldFilters).length > 0) params.set('filters', JSON.stringify(s.fieldFilters));
    const qs = params.toString();
    router.push(qs ? `/results?${qs}` : '/results');
  };

  const remove = async (id: string, label: string) => {
    setDeletingId(id);
    const r = await deleteSavedSearch(id);
    setDeletingId(null);
    if (r.status !== 'success') {
      Alert.alert('تعذّر الحذف', `حصلت مشكلة في حذف "${label}"، جرّب تاني.`);
      return;
    }
    refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="عمليات البحث المحفوظة" />
      {state.kind !== 'success' ? (
        <ApiStateView state={state} onRetry={refetch} />
      ) : savedSearches.length === 0 ? (
        <EmptyState
          icon={<Icon name="search" color={colors.ink3} size={26} />}
          title="لسه معندكش عمليات بحث محفوظة"
          description="من شاشة الفلاتر في نتائج البحث، دوس «احفظ عملية البحث دي» عشان ترجعلها بسهولة بعدين."
          actionLabel="استكشف الإعلانات"
          onAction={() => router.push('/results')}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.s5, gap: spacing.s3 }}>
          {savedSearches.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => restore(s)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: radius.r2, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="search" size={17} color={colors.signal2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{s.label}</Text>
                <Text style={{ fontSize: 10.5, color: colors.ink3, marginTop: 2 }}>
                  {activeFiltersCount(s) > 0 ? `${activeFiltersCount(s)} فلتر محفوظ` : 'من غير فلاتر إضافية'}
                </Text>
              </View>
              <Pressable
                disabled={deletingId === s.id}
                onPress={() =>
                  Alert.alert('حذف عملية البحث', `متأكد إنك عايز تحذف "${s.label}"؟`, [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'حذف', style: 'destructive', onPress: () => remove(s.id, s.label) },
                  ])
                }
                style={{ padding: 6 }}
              >
                {deletingId === s.id ? <ActivityIndicator size="small" color={colors.danger} /> : <Icon name="trash" size={17} color={colors.danger} />}
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
