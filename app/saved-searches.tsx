/**
 * app/saved-searches.tsx — كانت زرار ميت في البروفايل. عمليات بحث
 * حقيقية بيحفظها المستخدم من شيت الفلاتر في /results (احفظ عملية البحث
 * دي)، مخزّنة في store/useAppStore → savedSearches.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function SavedSearches() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const savedSearches = useAppStore((s) => s.savedSearches);
  const removeSavedSearch = useAppStore((s) => s.removeSavedSearch);
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف عمليات البحث المحفوظة', description: 'احفظ فلاتر بحثك المفضّلة وارجعلها بسهولة بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const activeFiltersCount = (s: (typeof savedSearches)[number]) =>
    (s.conditionFilter ? 1 : 0) + Object.keys(s.fieldFilters).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="عمليات البحث المحفوظة" />
      {savedSearches.length === 0 ? (
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
              onPress={() => {
                const params = new URLSearchParams();
                if (s.categoryId) params.set('category', s.categoryId);
                if (s.query) params.set('q', s.query);
                const qs = params.toString();
                router.push(qs ? `/results?${qs}` : '/results');
              }}
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
                onPress={() =>
                  Alert.alert('حذف عملية البحث', `متأكد إنك عايز تحذف "${s.label}"؟`, [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'حذف', style: 'destructive', onPress: () => removeSavedSearch(s.id) },
                  ])
                }
                style={{ padding: 6 }}
              >
                <Icon name="trash" size={17} color={colors.danger} />
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
