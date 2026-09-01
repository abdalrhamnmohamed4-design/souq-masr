/**
 * app/jobs/applications.tsx — طلباتي (PART 17/18): تابات بالحالة، تايم
 * لاين حقيقي لكل طلب.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from '@/mock/jobs/types';
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

export default function MyApplications() {
  const router = useRouter();
  const { colors, spacing, radius, brandDark } = useTheme();
  const applications = useJobsStore((s) => s.applications);
  const withdraw = useJobsStore((s) => s.withdrawApplication);
  const jobs = useAllJobs();
  const companies = useAllCompanies();
  const [tab, setTab] = useState<ApplicationStatus | 'all'>('all');
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف طلباتك', description: 'طلبات التقديم على الوظائف هتظهر هنا بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const visible = tab === 'all' ? applications : applications.filter((a) => a.status === tab);

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

      {visible.length === 0 ? (
        <EmptyState
          icon={<Icon name="doc" color={colors.ink3} size={26} />}
          title="مفيش طلبات هنا"
          description="لما تقدّم على وظيفة، هتلاقي طلبك هنا مع كل تحديثات حالته."
          actionLabel="استكشف الوظائف"
          onAction={() => router.push('/jobs')}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.s5, gap: spacing.s3 }}>
          {visible.map((a) => {
            const job = jobs.find((j) => j.id === a.jobId);
            const company = companies.find((c) => c.id === job?.companyId);
            return (
              <Pressable key={a.id} onPress={() => job && router.push(`/jobs/${job.id}`)} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{job?.title ?? 'وظيفة محذوفة'}</Text>
                    <Text style={{ fontSize: 11, color: colors.ink3, marginTop: 2 }}>{company?.name ?? '—'}</Text>
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
                        { text: 'سحب', style: 'destructive', onPress: () => withdraw(a.id) },
                      ])
                    }
                    style={{ marginTop: 8, alignSelf: 'flex-start' }}
                  >
                    <Text style={{ fontSize: 10.5, color: colors.danger, fontWeight: '700' }}>سحب الطلب</Text>
                  </Pressable>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
