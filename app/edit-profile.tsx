/**
 * app/edit-profile.tsx — "بيانات الحساب" كانت زرار ميت في الإعدادات.
 * بتعدّل نفس onboarding draft اللي اتكتب وقت تسجيل الدخول (الاسم، الرقم،
 * المدينة) — نفس المصدر اللي البروفايل وكل مكان بيعرض اسم البائع منه.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/primitives/Button';
import { FormField } from '@/components/primitives/FormField';
import { isValidEgyptianPhone } from '@/lib/validation';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function EditProfile() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const onboarding = useAppStore((s) => s.onboarding);
  const setOnboarding = useAppStore((s) => s.setOnboarding);
  const [name, setName] = useState(onboarding.name);
  const [phone, setPhone] = useState(onboarding.phone);
  const [city, setCity] = useState(onboarding.city);
  // كل الـhooks لازم تتنادى الأول من غير شرط — الـauth check بعدهم كلهم
  // مباشرة (مش قبلهم)، وإلا لو الشاشة فضلت متركّبة (mounted) ورجعنا لها
  // بعد تسجيل الدخول من /signin عبر router.back()، عدد الـhooks هيختلف
  // بين الرندر قبل وبعد وReact هيرمي خطأ "Rendered fewer hooks than expected".
  const authBlock = useAuthGuard();
  if (authBlock) return authBlock;

  const canSave = name.trim().length >= 2 && isValidEgyptianPhone(phone);

  const save = () => {
    setOnboarding({ name: name.trim(), phone: phone.trim(), city: city.trim() });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="بيانات الحساب" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 60 }}>
        <FormField label="الاسم" placeholder="اكتب اسمك" value={name} onChangeText={setName} />
        <FormField label="رقم الموبايل" placeholder="01xxxxxxxxx" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        {phone.trim().length > 0 && !isValidEgyptianPhone(phone) ? (
          <Text style={{ fontSize: 11, color: colors.danger, marginTop: -8, marginBottom: spacing.s4 }}>رقم موبايل مصري غير صحيح</Text>
        ) : null}
        <FormField label="المدينة" placeholder="مثلاً: القاهرة" value={city} onChangeText={setCity} />
        <Button disabled={!canSave} onPress={save}>
          حفظ التعديلات
        </Button>
      </ScrollView>
    </View>
  );
}
