/**
 * app/services/profile.tsx — إنشاء/تعديل ملف المحترف (PART 26).
 *
 * Services vertical (Phase 2B): لو عندك ملف محلي (mock) قديم، بيفضل
 * يتعدّل محليًا زي ما هو (مفيش هجرة قسرية) — أي ملف جديد بيتسجّل على
 * الباك إند الحقيقي مباشرة (souq_masr.api.v1.professional_profiles)،
 * نفس مبدأ app/jobs/my-company.tsx بالظبط.
 */
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { LocationPicker } from '@/components/LocationPicker';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/primitives/Button';
import { Chip } from '@/components/primitives/Chip';
import { FormField } from '@/components/primitives/FormField';
import { getServiceCategories, getTradesForCategory } from '@/mock/jobs/trades';
import { locationPathLabel } from '@/mock/taxonomy/locations';
import { isValidEgyptianPhone, toPositiveInt } from '@/lib/validation';
import { frappeUploadFile } from '@/lib/apiClient';
import { useMyProfessionalProfile } from '@/hooks/useMyProfessionalProfile';
import { createOrUpdateMyProfile } from '@/services/professionalProfileService';
import { useJobsStore } from '@/store/useJobsStore';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function ProfessionalProfileForm() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const setProfileMock = useJobsStore((s) => s.setProfessionalProfile);
  const onboarding = useAppStore((s) => s.onboarding);
  const profile = useMyProfessionalProfile();

  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [name, setName] = useState(onboarding.name ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tradeId, setTradeId] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [priceStartingFrom, setPriceStartingFrom] = useState('');
  const [phone, setPhone] = useState(onboarding.phone ?? '');
  const [whatsapp, setWhatsapp] = useState('');
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [locationSheet, setLocationSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || profile.loading) return;
    if (profile.mock) {
      setPhotoUri(profile.mock.photoUri);
      setName(profile.mock.name);
      setTradeId(profile.mock.tradeId);
      setDescription(profile.mock.description);
      setYearsExperience(profile.mock.yearsExperience?.toString() ?? '');
      setPriceStartingFrom(profile.mock.priceStartingFrom?.toString() ?? '');
      setPhone(profile.mock.phone ?? onboarding.phone ?? '');
      setWhatsapp(profile.mock.whatsapp ?? '');
      setServiceAreas(profile.mock.serviceAreas);
    } else if (profile.real) {
      setPhotoUri(profile.real.photo ?? undefined);
      setName(profile.real.name);
      setTradeId(profile.real.tradeKey ?? undefined);
      setDescription(profile.real.description);
      setYearsExperience(profile.real.yearsExperience?.toString() ?? '');
      setPriceStartingFrom(profile.real.priceStartingFrom?.toString() ?? '');
      setPhone(profile.real.phone || onboarding.phone || '');
      setWhatsapp(profile.real.whatsapp || '');
      setServiceAreas(profile.real.serviceAreas);
    }
    setHydrated(true);
  }, [hydrated, profile, onboarding]);

  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تعمل ملف محترف', description: 'ملف المحترف بيانات مرتبطة بحسابك — سجّل دخولك الأول.' });
  if (authBlock) return authBlock;

  if (profile.loading) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }

  const trades = categoryId ? getTradesForCategory(categoryId) : [];

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const canSave = name.trim().length >= 2 && description.trim().length >= 5 && (!phone.trim() || isValidEgyptianPhone(phone));

  const save = async () => {
    if (profile.mock) {
      setProfileMock({
        name: name.trim(), photoUri, tradeId, description: description.trim(),
        yearsExperience: toPositiveInt(yearsExperience),
        skills: [], serviceAreas,
        priceStartingFrom: toPositiveInt(priceStartingFrom),
        phone: phone.trim() || undefined, whatsapp: whatsapp.trim() || undefined,
        photoUris: [], portfolio: profile.mock.portfolio ?? [],
      });
      router.back();
      return;
    }
    setSaving(true);
    let photoUrl: string | undefined = profile.real?.photo ?? undefined;
    if (photoUri && photoUri !== profile.real?.photo) {
      const uploadResult = await frappeUploadFile({ uri: photoUri, name: photoUri.split('/').pop() || `photo-${Date.now()}.jpg`, mimeType: 'image/jpeg' });
      if (uploadResult.status === 'success') photoUrl = uploadResult.data.fileUrl;
    }
    const r = await createOrUpdateMyProfile({
      name: name.trim(), description: description.trim(), tradeKey: tradeId, photo: photoUrl,
      yearsExperience: toPositiveInt(yearsExperience), serviceAreas,
      priceStartingFrom: toPositiveInt(priceStartingFrom),
      phone: phone.trim() || undefined, whatsapp: whatsapp.trim() || undefined,
    });
    setSaving(false);
    if (r.status !== 'success') {
      Alert.alert('تعذّر الحفظ', 'حصلت مشكلة، جرّب تاني.');
      return;
    }
    router.back();
  };

  const existing = profile.any;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title={existing ? 'تعديل ملفي المهني' : 'إنشاء ملف محترف'} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 60 }}>
        <Pressable onPress={pickPhoto} style={{ alignSelf: 'center', marginBottom: spacing.s5 }}>
          <View style={{ width: 80, height: 80, borderRadius: 22, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {photoUri ? <Image source={{ uri: photoUri }} style={{ width: 80, height: 80 }} /> : <Icon name="cam" color={colors.signal2} size={24} />}
          </View>
        </Pressable>
        <FormField label="اسمك" placeholder="اكتب اسمك" value={name} onChangeText={setName} />

        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>مجال العمل</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s4 }}>
          {getServiceCategories().map((c) => (
            <Chip key={c.id} label={c.name} compact active={categoryId === c.id} onPress={() => { setCategoryId(c.id); setTradeId(undefined); }} />
          ))}
        </View>
        {trades.length > 0 ? (
          <>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>المهنة بالتحديد</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s4 }}>
              {trades.map((t) => (
                <Chip key={t.id} label={t.name} compact active={tradeId === t.id} onPress={() => setTradeId(t.id)} />
              ))}
            </View>
          </>
        ) : null}

        <FormField label="نبذة عنك" placeholder="اشرح خبرتك وخدماتك" value={description} onChangeText={setDescription} multiline maxLength={400} showCounter />
        <FormField label="سنوات الخبرة" placeholder="0" keyboardType="number-pad" value={yearsExperience} onChangeText={setYearsExperience} />
        <FormField label="الأسعار تبدأ من (اختياري)" placeholder="0" isPrice keyboardType="number-pad" value={priceStartingFrom} onChangeText={setPriceStartingFrom} />

        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>مناطق تقديم الخدمة</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s2 }}>
          {serviceAreas.map((a) => (
            <Chip key={a} label={a} compact active onPress={() => setServiceAreas((areas) => areas.filter((x) => x !== a))} />
          ))}
        </View>
        <Pressable onPress={() => setLocationSheet(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.s4 }}>
          <Icon name="plus" size={13} color={colors.signal} />
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.signal }}>إضافة منطقة</Text>
        </Pressable>

        <FormField label="رقم التواصل" placeholder="01xxxxxxxxx" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        {phone.trim().length > 0 && !isValidEgyptianPhone(phone) ? (
          <Text style={{ fontSize: 11, color: colors.danger, marginTop: -8, marginBottom: spacing.s4 }}>رقم موبايل مصري غير صحيح</Text>
        ) : null}
        <FormField label="رقم واتساب (اختياري)" placeholder="01xxxxxxxxx" keyboardType="phone-pad" value={whatsapp} onChangeText={setWhatsapp} />

        <Button disabled={!canSave || saving} onPress={save}>{existing ? 'حفظ التعديلات' : 'إنشاء الملف'}</Button>
      </ScrollView>

      <LocationPicker
        visible={locationSheet}
        onClose={() => setLocationSheet(false)}
        onSelect={(id) => {
          const govName = locationPathLabel(id).split('، ')[0];
          if (!serviceAreas.includes(govName)) setServiceAreas((areas) => [...areas, govName]);
        }}
        title="منطقة تقديم الخدمة"
      />
    </View>
  );
}
