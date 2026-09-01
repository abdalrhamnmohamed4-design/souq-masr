/**
 * app/business.tsx — الحساب التجاري (Business Profile — PART 18). كانت
 * مفقودة تمامًا. امتداد حقيقي لحساب المستخدم الحالي (مفيش هوية بائع
 * منفصلة من غير باك إند)، بيتخزن في store/useAppStore → business.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/primitives/Button';
import { FormField } from '@/components/primitives/FormField';
import { Pill } from '@/components/primitives/Pill';
import { getTopLevel } from '@/mock/taxonomy/categories';
import { useAllListings, useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function BusinessProfile() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const business = useAppStore((s) => s.business);
  const setBusiness = useAppStore((s) => s.setBusiness);
  const clearBusiness = useAppStore((s) => s.clearBusiness);
  const onboarding = useAppStore((s) => s.onboarding);
  const allListings = useAllListings();
  const [editing, setEditing] = useState(false);
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تفتح حسابك التجاري', description: 'الحساب التجاري امتداد لحسابك الشخصي — لازم تسجّل دخولك الأول.' });
  if (authBlock) return authBlock;

  if (!business || editing) {
    return (
      <BusinessForm
        initial={business}
        defaultPhone={onboarding.phone}
        defaultCity={onboarding.city}
        onCancel={business ? () => setEditing(false) : undefined}
        onSave={(b) => {
          setBusiness(b);
          setEditing(false);
        }}
      />
    );
  }

  const myAds = allListings.filter((l) => l.sellerId === 'me');
  const categories = getTopLevel().filter((c) => business.categoryIds.includes(c.id));

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader
        title="الحساب التجاري"
        right={
          <Pressable onPress={() => setEditing(true)}>
            <Icon name="edit" size={17} color={colors.ink} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 60 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 76, height: 76, borderRadius: 22, backgroundColor: colors.signalWash, borderWidth: 1, borderColor: colors.signal, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="office" size={30} color={colors.signal2} />
          </View>
          <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 17, color: colors.ink, marginTop: spacing.s3 }}>{business.name}</Text>
          <View style={{ marginTop: 6 }}>
            <Pill tone="signal" icon={<Icon name="clock" size={12} color={colors.signal2} />}>حساب تجاري — قيد المراجعة</Pill>
          </View>
        </View>

        {business.description ? (
          <Text style={{ fontSize: 12.5, color: colors.ink2, lineHeight: 21, marginTop: spacing.s5, textAlign: 'center' }}>{business.description}</Text>
        ) : null}

        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s4, marginTop: spacing.s5, gap: spacing.s3 }}>
          <InfoRow icon="pin" label={business.city} />
          <InfoRow icon="mobile" label={business.phone || 'مفيش رقم مسجّل'} />
          <InfoRow icon="clock" label={business.openingHours || 'مواعيد العمل مش محددة'} />
        </View>

        {categories.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.s4 }}>
            {categories.map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10 }}>
                <Icon name={c.icon} size={12} color={colors.ink2} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ink2 }}>{c.name}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.ink, marginTop: spacing.s5, marginBottom: spacing.s2 }}>
          إعلانات النشاط ({myAds.length})
        </Text>
        {myAds.length === 0 ? (
          <Text style={{ fontSize: 12, color: colors.ink3 }}>لسه مفيش إعلانات منشورة تحت الحساب التجاري ده.</Text>
        ) : (
          myAds.map((l) => (
            <Pressable key={l.id} onPress={() => router.push(`/detail/${l.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: spacing.s3, marginBottom: spacing.s2 }}>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, color: colors.ink }}>{l.title}</Text>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{l.price.toLocaleString('en-US')} ج.م</Text>
            </Pressable>
          ))
        )}

        <Pressable
          onPress={() =>
            Alert.alert('إلغاء الحساب التجاري', 'هيرجع حسابك حساب شخصي عادي — تقدر تعمله تاني في أي وقت.', [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'تأكيد', style: 'destructive', onPress: clearBusiness },
            ])
          }
          style={{ marginTop: spacing.s5, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 11.5, color: colors.danger, fontWeight: '600' }}>إلغاء الحساب التجاري</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label }: { icon: 'pin' | 'mobile' | 'clock'; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon name={icon} size={15} color={colors.ink3} />
      <Text style={{ fontSize: 12, color: colors.ink2 }}>{label}</Text>
    </View>
  );
}

function BusinessForm({
  initial,
  defaultPhone,
  defaultCity,
  onCancel,
  onSave,
}: {
  initial: { name: string; description: string; phone: string; city: string; categoryIds: string[]; openingHours: string } | null;
  defaultPhone: string;
  defaultCity: string;
  onCancel?: () => void;
  onSave: (b: { name: string; description: string; phone: string; city: string; categoryIds: string[]; openingHours: string }) => void;
}) {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? defaultPhone);
  const [city, setCity] = useState(initial?.city ?? defaultCity);
  const [openingHours, setOpeningHours] = useState(initial?.openingHours ?? '');
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.categoryIds ?? []);

  const toggleCategory = (id: string) =>
    setCategoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const canSave = name.trim().length >= 2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title={initial ? 'تعديل الحساب التجاري' : 'إنشاء حساب تجاري'} onBack={onCancel ?? (() => router.back())} />
      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 60 }}>
        {!initial ? (
          <Text style={{ fontSize: 12, color: colors.ink3, marginBottom: spacing.s4, lineHeight: 20 }}>
            الحساب التجاري بيظهر بشكل مختلف للمشترين (اسم النشاط، الوصف، مواعيد العمل) وبيجمّع كل إعلاناتك في مكان واحد.
          </Text>
        ) : null}
        <FormField label="اسم النشاط" placeholder="مثلاً: محل الأمانة للموبايلات" value={name} onChangeText={setName} />
        <FormField label="الوصف" placeholder="عرّف بنشاطك باختصار" value={description} onChangeText={setDescription} multiline maxLength={200} showCounter />
        <FormField label="رقم التواصل" placeholder="01xxxxxxxxx" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <FormField label="المدينة" placeholder="مثلاً: القاهرة" value={city} onChangeText={setCity} />
        <FormField label="مواعيد العمل" placeholder="مثلاً: يوميًا 10 ص - 10 م" value={openingHours} onChangeText={setOpeningHours} />

        <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink, marginBottom: spacing.s2 }}>مجالات النشاط</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s5 }}>
          {getTopLevel().map((c) => {
            const active = categoryIds.includes(c.id);
            return (
              <Pressable
                key={c.id}
                onPress={() => toggleCategory(c.id)}
                style={{ backgroundColor: active ? colors.ink : colors.card, borderWidth: 1, borderColor: active ? colors.ink : colors.line, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12 }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '600', color: active ? '#fff' : colors.ink2 }}>{c.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Button disabled={!canSave} onPress={() => onSave({ name: name.trim(), description: description.trim(), phone: phone.trim(), city: city.trim(), openingHours: openingHours.trim(), categoryIds })}>
          {initial ? 'حفظ التعديلات' : 'إنشاء الحساب التجاري'}
        </Button>
      </ScrollView>
    </View>
  );
}
