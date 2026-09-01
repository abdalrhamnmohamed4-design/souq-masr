/**
 * components/gates/SoftUpdateModal.tsx — تحديث اختياري (القسم 3). على
 * عكس MandatoryUpdateScreen، دي مش بديلة للتطبيق كله — modal بسيط فوق
 * التطبيق العادي، والمستخدم يقدر يكمّل استخدامه من غير ما يحدّث
 * ("لاحقًا"). الإخفاء ده محلي للجلسة الحالية بس (مش persisted) — لو
 * قفل التطبيق وفتحه تاني ولسه installed < latest، هيظهر تاني. ده متعمّد:
 * "لاحقًا" معناها لاحقًا، مش "متسألنيش تاني خالص".
 */
import React from 'react';
import { Linking, Modal, Platform, Pressable, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/primitives/Button';
import { useTheme } from '@/theme/ThemeProvider';
import type { AppVersionConfig } from '@/types/appVersion';

type Props = {
  visible: boolean;
  config: AppVersionConfig | null;
  onDismiss: () => void;
};

export function SoftUpdateModal({ visible, config, onDismiss }: Props) {
  const { colors, spacing, radius } = useTheme();
  const storeUrl = Platform.OS === 'android' ? config?.update_url_android : config?.update_url_ios;

  const updateNow = () => {
    if (storeUrl) Linking.openURL(storeUrl).catch(() => {});
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,26,46,.5)', justifyContent: 'flex-end' }} onPress={onDismiss}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: spacing.s5, paddingBottom: 28 }}>
          <View style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: colors.line, alignSelf: 'center', marginBottom: spacing.s4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, marginBottom: spacing.s3 }}>
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="rocket" size={20} color={colors.signal2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Cairo_800ExtraBold', fontSize: 14.5, color: colors.ink }}>في إصدار جديد من سوق مصر</Text>
              {config?.latest_version ? (
                <Text style={{ fontSize: 11, color: colors.ink3, marginTop: 2 }}>الإصدار {config.latest_version} متاح دلوقتي</Text>
              ) : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.s2, marginTop: spacing.s2 }}>
            <View style={{ flex: 1 }}>
              <Button variant="ghost" onPress={onDismiss}>لاحقًا</Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button onPress={updateNow}>تحديث الآن</Button>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default SoftUpdateModal;
