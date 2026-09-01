import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Card, PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { useAdminStore } from '@/store/useAdminStore';
import type { Banner, BannerPlacement } from '@/types';

const PLACEMENT_LABEL: Record<BannerPlacement, string> = {
  home: 'الرئيسية',
  category: 'صفحة قسم',
  popup: 'Pop-up',
  sponsored: 'إعلان ممول',
};

export function BannersPage() {
  const banners = useAdminStore((s) => s.banners);
  const toggleBannerActive = useAdminStore((s) => s.toggleBannerActive);
  const addBanner = useAdminStore((s) => s.addBanner);
  const removeBanner = useAdminStore((s) => s.removeBanner);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Banner, 'id' | 'active'>>({
    placement: 'home',
    title: '',
    subtitle: '',
    ctaLabel: 'اعرف أكتر',
    colorFrom: '#0F1A2E',
    colorTo: '#22375C',
  });

  const submit = () => {
    if (!form.title.trim()) return;
    addBanner({ ...form, id: `b-${Date.now()}`, active: true });
    setForm({ placement: 'home', title: '', subtitle: '', ctaLabel: 'اعرف أكتر', colorFrom: '#0F1A2E', colorTo: '#22375C' });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="البانرات"
        description="بانر الرئيسية، بانر ترويجي، بانر قسم، Pop-up، إعلانات ممولة — من غير تحديث للتطبيق."
        actions={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl bg-signal px-3.5 py-2 text-sm font-bold text-white">
            <Plus size={15} /> بانر جديد
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {banners.map((b) => (
          <Card key={b.id} className="!p-0 overflow-hidden">
            <div
              className="flex items-center justify-between p-4"
              style={{ background: `linear-gradient(115deg, ${b.colorFrom}, ${b.colorTo})` }}
            >
              <div>
                <div className="font-display text-sm font-bold text-white">{b.title}</div>
                <div className="mt-1 text-xs text-white/70">{b.subtitle}</div>
              </div>
              <span className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink">{b.ctaLabel}</span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="rounded-md bg-line-2 px-2 py-1 text-[11px] font-semibold text-ink-2">{PLACEMENT_LABEL[b.placement]}</span>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" checked={b.active} onChange={() => toggleBannerActive(b.id)} className="peer sr-only" />
                  <div className="h-5 w-9 rounded-full bg-line-2 transition-colors peer-checked:bg-verify" />
                  <div className="absolute right-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:-translate-x-4" />
                </label>
                <button onClick={() => removeBanner(b.id)} className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="بانر جديد" width="max-w-sm">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink">مكان العرض</span>
            <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as BannerPlacement })} className="input">
              {Object.entries(PLACEMENT_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink">العنوان</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink">الوصف</span>
            <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="input" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink">نص الزرار</span>
            <input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} className="input" />
          </label>
          <button onClick={submit} className="w-full rounded-xl bg-signal py-2.5 text-sm font-bold text-white">
            إضافة البانر
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default BannersPage;
