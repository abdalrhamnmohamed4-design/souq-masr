/**
 * app/results.tsx — يقابل #results + .sheet، بس الفلاتر بقت بتتولّد
 * ديناميكيًا من category.fields القابلة للفلترة (PART 10) — لو دخلت
 * الشاشة من غير تصنيف محدد (?category=) بتفضل فلاتر عامة بس (سعر/حالة).
 *
 * الترتيب (sort) بقى متخزّن كـ SortKey ثابت (مش النص العربي المعروض
 * نفسه زي قبل كده) — عشان التبديل للإنجليزي يغيّر النص المعروض بس،
 * مش الـstate/المقارنات الداخلية (lib/i18n وقت التبديل).
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiStateView } from '@/components/ApiStateView';
import { Icon } from '@/components/Icon';
import { RowCard } from '@/components/listing/RowCard';
import { Button } from '@/components/primitives/Button';
import { useApiResult } from '@/hooks/useApiResult';
import { useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import type { Listing } from '@/mock/listings';
// categoryLabel/fieldLabel: منتقيات تسمية بس بتشتغل على كائن Category/
// CategoryField اتجاب فعلًا (مش نداء بيانات). getCategory من الباك إند
// الحقيقي (Phase 2A) — بتحدد اسم/حقول التصنيف المعروضة. البحث والفلترة
// والترتيب نفسهم بقوا من searchListings الحقيقي (Phase 2B Slice 2) —
// التصنيف وفروعه بيتوسّعوا سيرفر-side (search_listings's category_key
// expansion، بيعيد استخدام get_descendant_ids)، مش محسوبين هنا محليًا.
import { categoryLabel, fieldLabel } from '@/mock/taxonomy/categories';
import { getCategory } from '@/services/taxonomyService';
import { searchListings } from '@/services/listingService';
import { useRequireAuth } from '@/lib/auth';
import { CONDITION_LABELS, conditionLabel, type CategoryField, type Condition } from '@/mock/taxonomy/types';
import { useTheme } from '@/theme/ThemeProvider';

type SortKey = 'newest' | 'cheapest' | 'priciest' | 'mostViewed' | 'nearest' | 'favoritesFirst';
const SORT_KEYS: SortKey[] = ['newest', 'cheapest', 'priciest', 'mostViewed', 'nearest', 'favoritesFirst'];
const SORT_TKEY: Record<SortKey, string> = {
  newest: 'results.sortNewest',
  cheapest: 'results.sortCheapest',
  priciest: 'results.sortPriciest',
  mostViewed: 'results.sortMostViewed',
  nearest: 'results.sortNearest',
  favoritesFirst: 'results.sortFavoritesFirst',
};

export default function Results() {
  const { category: categoryId, q } = useLocalSearchParams<{ category?: string; q?: string }>();
  const router = useRouter();
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const { colors, spacing, radius, brandDark } = useTheme();
  const insets = useSafeAreaInsets();
  const myCity = useAppStore((s) => s.onboarding.city);
  const favorites = useAppStore((s) => s.favorites);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>('newest');
  const [query, setQuery] = useState(q ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(q ?? '');
  const [conditionFilter, setConditionFilter] = useState<Condition | null>(null);
  const [fieldFilters, setFieldFilters] = useState<Record<string, string>>({});
  const addSavedSearch = useAppStore((s) => s.addSavedSearch);
  const requireAuth = useRequireAuth();

  const { state: categoryState, refetch: refetchCategory } = useApiResult(
    () => (categoryId ? getCategory(categoryId) : Promise.resolve({ status: 'success' as const, data: null })),
    [categoryId],
  );
  const category = categoryState.kind === 'success' ? categoryState.data ?? undefined : undefined;
  const categoryDisplayName = categoryId
    ? category
      ? categoryLabel(category, language)
      : t('common.loading')
    : t('results.allAds');
  const filterableFields: CategoryField[] = category?.fields.filter((f) => f.filterable && f.type === 'select') ?? [];

  // بحث حقيقي عبر الشبكة على كل ضغطة حرف مش منطقي (كان بحث محلي فوري
  // قبل كده) — debounce بسيط 300ms، نفس نمط CategoryStep's في
  // app/post/index.tsx بالظبط.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // nearest/favoritesFirst مش مدعومين سيرفر-side لسه (الأول محتاج
  // إحداثيات جهاز، والتاني محتاج نظام Favorites حقيقي — خارج نطاق
  // الشريحة دي بالكامل) — بيترتّبوا client-side على الصفحات المحمّلة
  // بس، موثّق في MOBILE_BACKEND_INTEGRATION_REPORT.md.
  const serverSort = sort === 'nearest' || sort === 'favoritesFirst' ? 'newest' : sort;

  const { state: searchState, refetch: refetchSearch } = useApiResult(
    () =>
      searchListings({
        q: debouncedQuery || undefined,
        categoryKey: categoryId,
        condition: conditionFilter ?? undefined,
        fieldFilters: Object.keys(fieldFilters).length > 0 ? fieldFilters : undefined,
        sort: serverSort,
        page: 1,
        limit: 20,
      }),
    [debouncedQuery, categoryId, conditionFilter, fieldFilters, serverSort],
  );

  // "تحميل المزيد" — تراكم يدوي، مش عن طريق useApiResult (ده استبدال مش
  // إضافة) — بيتصفّر كل ما مجموعة الفلاتر الفعلية تتغيّر.
  const [additionalItems, setAdditionalItems] = useState<Listing[]>([]);
  const [nextPage, setNextPage] = useState(2);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);

  useEffect(() => {
    setAdditionalItems([]);
    setNextPage(2);
    setLoadMoreFailed(false);
  }, [debouncedQuery, categoryId, conditionFilter, fieldFilters, serverSort]);

  const baseItems = searchState.kind === 'success' ? searchState.data.items : [];
  const totalResults = searchState.kind === 'success' ? searchState.data.total : 0;

  let results = [...baseItems, ...additionalItems];
  if (sort === 'nearest') results = [...results].sort((a, b) => Number(b.city === myCity) - Number(a.city === myCity));
  else if (sort === 'favoritesFirst') results = [...results].sort((a, b) => Number(!!favorites[b.id]) - Number(!!favorites[a.id]));

  const hasMore = results.length < totalResults;

  const loadMore = async () => {
    setLoadingMore(true);
    setLoadMoreFailed(false);
    const r = await searchListings({
      q: debouncedQuery || undefined,
      categoryKey: categoryId,
      condition: conditionFilter ?? undefined,
      fieldFilters: Object.keys(fieldFilters).length > 0 ? fieldFilters : undefined,
      sort: serverSort,
      page: nextPage,
      limit: 20,
    });
    setLoadingMore(false);
    if (r.status !== 'success') {
      setLoadMoreFailed(true);
      return;
    }
    setAdditionalItems((prev) => [...prev, ...r.data.items]);
    setNextPage((p) => p + 1);
  };

  const activeCount = (conditionFilter ? 1 : 0) + Object.keys(fieldFilters).length;
  const activeChips: { label: string; onRemove: () => void }[] = [
    ...(conditionFilter ? [{ label: conditionLabel(conditionFilter, language), onRemove: () => setConditionFilter(null) }] : []),
    ...Object.entries(fieldFilters).map(([key, value]) => ({
      label: value,
      onRemove: () => setFieldFilters((f) => { const next = { ...f }; delete next[key]; return next; }),
    })),
  ];

  const savedSearches = useAppStore((s) => s.savedSearches);
  const alreadySavedIdentical = savedSearches.some(
    (s) =>
      s.categoryId === (category?.id ?? null) &&
      s.query === query.trim() &&
      s.conditionFilter === conditionFilter &&
      JSON.stringify(s.fieldFilters) === JSON.stringify(fieldFilters),
  );

  const saveSearch = () =>
    requireAuth(() => {
      if (alreadySavedIdentical) return; // منع تكرار نفس معيار البحث (PART QA-fix)
      addSavedSearch({
        label: query.trim() ? `"${query.trim()}" — ${categoryDisplayName}` : categoryDisplayName,
        categoryId: category?.id ?? null,
        query: query.trim(),
        conditionFilter,
        fieldFilters,
      });
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, paddingHorizontal: spacing.s5, paddingTop: insets.top + spacing.s3, paddingBottom: spacing.s2 }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: radius.r2, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chev-r" color={colors.ink} />
        </Pressable>
        <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 18, color: colors.ink }}>{categoryDisplayName}</Text>
      </View>

      {categoryId && categoryState.kind !== 'success' ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ApiStateView state={categoryState} onRetry={refetchCategory} />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.s2, paddingHorizontal: spacing.s5, paddingBottom: spacing.s3 }}>
            <View style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, paddingVertical: 4, paddingHorizontal: spacing.s3, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="search" size={16} color={colors.ink3} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('results.searchIn', { category: categoryDisplayName })}
                placeholderTextColor={colors.ink3}
                style={{ flex: 1, fontSize: 12.5, color: colors.ink, paddingVertical: 8 }}
                returnKeyType="search"
              />
              {query ? (
                <Pressable onPress={() => setQuery('')}>
                  <Icon name="x" size={14} color={colors.ink3} />
                </Pressable>
              ) : null}
            </View>
            <Pressable onPress={() => setSheetOpen(true)} style={{ backgroundColor: brandDark, borderRadius: radius.r2, paddingHorizontal: spacing.s3, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="sliders" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{t('results.filter')}</Text>
              {activeCount > 0 ? (
                <View style={{ backgroundColor: colors.signal, borderRadius: 999, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 9 }}>{activeCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          {activeChips.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: spacing.s5, paddingBottom: spacing.s3, alignItems: 'flex-start' }}>
              {activeChips.map((f) => (
                <Pressable key={f.label} onPress={f.onRemove} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.signalWash, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.signal2 }}>{f.label}</Text>
                  <Icon name="x" size={12} color={colors.signal2} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.s5, paddingBottom: spacing.s3 }}>
            <Text style={{ fontSize: 11, color: colors.ink3 }}>{t('results.adsCount', { count: totalResults })}</Text>
            <Text style={{ fontSize: 11, color: colors.ink3 }}>{t(SORT_TKEY[sort] as Parameters<typeof t>[0])}</Text>
          </View>

          {searchState.kind !== 'success' ? (
            <ApiStateView state={searchState} onRetry={refetchSearch} />
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {results.length === 0 ? (
                <Text style={{ textAlign: 'center', color: colors.ink3, fontSize: 12.5, paddingTop: 40 }}>{t('results.noMatches')}</Text>
              ) : (
                <>
                  {results.map((l) => <RowCard key={l.id} listing={l} />)}
                  {hasMore ? (
                    <Pressable
                      onPress={loadMore}
                      disabled={loadingMore}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: spacing.s2 }}
                    >
                      {loadingMore ? (
                        <ActivityIndicator size="small" color={colors.signal} />
                      ) : (
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.signal }}>{t('results.loadMore')}</Text>
                      )}
                    </Pressable>
                  ) : null}
                  {loadMoreFailed ? (
                    <Text style={{ textAlign: 'center', color: colors.danger, fontSize: 11.5, paddingTop: 6, paddingBottom: 10 }}>{t('results.loadMoreFailed')}</Text>
                  ) : null}
                </>
              )}
            </ScrollView>
          )}
        </>
      )}

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,26,46,.5)', justifyContent: 'flex-end' }} onPress={() => setSheetOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: colors.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 12, paddingBottom: 24 + insets.bottom, maxHeight: '80%' }}
          >
            <View style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: colors.line, alignSelf: 'center', marginBottom: spacing.s4 }} />
            <ScrollView>
              <FilterGroup title={t('results.condition')}>
                {(Object.keys(CONDITION_LABELS) as Condition[]).map((c) => (
                  <FilterOpt key={c} label={conditionLabel(c, language)} active={conditionFilter === c} onPress={() => setConditionFilter(conditionFilter === c ? null : c)} />
                ))}
              </FilterGroup>

              {/* فلاتر ديناميكية حسب التصنيف — لو مفيش تصنيف محدد مبيظهروش خالص (PART 10: NEVER show irrelevant filters) */}
              {filterableFields.map((field) => (
                <FilterGroup key={field.key} title={fieldLabel(field, language)}>
                  {field.options?.map((opt) => (
                    <FilterOpt
                      key={opt}
                      label={opt}
                      active={fieldFilters[field.key] === opt}
                      onPress={() => setFieldFilters((f) => (f[field.key] === opt ? Object.fromEntries(Object.entries(f).filter(([k]) => k !== field.key)) : { ...f, [field.key]: opt }))}
                    />
                  ))}
                </FilterGroup>
              ))}

              <FilterGroup title={t('results.sortLabel')}>
                {SORT_KEYS.map((s) => (
                  <FilterOpt key={s} label={t(SORT_TKEY[s] as Parameters<typeof t>[0])} active={sort === s} onPress={() => setSort(s)} />
                ))}
              </FilterGroup>
            </ScrollView>
            <Pressable
              onPress={saveSearch}
              disabled={alreadySavedIdentical}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginHorizontal: spacing.s5, opacity: alreadySavedIdentical ? 0.6 : 1 }}
            >
              <Icon name="heart" size={14} color={colors.signal} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.signal }}>
                {alreadySavedIdentical ? t('results.alreadySaved') : t('results.saveSearch')}
              </Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: spacing.s2, paddingHorizontal: spacing.s5, paddingTop: spacing.s3, borderTopWidth: 1, borderTopColor: colors.line }}>
              <Button variant="ghost" size="sm" style={{ flex: 0, width: 110 }} onPress={() => { setConditionFilter(null); setFieldFilters({}); setSort('newest'); }}>
                {t('results.clearAll')}
              </Button>
              <View style={{ flex: 1 }}>
                <Button onPress={() => setSheetOpen(false)}>{t('results.showResults', { count: totalResults })}</Button>
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
      <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 12.5, color: colors.ink, marginBottom: spacing.s3 }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

function FilterOpt({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? colors.ink : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.ink : colors.line,
        borderRadius: radius.r1,
        paddingVertical: 8,
        paddingHorizontal: 13,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: active ? '#fff' : colors.ink }}>{label}</Text>
    </Pressable>
  );
}
