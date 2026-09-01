/**
 * app/(tabs)/myads.tsx — يقابل #myads: تابات + بطاقات إعلان بإحصائيات
 * وأزرار إدارة + حالة فاضية. فرع من قسم الحساب فبيفضل يحطّ "حسابي" هي
 * النشطة في الكبسولة العائمة (زي .nav في الموك اب بالظبط).
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { useRequireOnline } from '@/lib/connectivityGuard';
import { useFabScrollHandler } from '@/lib/scrollFab';
import { EmptyState } from '@/components/primitives/EmptyState';
import { IconButton } from '@/components/primitives/IconButton';
import { ThumbPlaceholder } from '@/components/primitives/ThumbPlaceholder';
import { type AdStatus, type MyAd, useAppStore, useSaleDetails } from '@/store/useAppStore';
import { SALE_METHOD_LABELS } from '@/types/sale';
import { useTheme } from '@/theme/ThemeProvider';

const SEGMENTS: { key: AdStatus; label: string }[] = [
  { key: 'active', label: 'نشطة' },
  { key: 'pending', label: 'قيد المراجعة' },
  { key: 'expired', label: 'منتهية' },
  { key: 'sold', label: 'مباع' },
];

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
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف إعلاناتك', description: 'إعلاناتك اللي هتنشرها هتظهر هنا — سجّل دخولك الأول عشان تقدر تديرها.' });
  if (authBlock) return authBlock;

  const counts = SEGMENTS.map((s) => myAds.filter((a) => a.status === s.key).length);
  const visible = myAds.filter((a) => a.status === seg && (!query.trim() || a.title.includes(query.trim())));

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

      <Animated.ScrollView onScroll={fabScrollHandler} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 150 }}>
        {visible.length === 0 ? (
          query.trim() ? (
            <Text style={{ textAlign: 'center', color: colors.ink3, fontSize: 12.5, paddingTop: 40 }}>مفيش إعلانات مطابقة للبحث.</Text>
          ) : (
            <EmptyState
              icon={<Icon name={seg === 'sold' ? 'check' : 'box'} color={colors.ink3} size={26} />}
              title={seg === 'expired' ? 'مفيش إعلانات منتهية هنا' : seg === 'sold' ? 'لسه معندكش إعلانات مباعة' : 'مفيش إعلانات في القسم ده'}
              description={
                seg === 'sold'
                  ? 'أول ما تأكّد بيع إعلان من الشات، هيظهر هنا مع تاريخ وطريقة البيع.'
                  : 'الإعلانات المنتهية بتفضل محفوظة 30 يوم، وتقدر تجدّدها في أي وقت.'
              }
              actionLabel={seg === 'sold' ? undefined : 'انشر إعلان جديد'}
              onAction={seg === 'sold' ? undefined : () => router.push('/post')}
            />
          )
        ) : (
          visible.map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              onRenew={() => requireOnline(() => renewMyAd(ad.id))}
              onRemove={() =>
                Alert.alert('حذف الإعلان', `متأكد إنك عايز تحذف "${ad.title}"؟`, [
                  { text: 'إلغاء', style: 'cancel' },
                  { text: 'حذف', style: 'destructive', onPress: () => requireOnline(() => removeMyAd(ad.id)) },
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

function AdCard({ ad, onRenew, onRemove }: { ad: MyAd; onRenew: () => void; onRemove: () => void }) {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const sale = useSaleDetails(ad.status === 'sold' ? ad.id : undefined);

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
      {ad.status === 'sold' && sale ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.verifyWash, paddingVertical: 6, paddingHorizontal: spacing.s3 }}>
          <Icon name="check" size={13} color={colors.verify} />
          <Text style={{ fontSize: 9.5, color: colors.verify }}>
            بيع في {new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long' }).format(new Date(sale.soldAt))} ·{' '}
            {sale.saleMethod === 'other' && sale.customSaleMethod ? sale.customSaleMethod : SALE_METHOD_LABELS[sale.saleMethod]}
          </Text>
        </View>
      ) : null}
      <Pressable
        disabled={ad.status !== 'sold'}
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
          <AdAction icon="rocket" label="ميّز" tone="gold" onPress={() => router.push(`/promote/${ad.id}`)} />
          <AdAction icon="refresh" label="جدّد" onPress={onRenew} disabled={ad.status === 'active'} />
          <AdAction icon="edit" label="عدّل" onPress={() => router.push(`/post?editId=${ad.id}`)} />
          <AdAction icon="trash" label="احذف" tone="danger" onPress={onRemove} />
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
  icon: 'rocket' | 'refresh' | 'edit' | 'trash';
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
