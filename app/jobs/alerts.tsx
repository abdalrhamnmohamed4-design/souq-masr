/**
 * app/jobs/alerts.tsx — تنبيهات وظائف (PART 20): معايير محفوظة، مفيش
 * إشعار push حقيقي بيتولّد أوتوماتيك من غير باك إند يفحص وظائف جديدة —
 * الشاشة دي بتخزن المعيار بس (البنية جاهزة لما السيرفر يبقى موجود).
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/primitives/Button';
import { Chip } from '@/components/primitives/Chip';
import { EmptyState } from '@/components/primitives/EmptyState';
import { FormField } from '@/components/primitives/FormField';
import { WORK_TYPE_LABELS, type WorkType } from '@/mock/jobs/types';
import { useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function JobAlerts() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const jobAlerts = useJobsStore((s) => s.jobAlerts);
  const addJobAlert = useJobsStore((s) => s.addJobAlert);
  const removeJobAlert = useJobsStore((s) => s.removeJobAlert);

  const [creating, setCreating] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [city, setCity] = useState('');
  const [workType, setWorkType] = useState<WorkType | null>(null);
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تعمل تنبيهات وظائف', description: 'تنبيهات الوظائف الجديدة متاحة بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const submit = () => {
    if (!keywords.trim() && !city.trim() && !workType) return;
    addJobAlert({ keywords: keywords.trim() || undefined, city: city.trim() || undefined, workType: workType ?? undefined });
    setKeywords('');
    setCity('');
    setWorkType(null);
    setCreating(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader
        title="تنبيهات الوظائف"
        right={
          <Pressable onPress={() => setCreating((v) => !v)}>
            <Icon name={creating ? 'x' : 'plus'} color={colors.ink} />
          </Pressable>
        }
      />
      {creating ? (
        <ScrollView contentContainerStyle={{ padding: spacing.s5 }}>
          <FormField label="كلمات مفتاحية" placeholder="مثلاً: محاسب" value={keywords} onChangeText={setKeywords} />
          <FormField label="المدينة" placeholder="مثلاً: القاهرة" value={city} onChangeText={setCity} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>نوع الدوام</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s5 }}>
            {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((wt) => (
              <Chip key={wt} label={WORK_TYPE_LABELS[wt]} compact active={workType === wt} onPress={() => setWorkType(workType === wt ? null : wt)} />
            ))}
          </View>
          <Button onPress={submit}>حفظ التنبيه</Button>
        </ScrollView>
      ) : jobAlerts.length === 0 ? (
        <EmptyState
          icon={<Icon name="bell" color={colors.ink3} size={26} />}
          title="لسه مفيش تنبيهات"
          description="احفظ معايير بحثك (مهنة، مدينة، نوع دوام) وهنجهّزلك نفس التجربة تلقائيًا لما السيرفر يبقى شغال."
          actionLabel="إضافة تنبيه"
          onAction={() => setCreating(true)}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.s5, gap: spacing.s3 }}>
          {jobAlerts.map((a) => (
            <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}>
              <View style={{ width: 38, height: 38, borderRadius: radius.r2, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bell" size={16} color={colors.signal2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>
                  {[a.keywords, a.city, a.workType ? WORK_TYPE_LABELS[a.workType] : null].filter(Boolean).join(' · ') || 'كل الوظائف'}
                </Text>
              </View>
              <Pressable
                onPress={() => Alert.alert('حذف التنبيه', 'متأكد؟', [{ text: 'إلغاء', style: 'cancel' }, { text: 'حذف', style: 'destructive', onPress: () => removeJobAlert(a.id) }])}
              >
                <Icon name="trash" size={16} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
