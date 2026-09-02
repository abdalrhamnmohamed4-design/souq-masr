/**
 * app/post/index.tsx — نموذج نشر الإعلان الكامل (PART 6 من المواصفة):
 * تصنيف تدريجي (المستخدم بيختار يدويًا — مفيش أي تصنيف تلقائي بالذكاء
 * الاصطناعي) ← براند/موديل لو التصنيف بيدعمهم ← خصائص ديناميكية حسب
 * التصنيف (category.fields من mock/taxonomy) ← صور وتفاصيل وسعر ←
 * موقع هرمي (محافظة←مدينة←منطقة) ← مراجعة ونشر.
 *
 * عدد الخطوات وأسئلتها بيتغيّروا فعليًا حسب التصنيف المختار — مفيش نموذج
 * ثابت واحد لكل الإعلانات (PART 8/10 من المواصفة).
 */
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiStateView } from '@/components/ApiStateView';
import { BrandLogo } from '@/components/BrandLogo';
import { Icon, type IconName } from '@/components/Icon';
import { useAuthGuard } from '@/components/AuthGuard';
import { useRequireOnline } from '@/lib/connectivityGuard';
import { Button } from '@/components/primitives/Button';
import { Chip } from '@/components/primitives/Chip';
import { FormField } from '@/components/primitives/FormField';
import { useApiResult } from '@/hooks/useApiResult';
import {
  getBrandsForCategory,
  getCategory,
  getChildren,
  getLocationPath,
  getModelsForBrand,
  getPath,
  searchCategories,
} from '@/services/taxonomyService';
import { LocationPicker } from '@/components/LocationPicker';
import {
  CONDITION_LABELS,
  PRICE_TYPE_LABELS,
  SELLING_TYPE_LABELS,
  type Category,
  type Condition,
  type PriceType,
  type SellingType,
} from '@/mock/taxonomy/types';
import { useAppStore } from '@/store/useAppStore';
import { toPositiveInt } from '@/lib/validation';
import type { Listing, ProductVariant } from '@/mock/listings';
import { useTheme } from '@/theme/ThemeProvider';

type StepKey = 'category' | 'brand' | 'attributes' | 'variants' | 'details' | 'location' | 'review';

export default function PostAd() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { colors, spacing, radius, brandDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { postDraft, setPostDraft, resetPostDraft, addMyAd, updateMyAd, publishListing, updateListing, userListings, business } = useAppStore();

  // تعديل إعلان موجود (PART QA-fix): قبل كده زرار "عدّل" كان بيفتح
  // فورم فاضي وبينشئ إعلان مكرر جديد بدل ما يعدّل الأصلي. دلوقتي بنحمّل
  // بيانات الإعلان الحقيقية في postDraft أول ما الشاشة تفتح بـeditId.
  const editingListing = editId ? userListings.find((l) => l.id === editId) : undefined;
  const [hydrated, setHydrated] = useState(!editId);

  React.useEffect(() => {
    if (!editId) {
      resetPostDraft();
      return;
    }
    if (editingListing && !hydrated) {
      const conditionKey =
        (Object.keys(CONDITION_LABELS) as Condition[]).find((k) => CONDITION_LABELS[k] === editingListing.condition) ?? null;
      setPostDraft({
        categoryKey: editingListing.categoryKey,
        brandId: editingListing.brandId ?? null,
        modelId: editingListing.modelId ?? null,
        attributes: editingListing.attributes ?? {},
        title: editingListing.title,
        price: editingListing.priceType === 'free' || editingListing.priceType === 'contact' ? '' : String(editingListing.price || ''),
        priceType: editingListing.priceType ?? 'negotiable',
        condition: conditionKey,
        sellingType: editingListing.sellingType ?? null,
        description: editingListing.description,
        locationId: editingListing.locationId ?? null,
        photoUris: editingListing.photoUris ?? [],
        variants: editingListing.variants ?? [],
        wholesalePrice: editingListing.wholesalePrice ? String(editingListing.wholesalePrice) : '',
        minWholesaleQty: editingListing.minWholesaleQty ? String(editingListing.minWholesaleQty) : '',
        discountPrice: editingListing.discountPrice ? String(editingListing.discountPrice) : '',
        discountEndsAt: editingListing.discountEndsAt ?? null,
      });
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, editingListing, hydrated]);

  // Phase 2A: تفاصيل التصنيف الكاملة (fields/hasBrands/allowedConditions...)
  // بقت بتيجي من الباك إند الحقيقي عبر getCategory غير المتزامنة، مش
  // نداء متزامن من mock/taxonomy/categories.ts. لسه undefined لحد ما
  // الطلب يخلص (أو لو مفيش categoryKey أصلًا).
  const categoryKey = postDraft.categoryKey;
  const { state: categoryState, refetch: refetchCategory } = useApiResult(
    () => (categoryKey ? getCategory(categoryKey) : Promise.resolve({ status: 'success' as const, data: null })),
    [categoryKey],
  );
  const category = categoryState.kind === 'success' ? categoryState.data ?? undefined : undefined;
  // لسه بيتحمّل تفاصيل التصنيف (أو فشل التحميل) — بنمنع "التالي" لحد ما
  // يتحل، عشان steps[] تحسيبها (hasBrands/fields.length) يبقى مبني على
  // بيانات حقيقية مش على undefined مؤقت.
  const categoryPending = !!categoryKey && categoryState.kind === 'loading';
  const categoryFailed = !!categoryKey && categoryState.kind !== 'loading' && categoryState.kind !== 'success';

  // خطوة المقاسات/الألوان بتظهر بس لحساب تجاري وف تصنيف بيدعم مقاسات
  // (PART "Business/Product Listing" — فردي بيبيع قطعة واحدة زي ما هي).
  const supportsVariants = !!business && !!category?.fields.some((f) => f.key === 'size');

  const steps: StepKey[] = useMemo(() => {
    const s: StepKey[] = ['category'];
    if (category?.hasBrands) s.push('brand');
    if (category && category.fields.length > 0) s.push('attributes');
    if (supportsVariants) s.push('variants');
    s.push('details', 'location', 'review');
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, supportsVariants]);

  const [stepIndex, setStepIndex] = useState(0);
  const stepKey = steps[Math.min(stepIndex, steps.length - 1)];
  const requireOnline = useRequireOnline();
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تنشر إعلان', description: 'نشر إعلان بياناته مرتبطة بحسابك — سجّل دخولك الأول.' });
  if (authBlock) return authBlock;

  const goBack = () => (stepIndex === 0 ? router.back() : setStepIndex((i) => i - 1));
  const goNext = () => setStepIndex((i) => Math.min(steps.length - 1, i + 1));

  // اسم المحافظة الخاص بالموقع المختار — بيتحل بشكل غير متزامن من
  // get_location_path الحقيقي (بديل locationPathLabel(id).split('، ')[0]
  // المتزامنة القديمة) عشان يبقى جاهز وقت publish() من غير ما نحوّل
  // publish() نفسها لدالة async.
  const [locationCity, setLocationCity] = useState('');
  React.useEffect(() => {
    let cancelled = false;
    if (!postDraft.locationId) {
      setLocationCity('');
      return undefined;
    }
    getLocationPath(postDraft.locationId).then((r) => {
      if (!cancelled && r.status === 'success' && r.data.length > 0) setLocationCity(r.data[0].name);
    });
    return () => {
      cancelled = true;
    };
  }, [postDraft.locationId]);

  const canNext = (() => {
    if (stepKey === 'category') return !!postDraft.categoryKey && !categoryPending && !categoryFailed;
    if (stepKey === 'brand') return !!postDraft.brandId;
    if (stepKey === 'attributes') {
      const required = category?.fields.filter((f) => f.required) ?? [];
      return required.every((f) => !!postDraft.attributes[f.key]);
    }
    if (stepKey === 'variants') return true; // اختياري — لو مفيش variants بيتباع كقطعة واحدة عادية
    if (stepKey === 'details') return postDraft.title.trim().length > 5 && (postDraft.priceType === 'free' || postDraft.priceType === 'contact' || postDraft.price.trim().length > 0);
    if (stepKey === 'location') return !!postDraft.locationId && !!locationCity;
    return true;
  })();

  const publish = () => requireOnline(() => {
    if (!category) return;
    const priceNum = toPositiveInt(postDraft.price) ?? 0;

    const patch: Omit<Listing, 'id' | 'sellerId' | 'postedAt' | 'views' | 'isFeatured' | 'isVerifiedSeller'> = {
      title: postDraft.title,
      price: priceNum,
      city: locationCity,
      condition: postDraft.condition ? CONDITION_LABELS[postDraft.condition] : '',
      categoryKey: category.id,
      thumb: 'a',
      images: postDraft.photoUris.length || 1,
      description: postDraft.description,
      specs: category.fields
        .filter((f) => postDraft.attributes[f.key])
        .map((f) => ({
          label: f.label,
          value: f.type === 'date'
            ? new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(postDraft.attributes[f.key]))
            : postDraft.attributes[f.key],
        })),
      attributes: postDraft.attributes,
      brandId: postDraft.brandId ?? undefined,
      modelId: postDraft.modelId ?? undefined,
      priceType: postDraft.priceType,
      sellingType: postDraft.sellingType ?? undefined,
      locationId: postDraft.locationId ?? undefined,
      photoUris: postDraft.photoUris.length > 0 ? postDraft.photoUris : undefined,
      sellerType: business ? 'business' : 'individual',
      brandName: business?.name,
      variants: postDraft.variants.length > 0 ? postDraft.variants : undefined,
      wholesalePrice: toPositiveInt(postDraft.wholesalePrice),
      minWholesaleQty: toPositiveInt(postDraft.minWholesaleQty),
      discountPrice: toPositiveInt(postDraft.discountPrice),
      discountEndsAt: postDraft.discountPrice ? postDraft.discountEndsAt ?? undefined : undefined,
    };

    if (editingListing) {
      // تعديل حقيقي: بيحدّث نفس السجل (userListings + myAds) بنفس الـid،
      // مش بينشئ إعلان جديد مكرر — وبيحافظ على views/postedAt/isFeatured.
      updateListing(editingListing.id, patch);
      updateMyAd(editingListing.id, { title: patch.title, price: patch.price, photoUri: patch.photoUris?.[0] });
      resetPostDraft();
      setStepIndex(0);
      router.replace('/myads');
      return;
    }

    const id = addMyAd({ title: postDraft.title, price: priceNum, thumb: 'a', photoUri: postDraft.photoUris[0] });
    const fullListing: Listing = { id, sellerId: 'me', postedAt: 'الآن', views: 0, isFeatured: false, isVerifiedSeller: false, ...patch };
    publishListing(fullListing);

    resetPostDraft();
    setStepIndex(0);
    router.replace('/myads');
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, paddingHorizontal: spacing.s5, paddingTop: insets.top + spacing.s2, paddingBottom: spacing.s2 }}>
        <Pressable
          onPress={goBack}
          style={{ width: 40, height: 40, borderRadius: radius.r2, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="x" color={colors.ink} />
        </Pressable>
        <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 18, color: colors.ink }}>{editingListing ? 'تعديل الإعلان' : 'إعلان جديد'}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: spacing.s5, paddingBottom: spacing.s4 }}>
        {steps.map((s, i) => (
          <View key={s} style={{ flex: 1, height: 4, borderRadius: 999, backgroundColor: i < stepIndex ? colors.verify : i === stepIndex ? colors.signal : colors.line }} />
        ))}
      </View>
      <View style={{ paddingHorizontal: spacing.s5, paddingBottom: spacing.s4 }}>
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 12.5, color: colors.ink, marginBottom: 3 }}>
          الخطوة {stepIndex + 1} من {steps.length} — {STEP_TITLES[stepKey]}
        </Text>
        <Text style={{ fontSize: 11, color: colors.ink3, lineHeight: 18 }}>{STEP_DESCS[stepKey]}</Text>
      </View>

      {categoryState.kind !== 'success' && categoryState.kind !== 'loading' && categoryKey ? (
        <View style={{ paddingHorizontal: spacing.s5, marginBottom: spacing.s4 }}>
          <ApiStateView state={categoryState} onRetry={refetchCategory} />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.s5, paddingBottom: 130 + insets.bottom }}>
        {stepKey === 'category' ? <CategoryStep /> : null}
        {stepKey === 'brand' && category ? <BrandStep category={category} /> : null}
        {stepKey === 'attributes' && category ? <AttributesStep category={category} /> : null}
        {stepKey === 'variants' && category ? <VariantsStep category={category} /> : null}
        {stepKey === 'details' ? <DetailsStep category={category} onEditCategory={() => setStepIndex(0)} brandDark={brandDark} /> : null}
        {stepKey === 'location' ? <LocationStep /> : null}
        {stepKey === 'review' && category ? <ReviewStep category={category} /> : null}
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s4, paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 + insets.bottom, flexDirection: 'row', gap: spacing.s2 }}>
        <Button variant="ghost" style={{ flex: 0, width: 100 }} onPress={goBack}>
          رجوع
        </Button>
        <View style={{ flex: 1 }}>
          <Button disabled={!canNext} onPress={() => (stepIndex < steps.length - 1 ? goNext() : publish())}>
            {stepIndex < steps.length - 1 ? 'التالي' : editingListing ? 'احفظ التعديلات' : 'انشر الإعلان'}
          </Button>
        </View>
      </View>
    </View>
  );
}

const STEP_TITLES: Record<StepKey, string> = {
  category: 'التصنيف',
  brand: 'البراند والموديل',
  attributes: 'خصائص الإعلان',
  variants: 'المقاسات والألوان',
  details: 'الصور والتفاصيل',
  location: 'الموقع',
  review: 'المراجعة والنشر',
};
const STEP_DESCS: Record<StepKey, string> = {
  category: 'اختار التصنيف الفرعي المناسب لإعلانك — تقدر تدور بالاسم كمان.',
  brand: 'اختار البراند وبعدين الموديل بالظبط.',
  attributes: 'الحقول دي بتفرق حسب التصنيف — عبّيها بدقة عشان الفلترة تشتغل صح.',
  variants: 'ضيف نسخ المنتج (مقاس/لون) بمخزون كل نسخة — اختياري، سيبه فاضي لو المنتج بقطعة واحدة بس.',
  details: 'الصور المهم فيها ضوء طبيعي، واذكر أي عيوب في الوصف.',
  location: 'حدّد المحافظة والمدينة عشان نقرّب الإعلان من المشترين حواليك.',
  review: 'راجع البيانات قبل النشر — تقدر تعدّلها بعدين من "إعلاناتي".',
};

// ============================================================ خطوة 1: التصنيف التدريجي
function CategoryStep() {
  const { colors, spacing, radius } = useTheme();
  const { postDraft, setPostDraft } = useAppStore();
  const [parentId, setParentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // debounce بسيط — بحث حقيقي عبر الشبكة (search_categories) على كل
  // ضغطة حرف كان معقول لما كان بحث محلي متزامن، مش دلوقتي.
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const { state: searchState } = useApiResult(
    () => (debouncedSearch ? searchCategories(debouncedSearch) : Promise.resolve({ status: 'success' as const, data: [] })),
    [debouncedSearch],
    (data) => debouncedSearch.length > 0 && data.length === 0,
  );

  const { state: childrenState, refetch: refetchChildren } = useApiResult(
    () => getChildren(parentId ?? undefined),
    [parentId],
    (data) => data.length === 0,
  );

  const { state: pathState } = useApiResult(
    () => (parentId ? getPath(parentId) : Promise.resolve({ status: 'success' as const, data: [] })),
    [parentId],
  );
  const path = pathState.kind === 'success' ? pathState.data : [];

  // isGroup جاي فعليًا من get_children/search_categories دلوقتي (زي
  // app/category/[id].tsx بالظبط) — بديل نداء getChildren(cat.id).length>0
  // إضافي لكل عنصر كان بيحصل قبل كده.
  const selectLeaf = (cat: Category) => {
    if (cat.isGroup) {
      setParentId(cat.id);
      setSearch('');
    } else {
      setPostDraft({ categoryKey: cat.id, brandId: null, modelId: null, attributes: {} });
    }
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, paddingHorizontal: spacing.s3, marginBottom: spacing.s4 }}>
        <Icon name="search" size={16} color={colors.ink3} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="دوّر في التصنيفات (مثال: آيفون)"
          placeholderTextColor={colors.ink3}
          style={{ flex: 1, paddingVertical: 12, fontSize: 12.5, color: colors.ink }}
        />
      </View>

      {search.trim() ? (
        searchState.kind === 'success' ? (
          <View style={{ gap: 8 }}>
            {searchState.data.map((c) => (
              <CategorySearchResultRow key={c.id} category={c} onPress={() => selectLeaf(c)} />
            ))}
          </View>
        ) : (
          <ApiStateView state={searchState} />
        )
      ) : (
        <>
          {path.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginBottom: spacing.s3 }}>
              <Pressable onPress={() => setParentId(null)}>
                <Text style={{ fontSize: 11.5, color: colors.signal, fontWeight: '600' }}>الكل</Text>
              </Pressable>
              {path.map((p) => (
                <React.Fragment key={p.id}>
                  <Icon name="chev-l" size={11} color={colors.ink3} />
                  <Pressable onPress={() => setParentId(p.id)}>
                    <Text style={{ fontSize: 11.5, color: colors.ink2, fontWeight: '600' }}>{p.name}</Text>
                  </Pressable>
                </React.Fragment>
              ))}
            </View>
          ) : null}

          {childrenState.kind === 'success' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s3 }}>
              {childrenState.data.map((c) => {
                const active = postDraft.categoryKey === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => selectLeaf(c)}
                    style={{ width: '31%', paddingVertical: spacing.s3, alignItems: 'center', backgroundColor: active ? colors.signalWash : colors.card, borderWidth: 1.5, borderColor: active ? colors.signal : colors.line, borderRadius: radius.r3 }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.s2 }}>
                      <Icon name={c.icon} color={colors.signal2} size={22} />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ink, textAlign: 'center' }}>{c.name}</Text>
                    {c.isGroup ? <Text style={{ fontSize: 9, color: colors.ink3, marginTop: 2 }}>فروع أكتر ›</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <ApiStateView state={childrenState} onRetry={refetchChildren} />
          )}
        </>
      )}
    </View>
  );
}

/** صف نتيجة بحث واحد — بيجيب مساره الكامل (تصنيف أب ← أب ← هو) لوحده عبر
 * getPath، عشان نتايج البحث تتعرض بمسارها الكامل زي التصفّح العادي بالظبط
 * (مش بس اسم التصنيف نفسه) من غير ما CategoryStep يجيب مسار كل نتيجة
 * مقدّمًا. بيرجع اسم التصنيف بس لحد ما المسار يوصل. */
function CategorySearchResultRow({ category, onPress }: { category: Category; onPress: () => void }) {
  const { colors, radius } = useTheme();
  const { state } = useApiResult(() => getPath(category.id), [category.id]);
  const label = state.kind === 'success' ? state.data.map((p) => p.name).join(' ← ') : category.name;
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: 12 }}>
      <Icon name={category.icon} size={18} color={colors.ink2} />
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink }}>{label}</Text>
      <Icon name="chev-l" size={14} color={colors.ink3} />
    </Pressable>
  );
}

// ============================================================ خطوة 2: البراند والموديل
function BrandStep({ category }: { category: Category }) {
  const { colors, spacing, radius } = useTheme();
  const { postDraft, setPostDraft } = useAppStore();
  const [search, setSearch] = useState('');

  const { state: brandsState, refetch: refetchBrands } = useApiResult(
    () => getBrandsForCategory(category.id),
    [category.id],
    (data) => data.length === 0,
  );
  const brands = brandsState.kind === 'success'
    ? brandsState.data.filter((b) => !search.trim() || b.name.toLowerCase().includes(search.trim().toLowerCase()))
    : [];
  const selectedBrand = brandsState.kind === 'success' ? brandsState.data.find((b) => b.id === postDraft.brandId) : undefined;

  const { state: modelsState, refetch: refetchModels } = useApiResult(
    () => (postDraft.brandId ? getModelsForBrand(postDraft.brandId) : Promise.resolve({ status: 'success' as const, data: [] })),
    [postDraft.brandId],
    (data) => data.length === 0,
  );

  if (!postDraft.brandId) {
    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, paddingHorizontal: spacing.s3, marginBottom: spacing.s4 }}>
          <Icon name="search" size={16} color={colors.ink3} />
          <TextInput value={search} onChangeText={setSearch} placeholder="دوّر على براند" placeholderTextColor={colors.ink3} style={{ flex: 1, paddingVertical: 12, fontSize: 12.5, color: colors.ink }} />
        </View>
        {brandsState.kind === 'success' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s3 }}>
            {brands.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => setPostDraft({ brandId: b.id, modelId: null })}
                style={{ width: 78, alignItems: 'center', gap: 6 }}
              >
                <BrandLogo brandId={b.id} size={56} fallbackIcon={category.icon} />
                <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: '600', color: colors.ink, textAlign: 'center' }}>
                  {b.name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <ApiStateView state={brandsState} onRetry={refetchBrands} />
        )}
      </View>
    );
  }

  return (
    <View>
      <Pressable onPress={() => setPostDraft({ brandId: null, modelId: null })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.s4 }}>
        {selectedBrand ? <BrandLogo brandId={selectedBrand.id} size={40} fallbackIcon={category.icon} /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name="chev-r" size={14} color={colors.signal} />
          <Text style={{ fontSize: 12, color: colors.signal, fontWeight: '600' }}>تغيير البراند</Text>
        </View>
      </Pressable>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink3, marginBottom: spacing.s2 }}>الموديل</Text>
      {modelsState.kind === 'success' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 }}>
          {modelsState.data.map((mo) => (
            <Chip key={mo.id} label={mo.name} active={postDraft.modelId === mo.id} onPress={() => setPostDraft({ modelId: mo.id })} />
          ))}
        </View>
      ) : (
        <ApiStateView state={modelsState} onRetry={refetchModels} />
      )}
    </View>
  );
}

// ============================================================ خطوة 3: الخصائص الديناميكية
function AttributesStep({ category }: { category: Category }) {
  const { colors, radius, spacing } = useTheme();
  const { postDraft, setPostDraft } = useAppStore();
  const [openDateField, setOpenDateField] = useState<string | null>(null);

  const setAttr = (key: string, value: string) => setPostDraft({ attributes: { ...postDraft.attributes, [key]: value } });

  return (
    <View>
      {category.fields.map((field) => {
        const value = postDraft.attributes[field.key] ?? '';
        if (field.type === 'select' && field.options) {
          return (
            <View key={field.key} style={{ marginBottom: 18 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>
                {field.label}{field.required ? ' *' : ''}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {field.options.map((opt) => (
                  <Chip key={opt} label={opt} compact active={value === opt} onPress={() => setAttr(field.key, opt)} />
                ))}
              </View>
            </View>
          );
        }
        if (field.type === 'boolean') {
          return (
            <View key={field.key} style={{ marginBottom: 18 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>{field.label}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip label="نعم" compact active={value === 'true'} onPress={() => setAttr(field.key, 'true')} />
                <Chip label="لا" compact active={value === 'false'} onPress={() => setAttr(field.key, 'false')} />
              </View>
            </View>
          );
        }
        if (field.type === 'date') {
          const dateValue = value ? new Date(value) : undefined;
          return (
            <View key={field.key} style={{ marginBottom: 18 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>
                {field.label}{field.required ? ' *' : ''}
              </Text>
              <Pressable
                onPress={() => setOpenDateField(field.key)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, paddingVertical: 13, paddingHorizontal: spacing.s3 }}
              >
                <Icon name="clock" size={16} color={colors.ink3} />
                <Text style={{ fontSize: 12.5, color: value ? colors.ink : colors.ink3 }}>
                  {dateValue ? new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(dateValue) : 'اختار التاريخ'}
                </Text>
              </Pressable>
              {openDateField === field.key ? (
                <DateTimePicker
                  value={dateValue ?? new Date()}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(event, selected) => {
                    setOpenDateField(null);
                    if (event.type === 'set' && selected) setAttr(field.key, selected.toISOString());
                  }}
                />
              ) : null}
            </View>
          );
        }
        return (
          <FormField
            key={field.key}
            label={field.label + (field.required ? ' *' : '')}
            hint={field.unit}
            value={value}
            onChangeText={(v) => setAttr(field.key, v)}
            keyboardType={field.type === 'number' || field.type === 'year' ? 'number-pad' : 'default'}
          />
        );
      })}
    </View>
  );
}

// ============================================================ خطوة 3.5: المقاسات والألوان (حسابات تجارية بس)
function VariantsStep({ category }: { category: Category }) {
  const { colors, spacing, radius } = useTheme();
  const { postDraft, setPostDraft } = useAppStore();
  const sizeOptions = category.fields.find((f) => f.key === 'size')?.options ?? [];
  const [size, setSize] = useState(sizeOptions[0] ?? '');
  const [color, setColor] = useState('');
  const [stock, setStock] = useState('1');

  const addVariant = () => {
    const stockNum = Number(stock.replace(/[^0-9]/g, '')) || 0;
    if (!size && !color) return;
    const variant: ProductVariant = { id: `v-${Date.now()}`, size: size || undefined, color: color || undefined, stock: stockNum };
    setPostDraft({ variants: [...postDraft.variants, variant] });
    setColor('');
    setStock('1');
  };

  const removeVariant = (vid: string) => setPostDraft({ variants: postDraft.variants.filter((v) => v.id !== vid) });

  return (
    <View>
      {postDraft.variants.length > 0 ? (
        <View style={{ gap: spacing.s2, marginBottom: spacing.s5 }}>
          {postDraft.variants.map((v) => (
            <View key={v.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: spacing.s3 }}>
              <Text style={{ flex: 1, fontSize: 12.5, color: colors.ink }}>
                {[v.size, v.color].filter(Boolean).join(' · ') || 'نسخة'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.ink3, fontVariant: ['tabular-nums'] }}>مخزون: {v.stock}</Text>
              <Pressable onPress={() => removeVariant(v.id)}>
                <Icon name="x" size={15} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {sizeOptions.length > 0 ? (
        <View style={{ marginBottom: spacing.s4 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>المقاس</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {sizeOptions.map((opt) => (
              <Chip key={opt} label={opt} compact active={size === opt} onPress={() => setSize(opt)} />
            ))}
          </View>
        </View>
      ) : null}
      <FormField label="اللون (اختياري)" placeholder="مثلاً: أحمر" value={color} onChangeText={setColor} />
      <FormField label="المخزون المتاح" placeholder="1" value={stock} onChangeText={setStock} keyboardType="number-pad" />
      <Pressable onPress={addVariant} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed', borderRadius: radius.r2, paddingVertical: 12 }}>
        <Icon name="plus" size={14} color={colors.ink2} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink2 }}>إضافة نسخة</Text>
      </Pressable>
    </View>
  );
}

// ============================================================ خطوة 4: الصور والتفاصيل
function DetailsStep({ category, onEditCategory, brandDark }: { category?: Category; onEditCategory: () => void; brandDark: string }) {
  const { colors, spacing, radius } = useTheme();
  const { postDraft, setPostDraft, business } = useAppStore();
  const [showDiscountDatePicker, setShowDiscountDatePicker] = useState(false);

  const { state: categoryPathState } = useApiResult(
    () => (category ? getPath(category.id) : Promise.resolve({ status: 'success' as const, data: [] })),
    [category?.id],
  );
  const categoryPathLabel = categoryPathState.kind === 'success' && categoryPathState.data.length > 0
    ? categoryPathState.data.map((p) => p.name).join(' ← ')
    : category?.name;

  const conditions: Condition[] = category?.allowedConditions ?? (['new', 'like_new', 'excellent', 'good', 'used'] as Condition[]);
  const sellingTypes: SellingType[] = category?.allowedSellingTypes ?? ['sale'];
  const priceTypes: PriceType[] = ['fixed', 'negotiable', 'contact', 'free'];
  const MAX_PHOTOS = 6;

  const addPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('محتاجين صلاحية الصور', 'من غير صلاحية الوصول لمعرض الصور مش هنقدر نضيف صور للإعلان.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, MAX_PHOTOS - postDraft.photoUris.length),
      quality: 0.7,
    });
    if (result.canceled) return;
    const uris = result.assets.map((a) => a.uri);
    setPostDraft({ photoUris: [...postDraft.photoUris, ...uris].slice(0, MAX_PHOTOS) });
  };

  const removePhoto = (uri: string) => setPostDraft({ photoUris: postDraft.photoUris.filter((u) => u !== uri) });

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.s2, marginBottom: spacing.s5 }}>
        {postDraft.photoUris.map((uri, i) => (
          <View key={uri} style={{ width: 68, height: 68 }}>
            <Image source={{ uri }} style={{ width: 68, height: 68, borderRadius: radius.r2 }} />
            {i === 0 ? (
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: brandDark, paddingVertical: 2, borderBottomLeftRadius: radius.r2, borderBottomRightRadius: radius.r2 }}>
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700', textAlign: 'center' }}>الصورة الرئيسية</Text>
              </View>
            ) : null}
            <Pressable onPress={() => removePhoto(uri)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={11} color="#fff" />
            </Pressable>
          </View>
        ))}
        {postDraft.photoUris.length < MAX_PHOTOS ? (
          <Pressable onPress={addPhotos} style={{ width: 68, height: 68, borderRadius: radius.r2, borderWidth: 2, borderColor: colors.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" color={colors.ink3} />
          </Pressable>
        ) : null}
      </ScrollView>
      {postDraft.photoUris.length === 0 ? (
        <Text style={{ fontSize: 10.5, color: colors.ink3, marginTop: -spacing.s3, marginBottom: spacing.s4 }}>
          إعلانات بصور بتلاقي تفاعل أكتر بكتير — ضيف صورة واحدة على الأقل.
        </Text>
      ) : null}

      <View style={{ marginBottom: spacing.s4 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 6 }}>التصنيف</Text>
        <Pressable onPress={onEditCategory} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 12.5, color: colors.ink }}>{category ? categoryPathLabel : 'اختار تصنيف'}</Text>
          <Icon name="edit" size={14} color={colors.ink3} />
        </Pressable>
      </View>

      <FormField label="عنوان الإعلان" value={postDraft.title} onChangeText={(v) => setPostDraft({ title: v })} placeholder="مثال: آيفون 13 برو 256 جيجا" maxLength={70} showCounter />

      {sellingTypes.length > 1 ? (
        <View style={{ marginBottom: spacing.s4 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 6 }}>نوع العرض</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {sellingTypes.map((st) => (
              <Chip key={st} label={SELLING_TYPE_LABELS[st]} compact active={postDraft.sellingType === st} onPress={() => setPostDraft({ sellingType: st })} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ marginBottom: spacing.s4 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 6 }}>نوع السعر</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {priceTypes.map((pt) => (
            <Chip key={pt} label={PRICE_TYPE_LABELS[pt]} compact active={postDraft.priceType === pt} onPress={() => setPostDraft({ priceType: pt })} />
          ))}
        </View>
      </View>

      {postDraft.priceType !== 'free' && postDraft.priceType !== 'contact' ? (
        <FormField label="السعر" value={postDraft.price} onChangeText={(v) => setPostDraft({ price: v })} keyboardType="number-pad" isPrice />
      ) : null}

      {business ? (
        <View style={{ backgroundColor: colors.signalWash, borderWidth: 1, borderColor: colors.signal, borderRadius: radius.r3, padding: spacing.s4, marginBottom: spacing.s4 }}>
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.signal2, marginBottom: spacing.s3 }}>تسعير حساب تجاري (اختياري)</Text>
          <FormField label="سعر الجملة" hint="لو بتبيع بكميات" placeholder="0" isPrice keyboardType="number-pad" value={postDraft.wholesalePrice} onChangeText={(v) => setPostDraft({ wholesalePrice: v })} />
          {postDraft.wholesalePrice ? (
            <FormField label="أقل كمية للجملة" placeholder="10" keyboardType="number-pad" value={postDraft.minWholesaleQty} onChangeText={(v) => setPostDraft({ minWholesaleQty: v })} />
          ) : null}
          <FormField label="سعر عرض مؤقت" hint="هيتعرض بدل السعر الأساسي لحد ما ينتهي" placeholder="0" isPrice keyboardType="number-pad" value={postDraft.discountPrice} onChangeText={(v) => setPostDraft({ discountPrice: v })} />
          {postDraft.discountPrice ? (
            <>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 8 }}>ينتهي العرض في</Text>
              <Pressable onPress={() => setShowDiscountDatePicker(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, padding: 12 }}>
                <Icon name="clock" size={15} color={colors.ink3} />
                <Text style={{ fontSize: 12, color: postDraft.discountEndsAt ? colors.ink : colors.ink3 }}>
                  {postDraft.discountEndsAt ? new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(postDraft.discountEndsAt)) : 'اختار تاريخ'}
                </Text>
              </Pressable>
              {showDiscountDatePicker ? (
                <DateTimePicker
                  value={postDraft.discountEndsAt ? new Date(postDraft.discountEndsAt) : new Date()}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(e, d) => { setShowDiscountDatePicker(false); if (e.type === 'set' && d) setPostDraft({ discountEndsAt: d.toISOString() }); }}
                />
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      <View style={{ marginBottom: spacing.s4 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink, marginBottom: 6 }}>الحالة</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {conditions.map((c) => (
            <Chip key={c} label={CONDITION_LABELS[c]} compact active={postDraft.condition === c} onPress={() => setPostDraft({ condition: c })} />
          ))}
        </View>
      </View>

      <FormField label="الوصف" hint="اذكر العيوب برضه — بتقلّل الرسائل الضايعة" value={postDraft.description} onChangeText={(v) => setPostDraft({ description: v })} multiline maxLength={1000} showCounter />
    </View>
  );
}

// ============================================================ خطوة 5: الموقع الهرمي
function LocationStep() {
  const { colors, spacing, radius } = useTheme();
  const { postDraft, setPostDraft } = useAppStore();
  const [sheetOpen, setSheetOpen] = useState(!postDraft.locationId);

  // get_location_path بيرجّع المسار الكامل (محافظة، مدينة، منطقة) في نداء
  // واحد — بديل getLocation()+locationPathLabel() المتزامنين القدامى.
  const { state: pathState } = useApiResult(
    () => (postDraft.locationId ? getLocationPath(postDraft.locationId) : Promise.resolve({ status: 'success' as const, data: [] })),
    [postDraft.locationId],
  );
  const selectedLabel = !postDraft.locationId
    ? null
    : pathState.kind === 'success' && pathState.data.length > 0
      ? pathState.data.map((p) => p.name).join('، ')
      : pathState.kind === 'loading'
        ? 'جاري التحميل...'
        : 'تعذّر تحميل اسم الموقع';

  return (
    <View>
      <Pressable
        onPress={() => setSheetOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.s3,
          backgroundColor: colors.card,
          borderWidth: 1.5,
          borderColor: postDraft.locationId ? colors.verify : colors.line,
          borderRadius: radius.r3,
          padding: spacing.s4,
        }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.verifyWash, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="pin" color={colors.verify} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>
            {selectedLabel ?? 'اضغط لاختيار موقع الإعلان'}
          </Text>
          <Text style={{ fontSize: 10.5, color: colors.ink3, marginTop: 2 }}>محافظة، مدينة، أو منطقة بالظبط</Text>
        </View>
        <Icon name="edit" size={16} color={colors.ink3} />
      </Pressable>

      <LocationPicker
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSelect={(id) => setPostDraft({ locationId: id })}
        initialLocationId={postDraft.locationId}
        title="موقع الإعلان"
      />
    </View>
  );
}

// ============================================================ خطوة 6: المراجعة
function ReviewStep({ category }: { category: Category }) {
  const { postDraft } = useAppStore();
  const { radius, spacing } = useTheme();

  const { state: categoryPathState } = useApiResult(() => getPath(category.id), [category.id]);
  const categoryPath = categoryPathState.kind === 'success' && categoryPathState.data.length > 0
    ? categoryPathState.data.map((p) => p.name).join(' ← ')
    : category.name;

  const { state: brandsState } = useApiResult(() => getBrandsForCategory(category.id), [category.id]);
  const brandName = brandsState.kind === 'success' ? brandsState.data.find((b) => b.id === postDraft.brandId)?.name ?? '—' : '…';

  const { state: modelsState } = useApiResult(
    () => (postDraft.brandId ? getModelsForBrand(postDraft.brandId) : Promise.resolve({ status: 'success' as const, data: [] })),
    [postDraft.brandId],
  );
  const modelName = modelsState.kind === 'success' ? modelsState.data.find((m) => m.id === postDraft.modelId)?.name ?? '—' : '…';

  const { state: locationPathState } = useApiResult(
    () => (postDraft.locationId ? getLocationPath(postDraft.locationId) : Promise.resolve({ status: 'success' as const, data: [] })),
    [postDraft.locationId],
  );
  const locationLabel = !postDraft.locationId
    ? '—'
    : locationPathState.kind === 'success' && locationPathState.data.length > 0
      ? locationPathState.data.map((p) => p.name).join('، ')
      : '…';

  return (
    <View>
      {postDraft.photoUris.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.s2, marginBottom: spacing.s4 }}>
          {postDraft.photoUris.map((uri) => (
            <Image key={uri} source={{ uri }} style={{ width: 64, height: 64, borderRadius: radius.r2 }} />
          ))}
        </ScrollView>
      ) : null}
      <ReviewSection title="التصنيف">
        <ReviewRow label="التصنيف" value={categoryPath} />
        {postDraft.brandId ? <ReviewRow label="البراند" value={brandName} /> : null}
        {postDraft.modelId ? <ReviewRow label="الموديل" value={modelName} last /> : null}
      </ReviewSection>
      {category.fields.length > 0 ? (
        <ReviewSection title="الخصائص">
          {category.fields.map((f, i) => {
            const raw = postDraft.attributes[f.key];
            const display = raw && f.type === 'date'
              ? new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(raw))
              : raw || '—';
            return <ReviewRow key={f.key} label={f.label} value={display} last={i === category.fields.length - 1} />;
          })}
        </ReviewSection>
      ) : null}
      {postDraft.variants.length > 0 ? (
        <ReviewSection title="المقاسات والألوان">
          {postDraft.variants.map((v, i) => (
            <ReviewRow key={v.id} label={[v.size, v.color].filter(Boolean).join(' · ') || `نسخة ${i + 1}`} value={`مخزون: ${v.stock}`} last={i === postDraft.variants.length - 1} />
          ))}
        </ReviewSection>
      ) : null}
      <ReviewSection title="التفاصيل">
        <ReviewRow label="العنوان" value={postDraft.title || '—'} />
        <ReviewRow label="السعر" value={postDraft.priceType === 'free' ? 'مجاني' : postDraft.priceType === 'contact' ? 'تواصل للسعر' : postDraft.price ? `${postDraft.price} ج.م` : '—'} />
        <ReviewRow label="الحالة" value={postDraft.condition ? CONDITION_LABELS[postDraft.condition] : '—'} />
        <ReviewRow label="الموقع" value={locationLabel} last />
      </ReviewSection>
    </View>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ marginBottom: spacing.s4 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink3, marginBottom: spacing.s2 }}>{title}</Text>
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

function ReviewRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: spacing.s4, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line2 }}>
      <Text style={{ fontSize: 12.5, color: colors.ink3 }}>{label}</Text>
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }}>{value}</Text>
    </View>
  );
}
