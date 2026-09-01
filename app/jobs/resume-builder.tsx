/**
 * app/jobs/resume-builder.tsx — إنشاء سيرة ذاتية من بيانات ملفك المهني
 * (PART 16): اختيار قالب → معاينة حقيقية → حفظ. القوالب الخمسة مختلفة
 * فعليًا (شكل وألوان وترتيب)، مش نفس التصميم بلون مختلف.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CVPreview, RESUME_TEMPLATE_LABELS } from '@/components/CVPreview';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { useRequireOnline } from '@/lib/connectivityGuard';
import { Button } from '@/components/primitives/Button';
import { FormField } from '@/components/primitives/FormField';
import type { ResumeTemplate } from '@/mock/jobs/types';
import { useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

const TEMPLATES: ResumeTemplate[] = ['modern', 'classic', 'professional', 'minimal', 'executive'];
const TEMPLATE_SWATCH: Record<ResumeTemplate, string> = {
  modern: '#F4511E', classic: '#0F1A2E', professional: '#0F1A2E', minimal: '#9AA1AE', executive: '#1A1A1A',
};

export default function ResumeBuilder() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const careerProfile = useJobsStore((s) => s.careerProfile);
  const addGeneratedResume = useJobsStore((s) => s.addGeneratedResume);

  const [step, setStep] = useState<'template' | 'preview'>('template');
  const [template, setTemplate] = useState<ResumeTemplate>('modern');
  const [name, setName] = useState('السيرة الذاتية العامة');
  const requireOnline = useRequireOnline();
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تعمل سيرتك الذاتية', description: 'إنشاء السيرة الذاتية محتاج ملفك المهني — سجّل دخولك الأول.' });
  if (authBlock) return authBlock;

  if (!careerProfile || (!careerProfile.fullName && careerProfile.experience.length === 0 && careerProfile.education.length === 0)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: spacing.s6 }}>
        <Icon name="id" color={colors.ink3} size={26} />
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.ink, marginTop: spacing.s3, textAlign: 'center' }}>
          كمّل ملفك المهني الأول
        </Text>
        <Text style={{ fontSize: 12, color: colors.ink3, textAlign: 'center', marginTop: spacing.s2, lineHeight: 20 }}>
          عشان ننشئلك سيرة ذاتية حقيقية محتاجين على الأقل اسمك وخبرة أو تعليم واحد.
        </Text>
        <View style={{ marginTop: spacing.s5, width: '100%' }}>
          <Button onPress={() => router.replace('/jobs/profile')}>روح لملفي المهني</Button>
        </View>
      </View>
    );
  }

  const save = () =>
    requireOnline(() => {
      addGeneratedResume({ name: name.trim() || RESUME_TEMPLATE_LABELS[template], template });
      router.back();
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="إنشاء سيرة ذاتية" onBack={() => (step === 'preview' ? setStep('template') : router.back())} />
      {step === 'template' ? (
        <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 130 + insets.bottom }}>
          <Text style={{ fontSize: 12.5, color: colors.ink2, marginBottom: spacing.s4, lineHeight: 20 }}>اختار شكل السيرة الذاتية — البيانات هتتولّد أوتوماتيك من ملفك المهني.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s3 }}>
            {TEMPLATES.map((tpl) => (
              <Pressable
                key={tpl}
                onPress={() => setTemplate(tpl)}
                style={{ width: '47%', borderRadius: radius.r3, borderWidth: 2, borderColor: template === tpl ? colors.signal : colors.line, overflow: 'hidden', backgroundColor: colors.card }}
              >
                <View style={{ height: 70, backgroundColor: TEMPLATE_SWATCH[tpl] }} />
                <View style={{ padding: spacing.s3, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{RESUME_TEMPLATE_LABELS[tpl]}</Text>
                </View>
                {template === tpl ? (
                  <View style={{ position: 'absolute', top: 8, left: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.signal, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={12} color="#fff" />
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 130 + insets.bottom }}>
          <FormField label="اسم السيرة الذاتية" placeholder="مثلاً: سيرة المحاسبة" value={name} onChangeText={setName} />
          <CVPreview profile={careerProfile} template={template} />
        </ScrollView>
      )}

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s4, paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 + insets.bottom }}>
        {step === 'template' ? (
          <Button onPress={() => setStep('preview')}>معاينة السيرة</Button>
        ) : (
          <Button onPress={save}>حفظ السيرة الذاتية</Button>
        )}
      </View>
    </View>
  );
}
