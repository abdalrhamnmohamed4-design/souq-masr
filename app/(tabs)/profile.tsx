/**
 * app/(tabs)/profile.tsx — يقابل #profile: هيدر بروفايل + إحصائيات + حد
 * الإعلانات + محفظة + توثيق الهوية + QR مشاركة + قائمة روابط.
 */
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Linking, Pressable, Share, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon, type IconName } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { Avatar } from '@/components/primitives/Avatar';
import { Button } from '@/components/primitives/Button';
import { Card } from '@/components/primitives/Card';
import { IconButton } from '@/components/primitives/IconButton';
import { Pill } from '@/components/primitives/Pill';
import { useFabScrollHandler } from '@/lib/scrollFab';
import { useAppStore, useSeller } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

// حد الإعلانات المجانية في العضوية الأساسية — قاعدة عمل ثابتة (زي باقات
// التمييز في mock/plans.ts)، مش بيانات مستخدم وهمية.
const FREE_ADS_LIMIT = 20;

const VERIFICATION_LABEL = { unverified: 'غير موثّق', pending: 'قيد المراجعة', verified: 'موثّق' } as const;

// نفس الـ pattern الحرفي من mazad-v2.html (7×7 = 49 خانة)
const QR_PATTERN = [
  1, 1, 1, 0, 1, 1, 1,
  1, 0, 1, 0, 1, 0, 1,
  1, 1, 1, 0, 1, 1, 1,
  0, 0, 0, 1, 0, 0, 0,
  1, 1, 1, 0, 1, 0, 1,
  1, 0, 1, 1, 0, 1, 1,
  1, 1, 1, 0, 1, 1, 0,
];

function MenuRow({
  icon,
  label,
  count,
  onPress,
}: {
  icon: IconName;
  label: string;
  count?: number;
  onPress?: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s3,
        paddingVertical: 14,
        paddingHorizontal: spacing.s4,
        borderBottomWidth: 1,
        borderBottomColor: colors.line2,
      }}
    >
      <Icon name={icon} color={colors.ink} />
      <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: colors.ink }}>{label}</Text>
      {count !== undefined ? <Text style={{ fontSize: 11, color: colors.ink3 }}>{count}</Text> : null}
      <Icon name="chev-r" size={16} color={colors.ink3} />
    </Pressable>
  );
}

export default function Profile() {
  const router = useRouter();
  const { colors, spacing, radius, brandDark } = useTheme();
  const myAds = useAppStore((s) => s.myAds);
  const adsBalance = useAppStore((s) => s.adsBalance);
  const promoBalance = useAppStore((s) => s.promoBalance);
  const currentUser = useSeller('me')!;
  const verification = useAppStore((s) => s.verification);
  const setVerificationPhoto = useAppStore((s) => s.setVerificationPhoto);
  const [copied, setCopied] = useState(false);
  const fabScrollHandler = useFabScrollHandler();
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف حسابك', description: 'بيانات حسابك، محفظتك، وإعلاناتك هتظهر هنا بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const activeAdsCount = myAds.filter((a) => a.status !== 'expired').length;
  const limitUsed = Math.min(activeAdsCount, FREE_ADS_LIMIT);
  const shareText = `${currentUser.name} على سوق مصر${currentUser.phone ? ` — ${currentUser.phone}` : ''}`;
  const copyProfile = async () => {
    await Clipboard.setStringAsync(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const pickVerificationPhoto = async (side: 'front' | 'back') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('محتاجين صلاحية الصور', 'من غير صلاحية الوصول لمعرض الصور مش هنقدر نوثّق حسابك.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    setVerificationPhoto(side, result.assets[0].uri);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader
        title="حسابي"
        showBack={false}
        right={
          <IconButton onPress={() => router.push('/settings')}>
            <Icon name="cog" color={colors.ink} />
          </IconButton>
        }
      />
      <Animated.ScrollView onScroll={fabScrollHandler} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 150 }}>
        <View style={{ alignItems: 'center', paddingHorizontal: spacing.s5 }}>
          <View>
            <Avatar initials={currentUser.initials} size="xl" />
            <View
              style={{
                position: 'absolute',
                bottom: -5,
                left: -5,
                width: 32,
                height: 32,
                borderRadius: 12,
                backgroundColor: colors.signal,
                borderWidth: 3,
                borderColor: colors.paper,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="cam" color="#fff" size={16} />
            </View>
          </View>
          <Pressable onPress={() => router.push('/edit-profile')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.s4 }}>
            <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 16, color: colors.ink }}>
              {currentUser.name}
            </Text>
            <Icon name="edit" size={14} color={colors.ink3} />
          </Pressable>
          <Text style={{ fontSize: 11, color: colors.ink3, marginTop: 5 }}>
            {currentUser.phone ? `${currentUser.phone} · ` : ''}{currentUser.memberSince}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: spacing.s3 }}>
            {verification.status !== 'unverified' ? (
              <Pill tone="signal" icon={<Icon name="clock" size={12} color={colors.signal2} />}>
                {VERIFICATION_LABEL[verification.status]}
              </Pill>
            ) : null}
            <Pill>عضوية مجانية</Pill>
          </View>
        </View>

        <View style={{ flexDirection: 'row', marginHorizontal: spacing.s5, marginTop: spacing.s5, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3 }}>
          {[
            [String(currentUser.adsCount), 'إعلان'],
            [currentUser.rating > 0 ? String(currentUser.rating) : '—', 'تقييم'],
            [currentUser.adsCount > 0 ? `${currentUser.responseRate}%` : '—', 'معدل الرد'],
          ].map(([v, l], i) => (
            <View key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.s3, borderLeftWidth: i < 2 ? 1 : 0, borderLeftColor: colors.line2 }}>
              <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 16, color: colors.ink }}>{v}</Text>
              <Text style={{ fontSize: 9.5, color: colors.ink3 }}>{l}</Text>
            </View>
          ))}
        </View>

        <Card style={{ marginHorizontal: spacing.s5, marginTop: spacing.s3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, color: colors.ink3 }}>حد الإعلانات المجانية</Text>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 12.5, color: colors.ink }}>
              {limitUsed} / {FREE_ADS_LIMIT}
            </Text>
          </View>
          <View style={{ height: 7, borderRadius: 999, backgroundColor: colors.line, marginTop: spacing.s3, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${(limitUsed / FREE_ADS_LIMIT) * 100}%`, backgroundColor: colors.gold, borderRadius: 999 }} />
          </View>
          <View style={{ marginTop: spacing.s3 }}>
            <Button variant="ghost" size="sm" style={{ width: '100%' }}>
              زوّد الحد بترقية العضوية
            </Button>
          </View>
        </Card>

        {/* brandDark ثابتة (مش colors.ink) — بطاقة المحفظة المفروض تفضل
            غامقة "premium" في الوضعين، مش تتقلب لفاتح في الوضع الغامق */}
        <View style={{ marginHorizontal: spacing.s5, marginTop: spacing.s3, backgroundColor: brandDark, borderRadius: radius.r3, padding: spacing.s4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>رصيد المحفظة</Text>
            <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 22, color: '#fff' }}>
              {(adsBalance + promoBalance).toFixed(1)} ج.م
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.s3 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,.09)', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#fff' }}>{promoBalance}</Text>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,.72)' }}>رصيد التمييز</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,.09)', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#fff' }}>{adsBalance}</Text>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,.72)' }}>رصيد الإعلانات</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <View style={{ flex: 1 }}>
              <Button icon={<Icon name="wallet" color="#fff" size={16} />} onPress={() => router.push('/pay')}>
                اشحن رصيد
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button variant="ghost" icon={<Icon name="send" color="#fff" size={16} />} onPress={() => router.push('/transfer')} borderColor="rgba(255,255,255,.3)" textColor="#fff" style={{ backgroundColor: 'rgba(255,255,255,.12)' }}>
                تحويل لصديق
              </Button>
            </View>
          </View>
        </View>

        <Card style={{ marginHorizontal: spacing.s5, marginTop: spacing.s3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.s2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="id" size={16} color={colors.ink} />
              <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 12.5, color: colors.ink }}>توثيق الحساب</Text>
            </View>
            <Pill tone="signal">{VERIFICATION_LABEL[verification.status]}</Pill>
          </View>
          <Text style={{ fontSize: 11, color: colors.ink3, lineHeight: 19 }}>
            {verification.status === 'pending'
              ? 'لسه بنراجع بطاقتك، هتظهر علامة "موثّق" على كل إعلاناتك.'
              : 'صوّر وش وضهر بطاقتك عشان تتوثّق، هتظهر علامة "موثّق" على كل إعلاناتك.'}{' '}
            الصور دي مشفّرة ومش بيشوفها غير فريق المراجعة.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.s2, marginTop: spacing.s3 }}>
            {(['front', 'back'] as const).map((side) => {
              const uri = side === 'front' ? verification.frontUri : verification.backUri;
              const label = side === 'front' ? 'وش البطاقة' : 'ضهر البطاقة';
              return (
                <Pressable
                  key={side}
                  onPress={() => pickVerificationPhoto(side)}
                  style={{
                    flex: 1,
                    height: 58,
                    borderRadius: radius.r2,
                    backgroundColor: uri ? undefined : '#E9EFF8',
                    borderWidth: 1,
                    borderColor: '#CBD9EC',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    overflow: 'hidden',
                  }}
                >
                  {uri ? (
                    <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <>
                      <Icon name="id" size={16} color="#2E4A70" />
                      <Text style={{ fontSize: 9.5, color: '#2E4A70' }}>{label}</Text>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={{ marginHorizontal: spacing.s5, marginTop: spacing.s3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.s2 }}>
            <Icon name="qr" size={16} color={colors.ink} />
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 12.5, color: colors.ink }}>شارك حسابك</Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.ink3, lineHeight: 19 }}>
            الكود ده بيفتح صفحتك وكل إعلاناتك — علّمه من الكاميرا أو ابعته لمعارفك.
          </Text>
          <View
            style={{
              marginTop: spacing.s3,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors.line,
              borderRadius: radius.r2,
              padding: spacing.s4,
              alignItems: 'center',
            }}
          >
            <View style={{ width: 88, height: 88, flexDirection: 'row', flexWrap: 'wrap' }}>
              {QR_PATTERN.map((v, i) => (
                <View key={i} style={{ width: '14.28%', height: '14.28%', padding: 1 }}>
                  <View style={{ flex: 1, backgroundColor: v ? colors.ink : 'transparent', borderRadius: 1 }} />
                </View>
              ))}
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.s2, marginTop: spacing.s3 }}>
            {(
              [
                { icon: 'wa' as const, onPress: () => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(shareText)}`) },
                { icon: 'share' as const, onPress: () => Share.share({ message: shareText }) },
                { icon: 'link' as const, onPress: copyProfile },
                { icon: 'copy' as const, onPress: copyProfile },
              ]
            ).map(({ icon, onPress }) => (
              <Pressable
                key={icon}
                onPress={onPress}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: radius.r2,
                  backgroundColor: copied && (icon === 'link' || icon === 'copy') ? colors.verifyWash : colors.paper,
                  borderWidth: 1,
                  borderColor: colors.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={copied && (icon === 'link' || icon === 'copy') ? 'check' : icon} size={16} color={colors.ink2} />
              </Pressable>
            ))}
          </View>
        </Card>

        <View style={{ marginHorizontal: spacing.s5, marginTop: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, overflow: 'hidden' }}>
          <MenuRow icon="box" label="إعلاناتي" count={myAds.length} onPress={() => router.push('/myads')} />
          <MenuRow icon="info" label="تحليلات إعلاناتي" onPress={() => router.push('/analytics')} />
          <MenuRow icon="heart" label="المفضلة" onPress={() => router.push('/favorites')} />
          <MenuRow icon="search" label="عمليات البحث المحفوظة" onPress={() => router.push('/saved-searches')} />
          <MenuRow icon="bell" label="الإشعارات" onPress={() => router.push('/notifications')} />
          <MenuRow icon="office" label="الحساب التجاري" onPress={() => router.push('/business')} />
          <MenuRow icon="cog" label="الإعدادات" onPress={() => router.push('/settings')} />
        </View>
      </Animated.ScrollView>
    </View>
  );
}
