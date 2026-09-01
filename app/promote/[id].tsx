/**
 * app/promote/[id].tsx — يقابل #promote: شرح + 3 باقات + ملخص دفع + CTA لاصق.
 */
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/primitives/Button';
import { getActivePaymentNumbers, METHOD_LABEL } from '@/mock/paymentNumbers';
import { promotePlans } from '@/mock/plans';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function Promote() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [planId, setPlanId] = useState('3d');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const promoBalance = useAppStore((s) => s.promoBalance);
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تميّز إعلانك', description: 'تمييز الإعلان عملية دفع — لازم تكون مسجّل دخولك الأول.' });
  if (authBlock) return authBlock;

  const plan = promotePlans.find((p) => p.id === planId)!;
  const amountDue = Math.max(0, plan.price - promoBalance);
  const activeNumbers = getActivePaymentNumbers();

  const copyNumber = async (numId: string, number: string) => {
    await Clipboard.setStringAsync(number);
    setCopiedId(numId);
    setTimeout(() => setCopiedId((c) => (c === numId ? null : c)), 1600);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="ميّز إعلانك" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        <Text style={{ fontSize: 12.5, color: colors.ink2, paddingHorizontal: spacing.s5, paddingBottom: spacing.s4, lineHeight: 21 }}>
          الإعلان المميز بيظهر في أول نتائج البحث وفي قسم "مميزة" على الصفحة الرئيسية. الأرقام دي متوسط زيادة المشاهدات على إعلانات شبه إعلانك.
        </Text>

        {promotePlans.map((p) => {
          const active = p.id === planId;
          return (
            <Pressable
              key={p.id}
              onPress={() => setPlanId(p.id)}
              style={{
                marginHorizontal: spacing.s5,
                marginBottom: spacing.s3,
                backgroundColor: colors.card,
                borderWidth: 2,
                borderColor: active ? colors.signal : colors.line,
                borderRadius: radius.r3,
                padding: spacing.s4,
                position: 'relative',
              }}
            >
              {p.best ? (
                <View style={{ position: 'absolute', top: -9, right: spacing.s4, backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>الأكثر اختيارًا</Text>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.ink }}>{p.duration}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontFamily: 'Cairo_900Black', fontSize: 16, color: colors.ink }}>{p.price} ج.م</Text>
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: active ? colors.signal : colors.line, alignItems: 'center', justifyContent: 'center' }}>
                    {active ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.signal }} /> : null}
                  </View>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: colors.ink3, marginTop: 6, lineHeight: 18 }}>{p.description}</Text>
            </Pressable>
          );
        })}

        <View style={{ marginTop: spacing.s2 }}>
          <PayLine label={`باقة ${plan.duration}`} value={`${plan.price} ج.م`} />
          <PayLine label="من رصيد التمييز" value={`− ${Math.min(promoBalance, plan.price)} ج.م`} tone="verify" />
          <PayLine label="الإجمالي" value={`${amountDue} ج.م`} total />
        </View>

        {amountDue > 0 ? (
          <View style={{ marginTop: spacing.s4 }}>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13, color: colors.ink, marginBottom: spacing.s3 }}>
              حوّل {amountDue.toLocaleString('en-US')} ج.م على واحد من الأرقام دي
            </Text>
            {activeNumbers.length === 0 ? (
              <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed', borderRadius: radius.r3, padding: spacing.s4, alignItems: 'center', gap: spacing.s2 }}>
                <Icon name="info" color={colors.ink3} size={20} />
                <Text style={{ fontSize: 11.5, color: colors.ink3, textAlign: 'center', lineHeight: 18 }}>
                  لسه مفيش وسيلة دفع متاحة دلوقتي. تواصل مع الدعم عشان تكمّل التمييز.
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
          </View>
        ) : null}
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s4, paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 + insets.bottom }}>
        <Button
          icon={<Icon name="rocket" color="#fff" size={18} />}
          disabled={amountDue > 0 && activeNumbers.length === 0}
          onPress={() => router.push({ pathname: '/paypending', params: { purpose: 'promote', adId: id, amount: String(plan.price), planId } })}
        >
          {amountDue > 0 ? 'حوّلت المبلغ، تأكيد الدفع' : 'ادفع لتمييز الإعلان'}
        </Button>
      </View>
    </View>
  );
}

function PayLine({ label, value, total, tone }: { label: string; value: string; total?: boolean; tone?: 'verify' }) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.s5,
        paddingVertical: total ? spacing.s3 : spacing.s2,
        borderTopWidth: total ? 1 : 0,
        borderTopColor: colors.line,
        marginTop: total ? spacing.s2 : 0,
      }}
    >
      <Text style={{ fontSize: total ? 14 : 12.5, fontFamily: total ? 'Cairo_800ExtraBold' : undefined, color: colors.ink }}>{label}</Text>
      <Text style={{ fontSize: total ? 14 : 12.5, fontFamily: total ? 'Cairo_800ExtraBold' : undefined, color: tone === 'verify' ? colors.verify : colors.ink }}>
        {value}
      </Text>
    </View>
  );
}
