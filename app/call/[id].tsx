/**
 * app/call/[id].tsx — Phase 2B Slice 4: شاشة مكالمة حقيقية (id هنا =
 * CALL-##### حقيقي، مش seller id زي النسخة القديمة). الحالة اللي بتتعرض
 * (Ringing/Active/Ended/...) بتيجي فعليًا من souq_masr.api.v1.calls عن
 * طريق poll دوري — **مش timer وهمي بيوصّل تلقائي بعد ثانيتين زي النسخة
 * القديمة** (اتشالت بالكامل — كانت بالظبط الـ"fake calling UI" اللي
 * الطلب منع بناءها صراحة).
 *
 * ملحوظة صادقة ظاهرة في الواجهة نفسها: مفيش صوت حقيقي متصل لسه (مفيش
 * WebRTC/مزوّد RTC — القرار والمعمارية الموصى بيها موثّقين بالكامل في
 * MOBILE_BACKEND_INTEGRATION_REPORT.md's Phase 2B Slice 4 section). اللي
 * حقيقي فعليًا هنا: سجل المكالمة، الحالة، التوقيتات، المدة، والتحكم
 * (قبول/رفض/إنهاء) — كله بيتخزّن ويتحدّث سيرفر-side حقيقي. مفيش أزرار
 * كتم/سماعة هنا عمدًا (مكنش هيبقى ليهم أي تأثير حقيقي من غير مجرى صوت).
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { useAuthGuard } from '@/components/AuthGuard';
import { Avatar } from '@/components/primitives/Avatar';
import { acceptCall, declineCall, endCall, getCall, type CallStatus, type RealCall } from '@/services/callService';
import { useTheme } from '@/theme/ThemeProvider';

const POLL_MS = 2500;

function useRing(enabled: boolean) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.6, duration: 1900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 1900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      scale.setValue(1);
      opacity.setValue(0.85);
    };
  }, [enabled, scale, opacity]);
  return { scale, opacity };
}

const STATUS_LABEL: Record<CallStatus, string> = {
  Ringing: 'بيرن...',
  Active: 'متصل',
  Ended: 'انتهت المكالمة',
  Declined: 'اترفضت المكالمة',
  Missed: 'مكالمة فائتة',
  Cancelled: 'اتلغت المكالمة',
  Failed: 'فشل الاتصال',
};

export default function Call() {
  const { id } = useLocalSearchParams<{ id: string; role?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [call, setCall] = useState<RealCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const ring = useRing(call?.status === 'Ringing');

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval>;

    const poll = async () => {
      if (!id) return;
      const r = await getCall(id);
      if (cancelled) return;
      if (r.status === 'success') {
        setCall(r.data);
        setLoading(false);
        // انتهت المكالمة (بأي طريقة) — نوقف الـpoll، مفيش داعي نستمر.
        if (!['Ringing', 'Active'].includes(r.data.status)) {
          clearInterval(timer);
        }
      } else {
        setLoading(false);
      }
    };

    poll();
    timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id]);

  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تتصل', description: 'المكالمات متاحة بس للمستخدمين المسجّلين.' });
  if (authBlock) return authBlock;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink }}>
        <Text style={{ color: '#fff' }}>جاري التحميل...</Text>
      </View>
    );
  }

  if (!call) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink }}>
        <Text style={{ color: '#fff' }}>مفيش بيانات مكالمة</Text>
      </View>
    );
  }

  const isOngoing = call.status === 'Ringing' || call.status === 'Active';
  const durationLabel = call.durationSeconds != null
    ? `${String(Math.floor(call.durationSeconds / 60)).padStart(2, '0')}:${String(call.durationSeconds % 60).padStart(2, '0')}`
    : null;

  const doAccept = async () => {
    setActionPending(true);
    const r = await acceptCall(call.id);
    setActionPending(false);
    if (r.status === 'success') setCall(r.data);
  };
  const doDecline = async () => {
    setActionPending(true);
    const r = await declineCall(call.id);
    setActionPending(false);
    if (r.status === 'success') setCall(r.data);
  };
  const doEnd = async () => {
    setActionPending(true);
    const r = await endCall(call.id);
    setActionPending(false);
    if (r.status === 'success') setCall(r.data);
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', paddingTop: insets.top + 20, backgroundColor: '#0F1A2E' }}>
      <StatusBar style="light" />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(224,161,6,.14)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, marginTop: 4 }}>
        <Icon name="info" size={13} color={colors.gold} />
        <Text style={{ fontSize: 10, color: colors.gold, textAlign: 'center' }}>
          لسه من غير صوت حقيقي — بيانات المكالمة (الحالة/المدة) حقيقية ومتسجّلة فعليًا
        </Text>
      </View>

      <View style={{ marginTop: 60, alignItems: 'center' }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          {call.status === 'Ringing' ? (
            <>
              <Animated.View style={[ringStyle, { transform: [{ scale: ring.scale }], opacity: ring.opacity }]} />
              <Animated.View style={[ringStyle, { transform: [{ scale: ring.scale }], opacity: ring.opacity }]} />
            </>
          ) : null}
          <View style={{ width: 110, height: 110, borderRadius: 34, backgroundColor: 'rgba(255,255,255,.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' }}>
            <Avatar initials="؟" size="xl" color="transparent" />
          </View>
        </View>
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 21, color: '#fff', marginTop: 20 }}>مكالمة صوتية</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: call.status === 'Active' ? '#6EE7A8' : colors.gold, fontVariant: ['tabular-nums'] }}>
            {call.status === 'Active' && durationLabel ? durationLabel : STATUS_LABEL[call.status]}
          </Text>
        </View>
      </View>

      {call.status === 'Ringing' ? (
        <View style={{ position: 'absolute', bottom: 90 + insets.bottom, flexDirection: 'row', gap: 32 }}>
          <Pressable disabled={actionPending} onPress={doDecline} style={{ alignItems: 'center', gap: 8 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="phone" color="#fff" size={22} style={{ transform: [{ rotate: '135deg' }] }} />
            </View>
            <Text style={{ fontSize: 10.5, color: '#fff' }}>رفض</Text>
          </Pressable>
          <Pressable disabled={actionPending} onPress={doAccept} style={{ alignItems: 'center', gap: 8 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.verify, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="phone" color="#fff" size={22} />
            </View>
            <Text style={{ fontSize: 10.5, color: '#fff' }}>قبول</Text>
          </Pressable>
        </View>
      ) : isOngoing ? (
        <View style={{ position: 'absolute', bottom: 52 + insets.bottom }}>
          <Pressable disabled={actionPending} onPress={doEnd} style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="phone" color="#fff" size={24} style={{ transform: [{ rotate: '135deg' }] }} />
          </Pressable>
        </View>
      ) : (
        <View style={{ position: 'absolute', bottom: 52 + insets.bottom, alignItems: 'center', gap: 12 }}>
          <Text style={{ color: 'rgba(255,255,255,.7)', fontSize: 12 }}>{STATUS_LABEL[call.status]}</Text>
          <Pressable onPress={() => router.back()} style={{ backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 22 }}>
            <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '700' }}>رجوع</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const ringStyle = {
  position: 'absolute' as const,
  width: 110,
  height: 110,
  borderRadius: 34,
  borderWidth: 2,
  borderColor: 'rgba(224,161,6,.5)',
};
