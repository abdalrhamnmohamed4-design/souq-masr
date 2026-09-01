import type { NotificationCampaign } from '@/types';
import { daysAgo } from './utils';

export const notificationCampaigns: NotificationCampaign[] = [
  { id: 'n-1', title: 'خصم 50% على الإعلانات المميزة اليوم!', body: 'ميّز إعلانك دلوقتي بنص السعر لمدة يومين بس.', audience: 'all', status: 'sent', sentAt: daysAgo(2), recipientsCount: 18420 },
  { id: 'n-2', title: 'عروض السويس الأسبوع ده', body: 'تخفيضات خاصة على خدمة الرفع في السويس.', audience: 'city', audienceDetail: 'السويس', status: 'sent', sentAt: daysAgo(6), recipientsCount: 2310 },
  { id: 'n-3', title: 'حدّث بياناتك عشان تفضل موثّق', body: 'وثّق حسابك عشان تكسب ثقة أكتر من المشترين.', audience: 'sellers', status: 'sent', sentAt: daysAgo(12), recipientsCount: 9600 },
  { id: 'n-4', title: 'إعلانات جديدة في السيارات', body: 'شوف أحدث عروض السيارات المضافة النهاردة.', audience: 'category', audienceDetail: 'سيارات', status: 'scheduled', recipientsCount: 0 },
  { id: 'n-5', title: 'مسودة: تذكير بتجديد الإعلان', body: 'إعلانك هيخلص قريب، جدّده عشان يفضل ظاهر.', audience: 'sellers', status: 'draft', recipientsCount: 0 },
];

export default notificationCampaigns;
