/**
 * app/services/post.tsx — إضافة خدمة جديدة (PART 27). محتاج ملف محترف
 * الأول (زي ما نشر وظيفة محتاج ملف شركة).
 *
 * Services vertical (Phase 2B): editId بتاع SRV-##### معناه خدمة حقيقية.
 * إنشاء جديد بيتسجّل حقيقي لو الملف المهني حقيقي (أو لو مفيش ملف محلي
 * قديم خالص)، غير كده بيفضل محلي — نفس نمط app/jobs/post.tsx بالظبط.
 */
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/primitives/Button';
import { Chip } from '@/components/primitives/Chip';
import { EmptyState } from '@/components/primitives/EmptyState';
import { FormField } from '@/components/primitives/FormField';
import { getServiceCategories, getTradesForCategory } from '@/mock/jobs/trades';
import { toPositiveInt } from '@/lib/validation';
import type { PriceType } from '@/mock/jobs/types';
import { frappeUploadFile } from '@/lib/apiClient';
import { useMyProfessionalProfile } from '@/hooks/useMyProfessionalProfile';
import { createService, getServiceListing, isRealServiceId, updateService, type RealServiceListing } from '@/services/serviceListingService';
import { useJobsStore } from '@/store/useJobsStore';
import { useTheme } from '@/theme/ThemeProvider';

const PRICE_TYPE_LABELS: Record<PriceType, string> = { fixed: 'ثابت', starting_from: 'يبدأ من', hourly: 'بالساعة', negotiable: 'قابل للتفاوض' };

export default function PostService() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const userServices = useJobsStore((s) => s.userServices);
  const addService = useJobsStore((s) => s.addService);
  const updateServiceMock = useJobsStore((s) => s.updateService);
  const myProfile = useMyProfessionalProfile();

  const editIsReal = isRealServiceId(editId);
  const editingServiceMock = editId && !editIsReal ? userServices.find((sv) => sv.id === editId) : undefined;
  const [realEditingService, setRealEditingService] = useState<RealServiceListing | null>(null);
  const [loadingRealService, setLoadingRealService] = useState(editIsReal);

  useEffect(() => {
    if (!editIsReal || !editId) return;
    getServiceListing(editId).then((r) => {
      if (r.status === 'success') setRealEditingService(r.data);
      setLoadingRealService(false);
    });
  }, [editIsReal, editId]);

  const editingService = editingServiceMock;

  const [categoryId, setCategoryId] = useState<string | null>(editingService?.categoryId ?? null);
  const [tradeId, setTradeId] = useState<string | undefined>(editingService?.tradeId);
  const [title, setTitle] = useState(editingService?.title ?? '');
  const [description, setDescription] = useState(editingService?.description ?? '');
  const [price, setPrice] = useState(editingService?.price !== undefined ? String(editingService.price) : '');
  const [priceType, setPriceType] = useState<PriceType>(editingService?.priceType ?? 'starting_from');
  const [imageUris, setImageUris] = useState<string[]>(editingService?.imageUris ?? []);
  const [offerPrice, setOfferPrice] = useState(editingService?.offerPrice !== undefined ? String(editingService.offerPrice) : '');
  const [offerEndsAt, setOfferEndsAt] = useState<string | null>(editingService?.offerEndsAt ?? null);
  const [showOfferDatePicker, setShowOfferDatePicker] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!realEditingService) return;
    setCategoryId(realEditingService.categoryKey);
    setTradeId(realEditingService.tradeKey ?? undefined);
    setTitle(realEditingService.title);
    setDescription(realEditingService.description);
    setPrice(realEditingService.price != null ? String(realEditingService.price) : '');
    setPriceType(realEditingService.priceType);
    setImageUris(realEditingService.imageUrls);
    setOfferPrice(realEditingService.offerPrice != null ? String(realEditingService.offerPrice) : '');
    setOfferEndsAt(realEditingService.offerEndsAt);
  }, [realEditingService]);

  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تضيف خدمة', description: 'إضافة خدمة محتاجة ملف محترف مرتبط بحسابك — سجّل دخولك الأول.' });
  if (authBlock) return authBlock;

  if (myProfile.loading || loadingRealService) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }

  const trades = categoryId ? getTradesForCategory(categoryId) : [];

  const addImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.7 });
    if (!result.canceled) setImageUris((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
  };

  const canSave = !!categoryId && title.trim().length > 3 && description.trim().length > 5;

  const publish = async () => {
    if (!categoryId) return;

    if ((!myProfile.mock && myProfile.real) || editIsReal) {
      setPublishing(true);
      // ارفع أي صور محلية جديدة (uri مش https/http بالفعل) قبل الحفظ.
      const uploadedUris: string[] = [];
      for (const uri of imageUris) {
        if (uri.startsWith('http')) {
          uploadedUris.push(uri);
          continue;
        }
        const uploadResult = await frappeUploadFile({ uri, name: uri.split('/').pop() || `svc-${Date.now()}.jpg`, mimeType: 'image/jpeg' });
        if (uploadResult.status === 'success') uploadedUris.push(uploadResult.data.fileUrl);
      }
      const payload = {
        categoryKey: categoryId, title: title.trim(), tradeKey: tradeId, description: description.trim(),
        price: toPositiveInt(price), priceType,
        serviceAreas: myProfile.real?.serviceAreas ?? [], imageUrls: uploadedUris,
        offerPrice: toPositiveInt(offerPrice), offerEndsAt: offerPrice ? offerEndsAt ?? undefined : undefined,
      };
      const r = editIsReal && editId ? await updateService(editId, payload) : await createService(payload);
      setPublishing(false);
      if (r.status !== 'success') {
        Alert.alert('تعذّر النشر', 'حصلت مشكلة، جرّب تاني.');
        return;
      }
      router.replace(`/services/${r.data.id}`);
      return;
    }

    const patch = {
      categoryId, tradeId, title: title.trim(), description: description.trim(),
      price: toPositiveInt(price), priceType,
      serviceAreas: (myProfile.mock as { serviceAreas?: string[] } | null)?.serviceAreas ?? [], imageUris,
      offerPrice: toPositiveInt(offerPrice),
      offerEndsAt: offerPrice ? offerEndsAt ?? undefined : undefined,
    };
    if (editingService) {
      updateServiceMock(editingService.id, patch);
      router.replace(`/services/${editingService.id}`);
      return;
    }
    const id = addService(patch);
    router.replace(`/services/${id}`);
  };

  if (!myProfile.any) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <ScreenHeader title="إضافة خدمة" onBack={() => router.back()} />
        <EmptyState
          icon={<Icon name="user" color={colors.ink3} size={26} />}
          title="محتاج تعمل ملفك المهني الأول"
          description="عشان تضيف خدمة، لازم يكون عندك ملف محترف — اسمك وخبرتك هتظهر لكل العملاء."
          actionLabel="إنشاء ملف محترف"
          onAction={() => router.push('/services/profile')}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title={editingService || realEditingService ? 'تعديل الخدمة' : 'إضافة خدمة'} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.s5, paddingBottom: 130 + insets.bottom }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>القسم</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s4 }}>
          {getServiceCategories().map((c) => (
            <Chip key={c.id} label={c.name} compact active={categoryId === c.id} onPress={() => { setCategoryId(c.id); setTradeId(undefined); }} />
          ))}
        </View>
        {trades.length > 0 ? (
          <>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>المهنة (اختياري)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s4 }}>
              {trades.map((t) => (
                <Chip key={t.id} label={t.name} compact active={tradeId === t.id} onPress={() => { setTradeId(t.id); if (!title) setTitle(t.name); }} />
              ))}
            </View>
          </>
        ) : null}

        <FormField label="عنوان الخدمة" placeholder="مثلاً: صيانة تكييفات منزلية" value={title} onChangeText={setTitle} />
        <FormField label="الوصف" placeholder="اشرح الخدمة بالتفصيل" value={description} onChangeText={setDescription} multiline maxLength={400} showCounter />

        <View style={{ flexDirection: 'row', gap: spacing.s2 }}>
          <View style={{ flex: 1 }}>
            <FormField label="السعر (اختياري)" placeholder="0" isPrice keyboardType="number-pad" value={price} onChangeText={setPrice} />
          </View>
        </View>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>نوع السعر</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.s4 }}>
          {(Object.keys(PRICE_TYPE_LABELS) as PriceType[]).map((pt) => (
            <Chip key={pt} label={PRICE_TYPE_LABELS[pt]} compact active={priceType === pt} onPress={() => setPriceType(pt)} />
          ))}
        </View>

        {price ? (
          <View style={{ backgroundColor: colors.signalWash, borderWidth: 1, borderColor: colors.signal, borderRadius: radius.r3, padding: spacing.s4, marginBottom: spacing.s4 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.signal2, marginBottom: spacing.s3 }}>عرض خاص مؤقت (اختياري)</Text>
            <FormField label="سعر العرض" placeholder="0" isPrice keyboardType="number-pad" value={offerPrice} onChangeText={setOfferPrice} />
            {offerPrice ? (
              <>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>ينتهي العرض في</Text>
                <Pressable onPress={() => setShowOfferDatePicker(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: 12 }}>
                  <Icon name="clock" size={15} color={colors.ink3} />
                  <Text style={{ fontSize: 12, color: offerEndsAt ? colors.ink : colors.ink3 }}>
                    {offerEndsAt ? new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(offerEndsAt)) : 'اختار تاريخ'}
                  </Text>
                </Pressable>
                {showOfferDatePicker ? (
                  <DateTimePicker
                    value={offerEndsAt ? new Date(offerEndsAt) : new Date()}
                    mode="date"
                    minimumDate={new Date()}
                    onChange={(e, d) => { setShowOfferDatePicker(false); if (e.type === 'set' && d) setOfferEndsAt(d.toISOString()); }}
                  />
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>صور</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.s4 }}>
          {imageUris.map((uri) => <Image key={uri} source={{ uri }} style={{ width: 72, height: 72, borderRadius: radius.r2, marginLeft: 8 }} />)}
          <Pressable onPress={addImages} style={{ width: 72, height: 72, borderRadius: radius.r2, borderWidth: 2, borderColor: colors.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" color={colors.ink3} />
          </Pressable>
        </ScrollView>
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s4, paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 + insets.bottom }}>
        <Button disabled={!canSave || publishing} onPress={publish}>{editingService || realEditingService ? 'احفظ التعديلات' : 'نشر الخدمة'}</Button>
      </View>
    </View>
  );
}
