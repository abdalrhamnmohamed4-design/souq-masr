/**
 * app/call/[id].tsx — Phase 2B Slice 4B: مكالمة صوتية حقيقية عبر LiveKit
 * (self-hosted). صوت بس — مفيش أي كاميرا/فيديو خالص في الشاشة دي ولا في
 * الـtoken اللي جاي من الباك إند (calls.py's get_rtc_token's
 * canPublishSources=["microphone"]).
 *
 * دمج مصدرين حقيقيين لحالة المكالمة (lib/callUiState.ts's computeCallUiState):
 * 1. سجل المكالمة على الباك إند (Ringing/Active/Ended/Declined/Missed/
 *    Cancelled/Failed) — نفس polling القديم من Slice 4، بس بيوقف تلقائي
 *    أول ما الاتصال الصوتي الحقيقي ينجح (القسم 15 من طلب Slice 4B: مفيش
 *    polling إضافي وهو LiveKit بيتصرف — الأحداث الحقيقية من الغرفة نفسها
 *    (useRemoteParticipants) هي اللي بتتابع الاتصال من هنا).
 * 2. حالة اتصال LiveKit الفعلية (ConnectionState) — الواجهة ميقولش
 *    "متصل" إلا لو ده حقيقي فعلًا، مش لمجرد إن الباك إند قال Active.
 *
 * مفيش تسجيل صوت هنا خالص، ومفيش أي مسار بيخزّن الـstream — نفس مبدأ
 * "Do not record calls" من Slice 4، بس دلوقتي بصوت حقيقي فعلًا بدل بيانات
 * حالة بس.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AudioSession,
  LiveKitRoom,
  useConnectionState,
  useLocalParticipant,
  useRemoteParticipants,
} from '@livekit/react-native';
import { ConnectionState } from 'livekit-client';
import { Icon } from '@/components/Icon';
import { useAuthGuard } from '@/components/AuthGuard';
import { Avatar } from '@/components/primitives/Avatar';
import { peekStoredCredentials } from '@/lib/authCredentials';
import { computeCallUiState, type CallUiState, type RtcConnectionState } from '@/lib/callUiState';
import { acceptCall, declineCall, endCall, getCall, type CallStatus, type RealCall } from '@/services/callService';
import { getConversation } from '@/services/chatService';
import { getRtcToken } from '@/services/rtcService';
import { useTheme } from '@/theme/ThemeProvider';

const BACKEND_POLL_MS = 2500;

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

const STATUS_LABEL: Record<CallUiState, string> = {
  idle: 'جاري التحميل...',
  outgoing_call: 'بيرن...',
  incoming_call: 'مكالمة واردة...',
  connecting: 'بيتصل...',
  connected: 'متصل',
  ended: 'انتهت المكالمة',
  rejected: 'اترفضت المكالمة',
  missed: 'مكالمة فائتة',
  failed: 'فشل الاتصال',
};

function rtcConnectionStateToLocal(s: ConnectionState): RtcConnectionState {
  switch (s) {
    case ConnectionState.Connected:
      return 'connected';
    case ConnectionState.Connecting:
      return 'connecting';
    case ConnectionState.Reconnecting:
      return 'reconnecting';
    case ConnectionState.SignalReconnecting:
      return 'signalReconnecting';
    default:
      return 'disconnected';
  }
}

export default function Call() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [call, setCall] = useState<RealCall | null>(null);
  const [otherPartyName, setOtherPartyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);

  const [rtcToken, setRtcToken] = useState<{ token: string; wsUrl: string } | null>(null);
  const [tokenFetchFailed, setTokenFetchFailed] = useState(false);
  const tokenFetchingRef = useRef(false);

  useEffect(() => {
    setMyUserId(peekStoredCredentials()?.userId ?? null);
  }, []);

  // AudioSession — لازم تبدأ قبل أي محاولة اتصال، نفس توثيق LiveKit's
  // Expo quickstart بالظبط. بتقفل تلقائي لما الشاشة تتقفل (رجوع/انتهاء).
  useEffect(() => {
    AudioSession.startAudioSession().catch(() => {});
    return () => {
      AudioSession.stopAudioSession().catch(() => {});
    };
  }, []);

  // Polling سجل المكالمة على الباك إند — شغّال طول ما لسه مفيش اتصال RTC
  // حقيقي ناجح (Ringing، أو Active وبنحاول نتصل). أول ما نتصل فعليًا،
  // بيوقف — الأحداث الحقيقية من الغرفة (useRemoteParticipants) هي اللي
  // بتكمل المتابعة (القسم 15 من الطلب).
  const isRtcConnected = !!rtcToken; // هل عندنا token ودخلنا مرحلة الاتصال الفعلي
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      const r = await getCall(id);
      if (cancelled) return;
      if (r.status === 'success') {
        setCall(r.data);
        setLoading(false);
        if (!['Ringing', 'Active'].includes(r.data.status) && timer) {
          clearInterval(timer);
          timer = null;
        }
      } else {
        setLoading(false);
      }
    };

    poll();
    if (!isRtcConnected) {
      timer = setInterval(poll, BACKEND_POLL_MS);
    }
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [id, isRtcConnected]);

  // اسم الطرف التاني — بيانات حقيقية من المحادثة (مش "؟" ثابتة).
  useEffect(() => {
    if (!call?.conversationId) return;
    getConversation(call.conversationId).then((r) => {
      if (r.status === 'success') setOtherPartyName(r.data.conversation.otherParty.name || null);
    });
  }, [call?.conversationId]);

  const isCaller = !!myUserId && !!call && call.caller === myUserId;

  // أول ما الباك إند يقول Active، بنجيب RTC token حقيقي ونبدأ الاتصال
  // الفعلي — مش قبل كده خالص (لسه محدش وافق على المكالمة قبل Active).
  useEffect(() => {
    if (!call || call.status !== 'Active' || rtcToken || tokenFetchingRef.current) return;
    tokenFetchingRef.current = true;
    getRtcToken(call.id).then((r) => {
      tokenFetchingRef.current = false;
      if (r.status === 'success') {
        setRtcToken({ token: r.data.token, wsUrl: r.data.wsUrl });
      } else {
        setTokenFetchFailed(true);
      }
    });
  }, [call, rtcToken]);

  // لو الباك إند بقى مش Active تاني (الطرف التاني قفل مثلًا) وإحنا لسه
  // متصلين RTC، افصل فورًا — مينفعش نفضل متصلين بغرفة مفروض تكون خلصت.
  useEffect(() => {
    if (call && call.status !== 'Active' && call.status !== 'Ringing' && rtcToken) {
      setRtcToken(null);
    }
  }, [call, rtcToken]);

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
    setRtcToken(null); // افصل من غرفة LiveKit فورًا، مش بعد رد الباك إند
    const r = await endCall(call.id);
    setActionPending(false);
    if (r.status === 'success') setCall(r.data);
  };

  const otherPartyLabel = otherPartyName || 'مستخدم سوق مصر';

  if (rtcToken && call.status === 'Active') {
    return (
      <LiveKitRoom
        serverUrl={rtcToken.wsUrl}
        token={rtcToken.token}
        connect
        audio
        video={false}
        onDisconnected={() => setRtcToken(null)}
        onError={() => setTokenFetchFailed(true)}
      >
        <ConnectedCallUI
          otherPartyLabel={otherPartyLabel}
          onEnd={doEnd}
          actionPending={actionPending}
        />
      </LiveKitRoom>
    );
  }

  const uiState = computeCallUiState({
    backendStatus: call.status as CallStatus,
    isCaller,
    rtcAttempted: !!rtcToken,
    rtcState: 'disconnected',
    rtcFailed: tokenFetchFailed,
  });

  return (
    <PreConnectCallUI
      uiState={uiState}
      otherPartyLabel={otherPartyLabel}
      insetsTop={insets.top}
      insetsBottom={insets.bottom}
      onAccept={doAccept}
      onDecline={doDecline}
      onEnd={doEnd}
      onBack={() => router.back()}
      actionPending={actionPending}
    />
  );
}

/** الحالة قبل ما نوصل لاتصال RTC حقيقي: بيرن (متصل/مستقبل)، بنجهّز
 * الاتصال (Active بس لسه من غير token/اتصال ناجح)، أو حالة نهائية
 * (انتهت/اترفضت/فائتة/فشلت). مفيش أي مؤقّت وهمي هنا — كل حالة معروضة
 * جايه من call.status الحقيقي أو من فشل حقيقي في جلب الـtoken. */
function PreConnectCallUI({
  uiState,
  otherPartyLabel,
  insetsTop,
  insetsBottom,
  onAccept,
  onDecline,
  onEnd,
  onBack,
  actionPending,
}: {
  uiState: CallUiState;
  otherPartyLabel: string;
  insetsTop: number;
  insetsBottom: number;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onBack: () => void;
  actionPending: boolean;
}) {
  const { colors } = useTheme();
  const ring = useRing(uiState === 'outgoing_call' || uiState === 'incoming_call');

  return (
    <View style={{ flex: 1, alignItems: 'center', paddingTop: insetsTop + 20, backgroundColor: '#0F1A2E' }}>
      <StatusBar style="light" />

      <View style={{ marginTop: 60, alignItems: 'center' }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          {uiState === 'outgoing_call' || uiState === 'incoming_call' ? (
            <>
              <Animated.View style={[ringStyle, { transform: [{ scale: ring.scale }], opacity: ring.opacity }]} />
              <Animated.View style={[ringStyle, { transform: [{ scale: ring.scale }], opacity: ring.opacity }]} />
            </>
          ) : null}
          <View style={{ width: 110, height: 110, borderRadius: 34, backgroundColor: 'rgba(255,255,255,.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' }}>
            <Avatar initials={otherPartyLabel.slice(0, 2)} size="xl" color="transparent" />
          </View>
        </View>
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 21, color: '#fff', marginTop: 20 }}>{otherPartyLabel}</Text>
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: colors.gold, marginTop: 16 }}>{STATUS_LABEL[uiState]}</Text>
      </View>

      {uiState === 'incoming_call' ? (
        <View style={{ position: 'absolute', bottom: 90 + insetsBottom, flexDirection: 'row', gap: 32 }}>
          <Pressable disabled={actionPending} onPress={onDecline} style={{ alignItems: 'center', gap: 8 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="phone" color="#fff" size={22} style={{ transform: [{ rotate: '135deg' }] }} />
            </View>
            <Text style={{ fontSize: 10.5, color: '#fff' }}>رفض</Text>
          </Pressable>
          <Pressable disabled={actionPending} onPress={onAccept} style={{ alignItems: 'center', gap: 8 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.verify, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="phone" color="#fff" size={22} />
            </View>
            <Text style={{ fontSize: 10.5, color: '#fff' }}>قبول</Text>
          </Pressable>
        </View>
      ) : uiState === 'outgoing_call' || uiState === 'connecting' ? (
        <View style={{ position: 'absolute', bottom: 52 + insetsBottom }}>
          <Pressable disabled={actionPending} onPress={onEnd} style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="phone" color="#fff" size={24} style={{ transform: [{ rotate: '135deg' }] }} />
          </Pressable>
        </View>
      ) : (
        <View style={{ position: 'absolute', bottom: 52 + insetsBottom, alignItems: 'center', gap: 12 }}>
          <Pressable onPress={onBack} style={{ backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 22 }}>
            <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '700' }}>رجوع</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** الحالة بعد ما نوصل لاتصال RTC حقيقي (LiveKitRoom متصلة فعليًا أو
 * بتحاول). بتستخدم hooks حقيقية من @livekit/react-native — مفيش أي
 * قيمة UI هنا مش جايه من الغرفة الفعلية (useConnectionState/
 * useLocalParticipant/useRemoteParticipants). لازم تتعرض جوه
 * <LiveKitRoom> عشان الـhooks دي تلاقي الـcontext بتاعها. */
function ConnectedCallUI({
  otherPartyLabel,
  onEnd,
  actionPending,
}: {
  otherPartyLabel: string;
  onEnd: () => void;
  actionPending: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const connectionState = useConnectionState();
  const { localParticipant, isMicrophoneEnabled, lastMicrophoneError } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const [speakerOn, setSpeakerOn] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const connectedAtRef = useRef<number | null>(null);
  const endedOnRemoteLeaveRef = useRef(false);

  const rtcState = rtcConnectionStateToLocal(connectionState);
  const isConnected = connectionState === ConnectionState.Connected;

  // مؤقّت المدة — تِكّة حقيقية محسوبة من لحظة الاتصال الفعلي (مش قيمة
  // ثابتة زي الشاشة القديمة، ومش هي مصدر الحقيقة — المدة المُخزّنة
  // فعليًا بتتحسب سيرفر-side وقت end_call من answered_at/ended_at
  // الحقيقيين، هنا للعرض الحي بس).
  useEffect(() => {
    if (!isConnected) return;
    if (connectedAtRef.current == null) connectedAtRef.current = Date.now();
    const timer = setInterval(() => {
      if (connectedAtRef.current) setDurationSec(Math.floor((Date.now() - connectedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isConnected]);

  // الطرف التاني قفل من غرفة LiveKit نفسها (إشارة حقيقية من الغرفة، مش
  // polling) — نعتبرها نهاية المكالمة ونأكّدها على الباك إند (القسم 15
  // من الطلب: الاعتماد على أحداث RTC الحقيقية بدل استعلام متكرر).
  useEffect(() => {
    if (isConnected && remoteParticipants.length === 0 && connectedAtRef.current && !endedOnRemoteLeaveRef.current) {
      endedOnRemoteLeaveRef.current = true;
      onEnd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteParticipants.length, isConnected]);

  const toggleMute = () => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);

  const toggleSpeaker = async () => {
    const next = !speakerOn;
    try {
      await AudioSession.selectAudioOutput(Platform.OS === 'ios' ? (next ? 'force_speaker' : 'default') : next ? 'speaker' : 'earpiece');
      setSpeakerOn(next);
    } catch {
      // الجهاز مش بيدعم اختيار مخرج صوت معيّن — نتجاهل بهدوء (القسم 4:
      // "speaker/earpiece selection WHERE SUPPORTED").
    }
  };

  const durationLabel = `${String(Math.floor(durationSec / 60)).padStart(2, '0')}:${String(durationSec % 60).padStart(2, '0')}`;
  const statusText = !isConnected
    ? rtcState === 'reconnecting' || rtcState === 'signalReconnecting'
      ? 'بيعيد الاتصال...'
      : 'بيتصل...'
    : durationLabel;

  return (
    <View style={{ flex: 1, alignItems: 'center', paddingTop: insets.top + 20, backgroundColor: '#0F1A2E' }}>
      <StatusBar style="light" />

      <View style={{ marginTop: 60, alignItems: 'center' }}>
        <View style={{ width: 110, height: 110, borderRadius: 34, backgroundColor: 'rgba(255,255,255,.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' }}>
          <Avatar initials={otherPartyLabel.slice(0, 2)} size="xl" color="transparent" />
        </View>
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 21, color: '#fff', marginTop: 20 }}>{otherPartyLabel}</Text>
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: isConnected ? '#6EE7A8' : colors.gold, marginTop: 16, fontVariant: ['tabular-nums'] }}>
          {statusText}
        </Text>
        {lastMicrophoneError ? (
          <Pressable
            onPress={() => Linking.openSettings()}
            style={{ marginTop: 14, backgroundColor: 'rgba(224,161,6,.16)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 }}
          >
            <Text style={{ fontSize: 11, color: colors.gold }}>مفيش صلاحية ميكروفون — افتح الإعدادات</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ position: 'absolute', bottom: 130 + insets.bottom, flexDirection: 'row', gap: 26 }}>
        <Pressable onPress={toggleMute} style={{ alignItems: 'center', gap: 6 }}>
          <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: isMicrophoneEnabled ? 'rgba(255,255,255,.14)' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={isMicrophoneEnabled ? 'mic' : 'mic-off'} color={isMicrophoneEnabled ? '#fff' : '#0F1A2E'} size={20} />
          </View>
          <Text style={{ fontSize: 10, color: '#fff' }}>{isMicrophoneEnabled ? 'كتم' : 'إلغاء الكتم'}</Text>
        </Pressable>
        <Pressable onPress={toggleSpeaker} style={{ alignItems: 'center', gap: 6 }}>
          <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: speakerOn ? '#fff' : 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={speakerOn ? 'spk' : 'spk-off'} color={speakerOn ? '#0F1A2E' : '#fff'} size={20} />
          </View>
          <Text style={{ fontSize: 10, color: '#fff' }}>سماعة</Text>
        </Pressable>
      </View>

      <View style={{ position: 'absolute', bottom: 52 + insets.bottom }}>
        <Pressable disabled={actionPending} onPress={onEnd} style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="phone" color="#fff" size={24} style={{ transform: [{ rotate: '135deg' }] }} />
        </Pressable>
      </View>
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
