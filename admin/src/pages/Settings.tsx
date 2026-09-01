import { Save } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Card, PageHeader } from '@/components/ui/PageHeader';
import { useAdminStore } from '@/store/useAdminStore';

export function SettingsPage() {
  const settings = useAdminStore((s) => s.settings);
  const updateSettings = useAdminStore((s) => s.updateSettings);
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div>
      <PageHeader
        title="الإعدادات"
        description="إعدادات عامة للتطبيق — بتتحدّث فورًا من غير الحاجة لإصدار تحديث جديد."
        actions={
          <button onClick={save} className="flex items-center gap-2 rounded-xl bg-signal px-3.5 py-2 text-sm font-bold text-white">
            <Save size={15} /> {saved ? 'اتحفظ ✓' : 'حفظ التغييرات'}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="الهوية والتواصل">
          <div className="space-y-3">
            <Field label="اسم التطبيق">
              <input value={form.appName} onChange={(e) => setForm({ ...form, appName: e.target.value })} className="input" />
            </Field>
            <Field label="رقم الدعم">
              <input value={form.supportPhone} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} className="input" dir="ltr" />
            </Field>
            <Field label="واتساب">
              <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="input" dir="ltr" />
            </Field>
            <Field label="البريد الإلكتروني">
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" dir="ltr" />
            </Field>
          </div>
        </Card>

        <Card title="النظام والتسعير">
          <div className="space-y-3">
            <Field label="أقل نسخة مسموحة من التطبيق">
              <input value={form.minAppVersion} onChange={(e) => setForm({ ...form, minAppVersion: e.target.value })} className="input" dir="ltr" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="سعر التمييز الافتراضي">
                <input type="number" value={form.featuredAdPriceDefault} onChange={(e) => setForm({ ...form, featuredAdPriceDefault: Number(e.target.value) })} className="input" />
              </Field>
              <Field label="سعر الرفع الافتراضي">
                <input type="number" value={form.boostPriceDefault} onChange={(e) => setForm({ ...form, boostPriceDefault: Number(e.target.value) })} className="input" />
              </Field>
            </div>
            <Field label="حد الإعلانات المجانية">
              <input type="number" value={form.freeAdsLimit} onChange={(e) => setForm({ ...form, freeAdsLimit: Number(e.target.value) })} className="input" />
            </Field>
            <div className="flex items-center justify-between rounded-xl border border-line-2 p-3">
              <div>
                <div className="text-sm font-semibold text-ink">وضع الصيانة</div>
                <div className="text-xs text-ink-3">بيقفل التطبيق مؤقتًا لكل المستخدمين</div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={form.maintenanceMode}
                  onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-line-2 transition-colors peer-checked:bg-danger" />
                <div className="absolute right-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:-translate-x-4" />
              </label>
            </div>
          </div>
        </Card>
      </div>
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

export default SettingsPage;
