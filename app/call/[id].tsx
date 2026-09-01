/**
 * app/call/[id].tsx — يقابل #call: شاشة اتصال داخلي كاملة (رنين → متصل)
 * بمؤقت ولوحة تحكم.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { useAuthGuard } from '@/components/AuthGuard';
import { Avatar } from '@/components/primitives/Avatar';
import { useSeller } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

function useRing() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
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
  }, [scale, opacity]);
  return { scale, opacity };
}

export default function Call() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const seller = useSeller(id);

  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [keypad, setKeypad] = useState(false);
  const ring1 = useRing();
  const ring2 = useRing();

  useEffect(() => {
    const t = setTimeout(() => setConnected(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!connected) return;
    const i = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [connected]);

  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تتصل', description: 'الاتصال الداخلي متاح بس للمستخدمين المسجّلين.' });
  if (authBlock) return authBlock;

  if (!seller) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink }}>
        <Text style={{ color: '#fff' }}>مفيش بيانات اتصال</Text>
      </View>
    );
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <LinearGradient colors={['#0F1A2E', '#182B4A', '#0C1524']} locations={[0, 0.55, 1]} style={{ flex: 1, alignItems: 'center', paddingTop: insets.top + 20 }}>
      <StatusBar style="light" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="lock" size={13} color="rgba(255,255,255,.55)" />
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,.55)' }}>مكالمة مشفّرة داخل سوق مصر — رقمك مش بيظهر</Text>
      </View>

      <View style={{ marginTop: 70, alignItems: 'center' }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          {!connected ? (
            <>
              <Animated.View style={[ringStyle, { transform: [{ scale: ring1.scale }], opacity: ring1.opacity }]} />
              <Animated.View style={[ringStyle, { transform: [{ scale: ring2.scale }], opacity: ring2.opacity }]} />
            </>
          ) : null}
          <View style={{ width: 110, height: 110, borderRadius: 34, backgroundColor: 'rgba(255,255,255,.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' }}>
            <Avatar initials={seller.initials} size="xl" color="transparent" />
          </View>
        </View>
        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 21, color: '#fff', marginTop: 20 }}>{seller.name}</Text>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 5 }}>مكالمة صوتية</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 14, color: connected ? '#6EE7A8' : colors.gold, fontVariant: ['tabular-nums'] }}>
            {connected ? `${mm}:${ss}` : 'بيرن...'}
          </Text>
        </View>
      </View>

      <View style={{ position: 'absolute', bottom: 150 + insets.bottom, flexDirection: 'row', gap: 24 }}>
        <CallCtl icon={muted ? 'mic-off' : 'mic'} label={muted ? 'مكتوم' : 'الكاتم'} active={muted} onPress={() => setMuted((m) => !m)} />
        <CallCtl icon="keypad" label="الأرقام" active={keypad} onPress={() => setKeypad((k) => !k)} />
        <CallCtl icon={speaker ? 'spk-off' : 'spk'} label="السماعة" active={speaker} onPress={() => setSpeaker((s) => !s)} />
      </View>

      <View style={{ position: 'absolute', bottom: 52 + insets.bottom }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="phone" color="#fff" size={24} style={{ transform: [{ rotate: '135deg' }] }} />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

function CallCtl({ icon, label, active, onPress }: { icon: IconName; label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: active ? '#fff' : 'rgba(255,255,255,.11)', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} color={active ? '#0F1A2E' : '#fff'} />
      </View>
      <Text style={{ fontSize: 9.5, color: active ? '#fff' : 'rgba(255,255,255,.75)', fontWeight: active ? '700' : '400' }}>{label}</Text>
    </Pressable>
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
