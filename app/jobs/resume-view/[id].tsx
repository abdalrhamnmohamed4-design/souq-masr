/**
 * app/jobs/resume-view/[id].tsx — عرض سيرة ذاتية متولّدة محفوظة.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { CVPreview } from '@/components/CVPreview';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function ResumeView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const careerProfile = useJobsStore((s) => s.careerProfile);
  const generated = careerProfile?.resume.generated.find((g) => g.id === id);
  // سيرة ذاتية = بيانات شخصية حساسة (القسم 8 من الطلب) — لازم تسجيل
  // دخول حتى لصاحبها نفسه، والأهم إنها مش متاحة لأي زائر بمجرد لينك.
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف السيرة الذاتية', description: 'السيرة الذاتية بيانات شخصية خاصة — متاحة بس لصاحبها بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  if (!careerProfile || !generated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <Text style={{ color: colors.ink3 }}>السيرة الذاتية مش موجودة</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title={generated.name} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 60 }}>
        <CVPreview profile={careerProfile} template={generated.template} />
      </ScrollView>
    </View>
  );
}
