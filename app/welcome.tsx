/**
 * app/welcome.tsx — شاشة الترحيب/الدخول.
 *
 * إعادة تصميم كاملة بناءً على ملاحظات المستخدم على النسخة القديمة:
 *   • كان فيه وردمارك عملاق فوق، وبعده فراغ ضخم (marginTop:'auto')،
 *     وبعدين ٣ بلوكات نص متراصّة فوق بعض مزنوقة تحت — تكوين مش متوازن.
 *   • البلوكات التلاتة اتشالت واتبدلت بصف ثقة واحد مضغوط + نص تطميني
 *     احترافي (بيانات محمية / تواصل جوه التطبيق).
 *   • الخلفية بقت حمرا زي شاشة البداية — تسلسل دخول متماسك
 *     (splash أحمر ← ترحيب أحمر ← التطبيق) بدل قفزة لونية للغامق.
 *   • اتضاف دخول بجوجل/آبل/فيسبوك جنب الدخول برقم الموبايل.
 *
 * هرم بصري واضح: زرار واحد أساسي مصمت (رقم الموبايل — الطريقة الوحيدة
 * الشغّالة فعلًا)، وتحته صف أيقونات دائرية للمزوّدين، وبعدين خروج
 * كضيف كنص بسيط. مفيش ٤ أزرار عريضة فوق بعض.
 *
 * ⚠️ أزرار جوجل/آبل/فيسبوك **مبتسجّلش دخول** — بتقول الحقيقة إنها محتاجة
 * ربط سيرفر (شوف lib/socialAuth.ts للأسباب الحقيقية). مفيش نجاح وهمي.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { SocialIcon, type SocialProvider } from '@/components/SocialIcon';
import { useT } from '@/i18n';
import { showProviderUnavailable, signInWithProvider } from '@/lib/socialAuth';

/** نفس تدرّج شاشة البداية (components/BrandSplash.tsx) — استمرار بصري. */
const RED_TOP = '#D8332F';
const RED_MID = '#C62828';
const RED_BOTTOM = '#9E1818';
const GOLD = '#FFC65C';

const PROVIDERS: { key: SocialProvider; bg: string; fg: string; border?: string }[] = [
  { key: 'google', bg: '#FFFFFF', fg: '#1F1F1F' },
  { key: 'apple', bg: '#000000', fg: '#FFFFFF' },
  { key: 'facebook', bg: '#1877F2', fg: '#FFFFFF' },
];

export default function Welcome() {
  const router = useRouter();
  const t = useT();

  /** صف ثقة مضغوط — بديل البلوكات التلاتة المتراصّة اللي كانت تحت. */
  const TRUST: { icon: IconName; label: string }[] = [
    { icon: 'shield', label: t('auth.trustVerified') },
    { icon: 'lock', label: t('auth.trustProtected') },
    { icon: 'chat', label: t('auth.trustSafeChat') },
  ];

  const onSocial = async (provider: SocialProvider) => {
    const result = await signInWithProvider(provider);
    // مفيش أي تغيير حالة هنا لو رجع not_configured — بنقول الحقيقة وبس.
    if (result.status === 'not_configured') showProviderUnavailable(provider);
  };

  return (
    <LinearGradient colors={[RED_TOP, RED_MID, RED_BOTTOM]} locations={[0, 0.52, 1]} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.wrap}>
        {/* ---- العلامة: مضغوطة، مش وردمارك عملاق ---- */}
        <View style={styles.brand}>
          <Image
            source={require('@/assets/splash-logo.png')}
            style={{ width: 42, height: 56 }}
            resizeMode="contain"
          />
          <Text style={styles.mark}>
            {t('common.brandName')}<Text style={{ color: GOLD }}>.</Text>
          </Text>
        </View>

        {/* ---- الرسالة الأساسية: عبارة قصيرة بدل الكلام التسويقي الطويل ---- */}
        <Text style={styles.headline}>{t('auth.headline')}</Text>
        <Text style={styles.sub}>{t('auth.subline')}</Text>

        {/* ---- صف الثقة: سطر واحد بدل ٣ بلوكات ---- */}
        <View style={styles.trust}>
          {TRUST.map((item) => (
            <View key={item.label} style={styles.trustItem}>
              <Icon name={item.icon} size={13} color="rgba(255,255,255,.9)" />
              <Text style={styles.trustLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        {/* ---- الدخول ---- */}
        <Pressable
          onPress={() => router.push('/signin')}
          style={({ pressed }) => [styles.primary, pressed && { opacity: 0.9 }]}
        >
          <Icon name="mobile" size={17} color={RED_MID} />
          <Text style={styles.primaryLabel}>{t('auth.continueWithPhone')}</Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>{t('auth.continueWith')}</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.providers}>
          {PROVIDERS.map((p) => (
            <Pressable
              key={p.key}
              onPress={() => onSocial(p.key)}
              style={({ pressed }) => [
                styles.provider,
                { backgroundColor: p.bg },
                pressed && { opacity: 0.85 },
              ]}
            >
              <SocialIcon provider={p.key} size={23} color={p.fg} />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => router.replace('/home')} style={styles.guest}>
          <Text style={styles.guestLabel}>{t('auth.browseAsGuest')}</Text>
        </Pressable>

        <Text style={styles.fine}>{t('auth.legalNotice')}</Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 26, paddingTop: 18, paddingBottom: 18 },

  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  mark: { fontFamily: 'Cairo_800ExtraBold', fontSize: 24, color: '#fff' },

  headline: {
    fontFamily: 'Cairo_800ExtraBold',
    fontSize: 27,
    lineHeight: 40,
    color: '#fff',
    marginTop: 26,
  },
  sub: {
    fontSize: 13.5,
    lineHeight: 24,
    color: 'rgba(255,255,255,.80)',
    marginTop: 8,
    maxWidth: 320,
  },

  trust: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 20 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustLabel: { fontSize: 11, color: 'rgba(255,255,255,.82)', fontWeight: '600' },

  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5,
  },
  primaryLabel: { fontFamily: 'Cairo_800ExtraBold', fontSize: 14.5, color: RED_MID },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  divider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,.22)' },
  dividerText: { fontSize: 11, color: 'rgba(255,255,255,.68)' },

  providers: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 16 },
  provider: {
    width: 62,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  guest: { alignItems: 'center', paddingVertical: 16, marginTop: 6 },
  guestLabel: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 13,
    color: 'rgba(255,255,255,.92)',
    textDecorationLine: 'underline',
  },

  fine: {
    textAlign: 'center',
    fontSize: 10,
    color: 'rgba(255,255,255,.5)',
    lineHeight: 17,
  },
});
