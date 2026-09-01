/**
 * app/jobs/index.tsx — الرئيسية المخصصة لسوق "الوظائف" (PART 1 و43).
 * تجربة مستقلة عن السوق العام — لما المستخدم يفتح "الوظائف" لازم يحس إنه
 * دخل سوق وظائف احترافي متخصص. مفيش بيانات وهمية: كل قسم بيتحسب من
 * وظائف حقيقية اتنشرت فعليًا، وبيختفي لو مفيش بيانات كافية بدل ما يتلفّق.
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
import { useRequireAuth } from '@/lib/auth';
import { WORK_TYPE_LABELS, type Job, type WorkType } from '@/mock/jobs/types';
import { useAllCompanies, useAllJobs, useJobsStore } from '@/store/useJobsStore';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

const QUICK_WORK_TYPES: WorkType[] = ['full_time', 'part_time', 'remote', 'freelance', 'internship'];

export default function JobsHome() {
  const router = useRouter();
  const { colors, spacing, radius, brandDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const allJobs = useAllJobs();
  const companies = useAllCompanies();
  const savedJobs = useJobsStore((s) => s.savedJobs);
  const careerProfile = useJobsStore((s) => s.careerProfile);
  const city = useAppStore((s) => s.onboarding.city);

  const published = allJobs.filter((j) => j.status === 'published');
  const featured = published.filter((j) => j.isFeatured);
  const urgent = published.filter((j) => j.isUrgent);
  const remote = published.filter((j) => j.remote);
  const nearby = city ? published.filter((j) => j.city === city) : [];
  const recommended = careerProfile?.professionId
    ? published.filter((j) => j.professionId === careerProfile.professionId)
    : [];
  const hiringCompanies = companies.filter((c) => published.some((j) => j.companyId === c.id));

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
            {savedJobs.length > 0 ? (
              <View style={{ position: 'absolute', top: -5, left: -6, backgroundColor: '#fff', minWidth: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: colors.signal }}>{savedJobs.length}</Text>
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

      {published.length === 0 ? (
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
          {recommended.length > 0 ? <JobRail title="مرشّحة لمهنتك" jobs={recommended} companies={companies} /> : null}
          <JobRail title="أحدث الوظائف" jobs={published} companies={companies} moreLabel="الكل" onMore={() => router.push('/jobs/results')} />
          {featured.length > 0 ? <JobRail title="وظائف مميزة" jobs={featured} companies={companies} /> : null}
          {urgent.length > 0 ? <JobRail title="وظائف عاجلة" jobs={urgent} companies={companies} /> : null}
          {nearby.length > 0 ? <JobRail title={`قريب منك — ${city}`} jobs={nearby} companies={companies} /> : null}
          {remote.length > 0 ? <JobRail title="وظائف عن بُعد" jobs={remote} companies={companies} /> : null}

          {hiringCompanies.length > 0 ? (
            <>
              <SectionHead title="شركات توظف الآن" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: spacing.s4, alignItems: 'flex-start' }}>
                {hiringCompanies.map((c) => (
                  <Pressable key={c.id} onPress={() => router.push(`/jobs/company/${c.id}`)} style={{ width: 120, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 12, alignItems: 'center' }}>
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="office" size={20} color={colors.signal2} />
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginTop: 8, textAlign: 'center' }}>{c.name}</Text>
                    <Text style={{ fontSize: 9.5, color: colors.ink3, marginTop: 2 }}>{published.filter((j) => j.companyId === c.id).length} وظيفة</Text>
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

function JobRail({ title, jobs, companies, moreLabel, onMore }: { title: string; jobs: Job[]; companies: ReturnType<typeof useAllCompanies>; moreLabel?: string; onMore?: () => void }) {
  const router = useRouter();
  const { colors, radius, spacing } = useTheme();
  const toggleSave = useJobsStore((s) => s.toggleSaveJob);
  const isSaved = useJobsStore((s) => s.isJobSaved);
  const requireAuth = useRequireAuth();
  return (
    <>
      <SectionHead title={title} moreLabel={moreLabel} onMore={onMore} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: spacing.s4, alignItems: 'flex-start' }}>
        {jobs.slice(0, 10).map((j) => {
          const company = companies.find((c) => c.id === j.companyId);
          return (
            <Pressable key={j.id} onPress={() => router.push(`/jobs/${j.id}`)} style={{ width: 220, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="office" size={16} color={colors.signal2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{j.title}</Text>
                  <Text numberOfLines={1} style={{ fontSize: 10, color: colors.ink3 }}>{company?.name ?? '—'}</Text>
                </View>
                <Pressable onPress={() => requireAuth(() => toggleSave(j.id), { type: 'save_job', jobId: j.id })}>
                  <Icon name="heart" size={15} color={isSaved(j.id) ? colors.signal : colors.ink3} />
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
          );
        })}
      </ScrollView>
    </>
  );
}
