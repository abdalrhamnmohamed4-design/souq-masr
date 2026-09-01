/**
 * app/jobs/profile.tsx — ملفي المهني (PART 3-16): بيانات شخصية + مهنية +
 * تعليم + خبرات + مهارات + لغات + شهادات + دورات + مشاريع + بورتفوليو +
 * سير ذاتية (رفع حقيقي PDF/DOC + إنشاء من البيانات) + إعدادات خصوصية.
 * القسم الوحيد اللي المستخدم "مجبر" يكمّله عشان يقدّم على وظيفة هو
 * الاسم والتليفون (PART 2: تصفّح الأول بدون إجبار).
 */
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { LocationPicker } from '@/components/LocationPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { useRequireOnline } from '@/lib/connectivityGuard';
import { Button } from '@/components/primitives/Button';
import { Chip } from '@/components/primitives/Chip';
import { FormField } from '@/components/primitives/FormField';
import { locationPathLabel } from '@/mock/taxonomy/locations';
import { isValidEgyptianPhone, isValidEmail, toPositiveInt } from '@/lib/validation';
import { professions } from '@/mock/jobs/categories';
import {
  CAREER_LEVEL_LABELS,
  LANGUAGE_LEVEL_LABELS,
  SKILL_LEVEL_LABELS,
  WORK_TYPE_LABELS,
  type CareerLevel,
  type LanguageLevel,
  type SkillLevel,
  type WorkType,
} from '@/mock/jobs/types';
import { useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function CareerProfileScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const careerProfile = useJobsStore((s) => s.careerProfile);
  const ensureCareerProfile = useJobsStore((s) => s.ensureCareerProfile);
  const updateCareerProfile = useJobsStore((s) => s.updateCareerProfile);

  React.useEffect(() => {
    if (!careerProfile) ensureCareerProfile();
  }, [careerProfile, ensureCareerProfile]);

  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تعمل ملفك المهني', description: 'الملف المهني والسيرة الذاتية بيانات شخصية — محتاجة تسجيل دخول.' });
  if (authBlock) return authBlock;

  if (!careerProfile) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="ملفي المهني" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 60 + insets.bottom, gap: spacing.s5 }}>
        <PersonalSection />
        <ProfessionalSection />
        <EducationSection />
        <ExperienceSection />
        <SkillsSection />
        <LanguagesSection />
        <CertificationsSection />
        <CoursesSection />
        <ProjectsSection />
        <PortfolioSection />
        <ResumeSection />
        <PrivacySection />
      </ScrollView>
    </View>
  );
}

// ============================================================ عناصر مشتركة
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.s3 }}>
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.ink, flex: 1 }}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name="plus" size={14} color={colors.signal} />
      <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.signal }}>{label}</Text>
    </Pressable>
  );
}

function ListItem({ title, sub, onRemove }: { title: string; sub?: string; onRemove: () => void }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s2, paddingVertical: spacing.s2, borderBottomWidth: 1, borderBottomColor: colors.line2 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{title}</Text>
        {sub ? <Text style={{ fontSize: 10.5, color: colors.ink3, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      <Pressable onPress={onRemove}>
        <Icon name="trash" size={15} color={colors.danger} />
      </Pressable>
    </View>
  );
}

function EmptyLine({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize: 11.5, color: colors.ink3 }}>{text}</Text>;
}

function AddModal({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,26,46,.55)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '90%', paddingBottom: insets.bottom }}>
          <View style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: colors.line, alignSelf: 'center', marginTop: 12, marginBottom: 10 }} />
          <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 15, color: colors.ink, paddingHorizontal: spacing.s5, marginBottom: spacing.s3 }}>{title}</Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.s5, paddingBottom: spacing.s4 }}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================ البيانات الشخصية
function PersonalSection() {
  const { colors, spacing, radius } = useTheme();
  const cp = useJobsStore((s) => s.careerProfile)!;
  const update = useJobsStore((s) => s.updateCareerProfile);
  const [locationSheet, setLocationSheet] = useState(false);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true });
    if (!result.canceled && result.assets[0]) update({ photoUri: result.assets[0].uri });
  };

  return (
    <Section title="البيانات الشخصية">
      <Pressable onPress={pickPhoto} style={{ alignSelf: 'center', marginBottom: spacing.s4 }}>
        <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {cp.photoUri ? <Image source={{ uri: cp.photoUri }} style={{ width: 72, height: 72 }} /> : <Icon name="cam" color={colors.signal2} size={22} />}
        </View>
      </Pressable>
      <FormField label="الاسم بالكامل" placeholder="اكتب اسمك" value={cp.fullName} onChangeText={(v) => update({ fullName: v })} />
      <FormField label="رقم الموبايل" placeholder="01xxxxxxxxx" keyboardType="phone-pad" value={cp.phone ?? ''} onChangeText={(v) => update({ phone: v })} />
      {cp.phone && !isValidEgyptianPhone(cp.phone) ? (
        <Text style={{ fontSize: 11, color: colors.danger, marginTop: -8, marginBottom: spacing.s4 }}>رقم موبايل مصري غير صحيح</Text>
      ) : null}
      <FormField label="الإيميل" placeholder="name@email.com" keyboardType="email-address" value={cp.email ?? ''} onChangeText={(v) => update({ email: v })} />
      {cp.email && !isValidEmail(cp.email) ? (
        <Text style={{ fontSize: 11, color: colors.danger, marginTop: -8, marginBottom: spacing.s4 }}>شكل الإيميل غلط</Text>
      ) : null}
      <FormField label="الجنسية" placeholder="مصري" value={cp.nationality ?? ''} onChangeText={(v) => update({ nationality: v })} />

      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>النوع</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.s4 }}>
        <Chip label="ذكر" compact active={cp.gender === 'male'} onPress={() => update({ gender: 'male' })} />
        <Chip label="أنثى" compact active={cp.gender === 'female'} onPress={() => update({ gender: 'female' })} />
      </View>

      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>الموقع</Text>
      <Pressable onPress={() => setLocationSheet(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: 12, marginBottom: spacing.s4 }}>
        <Icon name="pin" size={15} color={colors.ink3} />
        <Text style={{ flex: 1, fontSize: 12, color: cp.governorate ? colors.ink : colors.ink3 }}>
          {cp.governorate ? [cp.governorate, cp.city, cp.area].filter(Boolean).join('، ') : 'اختار موقعك'}
        </Text>
      </Pressable>

      <FormField label="العنوان بالتفصيل (اختياري)" placeholder="اسم الشارع، رقم العمارة..." value={cp.address ?? ''} onChangeText={(v) => update({ address: v })} />

      <LocationPicker
        visible={locationSheet}
        onClose={() => setLocationSheet(false)}
        onSelect={(id) => {
          const parts = locationPathLabel(id).split('، ');
          update({ governorate: parts[0], city: parts[1], area: parts[2] });
        }}
        title="موقعك"
      />
    </Section>
  );
}

// ============================================================ البيانات المهنية
const PROFESSIONS_LIST = professions;

function ProfessionalSection() {
  const { colors, spacing, radius } = useTheme();
  const cp = useJobsStore((s) => s.careerProfile)!;
  const update = useJobsStore((s) => s.updateCareerProfile);
  const [professionSheet, setProfessionSheet] = useState(false);
  const [query, setQuery] = useState('');

  const selectedProfession = PROFESSIONS_LIST.find((p) => p.id === cp.professionId);
  const filteredProfessions = query.trim() ? PROFESSIONS_LIST.filter((p) => p.name.includes(query.trim())) : PROFESSIONS_LIST;

  const toggleWorkType = (wt: WorkType) => {
    const next = cp.preferredWorkTypes.includes(wt) ? cp.preferredWorkTypes.filter((x) => x !== wt) : [...cp.preferredWorkTypes, wt];
    update({ preferredWorkTypes: next });
  };

  return (
    <Section title="البيانات المهنية">
      <FormField label="المسمى الوظيفي الحالي" placeholder="مثلاً: محاسب أول" value={cp.currentJobTitle ?? ''} onChangeText={(v) => update({ currentJobTitle: v })} />
      <FormField label="المسمى الوظيفي المطلوب" placeholder="مثلاً: مدير مالي" value={cp.desiredJobTitle ?? ''} onChangeText={(v) => update({ desiredJobTitle: v })} />

      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>المهنة</Text>
      <Pressable onPress={() => setProfessionSheet(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: 12, marginBottom: spacing.s4 }}>
        <Icon name="id" size={15} color={colors.ink3} />
        <Text style={{ flex: 1, fontSize: 12, color: selectedProfession ? colors.ink : colors.ink3 }}>{selectedProfession?.name ?? 'اختار مهنتك'}</Text>
      </Pressable>

      <FormField label="القطاع" placeholder="مثلاً: البنوك" value={cp.industry ?? ''} onChangeText={(v) => update({ industry: v })} />
      <FormField label="سنوات الخبرة" placeholder="0" keyboardType="number-pad" value={cp.yearsExperience?.toString() ?? ''} onChangeText={(v) => update({ yearsExperience: toPositiveInt(v) })} />

      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>المستوى الوظيفي</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s4 }}>
        {(Object.keys(CAREER_LEVEL_LABELS) as CareerLevel[]).map((cl) => (
          <Chip key={cl} label={CAREER_LEVEL_LABELS[cl]} compact active={cp.careerLevel === cl} onPress={() => update({ careerLevel: cl })} />
        ))}
      </View>

      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>نوع العمل المفضّل</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s4 }}>
        {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((wt) => (
          <Chip key={wt} label={WORK_TYPE_LABELS[wt]} compact active={cp.preferredWorkTypes.includes(wt)} onPress={() => toggleWorkType(wt)} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.s2 }}>
        <View style={{ flex: 1 }}>
          <FormField label="الراتب المتوقع من" placeholder="0" isPrice keyboardType="number-pad" value={cp.expectedSalaryMin?.toString() ?? ''} onChangeText={(v) => update({ expectedSalaryMin: toPositiveInt(v) })} />
        </View>
        <View style={{ flex: 1 }}>
          <FormField label="إلى" placeholder="0" isPrice keyboardType="number-pad" value={cp.expectedSalaryMax?.toString() ?? ''} onChangeText={(v) => update({ expectedSalaryMax: toPositiveInt(v) })} />
        </View>
      </View>

      <Modal visible={professionSheet} transparent animationType="slide" onRequestClose={() => setProfessionSheet(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,26,46,.55)', justifyContent: 'flex-end' }} onPress={() => setProfessionSheet(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '80%' }}>
            <View style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: colors.line, alignSelf: 'center', marginTop: 12, marginBottom: 10 }} />
            <View style={{ paddingHorizontal: spacing.s5, marginBottom: spacing.s3 }}>
              <TextInput value={query} onChangeText={setQuery} placeholder="دوّر عن مهنتك..." placeholderTextColor={colors.ink3} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: 12, fontSize: 12.5, color: colors.ink }} />
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.s5, paddingBottom: 30 }}>
              {filteredProfessions.map((p) => (
                <Pressable key={p.id} onPress={() => { update({ professionId: p.id }); setProfessionSheet(false); setQuery(''); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line2 }}>
                  <Text style={{ fontSize: 13, color: colors.ink }}>{p.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Section>
  );
}

// ============================================================ التعليم
function EducationSection() {
  const { colors, spacing, radius } = useTheme();
  const cp = useJobsStore((s) => s.careerProfile)!;
  const addEducation = useJobsStore((s) => s.addEducation);
  const removeEducation = useJobsStore((s) => s.removeEducation);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ degree: '', fieldOfStudy: '', institution: '', country: 'مصر', city: '', startDate: '', graduationDate: '', grade: '' });

  const submit = () => {
    if (!form.degree.trim() || !form.institution.trim()) return;
    addEducation({ ...form, startDate: form.startDate || new Date().toISOString() });
    setForm({ degree: '', fieldOfStudy: '', institution: '', country: 'مصر', city: '', startDate: '', graduationDate: '', grade: '' });
    setOpen(false);
  };

  return (
    <Section title="التعليم" action={<AddButton label="إضافة" onPress={() => setOpen(true)} />}>
      {cp.education.length === 0 ? <EmptyLine text="لسه مفيش مؤهلات مضافة." /> : cp.education.map((e) => (
        <ListItem key={e.id} title={`${e.degree} — ${e.fieldOfStudy}`} sub={`${e.institution} · ${e.startDate.slice(0, 4)}${e.graduationDate ? ` - ${e.graduationDate.slice(0, 4)}` : ''}`} onRemove={() => removeEducation(e.id)} />
      ))}
      <AddModal visible={open} title="إضافة مؤهل دراسي" onClose={() => setOpen(false)}>
        <FormField label="الدرجة العلمية" placeholder="بكالوريوس" value={form.degree} onChangeText={(v) => setForm({ ...form, degree: v })} />
        <FormField label="التخصص" placeholder="محاسبة" value={form.fieldOfStudy} onChangeText={(v) => setForm({ ...form, fieldOfStudy: v })} />
        <FormField label="الجامعة/المعهد" placeholder="جامعة قناة السويس" value={form.institution} onChangeText={(v) => setForm({ ...form, institution: v })} />
        <FormField label="المدينة" placeholder="الإسماعيلية" value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} />
        <FormField label="سنة البداية" placeholder="2019" keyboardType="number-pad" value={form.startDate} onChangeText={(v) => setForm({ ...form, startDate: v })} />
        <FormField label="سنة التخرج" placeholder="2023" keyboardType="number-pad" value={form.graduationDate} onChangeText={(v) => setForm({ ...form, graduationDate: v })} />
        <FormField label="التقدير (اختياري)" placeholder="جيد جدًا" value={form.grade} onChangeText={(v) => setForm({ ...form, grade: v })} />
        <Button onPress={submit}>إضافة</Button>
      </AddModal>
    </Section>
  );
}

// ============================================================ الخبرات
function ExperienceSection() {
  const { colors, spacing, radius } = useTheme();
  const cp = useJobsStore((s) => s.careerProfile)!;
  const addExperience = useJobsStore((s) => s.addExperience);
  const removeExperience = useJobsStore((s) => s.removeExperience);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ jobTitle: '', company: '', employmentType: 'full_time' as WorkType, location: '', startDate: '', endDate: '', isCurrent: false, description: '', responsibilities: '', achievements: '' });

  const submit = () => {
    if (!form.jobTitle.trim() || !form.company.trim()) return;
    addExperience({
      jobTitle: form.jobTitle, company: form.company, employmentType: form.employmentType, location: form.location,
      startDate: form.startDate || new Date().toISOString(), endDate: form.isCurrent ? undefined : form.endDate || undefined,
      isCurrent: form.isCurrent, description: form.description,
      responsibilities: form.responsibilities.split('\n').map((s) => s.trim()).filter(Boolean),
      achievements: form.achievements.split('\n').map((s) => s.trim()).filter(Boolean),
      skillsUsed: [],
    });
    setForm({ jobTitle: '', company: '', employmentType: 'full_time', location: '', startDate: '', endDate: '', isCurrent: false, description: '', responsibilities: '', achievements: '' });
    setOpen(false);
  };

  return (
    <Section title="الخبرات العملية" action={<AddButton label="إضافة" onPress={() => setOpen(true)} />}>
      {cp.experience.length === 0 ? <EmptyLine text="لسه مفيش خبرات مضافة." /> : cp.experience.map((e) => (
        <ListItem key={e.id} title={`${e.jobTitle} — ${e.company}`} sub={`${WORK_TYPE_LABELS[e.employmentType]} · ${e.location} · ${e.startDate.slice(0, 4)} - ${e.isCurrent ? 'حاليًا' : e.endDate?.slice(0, 4) ?? ''}`} onRemove={() => removeExperience(e.id)} />
      ))}
      <AddModal visible={open} title="إضافة خبرة عملية" onClose={() => setOpen(false)}>
        <FormField label="المسمى الوظيفي" placeholder="محاسب أول" value={form.jobTitle} onChangeText={(v) => setForm({ ...form, jobTitle: v })} />
        <FormField label="الشركة" placeholder="اسم الشركة" value={form.company} onChangeText={(v) => setForm({ ...form, company: v })} />
        <FormField label="الموقع" placeholder="القاهرة" value={form.location} onChangeText={(v) => setForm({ ...form, location: v })} />
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>نوع الدوام</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s4 }}>
          {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((wt) => (
            <Chip key={wt} label={WORK_TYPE_LABELS[wt]} compact active={form.employmentType === wt} onPress={() => setForm({ ...form, employmentType: wt })} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.s2 }}>
          <View style={{ flex: 1 }}><FormField label="سنة البداية" placeholder="2022" keyboardType="number-pad" value={form.startDate} onChangeText={(v) => setForm({ ...form, startDate: v })} /></View>
          <View style={{ flex: 1 }}><FormField label="سنة النهاية" placeholder="2024" keyboardType="number-pad" value={form.endDate} onChangeText={(v) => setForm({ ...form, endDate: v })} editable={!form.isCurrent} /></View>
        </View>
        <Pressable onPress={() => setForm({ ...form, isCurrent: !form.isCurrent })} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.s4 }}>
          <Switch value={form.isCurrent} onValueChange={(v) => setForm({ ...form, isCurrent: v })} trackColor={{ false: colors.line, true: colors.verify }} />
          <Text style={{ fontSize: 12, color: colors.ink }}>لسه شغال هنا</Text>
        </Pressable>
        <FormField label="الوصف" placeholder="وصف مختصر للدور" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} multiline />
        <FormField label="المسؤوليات (سطر لكل مسؤولية)" placeholder={'إعداد التقارير المالية\nمراجعة الحسابات'} value={form.responsibilities} onChangeText={(v) => setForm({ ...form, responsibilities: v })} multiline />
        <FormField label="الإنجازات (سطر لكل إنجاز)" placeholder={'تحسين عملية الإقفال الشهري'} value={form.achievements} onChangeText={(v) => setForm({ ...form, achievements: v })} multiline />
        <Button onPress={submit}>إضافة</Button>
      </AddModal>
    </Section>
  );
}

// ============================================================ المهارات
function SkillsSection() {
  const { colors, spacing } = useTheme();
  const cp = useJobsStore((s) => s.careerProfile)!;
  const addSkill = useJobsStore((s) => s.addCandidateSkill);
  const removeSkill = useJobsStore((s) => s.removeCandidateSkill);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [level, setLevel] = useState<SkillLevel>('intermediate');

  const submit = () => {
    if (!name.trim()) return;
    addSkill({ name: name.trim(), level });
    setName('');
    setLevel('intermediate');
    setOpen(false);
  };

  return (
    <Section title="المهارات" action={<AddButton label="إضافة" onPress={() => setOpen(true)} />}>
      {cp.skills.length === 0 ? <EmptyLine text="لسه مفيش مهارات مضافة." /> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {cp.skills.map((s) => (
            <Pressable key={s.id} onLongPress={() => removeSkill(s.id)}>
              <Chip label={`${s.name} · ${SKILL_LEVEL_LABELS[s.level]}`} compact active />
            </Pressable>
          ))}
        </View>
      )}
      <AddModal visible={open} title="إضافة مهارة" onClose={() => setOpen(false)}>
        <FormField label="اسم المهارة" placeholder="مثلاً: Excel" value={name} onChangeText={setName} />
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>المستوى</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s4 }}>
          {(Object.keys(SKILL_LEVEL_LABELS) as SkillLevel[]).map((l) => (
            <Chip key={l} label={SKILL_LEVEL_LABELS[l]} compact active={level === l} onPress={() => setLevel(l)} />
          ))}
        </View>
        <Button onPress={submit}>إضافة</Button>
      </AddModal>
    </Section>
  );
}

// ============================================================ اللغات
function LanguagesSection() {
  const { colors, spacing } = useTheme();
  const cp = useJobsStore((s) => s.careerProfile)!;
  const addLanguage = useJobsStore((s) => s.addCandidateLanguage);
  const removeLanguage = useJobsStore((s) => s.removeCandidateLanguage);
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState('');
  const [overall, setOverall] = useState<LanguageLevel>('intermediate');

  const submit = () => {
    if (!language.trim()) return;
    addLanguage({ language: language.trim(), speaking: overall, writing: overall, reading: overall, overall });
    setLanguage('');
    setOverall('intermediate');
    setOpen(false);
  };

  return (
    <Section title="اللغات" action={<AddButton label="إضافة" onPress={() => setOpen(true)} />}>
      {cp.languages.length === 0 ? <EmptyLine text="لسه مفيش لغات مضافة." /> : cp.languages.map((l) => (
        <ListItem key={l.id} title={l.language} sub={LANGUAGE_LEVEL_LABELS[l.overall]} onRemove={() => removeLanguage(l.id)} />
      ))}
      <AddModal visible={open} title="إضافة لغة" onClose={() => setOpen(false)}>
        <FormField label="اللغة" placeholder="الإنجليزية" value={language} onChangeText={setLanguage} />
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>المستوى العام</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s4 }}>
          {(Object.keys(LANGUAGE_LEVEL_LABELS) as LanguageLevel[]).map((l) => (
            <Chip key={l} label={LANGUAGE_LEVEL_LABELS[l]} compact active={overall === l} onPress={() => setOverall(l)} />
          ))}
        </View>
        <Button onPress={submit}>إضافة</Button>
      </AddModal>
    </Section>
  );
}

// ============================================================ الشهادات
function CertificationsSection() {
  const cp = useJobsStore((s) => s.careerProfile)!;
  const addCertification = useJobsStore((s) => s.addCertification);
  const removeCertification = useJobsStore((s) => s.removeCertification);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', issuer: '', issueDate: '' });

  const submit = () => {
    if (!form.name.trim() || !form.issuer.trim()) return;
    addCertification({ ...form, issueDate: form.issueDate || new Date().toISOString() });
    setForm({ name: '', issuer: '', issueDate: '' });
    setOpen(false);
  };

  return (
    <Section title="الشهادات" action={<AddButton label="إضافة" onPress={() => setOpen(true)} />}>
      {cp.certifications.length === 0 ? <EmptyLine text="لسه مفيش شهادات مضافة." /> : cp.certifications.map((c) => (
        <ListItem key={c.id} title={c.name} sub={c.issuer} onRemove={() => removeCertification(c.id)} />
      ))}
      <AddModal visible={open} title="إضافة شهادة" onClose={() => setOpen(false)}>
        <FormField label="اسم الشهادة" placeholder="CMA" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <FormField label="الجهة المانحة" placeholder="IMA" value={form.issuer} onChangeText={(v) => setForm({ ...form, issuer: v })} />
        <FormField label="سنة الحصول عليها" placeholder="2023" keyboardType="number-pad" value={form.issueDate} onChangeText={(v) => setForm({ ...form, issueDate: v })} />
        <Button onPress={submit}>إضافة</Button>
      </AddModal>
    </Section>
  );
}

// ============================================================ الدورات
function CoursesSection() {
  const cp = useJobsStore((s) => s.careerProfile)!;
  const addCourse = useJobsStore((s) => s.addCourse);
  const removeCourse = useJobsStore((s) => s.removeCourse);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', provider: '', startDate: '' });

  const submit = () => {
    if (!form.name.trim() || !form.provider.trim()) return;
    addCourse({ ...form, startDate: form.startDate || new Date().toISOString(), skillsGained: [] });
    setForm({ name: '', provider: '', startDate: '' });
    setOpen(false);
  };

  return (
    <Section title="الدورات التدريبية" action={<AddButton label="إضافة" onPress={() => setOpen(true)} />}>
      {cp.courses.length === 0 ? <EmptyLine text="لسه مفيش دورات مضافة." /> : cp.courses.map((c) => (
        <ListItem key={c.id} title={c.name} sub={c.provider} onRemove={() => removeCourse(c.id)} />
      ))}
      <AddModal visible={open} title="إضافة دورة" onClose={() => setOpen(false)}>
        <FormField label="اسم الدورة" placeholder="Financial Modeling" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <FormField label="الجهة" placeholder="Coursera" value={form.provider} onChangeText={(v) => setForm({ ...form, provider: v })} />
        <FormField label="سنة الإتمام" placeholder="2023" keyboardType="number-pad" value={form.startDate} onChangeText={(v) => setForm({ ...form, startDate: v })} />
        <Button onPress={submit}>إضافة</Button>
      </AddModal>
    </Section>
  );
}

// ============================================================ المشاريع
function ProjectsSection() {
  const cp = useJobsStore((s) => s.careerProfile)!;
  const addProject = useJobsStore((s) => s.addProject);
  const removeProject = useJobsStore((s) => s.removeProject);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', description: '' });

  const submit = () => {
    if (!form.name.trim()) return;
    addProject({ ...form, startDate: new Date().toISOString(), technologies: [], imageUris: [] });
    setForm({ name: '', role: '', description: '' });
    setOpen(false);
  };

  return (
    <Section title="المشاريع" action={<AddButton label="إضافة" onPress={() => setOpen(true)} />}>
      {cp.projects.length === 0 ? <EmptyLine text="لسه مفيش مشاريع مضافة." /> : cp.projects.map((p) => (
        <ListItem key={p.id} title={p.name} sub={p.role} onRemove={() => removeProject(p.id)} />
      ))}
      <AddModal visible={open} title="إضافة مشروع" onClose={() => setOpen(false)}>
        <FormField label="اسم المشروع" placeholder="مثلاً: نظام محاسبي داخلي" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <FormField label="دورك في المشروع" placeholder="محاسب رئيسي" value={form.role} onChangeText={(v) => setForm({ ...form, role: v })} />
        <FormField label="الوصف" placeholder="وصف المشروع" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} multiline />
        <Button onPress={submit}>إضافة</Button>
      </AddModal>
    </Section>
  );
}

// ============================================================ بورتفوليو
function PortfolioSection() {
  const { colors, radius } = useTheme();
  const cp = useJobsStore((s) => s.careerProfile)!;
  const addItem = useJobsStore((s) => s.addPortfolioItem);
  const removeItem = useJobsStore((s) => s.removePortfolioItem);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);

  const addImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.7 });
    if (!result.canceled) setImageUris((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
  };

  const submit = () => {
    if (!title.trim()) return;
    addItem({ title: title.trim(), description, imageUris, skills: [] });
    setTitle('');
    setDescription('');
    setImageUris([]);
    setOpen(false);
  };

  return (
    <Section title="البورتفوليو" action={<AddButton label="إضافة" onPress={() => setOpen(true)} />}>
      {cp.portfolio.length === 0 ? <EmptyLine text="لسه مفيش أعمال مضافة." /> : cp.portfolio.map((p) => (
        <ListItem key={p.id} title={p.title} sub={p.description} onRemove={() => removeItem(p.id)} />
      ))}
      <AddModal visible={open} title="إضافة عمل للبورتفوليو" onClose={() => setOpen(false)}>
        <FormField label="عنوان العمل" placeholder="مثلاً: تصميم هوية بصرية" value={title} onChangeText={setTitle} />
        <FormField label="الوصف" placeholder="وصف مختصر" value={description} onChangeText={setDescription} multiline />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {imageUris.map((uri) => <Image key={uri} source={{ uri }} style={{ width: 64, height: 64, borderRadius: radius.r2, marginLeft: 8 }} />)}
          <Pressable onPress={addImages} style={{ width: 64, height: 64, borderRadius: radius.r2, borderWidth: 2, borderColor: colors.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" color={colors.ink3} />
          </Pressable>
        </ScrollView>
        <Button onPress={submit}>إضافة</Button>
      </AddModal>
    </Section>
  );
}

// ============================================================ السيرة الذاتية
function ResumeSection() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const cp = useJobsStore((s) => s.careerProfile)!;
  const addResumeFile = useJobsStore((s) => s.addResumeFile);
  const removeResumeFile = useJobsStore((s) => s.removeResumeFile);
  const setPrimary = useJobsStore((s) => s.setPrimaryResumeFile);
  const removeGeneratedResume = useJobsStore((s) => s.removeGeneratedResume);
  const requireOnline = useRequireOnline();

  const uploadCv = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] });
    if (result.canceled || !result.assets[0]) return;
    const file = result.assets[0];
    const ext = (file.name.split('.').pop() ?? 'pdf').toLowerCase() as 'pdf' | 'doc' | 'docx';
    // اختيار الملف نفسه (DocumentPicker) عملية محلية، مش محتاجة اتصال —
    // الفحص هنا بس على خطوة "الرفع/الحفظ" الفعلية (القسم 8: "Upload CV").
    requireOnline(() => {
      addResumeFile({ name: file.name, uri: file.uri, fileType: ext === 'doc' || ext === 'docx' ? ext : 'pdf', sizeBytes: file.size ?? 0 });
    });
  };

  return (
    <Section title="السيرة الذاتية (CV)" action={<AddButton label="رفع ملف" onPress={uploadCv} />}>
      {cp.resume.files.length === 0 ? (
        <EmptyLine text="لسه مرفعتش سيرة ذاتية — تقدر ترفع PDF أو Word." />
      ) : (
        cp.resume.files.map((f) => (
          <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2, paddingVertical: spacing.s2, borderBottomWidth: 1, borderBottomColor: colors.line2 }}>
            <View style={{ width: 34, height: 34, borderRadius: radius.r2, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="doc" size={15} color={colors.signal2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{f.name}</Text>
              <Text style={{ fontSize: 10, color: colors.ink3, marginTop: 1 }}>{f.fileType.toUpperCase()} · {(f.sizeBytes / 1024).toFixed(0)} كيلوبايت</Text>
            </View>
            {f.isPrimary ? (
              <View style={{ backgroundColor: colors.verifyWash, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.verify }}>أساسية</Text>
              </View>
            ) : (
              <Pressable onPress={() => setPrimary(f.id)}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.signal }}>خليها أساسية</Text>
              </Pressable>
            )}
            <Pressable onPress={() => removeResumeFile(f.id)}>
              <Icon name="trash" size={15} color={colors.danger} />
            </Pressable>
          </View>
        ))
      )}

      {cp.resume.generated.length > 0 ? (
        <View style={{ marginTop: spacing.s3 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.ink3, marginBottom: 6 }}>سير ذاتية متولّدة من ملفك</Text>
          {cp.resume.generated.map((g) => (
            <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2, paddingVertical: spacing.s2, borderBottomWidth: 1, borderBottomColor: colors.line2 }}>
              <View style={{ width: 34, height: 34, borderRadius: radius.r2, backgroundColor: colors.goldWash, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="star" size={14} color="#8A6300" />
              </View>
              <Pressable onPress={() => router.push(`/jobs/resume-view/${g.id}`)} style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{g.name}</Text>
                <Text style={{ fontSize: 10, color: colors.ink3, marginTop: 1 }}>عرض المعاينة</Text>
              </Pressable>
              <Pressable onPress={() => removeGeneratedResume(g.id)}>
                <Icon name="trash" size={15} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable onPress={() => router.push('/jobs/resume-builder')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.s3, paddingVertical: 10 }}>
        <Icon name="rocket" size={14} color={colors.signal} />
        <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.signal }}>إنشاء سيرة ذاتية من بياناتك</Text>
      </Pressable>
    </Section>
  );
}

// ============================================================ الخصوصية
function PrivacySection() {
  const { colors, spacing } = useTheme();
  const cp = useJobsStore((s) => s.careerProfile)!;
  const update = useJobsStore((s) => s.updateCareerProfile);

  return (
    <Section title="الخصوصية">
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>مين يقدر يشوف ملفك</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s4 }}>
        <Chip label="عام" compact active={cp.visibility === 'public'} onPress={() => update({ visibility: 'public' })} />
        <Chip label="أصحاب العمل بس" compact active={cp.visibility === 'employers_only'} onPress={() => update({ visibility: 'employers_only' })} />
        <Chip label="خاص" compact active={cp.visibility === 'private'} onPress={() => update({ visibility: 'private' })} />
      </View>
      <PrivacyToggle label="إظهار رقم التليفون" value={cp.showPhone} onChange={(v) => update({ showPhone: v })} />
      <PrivacyToggle label="إظهار الإيميل" value={cp.showEmail} onChange={(v) => update({ showEmail: v })} />
      <PrivacyToggle label="إظهار السيرة الذاتية لأصحاب العمل" value={cp.showCv} onChange={(v) => update({ showCv: v })} />
      <PrivacyToggle label="السماح لشركات التوظيف بالتواصل معي" value={cp.allowRecruiterContact} onChange={(v) => update({ allowRecruiterContact: v })} />
    </Section>
  );
}

function PrivacyToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text style={{ fontSize: 12, color: colors.ink }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.line, true: colors.verify }} />
    </View>
  );
}
