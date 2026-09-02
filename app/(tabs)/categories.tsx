/**
 * app/(tabs)/categories.tsx — يقابل #cats: شبكة التصنيفات الرئيسية.
 *
 * Phase 2A: التصنيفات نفسها بقت بتيجي من الباك إند الحقيقي فعليًا
 * (services/taxonomyService.ts's getChildren()) بدل mock/taxonomy —
 * شوف MOBILE_BACKEND_INTEGRATION_REPORT.md. لسه بيستخدم
 * getAllDescendantIds() المحلي بس لعدّ الإعلانات (mock/local listings —
 * الإعلانات نفسها لسه في Phase 2B، مش هنا)؛ ده آمن لأن الـid بتاع كل
 * تصنيف مطابق حرفيًا بين mock والباك إند (نفس التصميم من الأول).
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ApiStateView } from '@/components/ApiStateView';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { IconButton } from '@/components/primitives/IconButton';
import { useApiResult } from '@/hooks/useApiResult';
import { useT } from '@/i18n';
import { useFabScrollHandler } from '@/lib/scrollFab';
import { categoryLabel, getAllDescendantIds } from '@/mock/taxonomy/categories';
import { getChildren } from '@/services/taxonomyService';
import { useDiscoverableListings } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useAllJobs, useAllServices } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function Categories() {
  const router = useRouter();
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const { colors, spacing, radius, brandDark } = useTheme();
  const fabScrollHandler = useFabScrollHandler();
  const { state: categoriesState, refetch: refetchCategories } = useApiResult(
    () => getChildren(),
    [],
    (data) => data.length === 0,
  );
  const allListings = useDiscoverableListings();
  const publishedJobsCount = useAllJobs().filter((j) => j.status === 'published').length;
  const activeServicesCount = useAllServices().filter((s) => s.status === 'active').length;

  const countFor = (id: string) => {
    const ids = new Set(getAllDescendantIds(id));
    return allListings.filter((l) => ids.has(l.categoryKey)).length;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader
        title={t('categoriesScreen.title')}
        showBack={false}
        right={
          <IconButton onPress={() => router.push('/results')}>
            <Icon name="search" color={colors.ink} />
          </IconButton>
        }
      />
      <Animated.ScrollView
        onScroll={fabScrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingHorizontal: spacing.s5,
          paddingBottom: 150,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.s3,
        }}
      >
        <Pressable
          onPress={() => router.push('/jobs')}
          style={{ width: '31%', backgroundColor: brandDark, borderRadius: radius.r3, paddingVertical: spacing.s3, alignItems: 'center' }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.s2 }}>
            <Icon name="office" color="#fff" size={22} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', textAlign: 'center' }}>{t('home.jobs')}</Text>
          <Text style={{ fontSize: 9, color: 'rgba(255,255,255,.7)', marginTop: 3 }}>{t('categoriesScreen.jobsCount', { count: publishedJobsCount.toLocaleString('en-US') })}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/services')}
          style={{ width: '31%', backgroundColor: colors.goldWash, borderWidth: 1, borderColor: '#F5E7B8', borderRadius: radius.r3, paddingVertical: spacing.s3, alignItems: 'center' }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(138,99,0,.12)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.s2 }}>
            <Icon name="tool" color="#8A6300" size={22} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A6300', textAlign: 'center' }}>{t('home.servicesAndCrafts')}</Text>
          <Text style={{ fontSize: 9, color: '#8A6300', marginTop: 3 }}>{t('categoriesScreen.servicesCount', { count: activeServicesCount.toLocaleString('en-US') })}</Text>
        </Pressable>
        {categoriesState.kind === 'success'
          ? categoriesState.data.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => router.push(`/category/${c.id}`)}
                style={{
                  width: '31%',
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.line,
                  borderRadius: radius.r3,
                  paddingVertical: spacing.s3,
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: colors.signalWash,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.s2,
                  }}
                >
                  <Icon name={c.icon} color={colors.signal2} size={22} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ink, textAlign: 'center' }}>{categoryLabel(c, language)}</Text>
                <Text style={{ fontSize: 9, color: colors.ink3, marginTop: 3 }}>{t('categoriesScreen.adsCount', { count: countFor(c.id).toLocaleString('en-US') })}</Text>
              </Pressable>
            ))
          : null}
      </Animated.ScrollView>
      {categoriesState.kind !== 'success' ? <ApiStateView state={categoriesState} onRetry={refetchCategories} /> : null}
    </View>
  );
}
