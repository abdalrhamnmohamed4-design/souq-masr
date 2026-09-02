/**
 * app/(tabs)/myads.tsx — يقابل #myads: تابات + بطاقات إعلان بإحصائيات
 * وأزرار إدارة + حالة فاضية. فرع من قسم الحساب فبيفضل يحطّ "حسابي" هي
 * النشطة في الكبسولة العائمة (زي .nav في الموك اب بالظبط).
 *
 * Phase 2B Slice 2: بيعرض دمج حقيقي — إعلانات حقيقية من get_my_listings
 * (السيرفر هو مصدر الحقيقة، مش mock معاد بناؤه محليًا) + إعلانات mock
 * محلية لسه موجودة (تعديلات إعلانات قديمة، أو إعلانات فيها variants —
 * القسم 8 من الطلب: مفيش حذف عام للـmock store). التاب "متوقفة" بديل
 * "قيد المراجعة" القديمة (كانت حالة وهمية غير قابلة للوصول فعليًا —
 * addMyAd's تعليق القديم يوضّح كده — والباك إند الحقيقي عنده Paused
 * فعلي محتاج يتعرض).
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ApiStateView } from '@/components/ApiStateView';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { useRequireOnline } from '@/lib/connectivityGuard';
import { useFabScrollHandler } from '@/lib/scrollFab';
import { useApiResult } from '@/hooks/useApiResult';
import { EmptyState } from '@/components/primitives/EmptyState';
import { IconButton } from '@/components/primitives/IconButton';
import { ThumbPlaceholder } from '@/components/primitives/ThumbPlaceholder';
import {
  activateListing as activateListingReal,
  deleteListing as deleteListingReal,
  getMyListings,
  markListingSold as markListingSoldReal,
  pauseListing as pauseListingReal,
} from '@/services/listingService';
import { type AdStatus, type MyAd, useAppStore, useSaleDetails } from '@/store/useAppStore';
import { SALE_METHOD_LABELS } from '@/types/sale';
import type { ThumbVariant } from '@/theme/decorative';
import { useTheme } from '@/theme/ThemeProvider';

const SEGMENTS: { key: AdStatus; label: string }[] = [
  { key: 'active', label: 'نشطة' },
  { key: 'paused', label: 'متوقفة' },
  { key: 'expired', label: 'منتهية' },
  { key: 'sold', label: 'مباع' },
];

/** بطاقة موحّدة لعرض إعلان حقيقي أو mock مع بعض بنفس شكل AdCard بالظبط
 * — chats/favorites/expiresInDays مش موجودين للإعلانات الحقيقية (خارج
 * نطاق الـslice دي: شات/مفضلة حقيقيين، ومفيش مفهوم "انتهاء" على
 * السيرفر أصلًا) فبيبقوا 0/undefined، مش قيم ملفّقة. */
type DisplayAd = {
  id: string;
  title: string;
  price: number;
  thumb: ThumbVariant;
  photoUri?: string;
  status: AdStatus;
  views: number;
  chats: number;
  favorites: number;
  expiresInDays?: number;
  isReal: boolean;
};

function realStatusToAdStatus(status: string): AdStatus | null {
  if (status === 'Active') return 'active';
  if (status === 'Paused') return 'paused';
  if (status === 'Sold') return 'sold';
  return null; // Draft/Rejected — مش قابلين للوصول من تدفق الموبايل الحالي أصلًا
}

export default function MyAds() {
  const router = useRouter();
  const { colors, spacing, radius, brandDark } = useTheme();
  const [seg, setSeg] = useState<AdStatus>('active');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const myAds = useAppStore((s) => s.myAds);
  const removeMyAd = useAppStore((s) => s.removeMyAd);
  const renewMyAd = useAppStore((s) => s.renewMyAd);
  const requireOnline = useRequireOnline();
  const fabScrollHandler = useFabScrollHandler();

  // إعلانات حقيقية من السيرفر — مصدر الحقيقة، مش إعادة بناء من الـstore
  // المحلي. limit=100: عدد إعلانات مستخدم واقعي مش محتاج pagination UI
  // في الشاشة دي تحديدًا (بعكس home/results اللي فعليًا بتحتاجها).
  const { state: realState, refetch: refetchReal } = useApiResult(
    () => getMyListings(undefined, 1, 100),
    [],
  );
  const realItems = realState.kind === 'success' ? realState.data.items : [];

  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف إعلاناتك', description: 'إعلاناتك اللي هتنشرها هتظهر هنا — سجّل دخولك الأول عشان تقدر تديرها.' });
  if (authBlock) return authBlock;

  const displayAds: DisplayAd[] = [
    ...realItems
      .map((r): DisplayAd | null => {
        const status = realStatusToAdStatus(r.status);
        if (!status) return null;
        return {
          id: r.id,
          title: r.title,
          price: r.price,
          thumb: 'a' as ThumbVariant,
          photoUri: r.thumb ?? undefined,
          status,
          views: r.views,
          chats: 0,
          favorites: 0,
          isReal: true,
        };
      })
      .filter((x): x is DisplayAd => x !== null),
    ...myAds.map((a) => ({
      id: a.id,
      title: a.title,
      price: a.price,
      thumb: a.thumb,
      photoUri: a.photoUri,
      status: a.status,
      views: a.views,
      chats: a.chats,
      favorites: a.favorites,
      expiresInDays: a.expiresInDays,
      isReal: false,
    })),
  ];

  const counts = SEGMENTS.map((s) => displayAds.filter((a) => a.status === s.key).length);
  const visible = displayAds.filter((a) => a.status === seg && (!query.trim() || a.title.includes(query.trim())));

  const mutateReal = async (action: () => Promise<{ status: string }>, failTitle: string) => {
    const r = await action();
    if (r.status !== 'success') {
      Alert.alert(failTitle, 'حصلت مشكلة، جرّب تاني.');
      return;
    }
    refetchReal();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader
        title="إعلاناتي"
        right={
          <IconButton onPress={() => setSearchOpen((v) => !v)}>
            <Icon name={searchOpen ? 'x' : 'search'} color={colors.ink} />
          </IconButton>
        }
      />
      {searchOpen ? (
        <View style={{ paddingHorizontal: spacing.s5, marginBottom: spacing.s3 }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="دوّر في إعلاناتك..."
            placeholderTextColor={colors.ink3}
            autoFocus
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r2, paddingVertical: 11, paddingHorizontal: spacing.s3, fontSize: 12.5, color: colors.ink }}
          />
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 6, marginHorizontal: spacing.s5, marginBottom: spacing.s4, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 999, padding: 4 }}>
        {SEGMENTS.map((s, i) => (
          <Pressable
            key={s.key}
            onPress={() => setSeg(s.key)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 9,
              borderRadius: 999,
              backgroundColor: seg === s.key ? brandDark : 'transparent',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: seg === s.key ? '#fff' : colors.ink3 }}>
              {s.label} · {counts[i]}
            </Text>
          </Pressable>
        ))}
      </View>

      {realState.kind !== 'success' && realState.kind !== 'loading' ? (
        <View style={{ paddingHorizontal: spacing.s5, marginBottom: spacing.s3 }}>
          <ApiStateView state={realState} onRetry={refetchReal} />
        </View>
      ) : null}

      <Animated.ScrollView onScroll={fabScrollHandler} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 150 }}>
        {realState.kind === 'loading' && displayAds.length === 0 ? (
          <ApiStateView state={realState} />
        ) : visible.length === 0 ? (
          query.trim() ? (
            <Text style={{ textAlign: 'center', color: colors.ink3, fontSize: 12.5, paddingTop: 40 }}>مفيش إعلانات مطابقة للبحث.</Text>
          ) : (
            <EmptyState
              icon={<Icon name={seg === 'sold' ? 'check' : 'box'} color={colors.ink3} size={26} />}
              title={seg === 'expired' ? 'مفيش إعلانات منتهية هنا' : seg === 'paused' ? 'مفيش إعلانات متوقفة هنا' : seg === 'sold' ? 'لسه معندكش إعلانات مباعة' : 'مفيش إعلانات في القسم ده'}
              description={
                seg === 'sold'
                  ? 'أول ما تأكّد بيع إعلان من الشات أو تعلّمه مباع، هيظهر هنا.'
                  : seg === 'paused'
                    ? 'وقّف أي إعلان نشط مؤقتًا، هيظهر هنا لحد ما تفعّله تاني.'
                    : 'الإعلانات المنتهية بتفضل محفوظة 30 يوم، وتقدر تجدّدها في أي وقت.'
              }
              actionLabel={seg === 'sold' || seg === 'paused' ? undefined : 'انشر إعلان جديد'}
              onAction={seg === 'sold' || seg === 'paused' ? undefined : () => router.push('/post')}
            />
          )
        ) : (
          visible.map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              onRenew={() => requireOnline(() => renewMyAd(ad.id))}
              onEdit={() => router.push(`/post?editId=${ad.id}`)}
              onPause={() => requireOnline(() => mutateReal(() => pauseListingReal(ad.id).then((r) => ({ status: r.status })), 'تعذّر إيقاف الإعلان'))}
              onActivate={() => requireOnline(() => mutateReal(() => activateListingReal(ad.id).then((r) => ({ status: r.status })), 'تعذّر تفعيل الإعلان'))}
              onMarkSold={() =>
                Alert.alert('تأكيد البيع', `متأكد إن "${ad.title}" اتباع فعلًا؟`, [
                  { text: 'إلغاء', style: 'cancel' },
                  {
                    text: 'اتباع',
                    onPress: () => requireOnline(() => mutateReal(() => markListingSoldReal(ad.id).then((r) => ({ status: r.status })), 'تعذّر تسجيل البيع')),
                  },
                ])
              }
              onRemove={() =>
                Alert.alert('حذف الإعلان', `متأكد إنك عايز تحذف "${ad.title}"؟`, [
                  { text: 'إلغاء', style: 'cancel' },
                  {
                    text: 'حذف',
                    style: 'destructive',
                    onPress: () =>
                      requireOnline(() => {
                        if (ad.isReal) {
                          mutateReal(() => deleteListingReal(ad.id).then((r) => ({ status: r.status })), 'تعذّر حذف الإعلان');
                        } else {
                          removeMyAd(ad.id);
                        }
                      }),
                  },
                ])
              }
            />
          ))
        )}
      </Animated.ScrollView>
    </View>
  );
}

function Stat({ icon, value }: { icon: 'eye' | 'chat' | 'heart'; value: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Icon name={icon} size={13} color={colors.ink3} />
      <Text style={{ fontSize: 9.5, color: colors.ink3 }}>{value}</Text>
    </View>
  );
}

function AdCard({
  ad,
  onRenew,
  onEdit,
  onPause,
  onActivate,
  onMarkSold,
  onRemove,
}: {
  ad: DisplayAd;
  onRenew: () => void;
  onEdit: () => void;
  onPause: () => void;
  onActivate: () => void;
  onMarkSold: () => void;
  onRemove: () => void;
}) {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  // useSaleDetails بيدوّر في mock/local sale records بس — بيرجع undefined
  // بأمان لإعلان حقيقي (مفيش تسجيل بيع محلي ليه)، فمش بيتوهم بمعلومة بيع
  // مش حقيقية؛ قسم "بيع في..." ببساطة بيختفي للإعلانات الحقيقية المباعة.
  const sale = useSaleDetails(!ad.isReal && ad.status === 'sold' ? ad.id : undefined);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.r3,
        marginHorizontal: spacing.s5,
        marginBottom: spacing.s3,
        overflow: 'hidden',
      }}
    >
      {ad.status === 'active' && ad.expiresInDays ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.signalWash, paddingVertical: 6, paddingHorizontal: spacing.s3 }}>
          <Icon name="clock" size={13} color={colors.signal2} />
          <Text style={{ fontSize: 9.5, color: colors.signal2 }}>
            ينتهي بعد {ad.expiresInDays} أيام — جدّده عشان يفضل ظاهر
          </Text>
        </View>
      ) : null}
      {ad.status === 'paused' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.line2, paddingVertical: 6, paddingHorizontal: spacing.s3 }}>
          <Icon name="ban" size={13} color={colors.ink3} />
          <Text style={{ fontSize: 9.5, color: colors.ink3 }}>الإعلان متوقف مؤقتًا — مش ظاهر في التصفّح العام</Text>
        </View>
      ) : null}
      {ad.status === 'sold' && sale ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.verifyWash, paddingVertical: 6, paddingHorizontal: spacing.s3 }}>
          <Icon name="check" size={13} color={colors.verify} />
          <Text style={{ fontSize: 9.5, color: colors.verify }}>
            بيع في {new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long' }).format(new Date(sale.soldAt))} ·{' '}
            {sale.saleMethod === 'other' && sale.customSaleMethod ? sale.customSaleMethod : SALE_METHOD_LABELS[sale.saleMethod]}
          </Text>
        </View>
      ) : ad.status === 'sold' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.verifyWash, paddingVertical: 6, paddingHorizontal: spacing.s3 }}>
          <Icon name="check" size={13} color={colors.verify} />
          <Text style={{ fontSize: 9.5, color: colors.verify }}>اتباع</Text>
        </View>
      ) : null}
      <Pressable
        disabled={ad.status === 'sold'}
        onPress={() => router.push(`/detail/${ad.id}`)}
        style={{ flexDirection: 'row', gap: spacing.s3, padding: 10, opacity: ad.status === 'sold' ? 0.75 : 1 }}
      >
        <ThumbPlaceholder variant={ad.thumb} photoUri={ad.photoUri} width={80} height={80} radius={radius.r2} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }}>{ad.title}</Text>
          <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 14, color: colors.ink, marginTop: 4 }}>
            {ad.price.toLocaleString('en-US')} <Text style={{ fontSize: 10, color: colors.ink3 }}>ج.م</Text>
          </Text>
          {ad.status === 'sold' ? (
            <Text style={{ fontSize: 10, color: colors.ink3, marginTop: 6 }}>افتح تفاصيل الإعلان ←</Text>
          ) : (
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
              <Stat icon="eye" value={ad.views} />
              <Stat icon="chat" value={ad.chats} />
              <Stat icon="heart" value={ad.favorites} />
            </View>
          )}
        </View>
      </Pressable>
      {ad.status !== 'sold' ? (
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line2 }}>
          {ad.isReal ? (
            <>
              <AdAction icon="edit" label="عدّل" onPress={onEdit} />
              {ad.status === 'active' ? (
                <AdAction icon="ban" label="أوقف" onPress={onPause} />
              ) : (
                <AdAction icon="refresh" label="فعّل" onPress={onActivate} />
              )}
              <AdAction icon="check" label="مباع" onPress={onMarkSold} />
              <AdAction icon="trash" label="احذف" tone="danger" onPress={onRemove} />
            </>
          ) : (
            <>
              <AdAction icon="rocket" label="ميّز" tone="gold" onPress={() => router.push(`/promote/${ad.id}`)} />
              <AdAction icon="refresh" label="جدّد" onPress={onRenew} disabled={ad.status === 'active'} />
              <AdAction icon="edit" label="عدّل" onPress={onEdit} />
              <AdAction icon="trash" label="احذف" tone="danger" onPress={onRemove} />
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

function AdAction({
  icon,
  label,
  onPress,
  tone,
  disabled,
}: {
  icon: 'rocket' | 'refresh' | 'edit' | 'trash' | 'ban' | 'check';
  label: string;
  onPress?: () => void;
  tone?: 'gold' | 'danger';
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const fg = tone === 'gold' ? '#8A6300' : tone === 'danger' ? colors.danger : colors.ink2;
  const bg = tone === 'gold' ? colors.goldWash : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        paddingVertical: 11,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 5,
        backgroundColor: bg,
        opacity: disabled ? 0.4 : 1,
        borderLeftWidth: 1,
        borderLeftColor: colors.line2,
      }}
    >
      <Icon name={icon} size={14} color={fg} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: fg }}>{label}</Text>
    </Pressable>
  );
}
