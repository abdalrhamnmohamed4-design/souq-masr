/**
 * app/legal/terms.tsx — "شروط الاستخدام" كانت زرار ميت. محتوى قانوني
 * عام مناسب لتطبيق إعلانات مبوّبة (النموذج المعتاد لمنصات زي ده) — نص
 * مبدئي قابل للتحديث لاحقًا من فريق قانوني حقيقي قبل النشر الفعلي.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/theme/ThemeProvider';

const SECTIONS: { title: string; body: string }[] = [
  { title: '١. طبيعة الخدمة', body: 'سوق مصر منصة إعلانات مبوّبة بتربط بين البائع والمشتري مباشرة. سوق مصر مش طرف في أي عملية بيع أو شراء، ومبياخدش عمولة، ومش مسؤول عن جودة أو مطابقة السلع والخدمات المعروضة.' },
  { title: '٢. مسؤولية المستخدم', body: 'إنت مسؤول عن دقة بيانات إعلاناتك وصور المنتج، وعن التحقق من الطرف التاني قبل إتمام أي عملية. متشاركش بيانات حساسة (رقم البطاقة، كلمات مرور) مع أي مستخدم آخر.' },
  { title: '٣. المحتوى المرفوض', body: 'ممنوع نشر سلع أو خدمات مخالفة للقانون المصري، محتوى مضلّل، إعلانات مكررة، أو انتحال شخصية. سوق مصر له الحق يحذف أي إعلان مخالف أو يوقف الحساب من غير إشعار مسبق.' },
  { title: '٤. الحسابات', body: 'بيانات حسابك (الاسم ورقم الموبايل) بتستخدم للتواصل معاك ولإظهار هويتك للمستخدمين التانيين. إنت مسؤول عن سرية بيانات الدخول لحسابك.' },
  { title: '٥. التعديلات', body: 'ممكن نعدّل الشروط دي من وقت للتاني. الاستمرار في استخدام التطبيق بعد أي تعديل معناه موافقتك على النسخة الجديدة.' },
];

export default function Terms() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="شروط الاستخدام" onBack={() => router.back()} />
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
