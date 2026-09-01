/**
 * app/jobs/results.tsx — بحث وفلترة الوظائف (PART 30). فلاتر حقيقية:
 * قسم، مهنة، مدينة، راتب، خبرة، نوع دوام، عن بُعد، شركة.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/primitives/Pill';
import { Button } from '@/components/primitives/Button';
import { getJobCategories, getJobCategory } from '@/mock/jobs/categories';
import { matchesQuery } from '@/lib/search';
import { useRequireAuth } from '@/lib/auth';
import { CAREER_LEVEL_LABELS, WORK_TYPE_LABELS, type CareerLevel, type Job, type WorkType } from '@/mock/jobs/types';
import { useAllCompanies, useAllJobs, useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

const SORTS = ['الأحدث', 'الأعلى راتبًا', 'الأقل خبرة مطلوبة'];

export default function JobsResults() {
  const params = useLocalSearchParams<{ q?: string; category?: string; workType?: string }>();
  const router = useRouter();
  const { colors, spacing, radius, brandDark } = useTheme();
  const insets = useSafeAreaInsets();
  const allJobs = useAllJobs();
  const companies = useAllCompanies();
  const toggleSave = useJobsStore((s) => s.toggleSaveJob);
  const isSaved = useJobsStore((s) => s.isJobSaved);
  const requireAuth = useRequireAuth();

  const [query, setQuery] = useState(params.q ?? '');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sort, setSort] = useState('الأحدث');
  const [categoryId, setCategoryId] = useState<string | null>(params.category ?? null);
  const [workType, setWorkType] = useState<WorkType | null>((params.workType as WorkType) ?? null);
  const [careerLevel, setCareerLevel] = useState<CareerLevel | null>(null);
  const [remoteOnly, setRemoteOnly] = useState(false);

  const category = categoryId ? getJobCategory(categoryId) : undefined;

  const results = useMemo(() => {
    let r = allJobs.filter((j) => j.status === 'published');
    if (query.trim()) {
      r = r.filter((j) => {
        const company = companies.find((c) => c.id === j.companyId)?.name ?? '';
        return matchesQuery(`${j.title} ${company} ${j.description}`, query);
      });
    }
    if (categoryId) r = r.filter((j) => j.categoryId === categoryId);
    if (workType) r = r.filter((j) => j.workType === workType);
    if (careerLevel) r = r.filter((j) => j.careerLevel === careerLevel);
    if (remoteOnly) r = r.filter((j) => j.remote);
    if (sort === 'الأعلى راتبًا') r.sort((a, b) => (b.salaryMax ?? b.salaryMin ?? 0) - (a.salaryMax ?? a.salaryMin ?? 0));
    if (sort === 'الأقل خبرة مطلوبة') r.sort((a, b) => (a.experienceYearsMin ?? 0) - (b.experienceYearsMin ?? 0));
    return r;
  }, [allJobs, companies, query, categoryId, workType, careerLevel, remoteOnly, sort]);

  const activeCount = (categoryId ? 1 : 0) + (workType ? 1 : 0) + (careerLevel ? 1 : 0) + (remoteOnly ? 1 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, paddingHorizontal: spacing.s5, paddingTop: insets.top + spacing.s3, paddingBottom: spacing.s2 }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: radius.r2, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chev-r" color={colors.ink} />
        </Pressable>
        <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 17, color: colors.ink }}>{category ? category.name : 'كل الوظائف'}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.s2, paddingHorizontal: spacing.s5, paddingBottom: spacing.s3 }}>
        <View style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, paddingHorizontal: spacing.s3, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="search" size={16} color={colors.ink3} />
          <TextInput value={query} onChangeText={setQuery} placeholder="وظيفة، مهنة، أو شركة..." placeholderTextColor={colors.ink3} style={{ flex: 1, fontSize: 12.5, color: colors.ink, paddingVertical: 11 }} />
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

      <Text style={{ fontSize: 11, color: colors.ink3, paddingHorizontal: spacing.s5, paddingBottom: spacing.s3 }}>{results.length} وظيفة</Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.s5, paddingBottom: 40, gap: spacing.s3 }}>
        {results.length === 0 ? (
          <Text style={{ textAlign: 'center', color: colors.ink3, fontSize: 12.5, paddingTop: 40 }}>مفيش وظائف مطابقة.</Text>
        ) : (
          results.map((j) => (
            <JobRow
              key={j.id}
              job={j}
              company={companies.find((c) => c.id === j.companyId)}
              onSave={() => requireAuth(() => toggleSave(j.id), { type: 'save_job', jobId: j.id })}
              saved={isSaved(j.id)}
            />
          ))
        )}
      </ScrollView>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,26,46,.5)', justifyContent: 'flex-end' }} onPress={() => setSheetOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 12, paddingBottom: 24 + insets.bottom, maxHeight: '85%' }}>
            <View style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: colors.line, alignSelf: 'center', marginBottom: spacing.s4 }} />
            <ScrollView>
              <FilterGroup title="القسم الوظيفي">
                {getJobCategories().map((c) => (
                  <FilterOpt key={c.id} label={c.name} active={categoryId === c.id} onPress={() => setCategoryId(categoryId === c.id ? null : c.id)} />
                ))}
              </FilterGroup>
              <FilterGroup title="نوع الدوام">
                {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((wt) => (
                  <FilterOpt key={wt} label={WORK_TYPE_LABELS[wt]} active={workType === wt} onPress={() => setWorkType(workType === wt ? null : wt)} />
                ))}
              </FilterGroup>
              <FilterGroup title="المستوى الوظيفي">
                {(Object.keys(CAREER_LEVEL_LABELS) as CareerLevel[]).map((cl) => (
                  <FilterOpt key={cl} label={CAREER_LEVEL_LABELS[cl]} active={careerLevel === cl} onPress={() => setCareerLevel(careerLevel === cl ? null : cl)} />
                ))}
              </FilterGroup>
              <FilterGroup title="">
                <FilterOpt label="عن بُعد بس" active={remoteOnly} onPress={() => setRemoteOnly((v) => !v)} />
              </FilterGroup>
              <FilterGroup title="الترتيب">
                {SORTS.map((s) => (
                  <FilterOpt key={s} label={s} active={sort === s} onPress={() => setSort(s)} />
                ))}
              </FilterGroup>
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: spacing.s2, paddingHorizontal: spacing.s5, paddingTop: spacing.s3, borderTopWidth: 1, borderTopColor: colors.line }}>
              <Button variant="ghost" size="sm" style={{ flex: 0, width: 110 }} onPress={() => { setCategoryId(null); setWorkType(null); setCareerLevel(null); setRemoteOnly(false); }}>
                امسح الكل
              </Button>
              <View style={{ flex: 1 }}>
                <Button onPress={() => setSheetOpen(false)}>اعرض {results.length} وظيفة</Button>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function JobRow({ job, company, onSave, saved }: { job: Job; company?: { name: string }; onSave: () => void; saved: boolean }) {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  return (
    <Pressable onPress={() => router.push(`/jobs/${job.id}`)} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s3 }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="office" size={18} color={colors.signal2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{job.title}</Text>
          <Text style={{ fontSize: 11, color: colors.ink3, marginTop: 2 }}>{company?.name ?? '—'} · {job.city}</Text>
        </View>
        <Pressable onPress={onSave}>
          <Icon name="heart" size={17} color={saved ? colors.signal : colors.ink3} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        <Pill>{WORK_TYPE_LABELS[job.workType]}</Pill>
        {job.remote ? <Pill tone="signal">عن بُعد</Pill> : null}
        {job.isUrgent ? <Pill tone="gold">عاجلة</Pill> : null}
        {!job.salaryHidden && job.salaryMin ? (
          <Pill>{`${job.salaryMin.toLocaleString('en-US')}${job.salaryMax ? `-${job.salaryMax.toLocaleString('en-US')}` : ''} ج.م`}</Pill>
        ) : null}
      </View>
    </Pressable>
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
