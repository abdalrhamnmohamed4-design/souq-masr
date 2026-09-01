/**
 * app/transfer.tsx — جديدة، نمط .wallet + .field + .sharerow من #profile
 * لتحويل رصيد لصديق.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/primitives/Button';
import { FormField } from '@/components/primitives/FormField';
import { isValidEgyptianPhone } from '@/lib/validation';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function Transfer() {
  const router = useRouter();
  const { colors, spacing, radius, brandDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const adsBalance = useAppStore((s) => s.adsBalance);
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تحوّل رصيد', description: 'تحويل الرصيد عملية مالية — لازم تكون مسجّل دخولك الأول.' });
  if (authBlock) return authBlock;

  const amountNum = Number(amount.replace(/[^0-9]/g, '')) || 0;
  const canSend = isValidEgyptianPhone(phone) && amountNum > 0 && amountNum <= adsBalance;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="تحويل رصيد" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.s5, paddingBottom: 130 }}>
        <View style={{ backgroundColor: brandDark, borderRadius: radius.r3, padding: spacing.s4, marginBottom: spacing.s5 }}>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>رصيد الإعلانات المتاح</Text>
          <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 22, color: '#fff', marginTop: 4 }}>{adsBalance} ج.م</Text>
        </View>

        <FormField label="رقم موبايل صاحبك" placeholder="01xxxxxxxxx" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {phone.trim().length > 0 && !isValidEgyptianPhone(phone) ? (
          <Text style={{ fontSize: 11, color: colors.danger, marginTop: -8, marginBottom: spacing.s4 }}>رقم موبايل مصري غير صحيح</Text>
        ) : null}
        <FormField label="المبلغ" value={amount} onChangeText={setAmount} keyboardType="number-pad" isPrice />

        {amountNum > adsBalance ? (
          <Text style={{ fontSize: 11, color: colors.danger, marginTop: -8 }}>المبلغ أكبر من رصيدك المتاح</Text>
        ) : null}
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s4, paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 + insets.bottom }}>
        <Button
          disabled={!canSend}
          onPress={() => router.push({ pathname: '/paypending', params: { purpose: 'transfer', amount: String(amountNum), toPhone: phone } })}
        >
          حوّل الرصيد
        </Button>
      </View>
    </View>
  );
}
