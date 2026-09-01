/**
 * app/legal/privacy.tsx — "سياسة الخصوصية" كانت زرار ميت. نفس ملاحظة
 * terms.tsx: نص مبدئي، قابل للتحديث من فريق قانوني حقيقي قبل النشر.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/theme/ThemeProvider';

const SECTIONS: { title: string; body: string }[] = [
  { title: '١. البيانات اللي بنجمعها', body: 'اسمك، رقم موبايلك، مدينتك، والإعلانات اللي بتنشرها — بس البيانات اللازمة عشان التطبيق يشتغل ويوصّلك بمستخدمين تانيين.' },
  { title: '٢. استخدام البيانات', body: 'بنستخدم بياناتك عشان نعرض إعلاناتك، نوصّلك بالمشترين/البائعين، ونبعتلك إشعارات عن نشاطك في التطبيق. مبنبيعش بياناتك لأي طرف تالت.' },
  { title: '٣. مشاركة البيانات', body: 'اسمك ورقم موبايلك بيظهروا للمستخدمين اللي بيتواصلوا معاك بخصوص إعلاناتك — ده جزء أساسي من فكرة المنصة (تواصل مباشر من غير وسيط).' },
  { title: '٤. حذف الحساب', body: 'تقدر تطلب حذف حسابك وكل بياناتك في أي وقت من الإعدادات. الحذف بيشيل إعلاناتك ومحادثاتك بشكل نهائي.' },
  { title: '٥. الأمان', body: 'بنستخدم تخزين آمن لحماية بياناتك. مع ذلك، احرص إنك ما تشاركش معلومات حساسة (كلمات مرور، بيانات بطاقات) مع أي مستخدم داخل الشات.' },
];

export default function Privacy() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="سياسة الخصوصية" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 60, gap: spacing.s5 }}>
        <Text style={{ fontSize: 11, color: colors.ink3 }}>آخر تحديث: أغسطس 2026</Text>
        {SECTIONS.map((s) => (
          <View key={s.title}>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 13.5, color: colors.ink, marginBottom: 6 }}>{s.title}</Text>
            <Text style={{ fontSize: 12.5, color: colors.ink2, lineHeight: 22 }}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
