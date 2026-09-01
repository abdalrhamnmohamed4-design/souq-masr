/**
 * app/paypending.tsx — جديدة، نمط .empty + .expiry banner من #myads،
 * لحالة "بانتظار تأكيد الدفع" بعد أي عملية (تمييز/شحن/تحويل).
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/primitives/Button';
import { useAuthGuard } from '@/components/AuthGuard';
import { useRequireOnline } from '@/lib/connectivityGuard';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

type Purpose = 'promote' | 'topup' | 'transfer';

const MESSAGES: Record<Purpose, { title: string; desc: (amount: string) => string }> = {
  promote: {
    title: 'بانتظار تأكيد الدفع',
    desc: (a) => `بعد ما تأكّد الدفع (${a} ج.م) هيتفعّل تمييز إعلانك فورًا.`,
  },
  topup: {
    title: 'بانتظار تأكيد الدفع',
    desc: (a) => `بعد ما تأكّد الدفع هيتضاف ${a} ج.م لرصيد إعلاناتك.`,
  },
  transfer: {
    title: 'بانتظار تأكيد التحويل',
    desc: (a) => `بعد ما تأكّد هيتحوّل ${a} ج.م لصاحبك.`,
  },
};

export default function PayPending() {
  const params = useLocalSearchParams<{ purpose: Purpose; amount: string; adId?: string; planId?: string; toPhone?: string }>();
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { promoteMyAd, topUp, transfer } = useAppStore();
  const requireOnline = useRequireOnline();
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تكمّل الدفع', description: 'العمليات المالية متاحة بس للمستخدمين المسجّلين.' });
  if (authBlock) return authBlock;

  const purpose = (params.purpose ?? 'topup') as Purpose;
  const amount = params.amount ?? '0';
  const msg = MESSAGES[purpose];

  const confirm = () =>
    requireOnline(() => {
      if (purpose === 'promote' && params.adId) promoteMyAd(params.adId);
      if (purpose === 'topup') topUp(purpose === 'topup' ? Number(amount) : 0);
      if (purpose === 'transfer') transfer(Number(amount), params.toPhone ?? '');

      if (purpose === 'promote') router.replace('/myads');
      else router.replace('/profile');
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

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.signalWash, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'center', marginTop: spacing.s4 }}>
        <Icon name="clock" size={13} color={colors.signal2} />
        <Text style={{ fontSize: 10, color: colors.signal2, fontVariant: ['tabular-nums'] }}>معلّق منذ لحظات</Text>
      </View>

      <View style={{ marginTop: spacing.s6, gap: spacing.s2 }}>
        <Button onPress={confirm}>تم الدفع، تحقق الآن</Button>
        <Button variant="ghost" onPress={() => router.back()}>
          إلغاء والرجوع
        </Button>
      </View>
    </SafeAreaView>
  );
}
