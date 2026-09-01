/**
 * app/jobs/my-company.tsx — إنشاء/تعديل بيانات شركتك (PART 21). لازم
 * قبل نشر أي وظيفة — مفيش وظيفة من غير شركة صاحبة ليها.
 */
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/primitives/Button';
import { Chip } from '@/components/primitives/Chip';
import { FormField } from '@/components/primitives/FormField';
import type { CompanySize } from '@/mock/jobs/types';
import { useJobsStore } from '@/store/useJobsStore';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

const SIZE_OPTIONS: CompanySize[] = ['1-10', '11-50', '51-200', '201-500', '500+'];

export default function MyCompany() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const userCompanies = useJobsStore((s) => s.userCompanies);
  const addCompany = useJobsStore((s) => s.addCompany);
  const updateCompany = useJobsStore((s) => s.updateCompany);
  const onboardingCity = useAppStore((s) => s.onboarding.city);
  const existing = userCompanies.find((c) => c.ownerSellerId === 'me');

  const [logoUri, setLogoUri] = useState(existing?.logoUri);
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [industry, setIndustry] = useState(existing?.industry ?? '');
  const [size, setSize] = useState<CompanySize>(existing?.size ?? '1-10');
  const [city, setCity] = useState(existing?.city ?? onboardingCity);
  const [website, setWebsite] = useState(existing?.website ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تضيف شركتك', description: 'بيانات الشركة مرتبطة بحسابك — سجّل دخولك الأول.' });
  if (authBlock) return authBlock;

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true });
    if (!result.canceled && result.assets[0]) setLogoUri(result.assets[0].uri);
  };

  const canSave = name.trim().length >= 2 && description.trim().length >= 5;

  const save = () => {
    const payload = { name: name.trim(), description: description.trim(), industry: industry.trim(), size, city: city.trim(), website: website.trim() || undefined, phone: phone.trim() || undefined, logoUri };
    if (existing) updateCompany(existing.id, payload);
    else addCompany(payload);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title={existing ? 'تعديل بيانات الشركة' : 'إضافة شركتك'} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 60 }}>
        <Pressable onPress={pickLogo} style={{ alignSelf: 'center', marginBottom: spacing.s5 }}>
          <View style={{ width: 80, height: 80, borderRadius: 22, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {logoUri ? <Image source={{ uri: logoUri }} style={{ width: 80, height: 80 }} /> : <Icon name="office" color={colors.signal2} size={26} />}
          </View>
        </Pressable>
        <FormField label="اسم الشركة" placeholder="مثلاً: شركة النور للتجارة" value={name} onChangeText={setName} />
        <FormField label="نبذة عن الشركة" placeholder="عرّف بنشاط شركتك" value={description} onChangeText={setDescription} multiline maxLength={400} showCounter />
        <FormField label="القطاع" placeholder="مثلاً: تجارة إلكترونية" value={industry} onChangeText={setIndustry} />

        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>حجم الشركة</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s4 }}>
          {SIZE_OPTIONS.map((s) => (
            <Chip key={s} label={`${s} موظف`} compact active={size === s} onPress={() => setSize(s)} />
          ))}
        </View>

        <FormField label="المدينة" placeholder="القاهرة" value={city} onChangeText={setCity} />
        <FormField label="الموقع الإلكتروني (اختياري)" placeholder="www.example.com" value={website} onChangeText={setWebsite} />
        <FormField label="رقم التواصل" placeholder="01xxxxxxxxx" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

        <Button disabled={!canSave} onPress={save}>{existing ? 'حفظ التعديلات' : 'إضافة الشركة'}</Button>
      </ScrollView>
    </View>
  );
}
