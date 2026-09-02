/**
 * app/jobs/applicants.tsx — متقدّمون هذه الوظيفة (PART 32/33): إدارة
 * حالة كل طلب + جدولة مقابلات حقيقية.
 *
 * Phase 2B — Jobs + Services Mobile Wiring: وظيفة حقيقية (JOB-#####) هنا
 * معناها فرع كامل حقيقي — get_applications_for_job (403 سيرفري لأي حد
 * غير صاحب الوظيفة، مش بس إخفاء واجهة) + get_interviews_for_job (دفعة
 * واحدة بدل نداء لكل متقدّم). وظيفة mock قديمة لسه بتشتغل بالسلوك
 * القديم بالظبط، بما فيه ملحوظة "المتقدّم الوحيد هو المستخدم الحالي".
 * السيرة الذاتية: مفيش عارض ملفات في التطبيق لسه (get_application_resume
 * موجود وشغّال في الباك إند، بيرجّع base64 — بس مفيش UI/مكتبة تحميل
 * ملفات متوصلة بيه في الشاشة دي، فده فجوة موثّقة بدل ما نلفّق رابط أو
 * نضيف مكتبة تحميل ملفات جديدة من غير ما يتطلب الأمر).
 */
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiStateView } from '@/components/ApiStateView';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/primitives/Button';
import { Chip } from '@/components/primitives/Chip';
import { EmptyState } from '@/components/primitives/EmptyState';
import { FormField } from '@/components/primitives/FormField';
import { useApiResult } from '@/hooks/useApiResult';
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from '@/mock/jobs/types';
import { getJob, isRealJobId } from '@/services/jobService';
import { getApplicationsForJob, setApplicationStatus as setApplicationStatusReal, type RealApplication } from '@/services/jobApplicationService';
import { getInterviewsForJob, scheduleInterview as scheduleInterviewReal } from '@/services/jobInterviewService';
import { useJobById, useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

const ACTIONS: { status: ApplicationStatus; label: string }[] = [
  { status: 'shortlisted', label: 'قايمة مختصرة' },
  { status: 'interview', label: 'مقابلة' },
  { status: 'offer', label: 'عرض عمل' },
  { status: 'rejected', label: 'رفض' },
];

export default function Applicants() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const isReal = isRealJobId(jobId);

  const mockJob = useJobById(!isReal ? jobId : undefined);
  const mockApplications = useJobsStore((s) => s.applications);
  const setStatusMock = useJobsStore((s) => s.setApplicationStatus);
  const careerProfile = useJobsStore((s) => s.careerProfile);
  const mockInterviews = useJobsStore((s) => s.interviews);
  const scheduleInterviewMock = useJobsStore((s) => s.scheduleInterview);

  const { state: jobState } = useApiResult(() => (isReal && jobId ? getJob(jobId) : Promise.resolve({ status: 'not_found' as const })), [jobId, isReal]);
  const { state: appsState, refetch: refetchApps } = useApiResult(
    () => (isReal && jobId ? getApplicationsForJob(jobId, 1, 100) : Promise.resolve({ status: 'success' as const, data: { items: [] as RealApplication[], total: 0, page: 1, limit: 100 } })),
    [jobId, isReal],
  );
  const { state: interviewsState, refetch: refetchInterviews } = useApiResult(
    () => (isReal && jobId ? getInterviewsForJob(jobId) : Promise.resolve({ status: 'success' as const, data: { items: [] } })),
    [jobId, isReal],
  );

  const [scheduleFor, setScheduleFor] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState('11:00 ص');
  const [location, setLocation] = useState('');
  const [mode, setMode] = useState<'online' | 'in_person'>('in_person');
  const [notes, setNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تدير المتقدّمين', description: 'إدارة المتقدّمين على وظيفتك متاحة بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const jobApplicationsMock = mockApplications.filter((a) => a.jobId === jobId);
  const jobTitle = isReal ? (jobState.kind === 'success' ? jobState.data.title : undefined) : mockJob?.title;

  const setStatusReal = async (applicationId: string, status: ApplicationStatus) => {
    const r = await setApplicationStatusReal(applicationId, status as any);
    if (r.status !== 'success') {
      Alert.alert('تعذّر تحديث الحالة', 'حصلت مشكلة، جرّب تاني.');
      return;
    }
    refetchApps();
  };

  const submitInterview = async () => {
    if (!scheduleFor) return;
    if (isReal) {
      setScheduling(true);
      const r = await scheduleInterviewReal(scheduleFor, date.toISOString().slice(0, 10), time, mode, location.trim() || undefined, notes.trim() || undefined);
      setScheduling(false);
      if (r.status !== 'success') {
        Alert.alert('تعذّر جدولة المقابلة', 'حصلت مشكلة، جرّب تاني.');
        return;
      }
      refetchApps();
      refetchInterviews();
    } else if (jobId) {
      scheduleInterviewMock({
        applicationId: scheduleFor, jobId, candidateSellerId: 'me',
        date: date.toISOString(), time, location: location.trim() || undefined, mode, notes: notes.trim() || undefined,
      });
      setStatusMock(scheduleFor, 'interview');
    }
    setScheduleFor(null);
    setLocation('');
    setNotes('');
  };

  const realItems = appsState.kind === 'success' ? appsState.data.items : [];
  const realInterviews = interviewsState.kind === 'success' ? interviewsState.data.items : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title={jobTitle ? `متقدّمون: ${jobTitle}` : 'المتقدّمون'} onBack={() => router.back()} />

      {isReal ? (
        appsState.kind === 'loading' ? (
          <ApiStateView state={appsState} />
        ) : appsState.kind !== 'success' ? (
          <View style={{ paddingHorizontal: spacing.s5, marginTop: spacing.s3 }}>
            <ApiStateView state={appsState} onRetry={refetchApps} />
          </View>
        ) : realItems.length === 0 ? (
          <EmptyState
            icon={<Icon name="user" color={colors.ink3} size={26} />}
            title="لسه مفيش متقدّمين"
            description="أول ما حد يقدّم على الوظيفة دي، هتلاقي طلبه هنا مع كل بياناته."
          />
        ) : (
          <ScrollView contentContainerStyle={{ padding: spacing.s5, gap: spacing.s3 }}>
            {realItems.map((a) => {
              const interview = realInterviews.find((iv) => iv.application === a.id);
              return (
                <View key={a.id} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{a.fullName}</Text>
                      <Text style={{ fontSize: 10.5, color: colors.ink3, marginTop: 2 }}>
                        اتقدّم {new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long' }).format(new Date(a.appliedAt))}
                        {a.phone ? ` · ${a.phone}` : ''}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: colors.signalWash, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.signal2 }}>{APPLICATION_STATUS_LABELS[a.status]}</Text>
                    </View>
                  </View>
                  {a.coverLetter ? <Text style={{ fontSize: 11.5, color: colors.ink2, marginTop: 8, lineHeight: 18 }}>{a.coverLetter}</Text> : null}
                  {a.hasResume ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
                      <Icon name="doc" size={13} color={colors.ink3} />
                      <Text style={{ fontSize: 11, color: colors.ink3 }}>مرفق سيرة ذاتية</Text>
                    </View>
                  ) : null}

                  {interview ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.verifyWash, borderRadius: radius.r2, padding: 10, marginTop: 10 }}>
                      <Icon name="clock" size={14} color={colors.verify} />
                      <Text style={{ fontSize: 11, color: colors.verify, flex: 1 }}>
                        مقابلة {interview.date ? new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long' }).format(new Date(interview.date)) : ''} — {interview.time}
                      </Text>
                    </View>
                  ) : null}

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {ACTIONS.map((act) => (
                      <Pressable
                        key={act.status}
                        onPress={() => (act.status === 'interview' ? setScheduleFor(a.id) : setStatusReal(a.id, act.status))}
                        style={{ backgroundColor: a.status === act.status ? colors.ink : colors.paper, borderWidth: 1, borderColor: a.status === act.status ? colors.ink : colors.line, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 }}
                      >
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: a.status === act.status ? '#fff' : colors.ink2 }}>
                          {act.status === 'interview' && interview ? 'تعديل المقابلة' : act.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )
      ) : jobApplicationsMock.length === 0 ? (
        <EmptyState
          icon={<Icon name="user" color={colors.ink3} size={26} />}
          title="لسه مفيش متقدّمين"
          description="أول ما حد يقدّم على الوظيفة دي، هتلاقي طلبه هنا مع كل بياناته وسيرته الذاتية."
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.s5, gap: spacing.s3 }}>
          {jobApplicationsMock.map((a) => {
            const interview = mockInterviews.find((iv) => iv.applicationId === a.id);
            return (
              <View key={a.id} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{careerProfile?.fullName || 'مستخدم سوق مصر'}</Text>
                    <Text style={{ fontSize: 10.5, color: colors.ink3, marginTop: 2 }}>
                      اتقدّم {new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long' }).format(new Date(a.appliedAt))}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: colors.signalWash, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.signal2 }}>{APPLICATION_STATUS_LABELS[a.status]}</Text>
                  </View>
                </View>
                {a.coverLetter ? <Text style={{ fontSize: 11.5, color: colors.ink2, marginTop: 8, lineHeight: 18 }}>{a.coverLetter}</Text> : null}
                <Pressable onPress={() => router.push('/jobs/profile')} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
                  <Icon name="id" size={13} color={colors.signal} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.signal }}>عرض الملف المهني والسيرة الذاتية</Text>
                </Pressable>

                {interview ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.verifyWash, borderRadius: radius.r2, padding: 10, marginTop: 10 }}>
                    <Icon name="clock" size={14} color={colors.verify} />
                    <Text style={{ fontSize: 11, color: colors.verify, flex: 1 }}>
                      مقابلة {new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long' }).format(new Date(interview.date))} — {interview.time}
                    </Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {ACTIONS.map((act) => (
                    <Pressable
                      key={act.status}
                      onPress={() => (act.status === 'interview' ? setScheduleFor(a.id) : setStatusMock(a.id, act.status))}
                      style={{ backgroundColor: a.status === act.status ? colors.ink : colors.paper, borderWidth: 1, borderColor: a.status === act.status ? colors.ink : colors.line, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 }}
                    >
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: a.status === act.status ? '#fff' : colors.ink2 }}>
                        {act.status === 'interview' && interview ? 'تعديل المقابلة' : act.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={!!scheduleFor} transparent animationType="slide" onRequestClose={() => setScheduleFor(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,26,46,.55)', justifyContent: 'flex-end' }} onPress={() => setScheduleFor(null)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: spacing.s5, paddingBottom: spacing.s5 + insets.bottom }}>
            <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 15, color: colors.ink, marginBottom: spacing.s4 }}>جدولة مقابلة</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>التاريخ</Text>
            <Pressable onPress={() => setShowDatePicker(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: 12, marginBottom: spacing.s4 }}>
              <Icon name="clock" size={15} color={colors.ink3} />
              <Text style={{ fontSize: 12, color: colors.ink }}>{new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)}</Text>
            </Pressable>
            {showDatePicker ? (
              <DateTimePicker value={date} mode="date" minimumDate={new Date()} onChange={(e, d) => { setShowDatePicker(false); if (e.type === 'set' && d) setDate(d); }} />
            ) : null}
            <FormField label="الوقت" placeholder="11:00 ص" value={time} onChangeText={setTime} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>نوع المقابلة</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.s4 }}>
              <Chip label="حضوري" compact active={mode === 'in_person'} onPress={() => setMode('in_person')} />
              <Chip label="أونلاين" compact active={mode === 'online'} onPress={() => setMode('online')} />
            </View>
            <FormField label={mode === 'in_person' ? 'مكان المقابلة' : 'رابط المقابلة'} placeholder={mode === 'in_person' ? 'عنوان الشركة' : 'رابط Zoom/Meet'} value={location} onChangeText={setLocation} />
            <FormField label="ملاحظات (اختياري)" placeholder="أي تفاصيل إضافية للمتقدّم" value={notes} onChangeText={setNotes} multiline />
            <Button disabled={scheduling} onPress={submitInterview}>تأكيد الجدولة</Button>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
