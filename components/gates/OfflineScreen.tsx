/**
 * components/gates/OfflineScreen.tsx — شاشتين قريبين جدًا بس برسائل
 * مختلفة عمدًا (سيناريو H مقابل I في VERSION_CONTROL.md's §12): variant
 * "no_internet" = الجهاز نفسه مقفول من النت، "backend_unavailable" =
 * النت شغّال بس الباك إند (Frappe) نفسه مش راد. التمييز ده مفيد لأنه
 * بيوجّه المستخدم صح (يشيك على شبكته، أو يستنى ويعيد المحاولة).
 *
 * زرار "إعادة المحاولة" بس — مفيش تخطي (القسم 6 و16). عشان منعملش loop
 * لا نهائي، الزرار نفسه هو اللي بيبدأ محاولة جديدة (مش auto-retry بلا
 * توقف) — المستخدم في السيطرة على متى يحاول تاني.
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/primitives/Button';
import { useAppGateStore } from '@/store/useAppGateStore';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  variant: 'no_internet' | 'backend_unavailable';
};

const COPY = {
  no_internet: {
    title: 'لا يوجد اتصال بالإنترنت',
    desc: 'سوق مصر محتاج اتصال بالإنترنت عشان يشتغل. اتأكد إنك متوصّل بشبكة واي فاي أو بيانات الموبايل وحاول تاني.',
  },
  backend_unavailable: {
    title: 'مفيش اتصال بالسيرفر دلوقتي',
    desc: 'الإنترنت عندك شغّال، بس مش عارفين نوصل لسيرفر سوق مصر حاليًا. جرّب تاني بعد شوية.',
  },
} as const;

export function OfflineScreen({ variant }: Props) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const retry = useAppGateStore((s) => s.retry);
  const [retrying, setRetrying] = useState(false);
  const copy = COPY[variant];

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.s6, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ width: 84, height: 84, borderRadius: 26, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.s5 }}>
        <Icon name="globe" size={30} color={colors.ink3} />
      </View>
      <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 17, color: colors.ink, textAlign: 'center' }}>
        {copy.title}
      </Text>
      <Text style={{ fontSize: 12.5, color: colors.ink3, textAlign: 'center', marginTop: spacing.s2, marginBottom: spacing.s6, lineHeight: 20 }}>
        {copy.desc}
      </Text>
      <View style={{ maxWidth: 260, width: '100%' }}>
        <Button icon={<Icon name="refresh" color="#fff" size={16} />} onPress={handleRetry} loading={retrying}>
          إعادة المحاولة
        </Button>
      </View>
    </View>
  );
}

export default OfflineScreen;
