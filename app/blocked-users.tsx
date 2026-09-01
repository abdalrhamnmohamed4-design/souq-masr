/**
 * app/blocked-users.tsx — "المستخدمون المحظورون" كانت زرار ميت في
 * الإعدادات. بتعرض بائعين اتحظروا فعليًا (store → blockedSellerIds)،
 * وبتسمح بإلغاء الحظر.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { Avatar } from '@/components/primitives/Avatar';
import { EmptyState } from '@/components/primitives/EmptyState';
import { sellers } from '@/mock/users';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function BlockedUsers() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const blockedSellerIds = useAppStore((s) => s.blockedSellerIds);
  const unblockSeller = useAppStore((s) => s.unblockSeller);
  const authBlock = useAuthGuard();
  if (authBlock) return authBlock;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader title="المستخدمون المحظورون" onBack={() => router.back()} />
      {blockedSellerIds.length === 0 ? (
        <EmptyState
          icon={<Icon name="ban" color={colors.ink3} size={26} />}
          title="مفيش حد محظور"
          description="لو حد ضايقك في محادثة، تقدر تحظره من صفحة الشات — مش هيقدر يراسلك تاني."
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.s5, gap: spacing.s3 }}>
          {blockedSellerIds.map((id) => {
            const seller = sellers[id];
            return (
              <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.r3, padding: spacing.s3 }}>
                <Avatar initials={seller?.initials ?? '؟'} color={seller?.avatarColor} />
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink }}>{seller?.name ?? id}</Text>
                <Pressable onPress={() => unblockSeller(id)} style={{ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink }}>إلغاء الحظر</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
