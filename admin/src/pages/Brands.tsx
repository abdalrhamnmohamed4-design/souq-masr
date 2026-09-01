/**
 * src/pages/Brands.tsx — إدارة البراندات والموديلات (PART 12): براند
 * واحد ممكن ينتمي لأكتر من تصنيف (مثال Apple ⊂ موبايلات + تابلت + لابتوب،
 * PART 27) — مفيش تكرار للبراند نفسه.
 */
import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { useAdminStore } from '@/store/useAdminStore';
import { getBrandLogoUrl } from '@/mock/taxonomy/brandLogos';
import type { Brand } from '@/mock/taxonomy/types';

function BrandLogo({ brand }: { brand: Brand }) {
  const url = getBrandLogoUrl(brand.id);
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white">
      {url ? <img src={url} alt={brand.name} className="h-5 w-5" /> : <span className="text-xs text-ink-3">—</span>}
    </div>
  );
}

export function BrandsPage() {
  const brands = useAdminStore((s) => s.brands);
  const categories = useAdminStore((s) => s.categories);
  const models = useAdminStore((s) => s.models);
  const addBrand = useAdminStore((s) => s.addBrand);
  const removeBrand = useAdminStore((s) => s.removeBrand);
  const addModel = useAdminStore((s) => s.addModel);
  const removeModel = useAdminStore((s) => s.removeModel);

  const brandableCategories = categories.filter((c) => c.hasBrands);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; categoryIds: string[] }>({ name: '', categoryIds: [] });
  const [modelsFor, setModelsFor] = useState<Brand | null>(null);
  const [newModel, setNewModel] = useState('');

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;
  const modelsCount = (brandId: string) => models.filter((m) => m.brandId === brandId).length;

  const submitBrand = () => {
    if (!form.name.trim() || form.categoryIds.length === 0) return;
    addBrand({ id: `brand-${Date.now()}`, name: form.name, categoryIds: form.categoryIds });
    setForm({ name: '', categoryIds: [] });
    setAddOpen(false);
  };

  const columns: Column<Brand>[] = [
    {
      key: 'name',
      header: 'البراند',
      sortValue: (b) => b.name,
      render: (b) => (
        <div className="flex items-center gap-2.5">
          <BrandLogo brand={b} />
          <span className="font-semibold text-ink">{b.name}</span>
        </div>
      ),
    },
    {
      key: 'categories',
      header: 'التصنيفات',
      render: (b) => (
        <div className="flex flex-wrap gap-1">
          {b.categoryIds.map((cid) => (
            <span key={cid} className="rounded-md bg-line-2 px-2 py-0.5 text-[11px] text-ink-2">{categoryName(cid)}</span>
          ))}
        </div>
      ),
    },
    { key: 'models', header: 'الموديلات', render: (b) => (
      <button onClick={() => setModelsFor(b)} className="text-xs font-semibold text-signal">{modelsCount(b.id)} موديل — إدارة</button>
    ) },
    {
      key: 'actions', header: '', align: 'left',
      render: (b) => (
        <button onClick={() => removeBrand(b.id)} className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger">
          <Trash2 size={15} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="البراندات والموديلات"
        description="مصدر البراندات والموديلات لكل التصنيفات اللي بتدعم اختيار براند/موديل في نموذج النشر."
        actions={
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 rounded-xl bg-signal px-3.5 py-2 text-sm font-bold text-white">
            <Plus size={15} /> براند جديد
          </button>
        }
      />
      <DataTable columns={columns} rows={brands} rowKey={(b) => b.id} searchText={(b) => b.name} searchPlaceholder="دوّر باسم البراند..." pageSize={14} />

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="براند جديد" width="max-w-sm">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink">اسم البراند</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="مثال: Apple" />
          </label>
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-ink">التصنيفات (ممكن أكتر من واحد)</span>
            <div className="flex flex-wrap gap-1.5">
              {brandableCategories.map((c) => {
                const active = form.categoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setForm((f) => ({ ...f, categoryIds: active ? f.categoryIds.filter((x) => x !== c.id) : [...f.categoryIds, c.id] }))}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${active ? 'bg-ink text-white' : 'border border-line text-ink-2'}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={submitBrand} className="w-full rounded-xl bg-signal py-2.5 text-sm font-bold text-white">
            إضافة البراند
          </button>
        </div>
      </Modal>

      <Modal open={!!modelsFor} onClose={() => setModelsFor(null)} title={modelsFor ? `موديلات ${modelsFor.name}` : ''} width="max-w-sm">
        {modelsFor ? (
          <div>
            <div className="mb-3 flex gap-2">
              <input value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="اسم الموديل" className="input" />
              <button
                onClick={() => {
                  if (!newModel.trim()) return;
                  addModel({ id: `model-${Date.now()}`, brandId: modelsFor.id, name: newModel.trim() });
                  setNewModel('');
                }}
                className="rounded-xl bg-signal px-4 text-sm font-bold text-white"
              >
                إضافة
              </button>
            </div>
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {models.filter((m) => m.brandId === modelsFor.id).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-paper px-3 py-2">
                  <span className="text-sm text-ink">{m.name}</span>
                  <button onClick={() => removeModel(m.id)} className="text-ink-3 hover:text-danger">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default BrandsPage;
