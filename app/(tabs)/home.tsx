/**
 * app/(tabs)/home.tsx — الرئيسية (مرجع mazadhome.html)، بلون العلامة
 * أحمر/برتقالي (colors.signal) بدل الأخضر الأصلي. شريط التنقل السفلي
 * فضل الكبسولة الزجاجية العائمة بتاعتنا (مش شريط التصميم الجديد المسطّح)
 * لأن ده قرار تصميم قائم للتطبيق كله.
 *
 * Phase 2B Slice 2: كل أقسام الإعلانات هنا بقت من الباك إند الحقيقي
 * (search_listings/get_listings_by_category/get_listings_by_location —
 * Active بس، مفيش Paused/Sold/Draft بيسرّب هنا خالص). "الأقسام اللي
 * محتاجة بيانات مش متاحة بأمانة" لسه المبدأ نفسه: "إعلانات مميّزة"
 * دايمًا فاضية (مفيش نظام تمييز حقيقي على السيرفر لسه — Phase 2D)، مش
 * ملفّقة بقيمة وهمية.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFabScrollHandler } from '@/lib/scrollFab';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiStateView } from '@/components/ApiStateView';
import { Icon, type IconName } from '@/components/Icon';
import { LocationPicker } from '@/components/LocationPicker';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ThumbPlaceholder } from '@/components/primitives/ThumbPlaceholder';
import { combineApiResultList, useApiResult } from '@/hooks/useApiResult';
import { useSeedFavoriteCache } from '@/hooks/useSeedFavoriteCache';
import { useT } from '@/i18n';
import { categoryLabel } from '@/mock/taxonomy/categories';
import type { Listing } from '@/mock/listings';
import { getBrandsForCategory, getCategory, getChildren, getLocationPath } from '@/services/taxonomyService';
import { getListingsByCategory, getListingsByLocation, searchListings } from '@/services/listingService';
import { getMyConversations } from '@/services/chatService';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useAllJobs, useAllServices } from '@/store/useJobsStore';
import { useRequireAuth } from '@/lib/auth';
import type { ThumbVariant } from '@/theme/decorative';
import { useTheme } from '@/theme/ThemeProvider';

const CAR_CATEGORY_ID = 'cars';
const REAL_ESTATE_PARENT_ID = 'real_estate';

// مدخل "براندات محلية" — روابط لتصنيفات حقيقية موجودة فعلاً (مش تصنيفات
// وهمية جديدة)، الاسم بيتقرأ من التصنيف نفسه (categoryLabel) مش نص ثابت
// هنا، عشان يتترجم زي أي تصنيف تاني.
const LOCAL_BRAND_SHORTCUT_IDS: { id: string; icon: IconName }[] = [
  { id: 'fashion_women', icon: 'shirt' },
  { id: 'fashion_men', icon: 'shirt' },
  { id: 'fashion_shoes_bags', icon: 'case' },
  { id: 'fashion_accessories', icon: 'star' },
  { id: 'beauty', icon: 'face' },
  { id: 'furniture', icon: 'sofa' },
];

export default function Home() {
  const router = useRouter();
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const { colors, spacing, radius, brandDark } = useTheme();
  const insets = useSafeAreaInsets();
  const fabScrollHandler = useFabScrollHandler();
  const isFav = useAppStore((s) => s.isFavorite);
  const toggleFav = useAppStore((s) => s.toggleFavorite);
  const requireAuth = useRequireAuth();
  const city = useAppStore((s) => s.onboarding.city);
  const mockUnreadCount = useAppStore((s) => s.conversations.reduce((sum, c) => sum + c.unread, 0));
  // Phase 2B Slice 4: المحادثات الحقيقية (CONV-#####) لها unread count
  // خاص بيها من الباك إند (get_my_conversations) — بنجمعه مع العداد
  // المحلي عشان شارة الرسائل تعكس الاتنين، مش تسيب الحقيقية بره الحساب.
  const [realUnreadCount, setRealUnreadCount] = useState(0);
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const r = await getMyConversations();
      if (!cancelled && r.status === 'success') {
        setRealUnreadCount(r.data.reduce((sum, c) => sum + (c.unread ?? 0), 0));
      }
    };
    load();
    const timer = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
  const unreadCount = mockUnreadCount + realUnreadCount;
  const unreadNotifications = useAppStore((s) => s.notifications.filter((n) => !n.isRead).length);
  const setOnboarding = useAppStore((s) => s.setOnboarding);
  const onboardingLocationId = useAppStore((s) => s.onboarding.locationId);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);

  const goDetail = (id: string) => router.push(`/detail/${id}`);

  // ============ Phase 2B Slice 2: أقسام الإعلانات من الباك إند الحقيقي ============
  // كل نداء مستقل بـuseApiResult خاصة بيه — فشل قسم واحد (شبكة/سيرفر)
  // مبيوقفش الباقي، ونفس نمط الفشل-الهادئ المتّبع في تصنيفات Phase 2A
  // (براندات محلية/أنواع عقارات) بالظبط.
  const { state: newestState, refetch: refetchNewest } = useApiResult(
    () => searchListings({ sort: 'newest', limit: 10 }),
    [],
  );
  const newest = newestState.kind === 'success' ? newestState.data.items : [];
  const totalActiveListings = newestState.kind === 'success' ? newestState.data.total : 0;

  // مفيش نظام تمييز (Featured) حقيقي متصل على السيرفر لسه (Phase 2D) —
  // القسم ده فاضي بأمانة دايمًا، مش بيانات وهمية بديلة.
  const featured: Listing[] = [];

  const { state: cheapestState } = useApiResult(() => searchListings({ sort: 'cheapest', limit: 10 }), []);
  const cheapest = cheapestState.kind === 'success' ? cheapestState.data.items : [];

  const { state: nearbyState } = useApiResult(
    () =>
      onboardingLocationId
        ? getListingsByLocation(onboardingLocationId, 1, 10)
        : Promise.resolve({ status: 'success' as const, data: { items: [] as Listing[], total: 0, page: 1 } }),
    [onboardingLocationId],
  );
  const nearby = nearbyState.kind === 'success' ? nearbyState.data.items : [];

  const { state: carListingsState } = useApiResult(() => getListingsByCategory(CAR_CATEGORY_ID, 1, 10), []);
  const carListings = carListingsState.kind === 'success' ? carListingsState.data.items : [];

  const { state: realEstateListingsState } = useApiResult(() => getListingsByCategory(REAL_ESTATE_PARENT_ID, 1, 10), []);
  const realEstateListings = realEstateListingsState.kind === 'success' ? realEstateListingsState.data.items : [];

  // Phase 2B Slice 3: بيزرع/يصحّح favorites cache المحلي من is_favorite
  // الحقيقي المتضمّن مع كل قسم — عشان قلوب MiniCard تبان بحالتها الصح من
  // أول تحميل، مش بس بعد أول toggle محلي.
  useSeedFavoriteCache(newest);
  useSeedFavoriteCache(cheapest);
  useSeedFavoriteCache(nearby);
  useSeedFavoriteCache(carListings);
  useSeedFavoriteCache(realEstateListings);

  const publishedJobsCount = useAllJobs().filter((j) => j.status === 'published').length;
  const activeServicesCount = useAllServices().filter((s) => s.status === 'active').length;

  // ============ Phase 2A: تصنيفات حقيقية من الباك إند ============
  const { state: categoriesState, refetch: refetchCategories } = useApiResult(
    () => getChildren(),
    [],
    (data) => data.length === 0,
  );
  const homeCategoryList = categoriesState.kind === 'success' ? categoriesState.data.slice(0, 7) : [];

  const { state: brandShortcutsState } = useApiResult(
    () => Promise.all(LOCAL_BRAND_SHORTCUT_IDS.map((s) => getCategory(s.id))).then(combineApiResultList),
    [],
  );
  const localBrandShortcuts =
    brandShortcutsState.kind === 'success'
      ? brandShortcutsState.data.map((cat, i) => ({ id: cat.id, icon: LOCAL_BRAND_SHORTCUT_IDS[i].icon, label: categoryLabel(cat, language) }))
      : [];

  const { state: propertyTypesState } = useApiResult(() => getCategory('realestate_sale'), []);
  const propertyTypes =
    propertyTypesState.kind === 'success' ? propertyTypesState.data.fields.find((f) => f.key === 'propertyType')?.options ?? [] : [];

  const { state: carBrandsState } = useApiResult(() => getBrandsForCategory(CAR_CATEGORY_ID), []);
  const carBrands = carBrandsState.kind === 'success' ? carBrandsState.data.slice(0, 8) : [];

  return (
    <Animated.ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingBottom: 140 }}
      onScroll={fabScrollHandler}
      scrollEventThrottle={16}
    >
      {/* الهيدر برتقالي/أحمر ثابت في الوضعين، فأيقونات الـ status bar
          لازم تفضل فاتحة (بيضا) فوقه بغض النظر عن وضع التطبيق. */}
      <StatusBar style="light" />
      {/* ============ الهيدر ============ */}
      <View
        style={{ backgroundColor: colors.signal, paddingTop: insets.top + spacing.s3, paddingBottom: spacing.s4, paddingHorizontal: spacing.s4, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icon name="menu" color="#fff" />
          <Text style={{ flex: 1, fontFamily: 'Cairo_800ExtraBold', fontSize: 22, color: '#fff' }}>
            {t('common.brandName')}<Text style={{ color: colors.gold }}>.</Text>
          </Text>
          <Pressable onPress={() => router.push('/favorites')}>
            <Icon name="heart" color="#fff" />
          </Pressable>
          <Pressable onPress={() => router.push('/messages')} style={{ position: 'relative' }}>
            <Icon name="chat" color="#fff" />
            {unreadCount > 0 ? (
              <View style={{ position: 'absolute', top: -5, left: -6, backgroundColor: '#fff', minWidth: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: colors.signal }}>{unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable onPress={() => router.push('/notifications')} style={{ position: 'relative' }}>
            <Icon name="bell" color="#fff" />
            {unreadNotifications > 0 ? (
              <View style={{ position: 'absolute', top: -5, left: -6, backgroundColor: '#fff', minWidth: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: colors.signal }}>{unreadNotifications}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <Pressable onPress={() => setLocationSheetOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }}>
          <Icon name="pin" size={16} color="#fff" />
          <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,.92)' }}>{city || t('home.chooseCity')}</Text>
          <Icon name="chev-d" size={13} color="rgba(255,255,255,.8)" />
        </Pressable>

        <View style={{ marginTop: 11, backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 13, shadowColor: '#063C30', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 }}>
          <Pressable onPress={() => router.push(searchQuery.trim() ? `/results?q=${encodeURIComponent(searchQuery.trim())}` : '/results')}>
            <Icon name="search" color={colors.signal} />
          </Pressable>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => router.push(searchQuery.trim() ? `/results?q=${encodeURIComponent(searchQuery.trim())}` : '/results')}
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor={colors.ink3}
            returnKeyType="search"
            style={{ flex: 1, fontSize: 14, color: colors.ink, padding: 0 }}
          />
        </View>
      </View>

      {/* ============ الأقسام — Phase 2A: get_children حقيقي ============ */}
      <SectionHead title={t('home.categories')} sub={t('home.mostUsed')} />
      {categoriesState.kind === 'success' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.s4 }}>
          {homeCategoryList.map((c) => (
            <Pressable key={c.id} onPress={() => router.push(`/category/${c.id}`)} style={{ width: '22.5%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}>
              <Icon name={c.icon} color={colors.ink2} />
              <Text style={{ fontSize: 10.5, fontWeight: '600', color: colors.ink2, marginTop: 5 }}>{categoryLabel(c, language)}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => router.push('/categories')} style={{ width: '22.5%', backgroundColor: colors.signalWash, borderWidth: 1, borderColor: colors.signal, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}>
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.signal2, textAlign: 'center' }}>{t('home.allCategories')}</Text>
          </Pressable>
        </View>
      ) : (
        <ApiStateView state={categoriesState} onRetry={refetchCategories} />
      )}

      {/* ============ براندات محلية — قسم تسوّق مميّز (أزياء/جمال/لايف
          ستايل) بدل ما تفضل مدفونة جوه "كل الأقسام". مدخل اكتشاف بس
          دلوقتي — دليل براندات مستقل ونظام اشتراك/موافقة أدمن هيتضافوا
          لما يبقى فيه traffic كفاية (زي ما اتفقنا). */}
      <SectionHead title={t('home.localBrands')} sub={t('home.localBrandsSub')} moreLabel={t('home.all')} onMore={() => router.push('/category/fashion')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: spacing.s4, alignItems: 'flex-start' }}>
        {localBrandShortcuts.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push(`/category/${c.id}`)}
            style={{ alignSelf: 'flex-start', width: 92, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingVertical: 14, gap: 8 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.goldWash, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={c.icon} size={19} color="#8A6300" />
            </View>
            <Text style={{ fontSize: 10.5, fontWeight: '600', color: colors.ink2, textAlign: 'center' }}>{c.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ============ الوظائف والمهن — مدخل مضغوط بس (PART 43: "متخليش
          الوظائف تسيطر على الرئيسية") — التجربة الكاملة جوه /jobs
          و/services، هنا بس بطاقتين حقيقيتين بأرقام فعلية. ============ */}
      <SectionHead title={t('home.jobsAndServices')} sub={t('home.jobsAndServicesSub')} />
      <View style={{ flexDirection: 'row', gap: spacing.s2, paddingHorizontal: spacing.s4 }}>
        <Pressable onPress={() => router.push('/jobs')} style={{ flex: 1, backgroundColor: brandDark, borderRadius: radius.r3, padding: spacing.s4 }}>
          <Icon name="office" color="#fff" size={20} />
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#fff', marginTop: 8 }}>{t('home.jobs')}</Text>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,.65)', marginTop: 2 }}>
            {publishedJobsCount > 0 ? t('home.jobsAvailable', { count: publishedJobsCount }) : t('home.findYourJob')}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.push('/services')} style={{ flex: 1, backgroundColor: colors.goldWash, borderRadius: radius.r3, padding: spacing.s4 }}>
          <Icon name="tool" color="#8A6300" size={20} />
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#8A6300', marginTop: 8 }}>{t('home.servicesAndCrafts')}</Text>
          <Text style={{ fontSize: 10, color: '#8A6300', marginTop: 2 }}>
            {activeServicesCount > 0 ? t('home.servicesAvailable', { count: activeServicesCount }) : t('home.findCraftsman')}
          </Text>
        </Pressable>
      </View>

      {/* ============ إعلانات حقيقية أو حالة فاضية/تحميل/خطأ موحّدة ============ */}
      {newestState.kind !== 'success' ? (
        <View style={{ marginTop: spacing.s4 }}>
          <ApiStateView state={newestState} onRetry={refetchNewest} />
        </View>
      ) : totalActiveListings === 0 ? (
        <View style={{ marginTop: spacing.s4 }}>
          <EmptyState
            icon={<Icon name="box" color={colors.ink3} size={26} />}
            title={t('home.emptyTitle')}
            description={t('home.emptyDesc')}
            actionLabel={t('home.postAd')}
            onAction={() => router.push('/post')}
          />
        </View>
      ) : (
        <>
          <SectionHead title={t('home.latestAds')} sub={t('home.adsCount', { count: totalActiveListings })} moreLabel={t('home.all')} onMore={() => router.push('/results')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: spacing.s4, alignItems: 'flex-start' }}>
            {newest.map((l) => (
              <MiniCard key={l.id} onPress={() => goDetail(l.id)} thumb={l.thumb} photoUri={l.photoUris?.[0]} title={l.title} price={l.price} priceSuffix={l.priceSuffix} meta={`${l.city} · ${l.postedAt}`} onFav={() => requireAuth(() => toggleFav(l.id), { type: 'favorite_listing', listingId: l.id })} fav={isFav(l.id)} />
            ))}
          </ScrollView>

          {featured.length > 0 ? (
            <>
              <SectionHead title={t('home.featuredAds')} sub={t('home.featuredAdsSub')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: spacing.s4, alignItems: 'flex-start' }}>
                {featured.map((l) => (
                  <MiniCard key={l.id} onPress={() => goDetail(l.id)} thumb={l.thumb} photoUri={l.photoUris?.[0]} title={l.title} price={l.price} priceSuffix={l.priceSuffix} meta={l.city} onFav={() => requireAuth(() => toggleFav(l.id), { type: 'favorite_listing', listingId: l.id })} fav={isFav(l.id)} />
                ))}
              </ScrollView>
            </>
          ) : null}

          {nearby.length > 0 ? (
            <>
              <SectionHead title={t('home.nearYou')} sub={city} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: spacing.s4, alignItems: 'flex-start' }}>
                {nearby.map((l) => (
                  <MiniCard key={l.id} onPress={() => goDetail(l.id)} thumb={l.thumb} photoUri={l.photoUris?.[0]} title={l.title} price={l.price} priceSuffix={l.priceSuffix} meta={l.district ?? l.city} onFav={() => requireAuth(() => toggleFav(l.id), { type: 'favorite_listing', listingId: l.id })} fav={isFav(l.id)} />
                ))}
              </ScrollView>
            </>
          ) : null}

          {cheapest.length >= 2 ? (
            <>
              <SectionHead title={t('home.cheapestAds')} sub={t('home.cheapestAdsSub')} />
              <View style={{ paddingHorizontal: spacing.s4, gap: 9 }}>
                {cheapest.map((l) => (
                  <Pressable key={l.id} onPress={() => goDetail(l.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 10 }}>
                    <ThumbPlaceholder variant={l.thumb} photoUri={l.photoUris?.[0]} width={58} height={58} radius={11} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>{l.title}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                        {l.isVerifiedSeller ? <Icon name="shield" size={12} color={colors.verify} /> : <Icon name="pin" size={12} color={colors.ink3} />}
                        <Text style={{ fontSize: 11, color: colors.ink3 }}>{l.isVerifiedSeller ? `${t('home.verifiedSeller')} · ` : ''}{l.city}</Text>
                      </View>
                    </View>
                    <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 15, color: colors.ink }}>{l.price.toLocaleString('en-US')}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </>
      )}

      {/* ============ سوق السيارات ============ */}
      <SubMarket
        icon="car"
        title={t('home.carsMarket')}
        chips={carBrands.map((b) => b.name)}
        listings={carListings}
        onMore={() => router.push(`/category/${CAR_CATEGORY_ID}`)}
        goDetail={goDetail}
      />

      {/* ============ سوق العقارات ============ */}
      <SubMarket
        icon="house"
        title={t('home.realEstateMarket')}
        chips={propertyTypes}
        listings={realEstateListings}
        onMore={() => router.push(`/category/${REAL_ESTATE_PARENT_ID}`)}
        goDetail={goDetail}
      />

      {/* ============ بيع بالذكاء الاصطناعي ============ */}
      <LinearGradient colors={['#A82A20', colors.signal2]} style={{ marginHorizontal: spacing.s4, marginTop: 22, borderRadius: 20, padding: 15 }}>
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#fff' }}>{t('home.aiSellTitle')}</Text>
        <Text style={{ fontSize: 12.5, color: 'rgba(255,255,255,.9)', lineHeight: 20, marginTop: 4 }}>
          {t('home.aiSellDesc')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 12 }}>
          {([
            ['cam', t('home.stepPhoto')],
            ['edit', t('home.stepDescribe')],
            ['wallet', t('home.stepPrice')],
            ['rocket', t('home.stepPublish')],
          ] as [IconName, string][]).map(([icon, label]) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10 }}>
              <Icon name={icon} size={13} color="#fff" />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>{label}</Text>
            </View>
          ))}
        </View>
        <Pressable onPress={() => router.push('/post')} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center' }}>
          <Text style={{ color: colors.signal2, fontWeight: '700', fontSize: 13.5 }}>{t('home.startSelling')}</Text>
        </Pressable>
      </LinearGradient>

      <Text style={{ textAlign: 'center', fontSize: 11.5, color: colors.ink3, lineHeight: 19, paddingHorizontal: spacing.s6, paddingTop: 26, paddingBottom: 10 }}>
        {t('home.footerTagline')}
      </Text>

      <LocationPicker
        visible={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        onSelect={(id) => {
          // بنسجّل locationId على طول (مش محتاج ننتظر الشبكة عشانه)، واسم
          // المحافظة (city) بيتحدّث لما get_location_path يرجع — نفس فكرة
          // locationPathLabel(id).split('، ')[0] القديمة (أول عنصر = المحافظة،
          // المسار جاي من الجذر) بس من الباك إند الحقيقي دلوقتي.
          setOnboarding({ locationId: id });
          getLocationPath(id).then((r) => {
            if (r.status === 'success' && r.data.length > 0) {
              setOnboarding({ city: r.data[0].name });
            }
          });
        }}
        initialLocationId={onboardingLocationId}
        title={t('home.chooseCity')}
      />
    </Animated.ScrollView>
  );
}

function SectionHead({ title, sub, moreLabel, onMore }: { title: string; sub?: string; moreLabel?: string; onMore?: () => void }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: spacing.s4, paddingTop: 18, paddingBottom: 10 }}>
      <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 18, color: colors.ink }}>{title}</Text>
      {sub ? <Text style={{ fontSize: 11.5, color: colors.ink3, fontWeight: '500' }}>{sub}</Text> : null}
      {moreLabel ? (
        <Pressable onPress={onMore} style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={{ fontSize: 12.5, color: colors.signal, fontWeight: '600' }}>{moreLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MiniCard({
  thumb,
  photoUri,
  title,
  price,
  priceSuffix,
  meta,
  onPress,
  onFav,
  fav,
}: {
  thumb: ThumbVariant;
  photoUri?: string;
  title: string;
  price: number;
  priceSuffix?: string;
  meta: string;
  onPress: () => void;
  onFav: () => void;
  fav: boolean;
}) {
  const { colors, radius } = useTheme();
  const t = useT();
  return (
    <Pressable onPress={onPress} style={{ alignSelf: 'flex-start', width: 158, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, overflow: 'hidden' }}>
      <ThumbPlaceholder variant={thumb} photoUri={photoUri} height={100}>
        <Pressable onPress={onFav} style={{ position: 'absolute', top: 8, left: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,.92)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="heart" size={14} color={fav ? colors.signal : colors.ink2} />
        </Pressable>
      </ThumbPlaceholder>
      <View style={{ padding: 9 }}>
        <Text numberOfLines={2} style={{ fontSize: 12, fontWeight: '500', color: colors.ink2, lineHeight: 17, height: 34 }}>{title}</Text>
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 15, color: colors.ink, marginTop: 3 }}>
          {price.toLocaleString('en-US')} <Text style={{ fontSize: 10.5, color: colors.ink3, fontWeight: '600' }}>{t('common.currency')}{priceSuffix ? `/${priceSuffix}` : ''}</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
          <Icon name="pin" size={11} color={colors.ink3} />
          <Text style={{ fontSize: 10, color: colors.ink3 }}>{meta}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function SubMarket({
  icon,
  title,
  chips,
  listings,
  onMore,
  goDetail,
}: {
  icon: IconName;
  title: string;
  chips: string[];
  listings: Listing[];
  onMore: () => void;
  goDetail: (id: string) => void;
}) {
  const { colors, spacing } = useTheme();
  const t = useT();
  return (
    <View style={{ marginHorizontal: spacing.s4, marginTop: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingVertical: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, paddingBottom: 11 }}>
        <Icon name={icon} size={19} color={colors.ink} />
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16, color: colors.ink, flex: 1 }}>{title}</Text>
        <Pressable onPress={onMore}>
          <Text style={{ fontSize: 12, color: colors.signal, fontWeight: '600' }}>{t('home.enterMarket')}</Text>
        </Pressable>
      </View>
      {chips.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingHorizontal: 13, paddingBottom: listings.length > 0 ? 12 : 2, alignItems: 'flex-start' }}>
          {chips.map((c) => (
            <Pressable key={c} onPress={onMore} style={{ alignSelf: 'flex-start', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink2 }}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {listings.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 13, alignItems: 'flex-start' }}>
          {listings.map((l) => (
            <MiniCardLink key={l.id} id={l.id} title={l.title} price={l.price} thumb={l.thumb} photoUri={l.photoUris?.[0]} meta={`${l.city}${l.district ? '، ' + l.district : ''}`} />
          ))}
        </ScrollView>
      ) : (
        <Text style={{ fontSize: 11, color: colors.ink3, paddingHorizontal: 13, paddingTop: 2 }}>{t('home.noAdsInMarket')}</Text>
      )}
    </View>
  );
}

function MiniCardLink({ id, title, price, thumb, photoUri, meta }: { id: string; title: string; price: number; thumb: ThumbVariant; photoUri?: string; meta: string }) {
  const router = useRouter();
  const { colors, radius } = useTheme();
  const t = useT();
  const isFav = useAppStore((s) => s.isFavorite(id));
  const toggleFav = useAppStore((s) => s.toggleFavorite);
  const requireAuth = useRequireAuth();
  return (
    <Pressable onPress={() => router.push(`/detail/${id}`)} style={{ alignSelf: 'flex-start', width: 155, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, overflow: 'hidden' }}>
      <ThumbPlaceholder variant={thumb} photoUri={photoUri} height={98}>
        <Pressable onPress={() => requireAuth(() => toggleFav(id), { type: 'favorite_listing', listingId: id })} style={{ position: 'absolute', top: 8, left: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,.92)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="heart" size={14} color={isFav ? colors.signal : colors.ink2} />
        </Pressable>
      </ThumbPlaceholder>
      <View style={{ padding: 9 }}>
        <Text numberOfLines={2} style={{ fontSize: 12, fontWeight: '500', color: colors.ink2, lineHeight: 17, height: 34 }}>{title}</Text>
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 15, color: colors.ink, marginTop: 3 }}>{price.toLocaleString('en-US')} <Text style={{ fontSize: 10.5, color: colors.ink3 }}>{t('common.currency')}</Text></Text>
        <Text numberOfLines={1} style={{ fontSize: 10, color: colors.ink3, marginTop: 4 }}>{meta}</Text>
      </View>
    </Pressable>
  );
}
