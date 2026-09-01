/**
 * app/pay.tsx — يقابل .payline/.plan + .field من نمط #promote — شحن
 * رصيد إعلانات للمحفظة. بعد اختيار المبلغ، بتظهر أرقام الدفع الحقيقية
 * اللي الأدمن ضايفها من لوحة التحكم (mock/paymentNumbers.ts) عشان
 * العميل يعرف يحوّل فين قبل ما يأكد إنه دفع — قبل كده الشاشة كانت بتقفز
 * على طول لـ"تأكيد الدفع" من غير ما تقول للعميل يبعت لمين.
 */
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/primitives/Button';
import { FormField } from '@/components/primitives/FormField';
import { getActivePaymentNumbers, METHOD_LABEL } from '@/mock/paymentNumbers';
import { useTheme } from '@/theme/ThemeProvider';

const AMOUNTS = [50, 100, 250, 500];

export default function Pay() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState(100);
  const [custom, setCustom] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشحن رصيدك', description: 'شحن المحفظة عملية مالية — لازم تكون مسجّل دخولك الأول.' });
  if (authBlock) return authBlock;

  const finalAmount = custom ? Number(custom.replace(/[^0-9]/g, '')) || 0 : amount;
  const activeNumbers = getActivePaymentNumbers();

  const copyNumber = async (id: string, number: string) => {
    await Clipboard.setStringAsync(number);
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1600);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="اشحن رصيد" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.s5, paddingBottom: 130 }}>
        <Text style={{ fontSize: 12.5, color: colors.ink2, marginBottom: spacing.s4, lineHeight: 21 }}>
          رصيد الإعلانات بتقدر تستخدمه في تمييز الإعلانات أو تحويله لصديق.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2, marginBottom: spacing.s4 }}>
          {AMOUNTS.map((a) => {
            const active = !custom && amount === a;
            return (
              <Pressable
                key={a}
                onPress={() => {
                  setAmount(a);
                  setCustom('');
                }}
                style={{
                  width: '47%',
                  paddingVertical: 18,
                  alignItems: 'center',
                  backgroundColor: active ? colors.signalWash : colors.card,
                  borderWidth: 1.5,
                  borderColor: active ? colors.signal : colors.line,
                  borderRadius: radius.r3,
                }}
              >
                <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 18, color: colors.ink }}>{a} ج.م</Text>
              </Pressable>
            );
          })}
        </View>

        <FormField label="أو اكتب مبلغ آخر" placeholder="0" value={custom} onChangeText={setCustom} keyboardType="number-pad" isPrice />

        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: colors.ink, marginTop: spacing.s3, marginBottom: spacing.s3 }}>
          حوّل {finalAmount > 0 ? `${finalAmount.toLocaleString('en-US')} ج.م` : 'المبلغ'} على واحد من الأرقام دي
        </Text>

        {activeNumbers.length === 0 ? (
          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed', borderRadius: radius.r3, padding: spacing.s4, alignItems: 'center', gap: spacing.s2 }}>
            <Icon name="info" color={colors.ink3} size={20} />
            <Text style={{ fontSize: 11.5, color: colors.ink3, textAlign: 'center', lineHeight: 18 }}>
              لسه مفيش وسيلة دفع متاحة دلوقتي. تواصل مع الدعم وهنساعدك تشحن رصيدك.
            </Text>
            <Pressable onPress={() => router.push('/support')}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.signal }}>تواصل مع الدعم</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: spacing.s2 }}>
            {activeNumbers.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.ink3 }}>{METHOD_LABEL[p.method]} · {p.holderName}</Text>
                  <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 15, color: colors.ink, fontVariant: ['tabular-nums'], marginTop: 2 }}>{p.number}</Text>
                </View>
                <Pressable
                  onPress={() => copyNumber(p.id, p.number)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, paddingVertical: 8, paddingHorizontal: 11 }}
                >
                  <Icon name={copiedId === p.id ? 'check' : 'copy'} size={14} color={colors.ink} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink }}>{copiedId === p.id ? 'اتنسخ' : 'نسخ'}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s4, paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 + insets.bottom }}>
        <Button
          disabled={finalAmount <= 0 || activeNumbers.length === 0}
          onPress={() => router.push({ pathname: '/paypending', params: { purpose: 'topup', amount: String(finalAmount) } })}
        >
          حوّلت المبلغ، تأكيد الدفع
        </Button>
      </View>
    </View>
  );
}
