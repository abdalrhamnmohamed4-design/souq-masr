/**
 * components/LocationPicker.tsx — شيت سفلي واحد لاختيار الموقع، بديل
 * الشبكة المسطّحة القديمة (محافظات بس، من غير تفاصيل مدن/مناطق) وخطوة
 * الموقع القديمة في نشر الإعلان. تصميم ميكس بين OpenSooq (تصفّح كامل
 * لمناطق كل محافظة، بحث حي) وOLX (شيت سفلي، قسم "الأكثر بحثًا"، استخدام
 * الموقع الحالي) — مستخدم في: خطوة الموقع في نشر الإعلان
 * (app/post/index.tsx، موقع الإعلان نفسه) وشيت "اختار مدينتك" الاختياري
 * في الرئيسية (app/(tabs)/home.tsx، لفلترة "قريب منك" بس). مبقاش جزء من
 * onboarding إجباري — المستخدم مبيتسألش عن موقعه إلا وهو بينشر إعلان أو
 * لو هو نفسه فتح الفلتر ده بإرادته.
 *
 * Phase 2A (آخر خطوة): بيقرأ من الباك إند الحقيقي بالكامل دلوقتي —
 * services/taxonomyService.ts's getGovernorates/getLocationChildren/
 * searchLocations/getLocation/getLocationPath. الاتنين الأخيرين كانوا
 * فجوة موثّقة في MOBILE_BACKEND_GAPS.md #1/#2 لحد ما endpoints get_location
 * وget_location_path اتضافوا فعليًا في الباك إند خصيصًا لفتح الشاشة دي.
 * قرار "الابن ده ليه أبناء ولا leaf؟" بقى بيتاخد من is_group الراجع فعليًا
 * (نفس تحسين app/category/[id].tsx بالظبط) بدل نداء إضافي لكل عنصر.
 */
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiStateView } from '@/components/ApiStateView';
import { combineApiResultList, useApiResult } from '@/hooks/useApiResult';
import { useT } from '@/i18n';
import type { LocationNode } from '@/mock/taxonomy/types';
import { getGovernorates, getLocation, getLocationChildren, searchLocations } from '@/services/taxonomyService';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';

// أشهر المحافظات بالنسبة لقاعدة مستخدمين مصريين — قسم "الأكثر بحثًا"
// زي OLX، بس من بيانات حقيقية موجودة فعلاً (مش قايمة وهمية).
const POPULAR_GOV_IDS = ['gov-القاهرة', 'gov-الجيزة', 'gov-الإسكندرية', 'gov-السويس', 'gov-الشرقية'];

// خريطة احتياطية للأسماء الإنجليزية اللي ممكن نظام التشغيل يرجّعها من
// reverseGeocodeAsync لو لغة الجهاز إنجليزي — مطابقة حقيقية، مش تخمين.
const EN_GOV_ALIASES: Record<string, string> = {
  cairo: 'gov-القاهرة',
  giza: 'gov-الجيزة',
  alexandria: 'gov-الإسكندرية',
  suez: 'gov-السويس',
  'qalyubia': 'gov-القليوبية',
  'port said': 'gov-بورسعيد',
  damietta: 'gov-دمياط',
  mansoura: 'gov-الدقهلية',
  dakahlia: 'gov-الدقهلية',
  sharqia: 'gov-الشرقية',
  gharbia: 'gov-الغربية',
  monufia: 'gov-المنوفية',
  beheira: 'gov-البحيرة',
  'kafr el sheikh': 'gov-كفر-الشيخ',
  fayoum: 'gov-الفيوم',
  'beni suef': 'gov-بني-سويف',
  minya: 'gov-المنيا',
  assiut: 'gov-أسيوط',
  sohag: 'gov-سوهاج',
  qena: 'gov-قنا',
  luxor: 'gov-الأقصر',
  aswan: 'gov-أسوان',
  'red sea': 'gov-البحر-الأحمر',
  matrouh: 'gov-مطروح',
  ismailia: 'gov-الإسماعيلية',
};

async function detectCurrentGovernorate(governorates: LocationNode[]): Promise<string | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
  const results = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
  const place = results[0];
  if (!place) return null;
  const candidates = [place.region, place.subregion, place.city].filter(Boolean) as string[];
  for (const cand of candidates) {
    const arabicMatch = governorates.find((g) => g.name === cand || cand.includes(g.name) || g.name.includes(cand));
    if (arabicMatch) return arabicMatch.id;
    const enMatch = EN_GOV_ALIASES[cand.toLowerCase().trim()];
    if (enMatch) return enMatch;
  }
  return null;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (locationId: string) => void;
  initialLocationId?: string | null;
  title?: string;
};

export function LocationPicker({ visible, onClose, onSelect, initialLocationId, title }: Props) {
  const { colors, spacing, radius } = useTheme();
  const t = useT();
  const resolvedTitle = title ?? t('locationPicker.defaultTitle');
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [browseId, setBrowseId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  // debounce بسيط (250ms) — نداء API حقيقي على كل ضغطة حرف مختلف تمامًا
  // عن بحث محلي متزامن كان مجاني فعليًا؛ ده أقل تغيير ممكن يمنع spam
  // من غير ما يغيّر شكل تجربة البحث نفسها.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  // initialLocationId: بنحل الأب بتاعه (عشان نبدأ التصفّح من نفس مستواه)
  // بشكل غير متزامن دلوقتي — قبل كده كان بحث محلي فوري وقت أول render.
  useEffect(() => {
    let cancelled = false;
    if (!initialLocationId) return;
    getLocation(initialLocationId).then((r) => {
      if (cancelled) return;
      if (r.status === 'success') setBrowseId(r.data.parentId);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocationId, visible]);

  const { state: browseNodeState } = useApiResult(
    () => (browseId ? getLocation(browseId) : Promise.resolve({ status: 'success' as const, data: null })),
    [browseId],
  );
  const browseNode = browseNodeState.kind === 'success' ? browseNodeState.data : null;

  const { state: itemsState, refetch: refetchItems } = useApiResult<LocationNode[]>(
    () => (browseId === null ? getGovernorates() : getLocationChildren(browseId)),
    [browseId],
    (data) => data.length === 0,
  );

  const { state: searchState } = useApiResult<LocationNode[]>(
    () => (debouncedQuery ? searchLocations(debouncedQuery) : Promise.resolve({ status: 'success' as const, data: [] })),
    [debouncedQuery],
    (data) => debouncedQuery.length > 0 && data.length === 0,
  );

  const { state: popularGovsState } = useApiResult(
    () => Promise.all(POPULAR_GOV_IDS.map((id) => getLocation(id))).then(combineApiResultList),
    [],
  );
  const popularGovs = popularGovsState.kind === 'success' ? popularGovsState.data : [];
  const allGovsForGeo = useMemo(() => (itemsState.kind === 'success' && browseId === null ? itemsState.data : popularGovs), [itemsState, browseId, popularGovs]);

  const select = (id: string) => {
    onSelect(id);
    setQuery('');
    onClose();
  };

  const drillIn = (node: LocationNode) => {
    if (node.isGroup) setBrowseId(node.id);
    else select(node.id);
  };

  const goBack = () => setBrowseId(browseNode?.parentId ?? null);

  const useCurrentLocation = async () => {
    setLocating(true);
    const govId = await detectCurrentGovernorate(allGovsForGeo);
    setLocating(false);
    if (govId) select(govId);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,26,46,.55)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: colors.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '86%', paddingBottom: insets.bottom }}
        >
          <View style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: colors.line, alignSelf: 'center', marginTop: 12, marginBottom: 10 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, paddingHorizontal: spacing.s5, marginBottom: spacing.s3 }}>
            {browseId !== null && !query ? (
              <Pressable onPress={goBack}>
                <Icon name="chev-r" size={18} color={colors.ink} />
              </Pressable>
            ) : null}
            <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 16, color: colors.ink, flex: 1 }}>
              {query ? resolvedTitle : browseNode ? browseNode.name : resolvedTitle}
            </Text>
          </View>

          <View style={{ paddingHorizontal: spacing.s5, marginBottom: spacing.s3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, paddingHorizontal: spacing.s3 }}>
              <Icon name="search" size={16} color={colors.ink3} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('locationPicker.searchPlaceholder')}
                placeholderTextColor={colors.ink3}
                style={{ flex: 1, fontSize: 12.5, color: colors.ink, paddingVertical: 11 }}
              />
              {query ? (
                <Pressable onPress={() => setQuery('')}>
                  <Icon name="x" size={14} color={colors.ink3} />
                </Pressable>
              ) : null}
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.s5, paddingBottom: 20 }}>
            {query.trim() ? (
              searchState.kind === 'success' ? (
                searchState.data.map((loc) => <Row key={loc.id} label={loc.name} onPress={() => select(loc.id)} />)
              ) : (
                <ApiStateView state={searchState} />
              )
            ) : (
              <>
                <Pressable
                  onPress={useCurrentLocation}
                  disabled={locating}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }}
                >
                  {locating ? <ActivityIndicator size="small" color={colors.signal} /> : <Icon name="pin" size={16} color={colors.signal} />}
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.signal }}>
                    {locating ? t('locationPicker.locating') : t('locationPicker.useCurrentLocation')}
                  </Text>
                </Pressable>

                {itemsState.kind === 'success' ? (
                  browseId === null ? (
                    <>
                      {popularGovsState.kind === 'success' ? (
                        <>
                          <SectionLabel text={t('locationPicker.popular')} />
                          {popularGovs.map((g) => (
                            <Row key={g.id} label={g.name} onPress={() => drillIn(g)} chevron />
                          ))}
                        </>
                      ) : null}
                      <SectionLabel text={t('locationPicker.allGovernorates')} />
                      {itemsState.data.map((loc) => (
                        <Row key={loc.id} label={loc.name} onPress={() => drillIn(loc)} chevron />
                      ))}
                    </>
                  ) : (
                    <>
                      <Row label={`${browseNode?.name ?? ''} — ${t('locationPicker.allAreas')}`} bold onPress={() => browseId && select(browseId)} />
                      {itemsState.data.map((loc) => (
                        <Row key={loc.id} label={loc.name} onPress={() => drillIn(loc)} chevron={!!loc.isGroup} />
                      ))}
                    </>
                  )
                ) : (
                  <ApiStateView state={itemsState} onRetry={refetchItems} />
                )}
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SectionLabel({ text }: { text: string }) {
  const { colors, spacing } = useTheme();
  return (
    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.ink3, marginTop: spacing.s3, marginBottom: spacing.s2 }}>{text}</Text>
  );
}

function Row({ label, sub, onPress, chevron, bold }: { label: string; sub?: string; onPress: () => void; chevron?: boolean; bold?: boolean }) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line2 }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: bold ? '700' : '500', color: bold ? colors.signal : colors.ink }}>{label}</Text>
        {sub ? <Text style={{ fontSize: 10, color: colors.ink3, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {chevron ? <Icon name="chev-l" size={14} color={colors.ink3} /> : null}
    </Pressable>
  );
}

export default LocationPicker;
