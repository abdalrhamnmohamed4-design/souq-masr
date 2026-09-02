/**
 * app/jobs/index.tsx — الرئيسية المخصصة لسوق "الوظائف" (PART 1 و43).
 * تجربة مستقلة عن السوق العام — لما المستخدم يفتح "الوظائف" لازم يحس إنه
 * دخل سوق وظائف احترافي متخصص. مفيش بيانات وهمية: كل قسم بيتحسب من
 * وظائف حقيقية اتنشرت فعليًا، وبيختفي لو مفيش بيانات كافية بدل ما يتلفّق.
 *
 * Phase 2B — Jobs + Services Mobile Wiring: كل قسم دلوقتي دمج حقيقي —
 * نداء search_jobs مستقل لكل قسم (نفس نمط app/(tabs)/home.tsx بالظبط،
 * فشل قسم واحد مش بيوقف الباقي) + وظائف mock محلية لسه موجودة مدموجة
 * جنبها. "وظائف مميزة"/"مرشّحة لمهنتك" فضلوا mock بس — مفيش is_featured
 * حقيقي على Souq Masr Job (نفس سابقة الإعلانات: مفيش نظام تمييز)، ومفيش
 * حقل مهنة على Career Profile الحقيقي (نطاق مختصر عمدًا). "شركات توظف
 * الآن" بقت من get_hiring_companies (تجميع سيرفري، مش fetch كل الوظائف
 * وتصفيتها محليًا).
 */
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/primitives/EmptyState';
import { Pill } from '@/components/primitives/Pill';
import { getJobCategories } from '@/mock/jobs/categories';
import { useApiResult } from '@/hooks/useApiResult';
import { useRequireAuth } from '@/lib/auth';
import { WORK_TYPE_LABELS, type WorkType } from '@/mock/jobs/types';
import { getHiringCompanies, searchJobs, type HiringCompany, type RealJobSummary } from '@/services/jobService';
import { getMySavedJobs, saveJob, unsaveJob } from '@/services/savedJobService';
import { useAllCompanies, useAllJobs, useJobsStore } from '@/store/useJobsStore';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

const QUICK_WORK_TYPES: WorkType[] = ['full_time', 'part_time', 'remote', 'freelance', 'internship'];

type DisplayJobCard = {
  id: string; title: string; companyName: string | null; city: string;
  isUrgent: boolean; salaryMin: number | null; salaryMax: number | null; salaryHidden: boolean; isReal: boolean;
};

function adaptReal(j: RealJobSummary): DisplayJobCard {
  return { id: j.id, title: j.title, companyName: null, city: j.city, isUrgent: j.isUrgent, salaryMin: j.salaryMin, salaryMax: j.salaryMax, salaryHidden: j.salaryHidden, isReal: true };
}

export default function JobsHome() {
  const router = useRouter();
  const { colors, spacing, radius, brandDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const allJobs = useAllJobs();
  const companies = useAllCompanies();
  const savedJobsMock = useJobsStore((s) => s.savedJobs);
  const toggleSaveMock = useJobsStore((s) => s.toggleSaveJob);
  const isSavedMock = useJobsStore((s) => s.isJobSaved);
  const careerProfile = useJobsStore((s) => s.careerProfile);
  const city = useAppStore((s) => s.onboarding.city);
  const requireAuth = useRequireAuth();

  const published = allJobs.filter((j) => j.status === 'published');
  const featured = published.filter((j) => j.isFeatured);
  const recommended = careerProfile?.professionId ? published.filter((j) => j.professionId === careerProfile.professionId) : [];
  const mockHiringCompanies = companies.filter((c) => published.some((j) => j.companyId === c.id));

  const adaptMock = (j: (typeof published)[number]): DisplayJobCard => ({
    id: j.id, title: j.title, companyName: companies.find((c) => c.id === j.companyId)?.name ?? null,
    city: j.city, isUrgent: j.isUrgent, salaryMin: j.salaryMin ?? null, salaryMax: j.salaryMax ?? null, salaryHidden: j.salaryHidden, isReal: false,
  });

  const { state: newestState } = useApiResult(() => searchJobs({ sort: 'newest', limit: 10 }), []);
  const { state: urgentState } = useApiResult(() => searchJobs({ isUrgent: true, limit: 10 }), []);
  const { state: remoteState } = useApiResult(() => searchJobs({ remote: true, limit: 10 }), []);
  const { state: nearbyState } = useApiResult(
    () => (city ? searchJobs({ city, limit: 10 }) : Promise.resolve({ status: 'success' as const, data: { items: [] as RealJobSummary[], total: 0 } })),
    [city],
  );
  const { state: hiringState } = useApiResult(() => getHiringCompanies(10), []);
  const { state: realSavedState, refetch: refetchRealSaved } = useApiResult(() => getMySavedJobs(), []);

  const realSavedIds = new Set(realSavedState.kind === 'success' ? realSavedState.data.items.map((j) => j.id) : []);
  const savedBadgeCount = savedJobsMock.length + realSavedIds.size;

  const newestRail: DisplayJobCard[] = [...(newestState.kind === 'success' ? newestState.data.items.map(adaptReal) : []), ...published.map(adaptMock)];
  const urgentRail: DisplayJobCard[] = [...(urgentState.kind === 'success' ? urgentState.data.items.map(adaptReal) : []), ...published.filter((j) => j.isUrgent).map(adaptMock)];
  const remoteRail: DisplayJobCard[] = [...(remoteState.kind === 'success' ? remoteState.data.items.map(adaptReal) : []), ...published.filter((j) => j.remote).map(adaptMock)];
  const nearbyRail: DisplayJobCard[] = city
    ? [...(nearbyState.kind === 'success' ? nearbyState.data.items.map(adaptReal) : []), ...published.filter((j) => j.city === city).map(adaptMock)]
    : [];
  const featuredRail: DisplayJobCard[] = featured.map(adaptMock);
  const recommendedRail: DisplayJobCard[] = recommended.map(adaptMock);

  type DisplayCompanyCard = { id: string; name: string; openJobs: number };
  const hiringCompaniesDisplay: DisplayCompanyCard[] = [
    ...(hiringState.kind === 'success' ? hiringState.data.items.map((c: HiringCompany) => ({ id: c.id, name: c.name, openJobs: c.openJobs })) : []),
    ...mockHiringCompanies.map((c) => ({ id: c.id, name: c.name, openJobs: published.filter((j) => j.companyId === c.id).length })),
  ];

  const isSaved = (item: DisplayJobCard) => (item.isReal ? realSavedIds.has(item.id) : isSavedMock(item.id));
  const toggleSave = (item: DisplayJobCard) =>
    requireAuth(() => {
      if (item.isReal) {
        (realSavedIds.has(item.id) ? unsaveJob(item.id) : saveJob(item.id)).then(() => refetchRealSaved());
        return;
      }
      toggleSaveMock(item.id);
    }, { type: 'save_job', jobId: item.id });

  const hasAnyJobs = newestState.kind === 'loading' || newestRail.length > 0;

  const submitSearch = () => router.push(query.trim() ? `/jobs/results?q=${encodeURIComponent(query.trim())}` : '/jobs/results');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ paddingBottom: 140 }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: brandDark, paddingTop: insets.top + spacing.s3, paddingBottom: spacing.s5, paddingHorizontal: spacing.s4, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chev-r" color="#fff" />
          </Pressable>
          <Text style={{ flex: 1, fontFamily: 'Cairo_800ExtraBold', fontSize: 19, color: '#fff' }}>الوظائف</Text>
          <Pressable onPress={() => router.push('/jobs/alerts')} style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bell" color="#fff" size={16} />
          </Pressable>
          <Pressable onPress={() => router.push('/jobs/saved')} style={{ position: 'relative' }}>
            <Icon name="heart" color="#fff" />
            {savedBadgeCount > 0 ? (
              <View style={{ position: 'absolute', top: -5, left: -6, backgroundColor: '#fff', minWidth: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: colors.signal }}>{savedBadgeCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 6 }}>دوّر على وظيفتك الجاية</Text>

        <View style={{ marginTop: spacing.s4, backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.s3 }}>
          <Icon name="search" size={16} color={colors.signal} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            placeholder="وظيفة، مهنة، أو شركة..."
            placeholderTextColor={colors.ink3}
            returnKeyType="search"
            style={{ flex: 1, fontSize: 13.5, color: colors.ink, paddingVertical: 12 }}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: spacing.s3, alignItems: 'flex-start' }}>
          {QUICK_WORK_TYPES.map((wt) => (
            <Pressable key={wt} onPress={() => router.push(`/jobs/results?workType=${wt}`)} style={{ backgroundColor: 'rgba(255,255,255,.12)', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{WORK_TYPE_LABELS[wt]}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <SectionHead title="الأقسام الوظيفية" onMore={() => router.push('/jobs/results')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.s4 }}>
        {getJobCategories().slice(0, 7).map((c) => (
          <Pressable key={c.id} onPress={() => router.push(`/jobs/results?category=${c.id}`)} style={{ width: '22.5%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}>
            <Icon name={c.icon} color={colors.ink2} />
            <Text numberOfLines={1} style={{ fontSize: 9.5, fontWeight: '600', color: colors.ink2, marginTop: 5, textAlign: 'center' }}>{c.name}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => router.push('/jobs/results')} style={{ width: '22.5%', backgroundColor: colors.signalWash, borderWidth: 1, borderColor: colors.signal, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}>
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.signal2, textAlign: 'center' }}>كل الأقسام</Text>
        </Pressable>
      </View>

      {!hasAnyJobs ? (
        <View style={{ marginTop: spacing.s5 }}>
          <EmptyState
            icon={<Icon name="office" color={colors.ink3} size={26} />}
            title="لسه مفيش وظائف منشورة"
            description="لو عندك شركة وعايز توظّف، انشر وظيفتك الأولى دلوقتي."
            actionLabel="انشر وظيفة"
            onAction={() => router.push('/jobs/post')}
          />
        </View>
      ) : (
        <>
          {recommendedRail.length > 0 ? <JobRail title="مرشّحة لمهنتك" items={recommendedRail} isSaved={isSaved} onToggleSave={toggleSave} /> : null}
          <JobRail title="أحدث الوظائف" items={newestRail} isSaved={isSaved} onToggleSave={toggleSave} moreLabel="الكل" onMore={() => router.push('/jobs/results')} />
          {featuredRail.length > 0 ? <JobRail title="وظائف مميزة" items={featuredRail} isSaved={isSaved} onToggleSave={toggleSave} /> : null}
          {urgentRail.length > 0 ? <JobRail title="وظائف عاجلة" items={urgentRail} isSaved={isSaved} onToggleSave={toggleSave} /> : null}
          {nearbyRail.length > 0 ? <JobRail title={`قريب منك — ${city}`} items={nearbyRail} isSaved={isSaved} onToggleSave={toggleSave} /> : null}
          {remoteRail.length > 0 ? <JobRail title="وظائف عن بُعد" items={remoteRail} isSaved={isSaved} onToggleSave={toggleSave} /> : null}

          {hiringCompaniesDisplay.length > 0 ? (
            <>
              <SectionHead title="شركات توظف الآن" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: spacing.s4, alignItems: 'flex-start' }}>
                {hiringCompaniesDisplay.map((c) => (
                  <Pressable key={c.id} onPress={() => router.push(`/jobs/company/${c.id}`)} style={{ width: 120, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 12, alignItems: 'center' }}>
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="office" size={20} color={colors.signal2} />
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginTop: 8, textAlign: 'center' }}>{c.name}</Text>
                    <Text style={{ fontSize: 9.5, color: colors.ink3, marginTop: 2 }}>{c.openJobs} وظيفة</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}
        </>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.s2, paddingHorizontal: spacing.s4, marginTop: spacing.s5 }}>
        <Pressable onPress={() => router.push('/jobs/profile')} style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3, alignItems: 'center', gap: 6 }}>
          <Icon name="id" color={colors.ink2} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink2 }}>ملفي المهني</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/jobs/applications')} style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3, alignItems: 'center', gap: 6 }}>
          <Icon name="doc" color={colors.ink2} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink2 }}>طلباتي</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/jobs/my-jobs')} style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3, alignItems: 'center', gap: 6 }}>
          <Icon name="office" color={colors.ink2} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink2 }}>وظائفي كصاحب عمل</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/jobs/interviews')} style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3, alignItems: 'center', gap: 6 }}>
          <Icon name="clock" color={colors.ink2} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink2 }}>مقابلاتي</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/services')} style={{ marginHorizontal: spacing.s4, marginTop: spacing.s3, backgroundColor: colors.goldWash, borderRadius: radius.r3, padding: spacing.s4, flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}>
        <Icon name="tool" color="#8A6300" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#8A6300' }}>بتدوّر على حرفي أو خدمة؟</Text>
          <Text style={{ fontSize: 10.5, color: '#8A6300' }}>افتح المهن والخدمات</Text>
        </View>
        <Icon name="chev-l" size={16} color="#8A6300" />
      </Pressable>
    </ScrollView>
  );
}

function SectionHead({ title, sub, moreLabel, onMore }: { title: string; sub?: string; moreLabel?: string; onMore?: () => void }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: spacing.s4, paddingTop: 18, paddingBottom: 10 }}>
      <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16, color: colors.ink }}>{title}</Text>
      {sub ? <Text style={{ fontSize: 11, color: colors.ink3 }}>{sub}</Text> : null}
      {moreLabel ? (
        <Pressable onPress={onMore} style={{ marginLeft: 'auto' }}>
          <Text style={{ fontSize: 12, color: colors.signal, fontWeight: '600' }}>{moreLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function JobRail({ title, items, isSaved, onToggleSave, moreLabel, onMore }: {
  title: string; items: DisplayJobCard[]; isSaved: (item: DisplayJobCard) => boolean; onToggleSave: (item: DisplayJobCard) => void;
  moreLabel?: string; onMore?: () => void;
}) {
  const router = useRouter();
  const { colors, radius, spacing } = useTheme();
  return (
    <>
      <SectionHead title={title} moreLabel={moreLabel} onMore={onMore} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: spacing.s4, alignItems: 'flex-start' }}>
        {items.slice(0, 10).map((j) => (
          <Pressable key={j.id} onPress={() => router.push(`/jobs/${j.id}`)} style={{ width: 220, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="office" size={16} color={colors.signal2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{j.title}</Text>
                <Text numberOfLines={1} style={{ fontSize: 10, color: colors.ink3 }}>{j.companyName ?? '—'}</Text>
              </View>
              <Pressable onPress={() => onToggleSave(j)}>
                <Icon name="heart" size={15} color={isSaved(j) ? colors.signal : colors.ink3} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
              <Pill>{j.city}</Pill>
              {j.isUrgent ? <Pill tone="signal">عاجلة</Pill> : null}
            </View>
            {!j.salaryHidden && j.salaryMin ? (
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink, marginTop: 8 }}>
                {j.salaryMin.toLocaleString('en-US')}{j.salaryMax ? ` - ${j.salaryMax.toLocaleString('en-US')}` : ''} ج.م
              </Text>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}
