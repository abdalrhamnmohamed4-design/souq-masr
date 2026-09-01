/**
 * app/notifications.tsx — مركز إشعارات حقيقي. مفيش إشعارات وهمية: كل
 * إشعار بيتولّد فعليًا من حدث حصل في التطبيق (نشر إعلان، تمييزه، تجديده،
 * تأكيد دفع، تقييم جديد) عن طريق store/useAppStore → addNotification.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { useAppStore, type NotificationItem, type NotificationType } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

const TYPE_ICON: Record<NotificationType, IconName> = {
  ad_published: 'rocket',
  ad_promoted: 'star',
  ad_renewed: 'refresh',
  payment_confirmed: 'wallet',
  review_received: 'star',
  system: 'bell',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `من ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `من ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `من ${days} يوم`;
}

export default function Notifications() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);
  const removeNotification = useAppStore((s) => s.removeNotification);
  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف إشعاراتك', description: 'إشعاراتك عن إعلاناتك وحسابك هتظهر هنا بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const openNotification = (n: NotificationItem) => {
    markRead(n.id);
    if (n.referenceType === 'listing' && n.referenceId) router.push(`/detail/${n.referenceId}`);
    else if (n.referenceType === 'conversation' && n.referenceId) router.push(`/chat/${n.referenceId}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader
        title="الإشعارات"
        right={
          unreadCount > 0 ? (
            <Pressable onPress={markAllRead}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.signal }}>تعليم الكل مقروء</Text>
            </Pressable>
          ) : undefined
        }
      />
      {notifications.length === 0 ? (
        <EmptyState
          icon={<Icon name="bell" color={colors.ink3} size={26} />}
          title="لسه مفيش إشعارات"
          description="هتوصلك إشعارات هنا لما تنشر إعلان، تميّزه، أو حد يقيّمك."
          actionLabel="انشر إعلان"
          onAction={() => router.push('/post')}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.s5, gap: spacing.s3 }}>
          {notifications.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => openNotification(n)}
              style={{
                flexDirection: 'row',
                gap: spacing.s3,
                backgroundColor: n.isRead ? colors.card : colors.signalWash,
                borderWidth: 1,
                borderColor: n.isRead ? colors.line : colors.signal,
                borderRadius: radius.r3,
                padding: spacing.s3,
              }}
            >
              <View style={{ width: 38, height: 38, borderRadius: radius.r2, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={TYPE_ICON[n.type]} size={17} color={colors.signal2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>{n.title}</Text>
                <Text style={{ fontSize: 11, color: colors.ink2, marginTop: 3, lineHeight: 17 }}>{n.body}</Text>
                <Text style={{ fontSize: 9.5, color: colors.ink3, marginTop: 5 }}>{timeAgo(n.createdAt)}</Text>
              </View>
              <Pressable onPress={() => removeNotification(n.id)} style={{ padding: 4 }}>
                <Icon name="x" size={15} color={colors.ink3} />
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
