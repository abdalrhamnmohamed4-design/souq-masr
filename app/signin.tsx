/**
 * app/signin.tsx — تسجيل الدخول باسم ورقم الموبايل بس، من غير OTP.
 * خطوة واحدة وبس: الاسم ↓ رقم الموبايل (باختيار كود الدولة) ↓ دخول
 * مباشر للتطبيق — من غير أي شاشة وسيطة (مفيش "اختار موقعك" ولا
 * "اهتماماتك" بعد كده، وصلًا لطلب المستخدم إن أول تجربة استخدام تبقى:
 * افتح التطبيق → اسم ورقم ← دخول على طول → تصفّح).
 *
 * ⚠️ isValidLocalPhoneForCountry بيدّي تحقق دقيق لمصر بس (010/011/012/015
 * + 11 رقم)؛ باقي الدول بتحقق عام (6-14 رقم) لحد ما يبقى فيه قواعد
 * حقيقية لكل دولة. الرقم بيتخزّن في onboarding.phone بصيغة دولية مطبّعة
 * ("+20xxxxxxxxxx") جاهزة لأي باك إند حقيقي مستقبلًا.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { CountryCodePicker } from '@/components/CountryCodePicker';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/primitives/Button';
import { FormField } from '@/components/primitives/FormField';
import { useT } from '@/i18n';
import { resolvePendingAuthAction } from '@/lib/auth';
import { flagEmoji, getCountry } from '@/lib/countries';
import { isValidLocalPhoneForCountry, normalizePhoneForStorage } from '@/lib/validation';
import { devLog } from '@/lib/devLog';
import { signin as realSignin } from '@/services/authService';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function SignIn() {
  const router = useRouter();
  const t = useT();
  const { colors, spacing, radius } = useTheme();
  const { onboarding, setOnboarding } = useAppStore();
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  // الرقم المحلي (من غير كود الدولة) بيتحرّر هنا وبس؛ onboarding.phone
  // بيتخزّن مطبّع بالكامل ("+20...") لحظة الدخول، مش أول ما المستخدم يكتب.
  const [localNumber, setLocalNumber] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const countryIso = onboarding.countryIso || 'EG';
  const country = getCountry(countryIso) ?? getCountry('EG')!;

  const canContinue = onboarding.name.trim().length >= 2 && isValidLocalPhoneForCountry(countryIso, localNumber);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title={t('auth.signIn')} onBack={() => router.back()} />
      <View style={{ paddingHorizontal: spacing.s5, paddingTop: spacing.s3 }}>
        <Text style={{ fontSize: 12.5, color: colors.ink3, marginBottom: spacing.s5, lineHeight: 20 }}>
          {t('auth.intro')}
        </Text>

        <FormField
          label={t('auth.name')}
          placeholder={t('auth.namePlaceholder')}
          value={onboarding.name}
          onChangeText={(v) => setOnboarding({ name: v })}
        />

        <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink, marginBottom: 6 }}>{t('auth.phone')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.s4 }}>
          <Pressable
            onPress={() => setCountryPickerOpen(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: radius.r2,
              paddingHorizontal: 10,
            }}
          >
            <Text style={{ fontSize: 18 }}>{flagEmoji(country.iso2)}</Text>
            <Text style={{ fontSize: 12.5, fontFamily: 'Cairo_700Bold', color: colors.ink }}>+{country.dial}</Text>
            <Icon name="chev-d" size={12} color={colors.ink3} />
          </Pressable>
          <TextInput
            value={localNumber}
            onChangeText={setLocalNumber}
            placeholder={countryIso === 'EG' ? t('auth.phonePlaceholderEg') : t('auth.phonePlaceholderGeneric')}
            placeholderTextColor={colors.ink3}
            keyboardType="phone-pad"
            textAlign="right"
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: radius.r2,
              paddingVertical: 13,
              paddingHorizontal: spacing.s3,
              fontSize: 12.5,
              color: colors.ink,
            }}
          />
        </View>
        {localNumber.trim().length > 0 && !isValidLocalPhoneForCountry(countryIso, localNumber) ? (
          <Text style={{ fontSize: 11, color: colors.danger, marginTop: -8, marginBottom: spacing.s4 }}>
            {countryIso === 'EG' ? t('auth.phoneErrorEg') : t('auth.phoneErrorGeneric')}
          </Text>
        ) : null}

        <Button
          disabled={!canContinue || signingIn}
          onPress={async () => {
            const normalized = normalizePhoneForStorage(country.dial, localNumber);
            const name = onboarding.name.trim();

            // نداء حقيقي على السيرفر — يسجّل/يلاقي مستخدم Frappe حقيقي
            // ويخزّن api_key/api_secret (lib/authCredentials.ts) قبل ما
            // نكمّل نفس تدفق الدخول المحلي القديم. لو فشل (مفيش نت/
            // الباك إند واقع)، بنكمّل التدفق المحلي زي ما هو بالظبط —
            // مفيش نجاح وهمي هنا لأن مفيش حاجة "نجحت" أصلًا غير الدخول
            // المحلي (زي قبل الفيز دي بالظبط)؛ نقطة الإنفاذ الحقيقية
            // (Phase 2B) هي وقت نشر إعلان فعلي (app/post/index.tsx's
            // ensureCredentials)، مش هنا.
            setSigningIn(true);
            const authResult = await realSignin(name, normalized, country.iso2);
            setSigningIn(false);
            if (authResult.status !== 'success') {
              devLog('signin', `real backend signin failed (${authResult.status}) — continuing with local-only session`);
            }

            const patch: Parameters<typeof setOnboarding>[0] = { phone: normalized, countryIso: country.iso2 };
            if (!onboarding.joinedAt) patch.joinedAt = new Date().toISOString();
            setOnboarding(patch);
            // لو المستخدم كان جاي من إجراء اتقفل (favorite/saveJob مثلًا)،
            // ننفّذه فورًا ونرجّعه لنفس الشاشة اللي كان فيها — مش نودّيه
            // لخطوة onboarding عادية كإنه أول مرة يفتح التطبيق.
            const hadPendingAction = resolvePendingAuthAction();
            if (hadPendingAction) {
              router.back();
              return;
            }
            // دخول مباشر — مفيش "اختار موقعك" ولا أي شاشة onboarding
            // وسيطة بعد كده.
            router.replace('/home');
          }}
        >
          {signingIn ? <ActivityIndicator color="#fff" size="small" /> : t('auth.enter')}
        </Button>
      </View>

      <CountryCodePicker
        visible={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        selectedIso2={countryIso}
        onSelect={(c) => setOnboarding({ countryIso: c.iso2 })}
      />
    </View>
  );
}
