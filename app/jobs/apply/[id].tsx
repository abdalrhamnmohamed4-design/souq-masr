/**
 * app/jobs/apply/[id].tsx — التقديم على وظيفة (PART 17). المستخدم مش
 * مجبر يعمل ملف مهني كامل قبل ما يتصفّح — لو لسه مالوش بيانات أساسية
 * بيكملها هنا بس (اسم/تليفون)، مش كل تفاصيل الـCareer Profile.
 *
 * Jobs vertical (Phase 2B): id بتاع JOB-##### معناه وظيفة حقيقية —
 * تقديم حقيقي (Souq Masr Job Application) بدل محلي. سيرة ذاتية "مولّدة"
 * (generatedResumes) مش متاحة هنا — دي جزء من الـCV builder العميق
 * اللي لسه محلي بالكامل؛ ملف مرفوع حقيقي (uploadResumeFile) بس متاح.
 */
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { useRequireOnline } from '@/lib/connectivityGuard';
import { Button } from '@/components/primitives/Button';
import { Chip } from '@/components/primitives/Chip';
import { FormField } from '@/components/primitives/FormField';
import { isValidEgyptianPhone, isValidEmail } from '@/lib/validation';
import { applyToJob, uploadResumeFile } from '@/services/jobApplicationService';
import { getCompany, type RealCompany } from '@/services/companyService';
import { getJob, isRealJobId, type RealJob } from '@/services/jobService';
import { useCompanyById, useJobById, useJobsStore } from '@/store/useJobsStore';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function ApplyToJob() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isReal = isRealJobId(id);
  return isReal ? <RealApplyScreen jobId={id!} /> : <MockApplyScreen id={id} />;
}

// ============================================================ REAL
function RealApplyScreen({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const onboarding = useAppStore((s) => s.onboarding);
  const requireOnline = useRequireOnline();

  const [job, setJob] = useState<RealJob | null>(null);
  const [company, setCompany] = useState<RealCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState(onboarding.name || '');
  const [phone, setPhone] = useState(onboarding.phone || '');
  const [email, setEmail] = useState('');
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [resumeUri, setResumeUri] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  React.useEffect(() => {
    let cancelled = false;
    getJob(jobId).then(async (r) => {
      if (cancelled || r.status !== 'success') {
        setLoading(false);
        return;
      }
      setJob(r.data);
      const c = await getCompany(r.data.company);
      if (!cancelled && c.status === 'success') setCompany(c.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تقدّم على الوظيفة', description: 'التقديم على وظائف محتاج حساب مسجّل عشان تقدر تتابع طلبك.' });
  if (authBlock) return authBlock;

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  if (!job) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <Text style={{ color: colors.ink3 }}>الوظيفة مش موجودة</Text>
      </View>
    );
  }

  const canSubmit = fullName.trim().length >= 2 && isValidEgyptianPhone(phone);

  const pickResume = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] });
    if (result.canceled || !result.assets[0]) return;
    setResumeUri(result.assets[0].uri);
    setResumeName(result.assets[0].name);
  };

  const submit = () =>
    requireOnline(async () => {
      setSubmitting(true);
      let resumeFileUrl: string | undefined;
      if (resumeUri && resumeName) {
        const uploadResult = await uploadResumeFile({ uri: resumeUri, name: resumeName, mimeType: 'application/octet-stream' });
        if (uploadResult.status === 'success') resumeFileUrl = uploadResult.data;
      }
      const r = await applyToJob(job.id, fullName.trim(), phone.trim(), email.trim() || undefined, resumeFileUrl, coverLetter.trim() || undefined);
      setSubmitting(false);
      if (r.status !== 'success') {
        Alert.alert('تعذّر التقديم', 'حصلت مشكلة، جرّب تاني.');
        return;
      }
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
        {resumeName ? (
          <Chip label={resumeName} active onPress={pickResume} />
        ) : (
          <Pressable onPress={pickResume} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed', borderRadius: radius.r2, padding: spacing.s3, marginBottom: spacing.s4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="clip" size={16} color={colors.ink3} />
            <Text style={{ fontSize: 11.5, color: colors.ink3, lineHeight: 18, flex: 1 }}>
              اضغط لرفع سيرتك الذاتية (PDF/Word) — أو قدّم من غيرها دلوقتي وارفعها بعدين.
            </Text>
          </Pressable>
        )}

        <FormField label="خطاب تقديم (اختياري)" placeholder="اكتب كام سطر عن نفسك ليه انت مناسب للوظيفة دي..." value={coverLetter} onChangeText={setCoverLetter} multiline maxLength={600} showCounter />
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s4, paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 + insets.bottom }}>
        <Button disabled={!canSubmit || submitting} onPress={submit}>
          تأكيد التقديم
        </Button>
      </View>
    </View>
  );
}

// ============================================================ MOCK (كان موجود قبل كده، من غير تغيير)
function MockApplyScreen({ id }: { id: string | undefined }) {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const job = useJobById(id);
  const company = useCompanyById(job?.companyId);
  const onboarding = useAppStore((s) => s.onboarding);
  const careerProfile = useJobsStore((s) => s.careerProfile);
  const ensureCareerProfile = useJobsStore((s) => s.ensureCareerProfile);
  const updateCareerProfile = useJobsStore((s) => s.updateCareerProfile);
  const applyToJobMock = useJobsStore((s) => s.applyToJob);

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
      applyToJobMock(
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
