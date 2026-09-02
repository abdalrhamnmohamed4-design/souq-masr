/**
 * app/jobs/saved.tsx — الوظائف المحفوظة (PART 19).
 *
 * Phase 2B — Jobs + Services Mobile Wiring: get_my_saved_jobs بترجّع
 * دلوقتي كائنات وظيفة كاملة (بديل أسماء عارية) — الشاشة مش محتاجة تعمل
 * fetch لكل وظيفة محفوظة على حدة. اسم الشركة مش متوفر في RealJobSummary
 * (id بس)، فبيتعرض بدون اسم شركة للوظائف الحقيقية بدل ما نعمل نداء إضافي
 * لكل صف (N+1) لتفصيلة عرض بسيطة.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { ApiStateView } from '@/components/ApiStateView';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { useRequireOnline } from '@/lib/connectivityGuard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { Pill } from '@/components/primitives/Pill';
import { useApiResult } from '@/hooks/useApiResult';
import { WORK_TYPE_LABELS, type WorkType as MockWorkType } from '@/mock/jobs/types';
import { getMySavedJobs, unsaveJob } from '@/services/savedJobService';
import { useAllCompanies, useAllJobs, useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

type DisplaySavedJob = { id: string; title: string; workType: MockWorkType; city: string; companyName: string | null; isReal: boolean };

export default function SavedJobsScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const savedJobsMock = useJobsStore((s) => s.savedJobs);
  const toggleSaveMock = useJobsStore((s) => s.toggleSaveJob);
  const jobs = useAllJobs();
  const companies = useAllCompanies();
  const requireOnline = useRequireOnline();

  const { state: realState, refetch: refetchReal } = useApiResult(async () => {
    const r = await getMySavedJobs();
    if (r.status !== 'success') return r;
    return { status: 'success' as const, data: r.data.items };
  }, []);

  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف وظائفك المحفوظة', description: 'الوظائف اللي حفظتها هتظهر هنا بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const realItems = realState.kind === 'success' ? realState.data : [];
  const mockList = savedJobsMock.map((sv) => jobs.find((j) => j.id === sv.jobId)).filter((j): j is NonNullable<typeof j> => !!j);

  const list: DisplaySavedJob[] = [
    ...realItems.map((r): DisplaySavedJob => ({ id: r.id, title: r.title, workType: r.workType as MockWorkType, city: r.city, companyName: null, isReal: true })),
    ...mockList.map((job): DisplaySavedJob => ({
      id: job.id, title: job.title, workType: job.workType, city: job.city,
      companyName: companies.find((c) => c.id === job.companyId)?.name ?? null, isReal: false,
    })),
  ];

  const unsave = (item: DisplaySavedJob) => {
    if (!item.isReal) {
      toggleSaveMock(item.id);
      return;
    }
    requireOnline(async () => {
      const r = await unsaveJob(item.id);
      if (r.status !== 'success') {
        Alert.alert('تعذّر إلغاء الحفظ', 'حصلت مشكلة، جرّب تاني.');
        return;
      }
      refetchReal();
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="الوظائف المحفوظة" onBack={() => router.back()} />

      {realState.kind !== 'success' && realState.kind !== 'loading' && realState.kind !== 'empty' ? (
        <View style={{ paddingHorizontal: spacing.s5, marginTop: spacing.s3 }}>
          <ApiStateView state={realState} onRetry={refetchReal} />
        </View>
      ) : null}

      {realState.kind === 'loading' && list.length === 0 ? (
        <ApiStateView state={realState} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Icon name="heart" color={colors.ink3} size={26} />}
          title="لسه مفيش وظائف محفوظة"
          description="احفظ أي وظيفة عجباك وارجعلها بسهولة من هنا."
          actionLabel="استكشف الوظائف"
          onAction={() => router.push('/jobs')}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.s5, gap: spacing.s3 }}>
          {list.map((job) => (
            <Pressable key={job.id} onPress={() => router.push(`/jobs/${job.id}`)} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{job.title}</Text>
                  <Text style={{ fontSize: 11, color: colors.ink3, marginTop: 2 }}>{job.companyName ? `${job.companyName} · ` : ''}{job.city}</Text>
                </View>
                <Pressable onPress={() => unsave(job)}>
                  <Icon name="heart" size={17} color={colors.signal} />
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                <Pill>{WORK_TYPE_LABELS[job.workType] ?? job.workType}</Pill>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

