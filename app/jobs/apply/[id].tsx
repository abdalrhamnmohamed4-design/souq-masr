/**
 * app/jobs/apply/[id].tsx — التقديم على وظيفة (PART 17). المستخدم مش
 * مجبر يعمل ملف مهني كامل قبل ما يتصفّح — لو لسه مالوش بيانات أساسية
 * بيكملها هنا بس (اسم/تليفون)، مش كل تفاصيل الـCareer Profile.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { useRequireOnline } from '@/lib/connectivityGuard';
import { Button } from '@/components/primitives/Button';
import { Chip } from '@/components/primitives/Chip';
import { FormField } from '@/components/primitives/FormField';
import { isValidEgyptianPhone, isValidEmail } from '@/lib/validation';
import { useCompanyById, useJobById, useJobsStore } from '@/store/useJobsStore';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function ApplyToJob() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const job = useJobById(id);
  const company = useCompanyById(job?.companyId);
  const onboarding = useAppStore((s) => s.onboarding);
  const careerProfile = useJobsStore((s) => s.careerProfile);
  const ensureCareerProfile = useJobsStore((s) => s.ensureCareerProfile);
  const updateCareerProfile = useJobsStore((s) => s.updateCareerProfile);
  const applyToJob = useJobsStore((s) => s.applyToJob);

  const [fullName, setFullName] = useState(careerProfile?.fullName || onboarding.name || '');
  const [phone, setPhone] = useState(careerProfile?.phone || onboarding.phone || '');
  const [email, setEmail] = useState(careerProfile?.email || '');
  const primaryFile = careerProfile?.resume.files.find((f) => f.isPrimary)?.id;
  const [selectedResume, setSelectedResume] = useState<{ type: 'file' | 'generated'; id: string } | undefined>(
    primaryFile ? { type: 'file', id: primaryFile } : undefined,
  );
  const [coverLetter, setCoverLetter] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const requireOnline = useRequireOnline();
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تقدّم على الوظيفة', description: 'التقديم على وظائف محتاج حساب مسجّل عشان تقدر تتابع طلبك.' });
  if (authBlock) return authBlock;

  if (!job) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <Text style={{ color: colors.ink3 }}>الوظيفة مش موجودة</Text>
      </View>
    );
  }

  const canSubmit = fullName.trim().length >= 2 && isValidEgyptianPhone(phone);
  const resumeFiles = careerProfile?.resume.files ?? [];
  const generatedResumes = careerProfile?.resume.generated ?? [];

  const submit = () =>
    requireOnline(() => {
      ensureCareerProfile();
      updateCareerProfile({ fullName: fullName.trim(), phone: phone.trim(), email: email.trim() || undefined });
      applyToJob(
        job.id,
        selectedResume?.type === 'file' ? selectedResume.id : undefined,
        selectedResume?.type === 'generated' ? selectedResume.id : undefined,
        coverLetter.trim() || undefined,
      );
      setSubmitted(true);
    });

  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.s6 }}>
        <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: colors.verifyWash, borderWidth: 1, borderColor: colors.verify, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.s4 }}>
          <Icon name="check" size={30} color={colors.verify} />
        </View>
        <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 16, color: colors.ink, textAlign: 'center' }}>اتقدّمت للوظيفة بنجاح</Text>
        <Text style={{ fontSize: 12.5, color: colors.ink3, textAlign: 'center', marginTop: spacing.s2, lineHeight: 20 }}>
          هيوصلك إشعار أول ما {company?.name ?? 'الشركة'} تراجع طلبك.
        </Text>
        <View style={{ marginTop: spacing.s6, gap: spacing.s2, width: '100%' }}>
          <Button onPress={() => router.replace('/jobs/applications')}>طلباتي</Button>
          <Button variant="ghost" onPress={() => router.replace(`/jobs/${job.id}`)}>رجوع للوظيفة</Button>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="التقديم على الوظيفة" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 130 + insets.bottom }}>
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3, marginBottom: spacing.s5 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{job.title}</Text>
          <Text style={{ fontSize: 11, color: colors.ink3, marginTop: 2 }}>{company?.name ?? '—'} · {job.city}</Text>
        </View>

        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13.5, color: colors.ink, marginBottom: spacing.s3 }}>بيانات التواصل</Text>
        <FormField label="الاسم بالكامل" placeholder="اكتب اسمك" value={fullName} onChangeText={setFullName} />
        <FormField label="رقم الموبايل" placeholder="01xxxxxxxxx" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        {phone.trim().length > 0 && !isValidEgyptianPhone(phone) ? (
          <Text style={{ fontSize: 11, color: colors.danger, marginTop: -8, marginBottom: spacing.s4 }}>رقم موبايل مصري غير صحيح</Text>
        ) : null}
        <FormField label="الإيميل (اختياري)" placeholder="name@email.com" keyboardType="email-address" value={email} onChangeText={setEmail} />
        {email.trim().length > 0 && !isValidEmail(email) ? (
          <Text style={{ fontSize: 11, color: colors.danger, marginTop: -8, marginBottom: spacing.s4 }}>شكل الإيميل غلط</Text>
        ) : null}

        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13.5, color: colors.ink, marginBottom: spacing.s3, marginTop: spacing.s2 }}>السيرة الذاتية</Text>
        {resumeFiles.length === 0 && generatedResumes.length === 0 ? (
          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed', borderRadius: radius.r2, padding: spacing.s3, marginBottom: spacing.s4 }}>
            <Text style={{ fontSize: 11.5, color: colors.ink3, lineHeight: 18 }}>
              لسه مرفعتش سيرة ذاتية. تقدر تقدّم من غير سيرة دلوقتي وترفعها بعدين من ملفك المهني.
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s4 }}>
            {resumeFiles.map((f) => (
              <Chip
                key={f.id}
                label={f.name}
                active={selectedResume?.type === 'file' && selectedResume.id === f.id}
                onPress={() => setSelectedResume({ type: 'file', id: f.id })}
              />
            ))}
            {generatedResumes.map((g) => (
              <Chip
                key={g.id}
                label={g.name}
                active={selectedResume?.type === 'generated' && selectedResume.id === g.id}
                onPress={() => setSelectedResume({ type: 'generated', id: g.id })}
              />
            ))}
          </View>
        )}

        <FormField label="خطاب تقديم (اختياري)" placeholder="اكتب كام سطر عن نفسك ليه انت مناسب للوظيفة دي..." value={coverLetter} onChangeText={setCoverLetter} multiline maxLength={600} showCounter />
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s4, paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 + insets.bottom }}>
        <Button disabled={!canSubmit} onPress={submit}>
          تأكيد التقديم
        </Button>
      </View>
    </View>
  );
}
