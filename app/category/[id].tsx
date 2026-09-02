/**
 * app/category/[id].tsx — متصفّح التصنيفات التدريجي (PART 36): مبيعرضش
 * الشجرة كلها مرة واحدة — بيوريك بس فروع التصنيف الحالي، ولو التصنيف
 * ورقة (leaf) بيودّي على طول لنتائج البحث مفلترة بيه.
 *
 * Phase 2A: بيقرأ من الباك إند الحقيقي بالكامل دلوقتي (services/
 * taxonomyService.ts) — get_category + get_children + get_path مع بعض
 * بـPromise.al واحد (hooks/useApiResult.ts's combineApiResultsTuple).
 * قرار "هل الابن ده ليه أبناء ولا leaf؟" بقى بيتاخد من is_group الراجع
 * فعليًا مع get_children نفسه (Category.isGroup) بدل ما نعمل نداء إضافي
 * منفصل لكل ابن زي ما كان حاصل مع mock (get_children(c.id).length > 0) —
 * نفس المعلومة، من غير أي نداء زيادة.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ApiStateView } from '@/components/ApiStateView';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { combineApiResultsTuple, useApiResult } from '@/hooks/useApiResult';
import { getCategory, getChildren, getPath } from '@/services/taxonomyService';
import type { ApiResult } from '@/types/frappeApi';
import type { Category } from '@/mock/taxonomy/types';
import { useTheme } from '@/theme/ThemeProvider';

type CategoryPage = {
  category: Category;
  children: Category[];
  path: { id: string; name: string }[];
};

async function fetchCategoryPage(id: string): Promise<ApiResult<CategoryPage>> {
  const [catR, childR, pathR] = await Promise.all([getCategory(id), getChildren(id), getPath(id)]);
  const combined = combineApiResultsTuple<[Category, Category[], { id: string; name: string }[]]>([catR, childR, pathR]);
  if (combined.status !== 'success') return combined;
  const [category, children, path] = combined.data;
  return { status: 'success', data: { category, children, path } };
}

export default function CategoryBrowser() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();

  const { state, refetch } = useApiResult<CategoryPage>(
    () => (id ? fetchCategoryPage(id) : Promise.resolve({ status: 'not_found' })),
    [id],
  );

  const isLeaf = state.kind === 'success' && state.data.children.length === 0;

  useEffect(() => {
    if (state.kind === 'success' && isLeaf) {
      router.replace(`/results?category=${state.data.category.id}`);
    }
  }, [state, isLeaf, router]);

  if (state.kind !== 'success') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <ScreenHeader title="" onBack={() => router.back()} />
        <ApiStateView state={state} onRetry={refetch} />
      </View>
    );
  }

  if (isLeaf) return null; // هيتحول لنتائج البحث فورًا (useEffect فوق)

  const { category, children, path } = state.data;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title={category.name} onBack={() => router.back()} />
      {path.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5, paddingHorizontal: spacing.s5, paddingBottom: spacing.s3, alignItems: 'center' }}>
          {path.map((p, i) => (
            <React.Fragment key={p.id}>
              {i > 0 ? <Icon name="chev-l" size={11} color={colors.ink3} /> : null}
              <Pressable onPress={() => router.push(`/category/${p.id}`)}>
                <Text style={{ fontSize: 11.5, color: i === path.length - 1 ? colors.ink : colors.signal, fontWeight: '600' }}>{p.name}</Text>
              </Pressable>
            </React.Fragment>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingTop: 0, gap: spacing.s3 }}>
        {children.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push(c.isGroup ? `/category/${c.id}` : `/results?category=${c.id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={c.icon} color={colors.signal2} size={22} />
            </View>
            <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.ink }}>{c.name}</Text>
            <Icon name="chev-l" size={16} color={colors.ink3} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
