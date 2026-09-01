/**
 * app/jobs/interviews.tsx — مقابلاتي (PART 33): المقابلات المجدولة
 * للمستخدم كمتقدّم.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { Pill } from '@/components/primitives/Pill';
import type { Interview } from '@/mock/jobs/types';
import { useAllJobs, useCompanyById, useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

const MODE_LABEL = { online: 'أونلاين', in_person: 'حضوري' } as const;
const STATUS_LABEL = { scheduled: 'مجدولة', completed: 'اتعملت', cancelled: 'اتلغت' } as const;

export default function MyInterviews() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const interviews = useJobsStore((s) => s.interviews);
  const jobs = useAllJobs();
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف مقابلاتك', description: 'المقابلات المجدولة هتظهر هنا بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const mine = interviews.filter((iv) => iv.candidateSellerId === 'me').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="مقابلاتي" onBack={() => router.back()} />
      {mine.length === 0 ? (
        <EmptyState
          icon={<Icon name="clock" color={colors.ink3} size={26} />}
          title="لسه مفيش مقابلات مجدولة"
          description="لما شركة تجدولك مقابلة على أي طلب، هتلاقيها هنا."
          actionLabel="طلباتي"
          onAction={() => router.push('/jobs/applications')}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.s5, gap: spacing.s3 }}>
          {mine.map((iv) => {
            const job = jobs.find((j) => j.id === iv.jobId);
            return (
              <InterviewRow key={iv.id} interview={iv} jobTitle={job?.title} companyId={job?.companyId} onPress={() => job && router.push(`/jobs/${job.id}`)} />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function InterviewRow({ interview, jobTitle, companyId, onPress }: { interview: Interview; jobTitle?: string; companyId?: string; onPress: () => void }) {
  const { colors, spacing, radius } = useTheme();
  const company = useCompanyById(companyId);
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{jobTitle ?? 'وظيفة'}</Text>
          <Text style={{ fontSize: 11, color: colors.ink3, marginTop: 2 }}>{company?.name ?? '—'}</Text>
        </View>
        <Pill tone={interview.status === 'scheduled' ? 'signal' : 'neutral'}>{STATUS_LABEL[interview.status]}</Pill>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
        <Icon name="clock" size={14} color={colors.ink3} />
        <Text style={{ fontSize: 11.5, color: colors.ink2 }}>
          {new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(interview.date))} · {interview.time}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        <Pill>{MODE_LABEL[interview.mode]}</Pill>
        {interview.location ? <Pill icon={<Icon name="pin" size={11} color={colors.ink2} />}>{interview.location}</Pill> : null}
      </View>
      {interview.notes ? <Text style={{ fontSize: 11, color: colors.ink3, marginTop: 8, lineHeight: 17 }}>{interview.notes}</Text> : null}
    </Pressable>
  );
}
