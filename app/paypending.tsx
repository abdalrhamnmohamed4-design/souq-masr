/**
 * app/paypending.tsx — جديدة، نمط .empty + .expiry banner من #myads،
 * لحالة "بانتظار تأكيد الدفع" بعد أي عملية (تمييز/شحن/تحويل).
 *
 * Payments vertical (Phase 2B): topup/transfer دلوقتي حقيقيين دايمًا.
 * "تم الدفع، تحقق الآن" بقى فعليًا بيبعت طلب حقيقي (topup) أو ينفّذ
 * تحويل حقيقي فوري (transfer) — مش بيزوّد رصيد وهمي فورًا زي القديم.
 * لـtopup تحديدًا: زرار "تحقق الآن" بيبقى معناه الحقيقي "سجّل طلبي"، مش
 * "أكّد فورًا" — الرصيد الفعلي مش بيتزاد إلا لما أدمن حقيقي يوافق (شوف
 * payments.py). promote لسه محلي بالكامل (خارج النطاق، مفيش نظام تمييز
 * حقيقي في الإعلانات لسه).
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/primitives/Button';
import { useAuthGuard } from '@/components/AuthGuard';
import { useRequireOnline } from '@/lib/connectivityGuard';
import { createTopupRequest, transferBalance } from '@/services/paymentService';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

type Purpose = 'promote' | 'topup' | 'transfer';

const MESSAGES: Record<Purpose, { title: string; desc: (amount: string) => string }> = {
  promote: {
    title: 'بانتظار تأكيد الدفع',
    desc: (a) => `بعد ما تأكّد الدفع (${a} ج.م) هيتفعّل تمييز إعلانك فورًا.`,
  },
  topup: {
    title: 'بانتظار مراجعة الدفع',
    desc: (a) => `طلب شحن ${a} ج.م هيتراجع من فريقنا بعد ما نتأكد من التحويل، وهيتضاف للرصيد فور الموافقة.`,
  },
  transfer: {
    title: 'تحويل رصيد',
    desc: (a) => `هيتحوّل ${a} ج.م لصاحبك فورًا.`,
  },
};

export default function PayPending() {
  const params = useLocalSearchParams<{ purpose: Purpose; amount: string; adId?: string; planId?: string; toPhone?: string }>();
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { promoteMyAd } = useAppStore();
  const requireOnline = useRequireOnline();
  const [submitting, setSubmitting] = useState(false);
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تكمّل الدفع', description: 'العمليات المالية متاحة بس للمستخدمين المسجّلين.' });
  if (authBlock) return authBlock;

  const purpose = (params.purpose ?? 'topup') as Purpose;
  const amount = params.amount ?? '0';
  const msg = MESSAGES[purpose];

  const confirm = () =>
    requireOnline(async () => {
      if (purpose === 'promote') {
        if (params.adId) promoteMyAd(params.adId);
        router.replace('/myads');
        return;
      }

      setSubmitting(true);
      if (purpose === 'topup') {
        const r = await createTopupRequest(Number(amount));
        setSubmitting(false);
        if (r.status !== 'success') {
          Alert.alert('تعذّر إرسال الطلب', 'حصلت مشكلة، جرّب تاني.');
          return;
        }
        Alert.alert('اتسجّل طلب الشحن', 'هيتراجع من فريقنا وهيتضاف الرصيد فور الموافقة.');
        router.replace('/profile');
        return;
      }

      if (purpose === 'transfer') {
        const r = await transferBalance(params.toPhone ?? '', Number(amount));
        setSubmitting(false);
        if (r.status !== 'success') {
          Alert.alert('تعذّر التحويل', 'اتأكد إن الرقم صحيح ورصيدك كافي، وجرّب تاني.');
          return;
        }
        router.replace('/profile');
        return;
      }
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper, justifyContent: 'center', paddingHorizontal: spacing.s6 }}>
      <View
        style={{
          alignSelf: 'center',
          width: 72,
          height: 72,
          borderRadius: 24,
          backgroundColor: colors.signalWash,
          borderWidth: 1,
          borderColor: colors.signal,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.s4,
        }}
      >
        <ActivityIndicator color={colors.signal2} />
      </View>
      <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 15, color: colors.ink, textAlign: 'center' }}>{msg.title}</Text>
      <Text style={{ fontSize: 12.5, color: colors.ink3, textAlign: 'center', marginTop: spacing.s2, lineHeight: 20 }}>
        {msg.desc(amount)}
      </Text>

      <View style={{ marginTop: spacing.s6, gap: spacing.s2 }}>
        <Button disabled={submitting} onPress={confirm}>
          {purpose === 'transfer' ? 'تأكيد التحويل' : purpose === 'topup' ? 'حوّلت المبلغ، سجّل طلبي' : 'تم الدفع، تحقق الآن'}
        </Button>
        <Button variant="ghost" onPress={() => router.back()}>
          إلغاء والرجوع
        </Button>
      </View>
    </SafeAreaView>
  );
}
