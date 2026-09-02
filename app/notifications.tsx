/**
 * app/notifications.tsx — مركز إشعارات حقيقي. مفيش إشعارات وهمية: كل
 * إشعار بيتولّد فعليًا من حدث حصل في التطبيق (نشر إعلان، تمييزه، تجديده،
 * تأكيد دفع، تقييم جديد) عن طريق store/useAppStore → addNotification.
 *
 * Notifications vertical (Phase 2B): إشعارات حقيقية من الباك إند
 * (souq_masr.api.v1.notifications) بتتدمج مع المحلية — نفس نمط
 * app/(tabs)/messages.tsx بالظبط. كل إشعار حقيقي ناتج عن حدث حقيقي فعلًا
 * حصل سيرفر-side (رسالة/مكالمة فايتة/تقييم/تقديم وظيفة) — مفيش endpoint
 * عام لإنشاء إشعار من الموبايل خالص.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthGuard } from '@/components/AuthGuard';
import { EmptyState } from '@/components/primitives/EmptyState';
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  removeRealNotification,
  type RealNotification,
} from '@/services/notificationService';
import { useAppStore, type NotificationItem, type NotificationType } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

const TYPE_ICON: Record<NotificationType | RealNotification['type'], IconName> = {
  ad_published: 'rocket',
  ad_promoted: 'star',
  ad_renewed: 'refresh',
  payment_confirmed: 'wallet',
  review_received: 'star',
  message_received: 'chat',
  call_missed: 'phone',
  job_application_received: 'doc',
  job_application_status_changed: 'doc',
  system: 'bell',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso.replace(' ', 'T')).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `من ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `من ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `من ${days} يوم`;
}

const REAL_NOTIF_POLL_MS = 20000;

export default function Notifications() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);
  const removeNotification = useAppStore((s) => s.removeNotification);

  const [realNotifs, setRealNotifs] = useState<RealNotification[]>([]);
  const [realLoaded, setRealLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const r = await getMyNotifications();
      if (!cancelled && r.status === 'success') setRealNotifs(r.data.items);
      setRealLoaded(true);
    };
    load();
    const timer = setInterval(load, REAL_NOTIF_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const authBlock = useAuthGuard({ title: 'سجّل دخولك عشان تشوف إشعاراتك', description: 'إشعاراتك عن إعلاناتك وحسابك هتظهر هنا بعد تسجيل الدخول.' });
  if (authBlock) return authBlock;

  const unreadCount = notifications.filter((n) => !n.isRead).length + realNotifs.filter((n) => !n.isRead).length;
  const totalCount = notifications.length + realNotifs.length;

  const openMock = (n: NotificationItem) => {
    markRead(n.id);
    if (n.referenceType === 'listing' && n.referenceId) router.push(`/detail/${n.referenceId}`);
    else if (n.referenceType === 'conversation' && n.referenceId) router.push(`/chat/${n.referenceId}`);
  };

  const openReal = (n: RealNotification) => {
    setRealNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    markNotificationRead(n.id);
    if (n.referenceType === 'listing' && n.referenceId) router.push(`/detail/${n.referenceId}`);
    else if (n.referenceType === 'conversation' && n.referenceId) router.push(`/chat/${n.referenceId}`);
    else if (n.referenceType === 'job' && n.referenceId) router.push(`/jobs/${n.referenceId}`);
    else if (n.referenceType === 'application') router.push('/jobs/applications');
    else if (n.referenceType === 'service' && n.referenceId) router.push(`/services/${n.referenceId}`);
  };

  const markAllReadCombined = () => {
    markAllRead();
    setRealNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    markAllNotificationsRead();
  };

  const removeReal = (id: string) => {
    setRealNotifs((prev) => prev.filter((n) => n.id !== id));
    removeRealNotification(id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScreenHeader
        title="الإشعارات"
        right={
          unreadCount > 0 ? (
            <Pressable onPress={markAllReadCombined}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.signal }}>تعليم الكل مقروء</Text>
            </Pressable>
          ) : undefined
        }
      />
      {totalCount === 0 && realLoaded ? (
        <EmptyState
          icon={<Icon name="bell" color={colors.ink3} size={26} />}
          title="لسه مفيش إشعارات"
          description="هتوصلك إشعارات هنا لما حد يراسلك، يقيّمك، أو يقدّم على وظيفتك."
          actionLabel="انشر إعلان"
          onAction={() => router.push('/post')}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.s5, gap: spacing.s3 }}>
          {realNotifs.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => openReal(n)}
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
              <Pressable onPress={() => removeReal(n.id)} style={{ padding: 4 }}>
                <Icon name="x" size={15} color={colors.ink3} />
              </Pressable>
            </Pressable>
          ))}
          {notifications.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => openMock(n)}
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
