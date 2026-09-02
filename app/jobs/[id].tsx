/**
 * app/jobs/[id].tsx — تفاصيل الوظيفة (PART 23): كل البيانات + Apply Now
 * حقيقي + حفظ + مشاركة + بلاغ.
 *
 * Jobs vertical (Phase 2B): id بتاع JOB-##### معناه وظيفة حقيقية —
 * فرع كامل موازي، مفيش تغيير على مسار mock (نفس نمط detail/[id].tsx).
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/primitives/Button';
import { Pill } from '@/components/primitives/Pill';
import { getJobCategory, getProfession } from '@/mock/jobs/categories';
import { useRequireAuth } from '@/lib/auth';
import { CAREER_LEVEL_LABELS, WORK_TYPE_LABELS, type JobsReportReason } from '@/mock/jobs/types';
import { getCompany, type RealCompany } from '@/services/companyService';
import { hasReportedContent, reportContent } from '@/services/contentReportService';
import { hasApplied as hasAppliedReal } from '@/services/jobApplicationService';
import { getJob, incrementJobViews as incrementJobViewsReal, isRealJobId, type RealJob } from '@/services/jobService';
import { isJobSaved, saveJob, unsaveJob } from '@/services/savedJobService';
import { useCompanyById, useJobById, useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

const REPORT_REASONS: { key: JobsReportReason; label: string }[] = [
  { key: 'fake', label: 'وظيفة وهمية' },
  { key: 'scam', label: 'نصب' },
  { key: 'wrong_category', label: 'تصنيف غلط' },
  { key: 'duplicate', label: 'وظيفة مكررة' },
  { key: 'prohibited', label: 'محتوى ممنوع' },
  { key: 'spam', label: 'سبام' },
  { key: 'abusive', label: 'شركة مسيئة' },
  { key: 'incorrect_info', label: 'معلومات غلط' },
];

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isReal = isRealJobId(id);
  return isReal ? <RealJobDetail id={id!} /> : <MockJobDetail id={id} />;
}

// ============================================================ REAL
function RealJobDetail({ id }: { id: string }) {
  const router = useRouter();
  const { colors, spacing, radius, brandDark } = useTheme();
  const insets = useSafeAreaInsets();
  const requireAuth = useRequireAuth();

  const [job, setJob] = useState<RealJob | null>(null);
  const [company, setCompany] = useState<RealCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getJob(id).then(async (r) => {
      if (cancelled || r.status !== 'success') {
        setLoading(false);
        return;
      }
      setJob(r.data);
      const companyResult = await getCompany(r.data.company);
      if (!cancelled && companyResult.status === 'success') setCompany(companyResult.data);
      setLoading(false);
      incrementJobViewsReal(id);
    });
    isJobSaved(id).then((r) => { if (!cancelled && r.status === 'success') setSaved(r.data.saved); });
    hasAppliedReal(id).then((r) => { if (!cancelled && r.status === 'success') setApplied(r.data.has_applied); });
    hasReportedContent('Souq Masr Job', id).then((r) => { if (!cancelled && r.status === 'success') setReported(r.data.has_reported); });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }
  if (!job) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <Text style={{ color: colors.ink3 }}>الوظيفة مش موجودة</Text>
      </View>
    );
  }

  const category = getJobCategory(job.categoryKey);
  const profession = job.professionKey ? getProfession(job.professionKey) : undefined;

  const shareJob = () => Share.share({ message: `${job.title} — ${company?.name ?? ''}\nعلى سوق مصر` });
  const toggleSave = () =>
    requireAuth(async () => {
      const next = !saved;
      setSaved(next);
      const r = next ? await saveJob(id) : await unsaveJob(id);
      if (r.status !== 'success') setSaved(!next);
    });
  const reportJob = () =>
    requireAuth(() => {
      if (reported) {
        Alert.alert('اتبلّغ عن الوظيفة دي', 'شكرًا، البلاغ بتاعك اتسجّل وهيتراجع.');
        return;
      }
      Alert.alert('بلّغ عن الوظيفة', 'اختار السبب', [
        ...REPORT_REASONS.map((r) => ({
          text: r.label,
          onPress: async () => {
            await reportContent('Souq Masr Job', id, r.key);
            setReported(true);
            Alert.alert('شكرًا', 'اتسجّل البلاغ وهنراجعه.');
          },
        })),
        { text: 'إلغاء', style: 'cancel' as const },
      ]);
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        <View style={{ backgroundColor: brandDark, paddingTop: insets.top + spacing.s3, paddingBottom: spacing.s5, paddingHorizontal: spacing.s5, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}>
            <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chev-r" color="#fff" />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8, marginLeft: 'auto' }}>
              <Pressable onPress={shareJob} style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="share" color="#fff" size={16} />
              </Pressable>
              <Pressable onPress={toggleSave} style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="heart" color={saved ? colors.signal : '#fff'} size={16} />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={() => company && router.push(`/jobs/company/${company.id}`)}
            disabled={!company}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, marginTop: spacing.s4 }}
          >
            <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="office" size={22} color={brandDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 17, color: '#fff' }}>{job.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,.75)' }}>{company?.name ?? '—'}</Text>
                {company?.verification === 'verified' ? <Icon name="shield" size={12} color="#6EE7A8" /> : null}
                {company ? <Icon name="chev-l" size={12} color="rgba(255,255,255,.5)" /> : null}
              </View>
            </View>
          </Pressable>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.s3 }}>
            <Pill icon={<Icon name="pin" size={11} color={colors.ink2} />}>{job.city}</Pill>
            <Pill>{WORK_TYPE_LABELS[job.workType]}</Pill>
            {job.remote ? <Pill tone="signal">عن بُعد</Pill> : null}
            {job.isUrgent ? <Pill tone="gold">عاجلة</Pill> : null}
          </View>
        </View>

        <View style={{ padding: spacing.s5, gap: spacing.s4 }}>
          {!job.salaryHidden && job.salaryMin ? (
            <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s4 }}>
              <Text style={{ fontSize: 11, color: colors.ink3 }}>الراتب المتوقع</Text>
              <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 20, color: colors.ink, marginTop: 3 }}>
                {job.salaryMin.toLocaleString('en-US')}{job.salaryMax ? ` - ${job.salaryMax.toLocaleString('en-US')}` : ''} <Text style={{ fontSize: 12, color: colors.ink3 }}>ج.م/شهريًا</Text>
              </Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 }}>
            <MetaTile icon="office" label="القسم" value={category?.name ?? '—'} />
            {profession ? <MetaTile icon="id" label="المهنة" value={profession.name} /> : null}
            {job.careerLevel ? <MetaTile icon="star" label="المستوى" value={CAREER_LEVEL_LABELS[job.careerLevel]} /> : null}
            {job.experienceYearsMin != null ? <MetaTile icon="clock" label="الخبرة" value={`${job.experienceYearsMin}+ سنين`} /> : null}
            <MetaTile icon="eye" label="عدد المشاهدات" value={String(job.views)} />
            <MetaTile icon="chat" label="عدد المتقدمين" value={String(job.applicationsCount)} />
          </View>

          <Section title="الوصف الوظيفي"><Text style={{ fontSize: 12.5, color: colors.ink2, lineHeight: 22 }}>{job.description}</Text></Section>
          {job.responsibilities.length > 0 ? <BulletSection title="المسؤوليات" items={job.responsibilities} /> : null}
          {job.requirements.length > 0 ? <BulletSection title="المتطلبات" items={job.requirements} /> : null}
          {job.skills.length > 0 ? (
            <Section title="المهارات المطلوبة">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {job.skills.map((s) => <Pill key={s}>{s}</Pill>)}
              </View>
            </Section>
          ) : null}
          {job.benefits.length > 0 ? <BulletSection title="المزايا" items={job.benefits} /> : null}

          <Pressable onPress={reportJob} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: spacing.s3 }}>
            <Icon name="flag" size={13} color={reported ? colors.danger : colors.ink3} />
            <Text style={{ fontSize: 11, color: reported ? colors.danger : colors.ink3 }}>{reported ? 'اتبلّغ عن الوظيفة دي' : 'بلّغ عن الوظيفة دي'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s4, paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 + insets.bottom }}>
        <Button disabled={applied} onPress={() => router.push(`/jobs/apply/${job.id}`)}>
          {applied ? 'اتقدّمت للوظيفة دي بالفعل' : 'قدّم دلوقتي'}
        </Button>
      </View>
    </View>
  );
}

// ============================================================ MOCK (كان موجود قبل كده، من غير تغيير)
function MockJobDetail({ id }: { id: string | undefined }) {
  const router = useRouter();
  const { colors, spacing, radius, brandDark } = useTheme();
  const insets = useSafeAreaInsets();
  const toggleSave = useJobsStore((s) => s.toggleSaveJob);
  const isSaved = useJobsStore((s) => s.isJobSaved);
  const hasApplied = useJobsStore((s) => s.hasAppliedToJob);
  const incrementViews = useJobsStore((s) => s.incrementJobViews);
  const reportJobsTarget = useJobsStore((s) => s.reportJobsTarget);
  const hasReported = useJobsStore((s) => s.hasReportedJobsTarget);
  const requireAuth = useRequireAuth();

  const job = useJobById(id);
  const company = useCompanyById(job?.companyId);

  React.useEffect(() => {
    if (job) incrementViews(job.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

  if (!job) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <Text style={{ color: colors.ink3 }}>الوظيفة مش موجودة</Text>
      </View>
    );
  }

  const category = getJobCategory(job.categoryId);
  const profession = job.professionId ? getProfession(job.professionId) : undefined;
  const alreadyApplied = hasApplied(job.id);

  const alreadyReported = hasReported('job', job.id);
  const shareJob = () => Share.share({ message: `${job.title} — ${company?.name ?? ''}\nعلى سوق مصر` });
  const toggleSaveGuarded = () => requireAuth(() => toggleSave(job.id), { type: 'save_job', jobId: job.id });
  const reportJob = () =>
    requireAuth(() => {
      if (alreadyReported) {
        Alert.alert('اتبلّغ عن الوظيفة دي', 'شكرًا، البلاغ بتاعك اتسجّل وهيتراجع.');
        return;
      }
      Alert.alert(
        'بلّغ عن الوظيفة',
        'اختار السبب',
        [
          ...REPORT_REASONS.map((r) => ({
            text: r.label,
            onPress: () => { reportJobsTarget('job', job.id, r.key); Alert.alert('شكرًا', 'اتسجّل البلاغ وهنراجعه.'); },
          })),
          { text: 'إلغاء', style: 'cancel' as const },
        ],
      );
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        <View style={{ backgroundColor: brandDark, paddingTop: insets.top + spacing.s3, paddingBottom: spacing.s5, paddingHorizontal: spacing.s5, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}>
            <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chev-r" color="#fff" />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8, marginLeft: 'auto' }}>
              <Pressable onPress={shareJob} style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="share" color="#fff" size={16} />
              </Pressable>
              <Pressable onPress={toggleSaveGuarded} style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="heart" color={isSaved(job.id) ? colors.signal : '#fff'} size={16} />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={() => company && router.push(`/jobs/company/${company.id}`)}
            disabled={!company}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, marginTop: spacing.s4 }}
          >
            <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="office" size={22} color={brandDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 17, color: '#fff' }}>{job.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,.75)' }}>{company?.name ?? '—'}</Text>
                {company?.verification === 'verified' ? <Icon name="shield" size={12} color="#6EE7A8" /> : null}
                {company ? <Icon name="chev-l" size={12} color="rgba(255,255,255,.5)" /> : null}
              </View>
            </View>
          </Pressable>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.s3 }}>
            <Pill icon={<Icon name="pin" size={11} color={colors.ink2} />}>{job.city}</Pill>
            <Pill>{WORK_TYPE_LABELS[job.workType]}</Pill>
            {job.remote ? <Pill tone="signal">عن بُعد</Pill> : null}
            {job.isUrgent ? <Pill tone="gold">عاجلة</Pill> : null}
          </View>
        </View>

        <View style={{ padding: spacing.s5, gap: spacing.s4 }}>
          {!job.salaryHidden && job.salaryMin ? (
            <InfoCard>
              <Text style={{ fontSize: 11, color: colors.ink3 }}>الراتب المتوقع</Text>
              <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 20, color: colors.ink, marginTop: 3 }}>
                {job.salaryMin.toLocaleString('en-US')}{job.salaryMax ? ` - ${job.salaryMax.toLocaleString('en-US')}` : ''} <Text style={{ fontSize: 12, color: colors.ink3 }}>ج.م/شهريًا</Text>
              </Text>
            </InfoCard>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 }}>
            <MetaTile icon="office" label="القسم" value={category?.name ?? '—'} />
            {profession ? <MetaTile icon="id" label="المهنة" value={profession.name} /> : null}
            {job.careerLevel ? <MetaTile icon="star" label="المستوى" value={CAREER_LEVEL_LABELS[job.careerLevel]} /> : null}
            {job.experienceYearsMin !== undefined ? <MetaTile icon="clock" label="الخبرة" value={`${job.experienceYearsMin}+ سنين`} /> : null}
            <MetaTile icon="eye" label="عدد المشاهدات" value={String(job.views)} />
            <MetaTile icon="chat" label="عدد المتقدمين" value={String(job.applicationsCount)} />
          </View>

          <Section title="الوصف الوظيفي"><Text style={{ fontSize: 12.5, color: colors.ink2, lineHeight: 22 }}>{job.description}</Text></Section>
          {job.responsibilities.length > 0 ? <BulletSection title="المسؤوليات" items={job.responsibilities} /> : null}
          {job.requirements.length > 0 ? <BulletSection title="المتطلبات" items={job.requirements} /> : null}
          {job.skills.length > 0 ? (
            <Section title="المهارات المطلوبة">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {job.skills.map((s) => <Pill key={s}>{s}</Pill>)}
              </View>
            </Section>
          ) : null}
          {job.benefits.length > 0 ? <BulletSection title="المزايا" items={job.benefits} /> : null}

          <Pressable onPress={reportJob} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: spacing.s3 }}>
            <Icon name="flag" size={13} color={alreadyReported ? colors.danger : colors.ink3} />
            <Text style={{ fontSize: 11, color: alreadyReported ? colors.danger : colors.ink3 }}>{alreadyReported ? 'اتبلّغ عن الوظيفة دي' : 'بلّغ عن الوظيفة دي'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s4, paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 + insets.bottom }}>
        <Button disabled={alreadyApplied} onPress={() => router.push(`/jobs/apply/${job.id}`)}>
          {alreadyApplied ? 'اتقدّمت للوظيفة دي بالفعل' : 'قدّم دلوقتي'}
        </Button>
      </View>
    </View>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  const { colors, radius, spacing } = useTheme();
  return <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s4 }}>{children}</View>;
}

function MetaTile({ icon, label, value }: { icon: React.ComponentProps<typeof Icon>['name']; label: string; value: string }) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ width: '31%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: 10, alignItems: 'center', gap: 4 }}>
      <Icon name={icon} size={15} color={colors.ink3} />
      <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: colors.ink }}>{value}</Text>
      <Text style={{ fontSize: 9, color: colors.ink3 }}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.ink, marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  );
}

function BulletSection({ title, items }: { title: string; items: string[] }) {
  const { colors } = useTheme();
  return (
    <Section title={title}>
      <View style={{ gap: 6 }}>
        {items.map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
            <Text style={{ fontSize: 12.5, color: colors.ink3, marginTop: 1 }}>•</Text>
            <Text style={{ flex: 1, fontSize: 12.5, color: colors.ink2, lineHeight: 20 }}>{item}</Text>
          </View>
        ))}
      </View>
    </Section>
  );
}
