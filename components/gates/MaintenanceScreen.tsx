/**
 * components/gates/MaintenanceScreen.tsx — القسم 12 من الطلب: تحكّم منفصل
 * تمامًا عن Force Update (maintenance_mode مقابل force_update — حقلين
 * مختلفين في AppVersionConfig، بيتفحصوا في خطوتين مختلفتين في
 * useAppGateStore.runStartupCheck). فيه زرار "إعادة المحاولة" لأن
 * الصيانة مؤقتة بطبيعتها وبتخلص — الفحص هيتكرر ويطلّع phase='ready' لما
 * الباك إند يقفل maintenance_mode.
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/primitives/Button';
import { useAppGateStore } from '@/store/useAppGateStore';
import { useTheme } from '@/theme/ThemeProvider';

export function MaintenanceScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const config = useAppGateStore((s) => s.config);
  const retry = useAppGateStore((s) => s.retry);
  const [retrying, setRetrying] = useState(false);

  const message = config?.maintenance_message_ar || 'سوق مصر تحت الصيانة حاليًا';

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
        <Icon name="tool" size={30} color={colors.ink2} />
      </View>
      <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 17, color: colors.ink, textAlign: 'center' }}>
        سوق مصر تحت الصيانة حاليًا
      </Text>
      <Text style={{ fontSize: 12.5, color: colors.ink3, textAlign: 'center', marginTop: spacing.s2, marginBottom: spacing.s6, lineHeight: 20 }}>
        {message}
      </Text>
      <View style={{ maxWidth: 260, width: '100%' }}>
        <Button icon={<Icon name="refresh" color="#fff" size={16} />} onPress={handleRetry} loading={retrying}>
          إعادة المحاولة
        </Button>
      </View>
    </View>
  );
}

export default MaintenanceScreen;
