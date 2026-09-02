/**
 * app/jobs/my-company.tsx — إنشاء/تعديل بيانات شركتك (PART 21). لازم
 * قبل نشر أي وظيفة — مفيش وظيفة من غير شركة صاحبة ليها.
 *
 * Jobs vertical (Phase 2B): لو عندك شركة محلية (mock) قديمة من قبل
 * التحديث ده، بتفضل تتعدّل محليًا زي ما هي بالظبط (مفيش هجرة قسرية).
 * غير كده، أي شركة جديدة بتتسجّل على الباك إند الحقيقي مباشرة
 * (souq_masr.api.v1.companies.create_or_update_my_company) — نفس مبدأ
 * "الجديد حقيقي، القديم يفضل زي ما هو" المتّبع في كل الـslices السابقة.
 */
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/primitives/Button';
import { Chip } from '@/components/primitives/Chip';
import { FormField } from '@/components/primitives/FormField';
import type { CompanySize } from '@/mock/jobs/types';
import { frappeUploadFile } from '@/lib/apiClient';
import { createOrUpdateMyCompany, getMyCompany, type RealCompany } from '@/services/companyService';
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
  const existingMock = userCompanies.find((c) => c.ownerSellerId === 'me');

  const [realCompany, setRealCompany] = useState<RealCompany | null>(null);
  const [loadingReal, setLoadingReal] = useState(!existingMock);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingMock) return; // شركة محلية موجودة بالفعل — متعملش نداء حقيقي أصلًا
    getMyCompany().then((r) => {
      if (r.status === 'success') setRealCompany(r.data);
      setLoadingReal(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const existing = existingMock ?? (realCompany ? { ...realCompany, ownerSellerId: 'me' as const, createdAt: '', verification: realCompany.verification } : undefined);

  const [logoUri, setLogoUri] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState<CompanySize>('1-10');
  const [city, setCity] = useState(onboardingCity ?? '');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || loadingReal) return;
    if (existingMock) {
      setLogoUri(existingMock.logoUri);
      setName(existingMock.name);
      setDescription(existingMock.description);
      setIndustry(existingMock.industry);
      setSize(existingMock.size);
      setCity(existingMock.city);
      setWebsite(existingMock.website ?? '');
      setPhone(existingMock.phone ?? '');
    } else if (realCompany) {
      setLogoUri(realCompany.logo ?? undefined);
      setName(realCompany.name);
      setDescription(realCompany.description);
      setIndustry(realCompany.industry);
      setSize(realCompany.size);
      setCity(realCompany.city);
      setWebsite(realCompany.website ?? '');
      setPhone(realCompany.phone ?? '');
    }
    setHydrated(true);
  }, [hydrated, loadingReal, existingMock, realCompany]);

  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تضيف شركتك', description: 'بيانات الشركة مرتبطة بحسابك — سجّل دخولك الأول.' });
  if (authBlock) return authBlock;

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true });
    if (!result.canceled && result.assets[0]) setLogoUri(result.assets[0].uri);
  };

  const canSave = name.trim().length >= 2 && description.trim().length >= 5;

  const save = async () => {
    if (existingMock) {
      const payload = { name: name.trim(), description: description.trim(), industry: industry.trim(), size, city: city.trim(), website: website.trim() || undefined, phone: phone.trim() || undefined, logoUri };
      updateCompany(existingMock.id, payload);
      router.back();
      return;
    }
    setSaving(true);
    let logoUrl: string | undefined;
    if (logoUri && logoUri !== realCompany?.logo) {
      const uploadResult = await frappeUploadFile({ uri: logoUri, name: logoUri.split('/').pop() || `logo-${Date.now()}.jpg`, mimeType: 'image/jpeg' });
      if (uploadResult.status === 'success') logoUrl = uploadResult.data.fileUrl;
    } else {
      logoUrl = realCompany?.logo ?? undefined;
    }
    const r = await createOrUpdateMyCompany({
      name: name.trim(), description: description.trim(), industry: industry.trim(), size, city: city.trim(),
      website: website.trim() || undefined, phone: phone.trim() || undefined, logo: logoUrl,
    });
    setSaving(false);
    if (r.status !== 'success') {
      Alert.alert('تعذّر الحفظ', 'حصلت مشكلة، جرّب تاني.');
      return;
    }
    router.back();
  };

  if (loadingReal) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }

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

        <Button disabled={!canSave || saving} onPress={save}>{existing ? 'حفظ التعديلات' : 'إضافة الشركة'}</Button>
      </ScrollView>
    </View>
  );
}
