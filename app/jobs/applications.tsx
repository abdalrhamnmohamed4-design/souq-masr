/**
 * app/jobs/applications.tsx — طلباتي (PART 17/18): تابات بالحالة، تايم
 * لاين حقيقي لكل طلب.
 *
 * Phase 2B — Jobs + Services Mobile Wiring: بيعرض دمج حقيقي — طلبات
 * حقيقية من get_my_applications (مُغنّاة بـjob_title/company_name/
 * company_id سيرفريًا، بديل عن useAllJobs()/useAllCompanies() اللي كانت
 * بتعمل client-side join لكل صف) + طلبات mock محلية لسه موجودة.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { ApiStateView } from '@/components/ApiStateView';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { useRequireOnline } from '@/lib/connectivityGuard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { useApiResult } from '@/hooks/useApiResult';
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from '@/mock/jobs/types';
import { getMyApplications, withdrawApplication as withdrawApplicationReal } from '@/services/jobApplicationService';
import { useAllCompanies, useAllJobs, useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

const TABS: { key: ApplicationStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'applied', label: 'اتقدّمت' },
  { key: 'viewed', label: 'اتشافت' },
  { key: 'shortlisted', label: 'مختصرة' },
  { key: 'interview', label: 'مقابلة' },
  { key: 'accepted', label: 'اتقبلت' },
  { key: 'rejected', label: 'اترفضت' },
  { key: 'withdrawn', label: 'اتسحبت' },
];

type DisplayApplication = {
  id: string;
  jobId: string | null;
  jobTitle: string | null;
  companyName: string | null;
  status: ApplicationStatus;
  appliedAt: string;
  isReal: boolean;
};

export default function MyApplications() {
  const router = useRouter();
  const { colors, spacing, radius, brandDark } = useTheme();
  const mockApplications = useJobsStore((s) => s.applications);
  const withdrawMock = useJobsStore((s) => s.withdrawApplication);
  const jobs = useAllJobs();
  const companies = useAllCompanies();
  const requireOnline = useRequireOnline();
  const [tab, setTab] = useState<ApplicationStatus | 'all'>('all');

  const { state: realState, refetch: refetchReal } = useApiResult(() => getMyApplications(undefined, 1, 100), []);
  const realItems = realState.kind === 'success' ? realState.data.items : [];

  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف طلباتك', description: 'طلبات التقديم على الوظائف هتظهر هنا بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const displayApplications: DisplayApplication[] = [
    ...realItems.map((a): DisplayApplication => ({
      id: a.id, jobId: a.job, jobTitle: a.jobTitle ?? null, companyName: a.companyName ?? null,
      status: a.status as ApplicationStatus, appliedAt: a.appliedAt, isReal: true,
    })),
    ...mockApplications.map((a): DisplayApplication => {
      const job = jobs.find((j) => j.id === a.jobId);
      const company = companies.find((c) => c.id === job?.companyId);
      return { id: a.id, jobId: job?.id ?? null, jobTitle: job?.title ?? null, companyName: company?.name ?? null, status: a.status, appliedAt: a.appliedAt, isReal: false };
    }),
  ];

  const visible = tab === 'all' ? displayApplications : displayApplications.filter((a) => a.status === tab);

  const withdraw = (a: DisplayApplication) => {
    if (!a.isReal) {
      withdrawMock(a.id);
      return;
    }
    requireOnline(async () => {
      const r = await withdrawApplicationReal(a.id);
      if (r.status !== 'success') {
        Alert.alert('تعذّر سحب الطلب', 'حصلت مشكلة، جرّب تاني.');
        return;
      }
      refetchReal();
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader
        title="طلباتي"
        onBack={() => router.back()}
        right={
          <Pressable onPress={() => router.push('/jobs/interviews')}>
            <Icon name="clock" color={colors.ink} />
          </Pressable>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: spacing.s5, paddingBottom: spacing.s3, alignItems: 'flex-start' }}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ alignSelf: 'flex-start', backgroundColor: tab === t.key ? brandDark : colors.card, borderWidth: 1, borderColor: tab === t.key ? brandDark : colors.line, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: tab === t.key ? '#fff' : colors.ink2 }}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {realState.kind !== 'success' && realState.kind !== 'loading' && realState.kind !== 'empty' ? (
        <View style={{ paddingHorizontal: spacing.s5, marginBottom: spacing.s3 }}>
          <ApiStateView state={realState} onRetry={refetchReal} />
        </View>
      ) : null}

      {realState.kind === 'loading' && displayApplications.length === 0 ? (
        <ApiStateView state={realState} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Icon name="doc" color={colors.ink3} size={26} />}
          title="مفيش طلبات هنا"
          description="لما تقدّم على وظيفة، هتلاقي طلبك هنا مع كل تحديثات حالته."
          actionLabel="استكشف الوظائف"
          onAction={() => router.push('/jobs')}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.s5, gap: spacing.s3 }}>
          {visible.map((a) => (
            <Pressable key={a.id} onPress={() => a.jobId && router.push(`/jobs/${a.jobId}`)} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{a.jobTitle ?? 'وظيفة محذوفة'}</Text>
                  <Text style={{ fontSize: 11, color: colors.ink3, marginTop: 2 }}>{a.companyName ?? '—'}</Text>
                </View>
                <View style={{ backgroundColor: colors.signalWash, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.signal2 }}>{APPLICATION_STATUS_LABELS[a.status]}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 10, color: colors.ink3, marginTop: 8 }}>
                اتقدّمت {new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long' }).format(new Date(a.appliedAt))}
              </Text>
              {a.status !== 'withdrawn' && a.status !== 'rejected' && a.status !== 'accepted' ? (
                <Pressable
                  onPress={() =>
                    Alert.alert('سحب الطلب', 'متأكد إنك عايز تسحب طلبك للوظيفة دي؟', [
                      { text: 'إلغاء', style: 'cancel' },
                      { text: 'سحب', style: 'destructive', onPress: () => withdraw(a) },
                    ])
                  }
                  style={{ marginTop: 8, alignSelf: 'flex-start' }}
                >
                  <Text style={{ fontSize: 10.5, color: colors.danger, fontWeight: '700' }}>سحب الطلب</Text>
                </Pressable>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
