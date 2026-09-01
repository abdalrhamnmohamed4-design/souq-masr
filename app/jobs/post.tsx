/**
 * app/jobs/post.tsx — نشر وظيفة جديدة (PART 22): خطوات حقيقية متعددة
 * زي نموذج نشر إعلان السوق العام بالظبط — القسم بيحدد قائمة المهن،
 * والمراجعة قبل النشر إجبارية.
 */
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { useAuthGuard } from '@/components/AuthGuard';
import { LocationPicker } from '@/components/LocationPicker';
import { Button } from '@/components/primitives/Button';
import { Chip } from '@/components/primitives/Chip';
import { EmptyState } from '@/components/primitives/EmptyState';
import { FormField } from '@/components/primitives/FormField';
import { getJobCategories, getProfessionsForCategory } from '@/mock/jobs/categories';
import { toPositiveInt } from '@/lib/validation';
import { locationPathLabel } from '@/mock/taxonomy/locations';
import { CAREER_LEVEL_LABELS, WORK_TYPE_LABELS, type CareerLevel, type Job, type WorkType } from '@/mock/jobs/types';
import { useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

type StepKey = 'category' | 'details' | 'description' | 'application' | 'review';
const STEPS: StepKey[] = ['category', 'details', 'description', 'application', 'review'];
const STEP_TITLES: Record<StepKey, string> = { category: 'القسم والمهنة', details: 'تفاصيل الوظيفة', description: 'الوصف والمتطلبات', application: 'طريقة التقديم', review: 'المراجعة والنشر' };

export default function PostJob() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { colors, spacing, radius, brandDark } = useTheme();
  const insets = useSafeAreaInsets();
  const userCompanies = useJobsStore((s) => s.userCompanies);
  const userJobs = useJobsStore((s) => s.userJobs);
  const addJob = useJobsStore((s) => s.addJob);
  const updateJob = useJobsStore((s) => s.updateJob);
  const myCompany = userCompanies.find((c) => c.ownerSellerId === 'me');
  const editingJob = editId ? userJobs.find((j) => j.id === editId) : undefined;

  const [stepIndex, setStepIndex] = useState(0);
  const stepKey = STEPS[stepIndex];

  const [categoryId, setCategoryId] = useState<string | null>(editingJob?.categoryId ?? null);
  const [professionId, setProfessionId] = useState<string | null>(editingJob?.professionId ?? null);
  const [title, setTitle] = useState(editingJob?.title ?? '');
  const [workType, setWorkType] = useState<WorkType>(editingJob?.workType ?? 'full_time');
  const [careerLevel, setCareerLevel] = useState<CareerLevel | null>(editingJob?.careerLevel ?? null);
  const [remote, setRemote] = useState(editingJob?.remote ?? false);
  const [locationId, setLocationId] = useState<string | null>(editingJob?.locationId ?? null);
  const [locationSheet, setLocationSheet] = useState(false);
  const [expMin, setExpMin] = useState(editingJob?.experienceYearsMin !== undefined ? String(editingJob.experienceYearsMin) : '');
  const [expMax, setExpMax] = useState(editingJob?.experienceYearsMax !== undefined ? String(editingJob.experienceYearsMax) : '');
  const [salaryMin, setSalaryMin] = useState(editingJob?.salaryMin !== undefined ? String(editingJob.salaryMin) : '');
  const [salaryMax, setSalaryMax] = useState(editingJob?.salaryMax !== undefined ? String(editingJob.salaryMax) : '');
  const [salaryHidden, setSalaryHidden] = useState(editingJob?.salaryHidden ?? false);
  const [description, setDescription] = useState(editingJob?.description ?? '');
  const [responsibilities, setResponsibilities] = useState(editingJob?.responsibilities.join('\n') ?? '');
  const [requirements, setRequirements] = useState(editingJob?.requirements.join('\n') ?? '');
  const [skills, setSkills] = useState(editingJob?.skills.join(', ') ?? '');
  const [benefits, setBenefits] = useState(editingJob?.benefits.join('\n') ?? '');
  const [deadline, setDeadline] = useState<Date | undefined>(editingJob?.deadline ? new Date(editingJob.deadline) : undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تنشر وظيفة', description: 'نشر وظيفة مرتبط بحسابك وشركتك — سجّل دخولك الأول.' });
  if (authBlock) return authBlock;

  const professionsForCategory = categoryId ? getProfessionsForCategory(categoryId) : [];

  const canNext = (() => {
    if (stepKey === 'category') return !!categoryId;
    if (stepKey === 'details') return title.trim().length > 3 && !!locationId;
    if (stepKey === 'description') return description.trim().length > 10;
    return true;
  })();

  const publish = () => {
    if (!myCompany || !categoryId || !locationId) return;
    const cityName = locationPathLabel(locationId).split('، ')[0];
    const job: Omit<Job, 'id' | 'postedAt' | 'status' | 'views' | 'applicationsCount' | 'isFeatured'> = {
      title: title.trim(),
      companyId: myCompany.id,
      categoryId,
      professionId: professionId ?? undefined,
      workType,
      careerLevel: careerLevel ?? undefined,
      city: cityName,
      locationId,
      remote,
      salaryMin: toPositiveInt(salaryMin),
      salaryMax: toPositiveInt(salaryMax),
      salaryHidden,
      experienceYearsMin: toPositiveInt(expMin),
      experienceYearsMax: toPositiveInt(expMax),
      description: description.trim(),
      responsibilities: responsibilities.split('\n').map((s) => s.trim()).filter(Boolean),
      requirements: requirements.split('\n').map((s) => s.trim()).filter(Boolean),
      skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
      benefits: benefits.split('\n').map((s) => s.trim()).filter(Boolean),
      applicationMethod: 'in_app',
      deadline: deadline?.toISOString(),
      isUrgent: editingJob?.isUrgent ?? false,
    };
    if (editingJob) {
      // تعديل حقيقي على نفس الـid — مش وظيفة مكررة جديدة.
      updateJob(editingJob.id, job);
      router.replace(`/jobs/${editingJob.id}`);
      return;
    }
    const id = addJob(job);
    router.replace(`/jobs/${id}`);
  };

  if (!myCompany) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, paddingHorizontal: spacing.s5, paddingTop: insets.top + spacing.s3, paddingBottom: spacing.s3 }}>
          <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: radius.r2, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" color={colors.ink} />
          </Pressable>
        </View>
        <EmptyState
          icon={<Icon name="office" color={colors.ink3} size={26} />}
          title="محتاج تضيف بيانات شركتك الأول"
          description="عشان تنشر وظيفة، لازم يكون عندك ملف شركة — بياناتها هتظهر لكل المتقدمين."
          actionLabel="إضافة بيانات الشركة"
          onAction={() => router.push('/jobs/my-company')}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, paddingHorizontal: spacing.s5, paddingTop: insets.top + spacing.s2, paddingBottom: spacing.s2 }}>
        <Pressable onPress={() => (stepIndex === 0 ? router.back() : setStepIndex((i) => i - 1))} style={{ width: 40, height: 40, borderRadius: radius.r2, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" color={colors.ink} />
        </Pressable>
        <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 17, color: colors.ink }}>{editingJob ? 'تعديل الوظيفة' : 'نشر وظيفة'}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: spacing.s5, paddingBottom: spacing.s4 }}>
        {STEPS.map((s, i) => (
          <View key={s} style={{ flex: 1, height: 4, borderRadius: 999, backgroundColor: i < stepIndex ? colors.verify : i === stepIndex ? colors.signal : colors.line }} />
        ))}
      </View>
      <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: colors.ink, paddingHorizontal: spacing.s5, paddingBottom: spacing.s4 }}>
        الخطوة {stepIndex + 1} من {STEPS.length} — {STEP_TITLES[stepKey]}
      </Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.s5, paddingBottom: 130 + insets.bottom }}>
        {stepKey === 'category' ? (
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>القسم الوظيفي</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s5 }}>
              {getJobCategories().map((c) => (
                <Chip key={c.id} label={c.name} compact active={categoryId === c.id} onPress={() => { setCategoryId(c.id); setProfessionId(null); }} />
              ))}
            </View>
            {categoryId ? (
              <>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>المهنة (اختياري)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {professionsForCategory.map((p) => (
                    <Chip key={p.id} label={p.name} compact active={professionId === p.id} onPress={() => { setProfessionId(p.id); if (!title) setTitle(p.name); }} />
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {stepKey === 'details' ? (
          <View>
            <FormField label="المسمى الوظيفي" placeholder="مثلاً: محاسب أول" value={title} onChangeText={setTitle} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>نوع الدوام</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s4 }}>
              {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((wt) => (
                <Chip key={wt} label={WORK_TYPE_LABELS[wt]} compact active={workType === wt} onPress={() => setWorkType(wt)} />
              ))}
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>المستوى الوظيفي</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s4 }}>
              {(Object.keys(CAREER_LEVEL_LABELS) as CareerLevel[]).map((cl) => (
                <Chip key={cl} label={CAREER_LEVEL_LABELS[cl]} compact active={careerLevel === cl} onPress={() => setCareerLevel(cl)} />
              ))}
            </View>
            <Pressable onPress={() => setRemote((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.s4 }}>
              <Icon name={remote ? 'check' : 'x'} size={16} color={remote ? colors.verify : colors.ink3} />
              <Text style={{ fontSize: 12.5, color: colors.ink }}>وظيفة عن بُعد</Text>
            </Pressable>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>الموقع</Text>
            <Pressable onPress={() => setLocationSheet(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: 12, marginBottom: spacing.s4 }}>
              <Icon name="pin" size={15} color={colors.ink3} />
              <Text style={{ flex: 1, fontSize: 12, color: locationId ? colors.ink : colors.ink3 }}>{locationId ? locationPathLabel(locationId) : 'اختار موقع الوظيفة'}</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: spacing.s2 }}>
              <View style={{ flex: 1 }}><FormField label="سنوات خبرة (من)" placeholder="0" keyboardType="number-pad" value={expMin} onChangeText={setExpMin} /></View>
              <View style={{ flex: 1 }}><FormField label="إلى" placeholder="5" keyboardType="number-pad" value={expMax} onChangeText={setExpMax} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.s2 }}>
              <View style={{ flex: 1 }}><FormField label="الراتب من" placeholder="0" isPrice keyboardType="number-pad" value={salaryMin} onChangeText={setSalaryMin} /></View>
              <View style={{ flex: 1 }}><FormField label="إلى" placeholder="0" isPrice keyboardType="number-pad" value={salaryMax} onChangeText={setSalaryMax} /></View>
            </View>
            <Pressable onPress={() => setSalaryHidden((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name={salaryHidden ? 'check' : 'x'} size={16} color={salaryHidden ? colors.verify : colors.ink3} />
              <Text style={{ fontSize: 12, color: colors.ink }}>إخفاء الراتب عن المتقدمين</Text>
            </Pressable>
            <LocationPicker visible={locationSheet} onClose={() => setLocationSheet(false)} onSelect={setLocationId} initialLocationId={locationId} title="موقع الوظيفة" />
          </View>
        ) : null}

        {stepKey === 'description' ? (
          <View>
            <FormField label="الوصف الوظيفي" placeholder="وصف عام للوظيفة" value={description} onChangeText={setDescription} multiline maxLength={800} showCounter />
            <FormField label="المسؤوليات (سطر لكل بند)" placeholder={'إعداد التقارير\nمتابعة الحسابات'} value={responsibilities} onChangeText={setResponsibilities} multiline />
            <FormField label="المتطلبات (سطر لكل بند)" placeholder={'خبرة 3 سنين\nإجادة Excel'} value={requirements} onChangeText={setRequirements} multiline />
            <FormField label="المهارات (افصل بفاصلة)" placeholder="Excel, SAP, Communication" value={skills} onChangeText={setSkills} />
            <FormField label="المزايا (سطر لكل بند)" placeholder={'تأمين صحي\nمواصلات'} value={benefits} onChangeText={setBenefits} multiline />
          </View>
        ) : null}

        {stepKey === 'application' ? (
          <View>
            <Text style={{ fontSize: 12.5, color: colors.ink2, lineHeight: 21, marginBottom: spacing.s4 }}>
              التقديم هيكون من داخل التطبيق — هتوصلك الطلبات في "متقدّمين هذه الوظيفة" أول ما المستخدمين يقدّموا.
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>آخر موعد للتقديم (اختياري)</Text>
            <Pressable onPress={() => setShowDatePicker(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: 12 }}>
              <Icon name="clock" size={15} color={colors.ink3} />
              <Text style={{ fontSize: 12, color: deadline ? colors.ink : colors.ink3 }}>
                {deadline ? new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(deadline) : 'اختار تاريخ'}
              </Text>
            </Pressable>
            {showDatePicker ? (
              <DateTimePicker value={deadline ?? new Date()} mode="date" minimumDate={new Date()} onChange={(e, d) => { setShowDatePicker(false); if (e.type === 'set' && d) setDeadline(d); }} />
            ) : null}
          </View>
        ) : null}

        {stepKey === 'review' ? (
          <View style={{ gap: spacing.s3 }}>
            <ReviewRow label="المسمى الوظيفي" value={title || '—'} />
            <ReviewRow label="القسم" value={getJobCategories().find((c) => c.id === categoryId)?.name ?? '—'} />
            <ReviewRow label="نوع الدوام" value={WORK_TYPE_LABELS[workType]} />
            <ReviewRow label="الموقع" value={locationId ? locationPathLabel(locationId) : '—'} />
            <ReviewRow label="الراتب" value={salaryHidden ? 'مخفي' : salaryMin ? `${salaryMin}${salaryMax ? ` - ${salaryMax}` : ''} ج.م` : '—'} />
          </View>
        ) : null}
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s4, paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 + insets.bottom, flexDirection: 'row', gap: spacing.s2 }}>
        {stepIndex > 0 ? (
          <View style={{ width: 100 }}>
            <Button variant="ghost" onPress={() => setStepIndex((i) => i - 1)}>رجوع</Button>
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          {stepKey === 'review' ? (
            <Button onPress={publish}>{editingJob ? 'احفظ التعديلات' : 'نشر الوظيفة'}</Button>
          ) : (
            <Button disabled={!canNext} onPress={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}>التالي</Button>
          )}
        </View>
      </View>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: spacing.s3 }}>
      <Text style={{ fontSize: 12, color: colors.ink3 }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{value}</Text>
    </View>
  );
}
