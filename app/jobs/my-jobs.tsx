/**
 * app/jobs/my-jobs.tsx — إدارة وظائفي كصاحب عمل (PART 34): إيقاف/تشغيل/
 * إغلاق/حذف + عدد المتقدمين الحقيقي لكل وظيفة.
 *
 * Phase 2B — Jobs + Services Mobile Wiring: بيعرض دمج حقيقي — وظائف
 * حقيقية من get_my_jobs (السيرفر مصدر الحقيقة) + وظائف mock محلية لسه
 * موجودة، بنفس نمط app/(tabs)/myads.tsx بالظبط (DisplayJob مدموج،
 * isReal flag بيحدد إمّا نداء API حقيقي أو mutation محلي).
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
import { useApiResult } from '@/hooks/useApiResult';
import { useMyCompany } from '@/hooks/useMyCompany';
import { JOB_STATUS_LABELS, WORK_TYPE_LABELS, type JobStatus as MockJobStatus, type WorkType as MockWorkType } from '@/mock/jobs/types';
import { activateJob as activateJobReal, deleteJob as deleteJobReal, getMyJobs, pauseJob as pauseJobReal } from '@/services/jobService';
import { useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

type DisplayJob = {
  id: string;
  title: string;
  status: MockJobStatus;
  workType: MockWorkType;
  city: string;
  views: number;
  applicationsCount: number;
  isReal: boolean;
};

export default function MyJobs() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const userJobs = useJobsStore((s) => s.userJobs);
  const setJobStatus = useJobsStore((s) => s.setJobStatus);
  const removeJob = useJobsStore((s) => s.removeJob);
  const requireOnline = useRequireOnline();
  const company = useMyCompany();

  const { state: realState, refetch: refetchReal } = useApiResult(() => getMyJobs(undefined, 1, 100), []);
  const realItems = realState.kind === 'success' ? realState.data.items : [];

  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تدير وظائفك', description: 'إدارة الوظائف اللي نشرتها كصاحب عمل متاحة بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const displayJobs: DisplayJob[] = [
    ...realItems.map((r): DisplayJob => ({
      id: r.id, title: r.title, status: r.status as MockJobStatus, workType: r.workType as MockWorkType,
      city: r.city, views: r.views, applicationsCount: r.applicationsCount, isReal: true,
    })),
    ...userJobs.map((j): DisplayJob => ({
      id: j.id, title: j.title, status: j.status, workType: j.workType, city: j.city,
      views: j.views, applicationsCount: j.applicationsCount, isReal: false,
    })),
  ];

  const mutateReal = async (action: () => Promise<{ status: string }>, failTitle: string) => {
    const r = await action();
    if (r.status !== 'success') {
      Alert.alert(failTitle, 'حصلت مشكلة، جرّب تاني.');
      return;
    }
    refetchReal();
  };

  const myCompanyAny = company.any;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader
        title="وظائفي كصاحب عمل"
        right={
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <Pressable onPress={() => router.push('/jobs/my-company')}>
              <Icon name="office" color={colors.ink} />
            </Pressable>
            <Pressable onPress={() => router.push('/jobs/post')}>
              <Icon name="plus" color={colors.ink} />
            </Pressable>
          </View>
        }
      />
      {myCompanyAny ? (
        <Pressable
          onPress={() => router.push(`/jobs/company/${myCompanyAny.id}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2, marginHorizontal: spacing.s5, marginTop: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: spacing.s3 }}
        >
          <Icon name="office" size={16} color={colors.signal2} />
          <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: colors.ink2 }}>عرض ملف {myCompanyAny.name} العام</Text>
          <Icon name="chev-l" size={14} color={colors.ink3} />
        </Pressable>
      ) : null}

      {realState.kind !== 'success' && realState.kind !== 'loading' && realState.kind !== 'empty' ? (
        <View style={{ paddingHorizontal: spacing.s5, marginTop: spacing.s3 }}>
          <ApiStateView state={realState} onRetry={refetchReal} />
        </View>
      ) : null}

      {realState.kind === 'loading' && displayJobs.length === 0 ? (
        <ApiStateView state={realState} />
      ) : displayJobs.length === 0 ? (
        <EmptyState
          icon={<Icon name="office" color={colors.ink3} size={26} />}
          title="لسه معندكش وظائف منشورة"
          description="انشر وظيفتك الأولى وهتلاقي طلبات المتقدمين هنا."
          actionLabel="انشر وظيفة"
          onAction={() => router.push('/jobs/post')}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.s5, gap: spacing.s3 }}>
          {displayJobs.map((j) => (
            <View key={j.id} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, overflow: 'hidden' }}>
              <Pressable onPress={() => router.push(`/jobs/${j.id}`)} style={{ padding: spacing.s3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{j.title}</Text>
                  <View style={{ backgroundColor: colors.signalWash, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.signal2 }}>{JOB_STATUS_LABELS[j.status] ?? j.status}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: colors.ink3, marginTop: 3 }}>{WORK_TYPE_LABELS[j.workType] ?? j.workType} · {j.city}</Text>
                <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
                  <MiniStat icon="eye" value={j.views} />
                  <MiniStat icon="doc" value={j.applicationsCount} />
                </View>
              </Pressable>
              <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line2 }}>
                <RowAction icon="user" label="المتقدمون" onPress={() => router.push(`/jobs/applicants?jobId=${j.id}`)} />
                <RowAction icon="edit" label="عدّل" onPress={() => router.push(`/jobs/post?editId=${j.id}`)} />
                {j.status === 'published' || j.status === 'paused' ? (
                  <RowAction
                    icon="refresh"
                    label={j.status === 'published' ? 'إيقاف' : 'تفعيل'}
                    onPress={() =>
                      j.isReal
                        ? requireOnline(() =>
                            mutateReal(
                              () => (j.status === 'published' ? pauseJobReal(j.id) : activateJobReal(j.id)).then((r) => ({ status: r.status })),
                              j.status === 'published' ? 'تعذّر إيقاف الوظيفة' : 'تعذّر تفعيل الوظيفة',
                            ),
                          )
                        : setJobStatus(j.id, j.status === 'published' ? 'paused' : 'published')
                    }
                  />
                ) : null}
                <RowAction
                  icon="trash"
                  label="حذف"
                  tone="danger"
                  onPress={() =>
                    Alert.alert('حذف الوظيفة', `متأكد إنك عايز تحذف "${j.title}"؟`, [
                      { text: 'إلغاء', style: 'cancel' },
                      {
                        text: 'حذف',
                        style: 'destructive',
                        onPress: () =>
                          j.isReal
                            ? requireOnline(() => mutateReal(() => deleteJobReal(j.id).then((r) => ({ status: r.status })), 'تعذّر حذف الوظيفة'))
                            : removeJob(j.id),
                      },
                    ])
                  }
                />
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function MiniStat({ icon, value }: { icon: 'eye' | 'doc'; value: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name={icon} size={12} color={colors.ink3} />
      <Text style={{ fontSize: 10.5, color: colors.ink3 }}>{value}</Text>
    </View>
  );
}

function RowAction({ icon, label, onPress, tone }: { icon: 'user' | 'edit' | 'refresh' | 'trash'; label: string; onPress: () => void; tone?: 'danger' }) {
  const { colors } = useTheme();
  const fg = tone === 'danger' ? colors.danger : colors.ink2;
  return (
    <Pressable onPress={onPress} style={{ flex: 1, paddingVertical: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5, borderLeftWidth: 1, borderLeftColor: colors.line2 }}>
      <Icon name={icon} size={14} color={fg} />
      <Text style={{ fontSize: 10.5, fontWeight: '700', color: fg }}>{label}</Text>
    </Pressable>
  );
}
