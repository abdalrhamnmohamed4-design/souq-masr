/**
 * services/notificationService.ts — Notifications vertical:
 * souq_masr.api.v1.notifications. مفيش endpoint عام لإنشاء إشعار —
 * كل إشعار حقيقي ناتج فعليًا عن حدث حقيقي في الباك إند (رسالة، مكالمة
 * فايتة، تقييم، تقديم على وظيفة، تغيّر حالة تقديم) — شوف notifications.py's
 * module docstring للقائمة الكاملة وأماكن النداء بالظبط.
 */
import { frappeGet, frappePost } from '@/lib/apiClient';
import type { ApiResult } from '@/types/frappeApi';

const NS = 'souq_masr.api.v1.notifications';

export type RealNotificationType =
  | 'ad_published' | 'ad_promoted' | 'ad_renewed' | 'payment_confirmed' | 'review_received'
  | 'message_received' | 'call_missed' | 'job_application_received' | 'job_application_status_changed' | 'system';

export type RealNotificationReferenceType = 'listing' | 'conversation' | 'job' | 'application' | 'service';

export type RealNotification = {
  id: string;
  type: RealNotificationType;
  title: string;
  body: string;
  referenceType: RealNotificationReferenceType | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
};

function adapt(raw: any): RealNotification {
  return {
    id: raw.id, type: raw.type, title: raw.title, body: raw.body,
    referenceType: raw.reference_type, referenceId: raw.reference_id,
    isRead: raw.is_read, createdAt: raw.created_at,
  };
}

export async function getMyNotifications(page = 1, limit = 30): Promise<ApiResult<{ items: RealNotification[]; total: number; unreadCount: number }>> {
  const r = await frappeGet<{ items: any[]; total: number; unread_count: number }>(`${NS}.get_my_notifications`, { page, limit });
  if (r.status !== 'success') return r;
  return { status: 'success', data: { items: r.data.items.map(adapt), total: r.data.total, unreadCount: r.data.unread_count } };
}

export async function getUnreadCount(): Promise<ApiResult<{ unread_count: number }>> {
  return frappeGet(`${NS}.get_unread_count`);
}

export async function markNotificationRead(notificationId: string): Promise<ApiResult<{ marked: boolean }>> {
  return frappePost(`${NS}.mark_read`, { notification_id: notificationId });
}

export async function markAllNotificationsRead(): Promise<ApiResult<{ marked: boolean }>> {
  return frappePost(`${NS}.mark_all_read`);
}

export async function removeRealNotification(notificationId: string): Promise<ApiResult<{ deleted: boolean }>> {
  return frappePost(`${NS}.remove_notification`, { notification_id: notificationId });
}
