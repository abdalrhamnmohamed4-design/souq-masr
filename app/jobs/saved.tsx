/**
 * app/jobs/saved.tsx — الوظائف المحفوظة (PART 19).
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { Pill } from '@/components/primitives/Pill';
import { WORK_TYPE_LABELS } from '@/mock/jobs/types';
import { useAllCompanies, useAllJobs, useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function SavedJobsScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const savedJobs = useJobsStore((s) => s.savedJobs);
  const toggleSave = useJobsStore((s) => s.toggleSaveJob);
  const jobs = useAllJobs();
  const companies = useAllCompanies();
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف وظائفك المحفوظة', description: 'الوظائف اللي حفظتها هتظهر هنا بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const list = savedJobs.map((sv) => jobs.find((j) => j.id === sv.jobId)).filter((j) => !!j);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="الوظائف المحفوظة" onBack={() => router.back()} />
      {list.length === 0 ? (
        <EmptyState
          icon={<Icon name="heart" color={colors.ink3} size={26} />}
          title="لسه مفيش وظائف محفوظة"
          description="احفظ أي وظيفة عجباك وارجعلها بسهولة من هنا."
          actionLabel="استكشف الوظائف"
          onAction={() => router.push('/jobs')}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.s5, gap: spacing.s3 }}>
          {list.map((job) => {
            const company = companies.find((c) => c.id === job!.companyId);
            return (
              <Pressable key={job!.id} onPress={() => router.push(`/jobs/${job!.id}`)} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{job!.title}</Text>
                    <Text style={{ fontSize: 11, color: colors.ink3, marginTop: 2 }}>{company?.name ?? '—'} · {job!.city}</Text>
                  </View>
                  <Pressable onPress={() => toggleSave(job!.id)}>
                    <Icon name="heart" size={17} color={colors.signal} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                  <Pill>{WORK_TYPE_LABELS[job!.workType]}</Pill>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
