import { Send, Save } from 'lucide-react';
import { useState } from 'react';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import { Card, PageHeader } from '@/components/ui/PageHeader';
import { formatDateTime } from '@/mock/utils';
import { useAdminStore } from '@/store/useAdminStore';
import type { NotificationAudience, NotificationCampaign } from '@/types';

const AUDIENCE_LABEL: Record<NotificationAudience, string> = {
  all: 'كل المستخدمين',
  city: 'محافظة معينة',
  category: 'قسم معين',
  sellers: 'البائعين',
  buyers: 'المشترين',
};

const STATUS_TONE: Record<NotificationCampaign['status'], BadgeTone> = {
  sent: 'verify',
  scheduled: 'gold',
  draft: 'neutral',
};
const STATUS_LABEL: Record<NotificationCampaign['status'], string> = {
  sent: 'تم الإرسال',
  scheduled: 'مجدولة',
  draft: 'مسودة',
};

export function NotificationsPage() {
  const notifications = useAdminStore((s) => s.notifications);
  const sendNotification = useAdminStore((s) => s.sendNotification);
  const saveDraftNotification = useAdminStore((s) => s.saveDraftNotification);

  const [form, setForm] = useState({ title: '', body: '', audience: 'all' as NotificationAudience, audienceDetail: '' });

  const reset = () => setForm({ title: '', body: '', audience: 'all', audienceDetail: '' });

  return (
    <div>
      <PageHeader title="الإشعارات" description="ابعت Push Notification لكل المستخدمين أو شريحة محددة." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="إشعار جديد" className="lg:col-span-1">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink">العنوان</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" placeholder="🔥 خصم 50% على الإعلانات المميزة اليوم!" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink">النص</span>
              <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="input h-24 resize-none" placeholder="تفاصيل الإشعار..." />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink">الجمهور</span>
              <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as NotificationAudience })} className="input">
                {Object.entries(AUDIENCE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            {form.audience === 'city' || form.audience === 'category' ? (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink">التفاصيل</span>
                <input value={form.audienceDetail} onChange={(e) => setForm({ ...form, audienceDetail: e.target.value })} className="input" placeholder={form.audience === 'city' ? 'مثال: السويس' : 'مثال: سيارات'} />
              </label>
            ) : null}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  if (!form.title.trim()) return;
                  saveDraftNotification(form);
                  reset();
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-sm font-semibold text-ink hover:bg-paper"
              >
                <Save size={14} /> حفظ كمسودة
              </button>
              <button
                onClick={() => {
                  if (!form.title.trim()) return;
                  sendNotification(form);
                  reset();
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-signal py-2.5 text-sm font-bold text-white"
              >
                <Send size={14} /> إرسال الآن
              </button>
            </div>
          </div>
        </Card>

        <Card title="سجل الحملات" className="lg:col-span-2">
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="rounded-xl border border-line-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-ink">{n.title}</div>
                    <div className="mt-0.5 text-xs text-ink-3">{n.body}</div>
                  </div>
                  <Badge tone={STATUS_TONE[n.status]}>{STATUS_LABEL[n.status]}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-3">
                  <span>{AUDIENCE_LABEL[n.audience]}{n.audienceDetail ? ` · ${n.audienceDetail}` : ''}</span>
                  {n.sentAt ? <span>{formatDateTime(n.sentAt)}</span> : null}
                  {n.recipientsCount > 0 ? <span>{n.recipientsCount.toLocaleString('en-US')} مستلم</span> : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default NotificationsPage;
