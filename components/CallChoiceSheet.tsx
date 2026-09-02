/**
 * components/CallChoiceSheet.tsx — Phase 2B Slice 4، القسم 3 من الطلب
 * بالظبط: "لما المستخدم يدوس زرار الاتصال، DO NOT اتصال فوري. افتح شيت
 * فيه خيارين: 📞 مكالمة مجانية داخل التطبيق / 📱 اتصال هاتفي عادي".
 *
 * مشترك بين app/chat/[id].tsx (فيه محادثة حقيقية بالفعل) و
 * app/detail/[id].tsx (لسه ممكن ميكونش فيه محادثة — الشاشتين بيحددوا
 * onFreeCall/onRegularCall بنفسهم حسب السياق، الشيت نفسه بصري بس).
 */
import React from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';

export function CallChoiceSheet({
  visible,
  onClose,
  onFreeCall,
  onRegularCall,
  starting,
}: {
  visible: boolean;
  onClose: () => void;
  onFreeCall: () => void;
  onRegularCall: () => void;
  starting?: boolean;
}) {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,26,46,.5)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: colors.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 12, paddingBottom: 24 + insets.bottom }}
        >
          <View style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: colors.line, alignSelf: 'center', marginBottom: spacing.s4 }} />
          <Pressable
            disabled={starting}
            onPress={onFreeCall}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, paddingVertical: 14, paddingHorizontal: spacing.s5, opacity: starting ? 0.6 : 1 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: radius.r2, backgroundColor: colors.signalWash, alignItems: 'center', justifyContent: 'center' }}>
              {starting ? <ActivityIndicator size="small" color={colors.signal} /> : <Icon name="phone" size={18} color={colors.signal2} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>مكالمة مجانية داخل التطبيق</Text>
              <Text style={{ fontSize: 10.5, color: colors.ink3, marginTop: 2 }}>عبر الإنترنت — من غير رسوم مكالمات عادية</Text>
            </View>
          </Pressable>
          <View style={{ height: 1, backgroundColor: colors.line2, marginHorizontal: spacing.s5 }} />
          <Pressable onPress={onRegularCall} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, paddingVertical: 14, paddingHorizontal: spacing.s5 }}>
            <View style={{ width: 40, height: 40, borderRadius: radius.r2, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="mobile" size={18} color={colors.ink2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>اتصال هاتفي عادي</Text>
              <Text style={{ fontSize: 10.5, color: colors.ink3, marginTop: 2 }}>هيفتح تطبيق الهاتف العادي بتاعك</Text>
            </View>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
