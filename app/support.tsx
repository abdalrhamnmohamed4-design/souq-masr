/**
 * app/support.tsx — "المساعدة والدعم" كانت زرار ميت. فورم تذكرة دعم
 * حقيقي بيتخزن محليًا (store → supportTickets)، جاهز يتحوّل لـ API تذاكر
 * حقيقي لما يتوصّل الـERP.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/primitives/Button';
import { FormField } from '@/components/primitives/FormField';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

const STATUS_LABEL = { open: 'قيد المراجعة', answered: 'تم الرد', closed: 'مغلقة' } as const;

export default function Support() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const tickets = useAppStore((s) => s.supportTickets);
  const addSupportTicket = useAppStore((s) => s.addSupportTicket);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تفتح تذكرة دعم', description: 'محتاجين نعرف مين بيتواصل معانا — سجّل دخولك الأول.' });
  if (authBlock) return authBlock;

  const canSend = subject.trim().length >= 3 && message.trim().length >= 10;

  const send = () => {
    addSupportTicket({ subject: subject.trim(), message: message.trim() });
    setSubject('');
    setMessage('');
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="المساعدة والدعم" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 60 }}>
        <Text style={{ fontSize: 12, color: colors.ink3, marginBottom: spacing.s4, lineHeight: 20 }}>
          واجهتك مشكلة أو عندك سؤال؟ ابعتلنا تفاصيلها وهنرد عليك في أقرب وقت.
        </Text>
        <FormField label="الموضوع" placeholder="مثلاً: مشكلة في نشر إعلان" value={subject} onChangeText={setSubject} />
        <FormField label="الرسالة" placeholder="اشرح المشكلة بالتفصيل..." value={message} onChangeText={setMessage} multiline maxLength={500} showCounter />
        <Button disabled={!canSend} onPress={send}>
          {sent ? 'اتبعتت ✓' : 'إرسال'}
        </Button>

        {tickets.length > 0 ? (
          <>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13.5, color: colors.ink, marginTop: spacing.s6, marginBottom: spacing.s3 }}>
              طلباتك السابقة
            </Text>
            {tickets.map((t) => (
              <View key={t.id} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3, marginBottom: spacing.s2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{t.subject}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="clock" size={11} color={colors.ink3} />
                    <Text style={{ fontSize: 10, color: colors.ink3 }}>{STATUS_LABEL[t.status]}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: colors.ink2, marginTop: 5, lineHeight: 17 }}>{t.message}</Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
