import { Plus, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import Badge from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatDate } from '@/mock/utils';
import { useAdminStore } from '@/store/useAdminStore';
import type { PromoCode } from '@/types';

const SCOPE_LABEL: Record<PromoCode['scope'], string> = {
  all: 'كل الخدمات',
  boost: 'الرفع',
  featured: 'التمييز',
  subscription: 'الاشتراكات',
};

export function PromoCodesPage() {
  const promoCodes = useAdminStore((s) => s.promoCodes);
  const addPromoCode = useAdminStore((s) => s.addPromoCode);
  const togglePromoActive = useAdminStore((s) => s.togglePromoActive);
  const removePromoCode = useAdminStore((s) => s.removePromoCode);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', value: 10, type: 'percent' as 'percent' | 'fixed', maxUses: 100, scope: 'all' as PromoCode['scope'] });

  const columns: Column<PromoCode>[] = [
    { key: 'code', header: 'الكود', render: (p) => <span className="font-display font-bold text-ink" dir="ltr">{p.code}</span> },
    { key: 'discount', header: 'الخصم', render: (p) => (p.discountType === 'percent' ? `${p.value}%` : `${p.value} ج.م`) },
    { key: 'scope', header: 'النطاق', render: (p) => SCOPE_LABEL[p.scope] },
    { key: 'usage', header: 'الاستخدام', sortValue: (p) => p.usedCount, render: (p) => `${p.usedCount} / ${p.maxUses}` },
    { key: 'expires', header: 'الانتهاء', sortValue: (p) => p.expiresAt, render: (p) => formatDate(p.expiresAt) },
    { key: 'status', header: 'الحالة', render: (p) => (p.active ? <Badge tone="verify">فعّال</Badge> : <Badge tone="neutral">موقوف</Badge>) },
    {
      key: 'actions',
      header: '',
      align: 'left',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" checked={p.active} onChange={() => togglePromoActive(p.id)} className="peer sr-only" />
            <div className="h-5 w-9 rounded-full bg-line-2 transition-colors peer-checked:bg-verify" />
            <div className="absolute right-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:-translate-x-4" />
          </label>
          <button onClick={() => removePromoCode(p.id)} className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  const submit = () => {
    if (!form.code.trim()) return;
    addPromoCode({
      id: `pc-${Date.now()}`,
      code: form.code.toUpperCase(),
      discountType: form.type,
      value: form.value,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      maxUses: form.maxUses,
      usedCount: 0,
      scope: form.scope,
      active: true,
    });
    setForm({ code: '', value: 10, type: 'percent', maxUses: 100, scope: 'all' });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="أكواد الخصم"
        description="كوبونات لتحفيز الاستخدام على خدمات الرفع والتمييز والاشتراكات."
        actions={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl bg-signal px-3.5 py-2 text-sm font-bold text-white">
            <Plus size={15} /> كود جديد
          </button>
        }
      />
      <DataTable columns={columns} rows={promoCodes} rowKey={(p) => p.id} searchText={(p) => p.code} searchPlaceholder="دوّر بالكود..." pageSize={10} />

      <Modal open={open} onClose={() => setOpen(false)} title="إضافة كود خصم" width="max-w-sm">
        <div className="space-y-3">
          <Field label="الكود">
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="WELCOME50" className="input" dir="ltr" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="نوع الخصم">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percent' | 'fixed' })} className="input">
                <option value="percent">نسبة %</option>
                <option value="fixed">مبلغ ثابت</option>
              </select>
            </Field>
            <Field label="القيمة">
              <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الحد الأقصى للاستخدام">
              <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })} className="input" />
            </Field>
            <Field label="النطاق">
              <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as PromoCode['scope'] })} className="input">
                {Object.entries(SCOPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <button onClick={submit} className="mt-2 w-full rounded-xl bg-signal py-2.5 text-sm font-bold text-white">
            إنشاء الكود
          </button>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

export default PromoCodesPage;
