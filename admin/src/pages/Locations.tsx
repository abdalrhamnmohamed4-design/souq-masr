import { MapPin, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Card, PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { useAdminStore } from '@/store/useAdminStore';

export function LocationsPage() {
  const locations = useAdminStore((s) => s.locations);
  const addLocation = useAdminStore((s) => s.addLocation);
  const removeLocation = useAdminStore((s) => s.removeLocation);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'city' as 'governorate' | 'city' | 'area', parentId: '' });

  const governorates = locations.filter((l) => l.type === 'governorate');
  const childrenOf = (id: string) => locations.filter((l) => l.parentId === id);

  const submit = () => {
    if (!form.name.trim()) return;
    addLocation({
      id: form.name.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: form.name,
      type: form.type,
      parentId: form.parentId || null,
    });
    setForm({ name: '', type: 'city', parentId: '' });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="المواقع"
        description="هيكل المحافظة ← المدينة ← المنطقة، زي القاهرة ← مدينة نصر ← عباس العقاد."
        actions={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl bg-signal px-3.5 py-2 text-sm font-bold text-white">
            <Plus size={15} /> موقع جديد
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {governorates.map((gov) => (
          <Card key={gov.id} className="!p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-signal-2" />
                <span className="font-display font-bold text-ink">{gov.name}</span>
              </div>
              <button onClick={() => removeLocation(gov.id)} className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="mt-3 space-y-2 border-t border-line-2 pt-3">
              {childrenOf(gov.id).length === 0 ? (
                <p className="text-xs text-ink-3">مفيش مدن مضافة تحت المحافظة دي.</p>
              ) : (
                childrenOf(gov.id).map((city) => (
                  <div key={city.id}>
                    <div className="flex items-center justify-between rounded-lg bg-paper px-2.5 py-1.5">
                      <span className="text-sm text-ink-2">{city.name}</span>
                      <button onClick={() => removeLocation(city.id)} className="text-ink-3 hover:text-danger">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {childrenOf(city.id).length > 0 ? (
                      <div className="mr-3 mt-1 flex flex-wrap gap-1">
                        {childrenOf(city.id).map((area) => (
                          <span key={area.id} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-3">
                            {area.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="إضافة موقع" width="max-w-sm">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink">النوع</span>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })} className="input">
              <option value="governorate">محافظة</option>
              <option value="city">مدينة</option>
              <option value="area">منطقة</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink">الاسم</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="مثال: التجمع الخامس" />
          </label>
          {form.type !== 'governorate' ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink">تابع لـ</span>
              <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className="input">
                <option value="">اختار...</option>
                {locations
                  .filter((l) => (form.type === 'city' ? l.type === 'governorate' : l.type === 'city'))
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
          <button onClick={submit} className="w-full rounded-xl bg-signal py-2.5 text-sm font-bold text-white">
            إضافة
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default LocationsPage;
