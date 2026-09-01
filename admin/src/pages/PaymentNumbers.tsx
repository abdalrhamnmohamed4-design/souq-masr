/**
 * src/pages/PaymentNumbers.tsx — الأرقام اللي بتظهر للعميل وقت ما يحب
 * يشحن رصيد أو يدفع (فودافون كاش/إنستاباي/تحويل بنكي...). الأدمن هنا
 * بيتحكم فعليًا في اللي العميل شايفه وبيدفع عليه في تطبيق الموبايل —
 * إضافة/تعديل/تفعيل وتعطيل بدون حذف.
 */
import { EyeOff, Plus, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import Badge from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAdminStore } from '@/store/useAdminStore';
import type { PaymentMethodKind, PaymentNumber } from '@/types';

const METHOD_LABEL: Record<PaymentMethodKind, string> = {
  vodafone_cash: 'فودافون كاش',
  orange_cash: 'أورنج كاش',
  etisalat_cash: 'اتصالات كاش',
  instapay: 'إنستاباي',
  bank_transfer: 'تحويل بنكي',
};

export function PaymentNumbersPage() {
  const paymentNumbers = useAdminStore((s) => s.paymentNumbers);
  const addPaymentNumber = useAdminStore((s) => s.addPaymentNumber);
  const updatePaymentNumber = useAdminStore((s) => s.updatePaymentNumber);
  const removePaymentNumber = useAdminStore((s) => s.removePaymentNumber);
  const togglePaymentNumberActive = useAdminStore((s) => s.togglePaymentNumberActive);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ method: 'vodafone_cash' as PaymentMethodKind, label: '', holderName: '', number: '' });

  const openNew = () => {
    setEditingId(null);
    setForm({ method: 'vodafone_cash', label: METHOD_LABEL.vodafone_cash, holderName: '', number: '' });
    setOpen(true);
  };

  const openEdit = (p: PaymentNumber) => {
    setEditingId(p.id);
    setForm({ method: p.method, label: p.label, holderName: p.holderName, number: p.number });
    setOpen(true);
  };

  const submit = () => {
    if (!form.holderName.trim() || !form.number.trim()) return;
    if (editingId) updatePaymentNumber(editingId, form);
    else addPaymentNumber(form);
    setOpen(false);
  };

  const columns: Column<PaymentNumber>[] = [
    { key: 'method', header: 'الوسيلة', render: (p) => METHOD_LABEL[p.method] },
    { key: 'label', header: 'الاسم الظاهر للعميل', render: (p) => p.label },
    { key: 'holder', header: 'اسم صاحب الحساب', render: (p) => p.holderName },
    { key: 'number', header: 'الرقم', render: (p) => <span dir="ltr" className="font-display tabular-nums">{p.number}</span> },
    { key: 'status', header: 'الحالة', render: (p) => (p.active ? <Badge tone="verify">ظاهر للعميل</Badge> : <Badge tone="neutral">مخفي</Badge>) },
    {
      key: 'actions',
      header: '',
      align: 'left',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => openEdit(p)} className="rounded-lg px-2 py-1 text-xs font-semibold text-ink-2 hover:bg-paper">تعديل</button>
          <label className="relative inline-flex cursor-pointer items-center" title={p.active ? 'إخفاء عن العميل' : 'إظهار للعميل'}>
            <input type="checkbox" checked={p.active} onChange={() => togglePaymentNumberActive(p.id)} className="peer sr-only" />
            <div className="h-5 w-9 rounded-full bg-line-2 transition-colors peer-checked:bg-verify" />
            <div className="absolute right-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:-translate-x-4" />
          </label>
          <button onClick={() => removePaymentNumber(p.id)} className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="أرقام الدفع"
        description="الأرقام اللي بتظهر للعميل في تطبيق الموبايل وقت الدفع (شحن رصيد، تمييز إعلان...). العميل بيحوّل عليها يدويًا وبيأكد إنه دفع."
        actions={
          <button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-signal px-3.5 py-2 text-sm font-bold text-white">
            <Plus size={15} /> رقم جديد
          </button>
        }
      />
      {paymentNumbers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-surface py-14 text-center">
          <EyeOff size={26} className="text-ink-3" />
          <p className="text-sm font-semibold text-ink">مفيش أرقام دفع مضافة لسه</p>
          <p className="max-w-sm text-xs text-ink-3">لحد ما تضيف رقم واحد على الأقل، شاشة الشحن في تطبيق العميل هتظهر فاضية ومتوجّهه للدعم بدل الدفع.</p>
        </div>
      ) : (
        <DataTable columns={columns} rows={paymentNumbers} rowKey={(p) => p.id} searchText={(p) => `${p.label} ${p.holderName} ${p.number}`} searchPlaceholder="دوّر برقم أو اسم..." pageSize={10} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? 'تعديل رقم الدفع' : 'إضافة رقم دفع'} width="max-w-sm">
        <div className="space-y-3">
          <Field label="الوسيلة">
            <select
              value={form.method}
              onChange={(e) => {
                const method = e.target.value as PaymentMethodKind;
                setForm((f) => ({ ...f, method, label: f.label || METHOD_LABEL[method] }));
              }}
              className="input"
            >
              {Object.entries(METHOD_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="الاسم الظاهر للعميل">
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="مثلاً: فودافون كاش الرسمي" className="input" />
          </Field>
          <Field label="اسم صاحب الحساب">
            <input value={form.holderName} onChange={(e) => setForm({ ...form, holderName: e.target.value })} placeholder="الاسم زي ما هيظهر للعميل" className="input" />
          </Field>
          <Field label="الرقم / رقم الحساب">
            <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="01xxxxxxxxx" dir="ltr" className="input" />
          </Field>
          <button onClick={submit} className="mt-2 w-full rounded-xl bg-signal py-2.5 text-sm font-bold text-white">
            {editingId ? 'حفظ التعديلات' : 'إضافة الرقم'}
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

export default PaymentNumbersPage;
