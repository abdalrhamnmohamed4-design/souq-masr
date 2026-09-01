/**
 * src/pages/Categories.tsx — شجرة التصنيفات الكاملة (PART 35): عرض شجري
 * قابل للطي، إضافة/حذف/إخفاء/إعادة ترتيب لأي مستوى، ومحرر خصائص لكل
 * تصنيف (PART 11 Attribute Manager) — نوع الحقل، إلزامي، قابل للفلترة،
 * خيارات select.
 */
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, Eye, EyeOff, Plus, Settings2, Trash2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useState } from 'react';
import { Card, PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useAdminStore } from '@/store/useAdminStore';
import type { Category, CategoryField, FieldType } from '@/mock/taxonomy/types';

function CatIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Package;
  return <Cmp size={size} />;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'نص', number: 'رقم', select: 'اختيار واحد', multiselect: 'اختيار متعدد', boolean: 'نعم/لا', date: 'تاريخ', year: 'سنة', location: 'موقع',
};

export function CategoriesPage() {
  const categories = useAdminStore((s) => s.categories);
  const listings = useAdminStore((s) => s.listings);
  const addCategory = useAdminStore((s) => s.addCategory);
  const removeCategory = useAdminStore((s) => s.removeCategory);
  const toggleCategoryActive = useAdminStore((s) => s.toggleCategoryActive);
  const reorderCategory = useAdminStore((s) => s.reorderCategory);

  const [expanded, setExpanded] = useState<Set<string>>(new Set(categories.filter((c) => c.parentId === null).slice(0, 3).map((c) => c.id)));
  const [addParent, setAddParent] = useState<string | null | undefined>(undefined);
  const [form, setForm] = useState({ name: '', nameEn: '', icon: 'Package' });
  const [fieldsFor, setFieldsFor] = useState<Category | null>(null);

  const topLevel = categories.filter((c) => c.parentId === null).sort((a, b) => a.order - b.order);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id).sort((a, b) => a.order - b.order);
  const listingsCount = (id: string) => listings.filter((l) => l.categoryId === id).length;

  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const submitAdd = () => {
    if (!form.name.trim() || addParent === undefined) return;
    const id = form.name.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const siblingsCount = categories.filter((c) => c.parentId === addParent).length;
    addCategory({ id, name: form.name, nameEn: form.nameEn || form.name, icon: form.icon, parentId: addParent, order: siblingsCount + 1 });
    if (addParent) setExpanded((s) => new Set(s).add(addParent));
    setForm({ name: '', nameEn: '', icon: 'Package' });
    setAddParent(undefined);
  };

  const renderNode = (cat: Category, depth: number) => {
    const kids = childrenOf(cat.id);
    const isOpen = expanded.has(cat.id);
    return (
      <div key={cat.id}>
        <div
          className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-paper"
          style={{ paddingRight: `${depth * 22 + 8}px` }}
        >
          {kids.length > 0 ? (
            <button onClick={() => toggle(cat.id)} className="text-ink-3">
              {isOpen ? <ChevronDown size={15} /> : <ChevronLeft size={15} />}
            </button>
          ) : (
            <span className="w-[15px]" />
          )}
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-signal-wash text-signal-2">
            <CatIcon name={cat.icon} size={14} />
          </span>
          <span className={`flex-1 text-sm font-semibold ${cat.active === false ? 'text-ink-3 line-through' : 'text-ink'}`}>{cat.name}</span>
          {cat.hasBrands ? <Badge tone="info">براندات</Badge> : null}
          {cat.fields.length > 0 ? <Badge tone="gold">{cat.fields.length} خاصية</Badge> : null}
          <span className="text-xs text-ink-3">{listingsCount(cat.id)} إعلان</span>
          <div className="flex items-center gap-1">
            <button onClick={() => reorderCategory(cat.id, 'up')} className="rounded-lg p-1.5 text-ink-3 hover:bg-line-2" title="لأعلى">
              <ArrowUp size={13} />
            </button>
            <button onClick={() => reorderCategory(cat.id, 'down')} className="rounded-lg p-1.5 text-ink-3 hover:bg-line-2" title="لأسفل">
              <ArrowDown size={13} />
            </button>
            <button onClick={() => setFieldsFor(cat)} className="rounded-lg p-1.5 text-ink-3 hover:bg-info-wash hover:text-info" title="الخصائص">
              <Settings2 size={13} />
            </button>
            <button onClick={() => toggleCategoryActive(cat.id)} className="rounded-lg p-1.5 text-ink-3 hover:bg-gold-wash hover:text-[#8A6300]" title={cat.active === false ? 'إظهار' : 'إخفاء'}>
              {cat.active === false ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
            <button onClick={() => setAddParent(cat.id)} className="rounded-lg p-1.5 text-ink-3 hover:bg-verify-wash hover:text-verify" title="إضافة فرع">
              <Plus size={13} />
            </button>
            <button onClick={() => removeCategory(cat.id)} className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger" title="حذف">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        {isOpen && kids.length > 0 ? <div>{kids.map((k) => renderNode(k, depth + 1))}</div> : null}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="الأقسام"
        description="شجرة تصنيفات كاملة قابلة للتعديل — كل تصنيف بيحدّد نموذج النشر والفلاتر بتاعته في التطبيق."
        actions={
          <button onClick={() => setAddParent(null)} className="flex items-center gap-2 rounded-xl bg-signal px-3.5 py-2 text-sm font-bold text-white">
            <Plus size={15} /> قسم رئيسي جديد
          </button>
        }
      />

      <Card>{topLevel.map((c) => renderNode(c, 0))}</Card>

      <Modal open={addParent !== undefined} onClose={() => setAddParent(undefined)} title={addParent ? 'إضافة فرع' : 'قسم رئيسي جديد'} width="max-w-sm">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink">الاسم بالعربي</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink">الاسم بالإنجليزي</span>
            <input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} className="input" dir="ltr" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink">اسم أيقونة Lucide</span>
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="input" dir="ltr" placeholder="Package" />
          </label>
          <button onClick={submitAdd} className="w-full rounded-xl bg-signal py-2.5 text-sm font-bold text-white">
            إضافة
          </button>
        </div>
      </Modal>

      {fieldsFor ? <FieldsManager category={fieldsFor} onClose={() => setFieldsFor(null)} /> : null}
    </div>
  );
}

function FieldsManager({ category, onClose }: { category: Category; onClose: () => void }) {
  const categories = useAdminStore((s) => s.categories);
  const addCategoryField = useAdminStore((s) => s.addCategoryField);
  const removeCategoryField = useAdminStore((s) => s.removeCategoryField);
  const updateCategory = useAdminStore((s) => s.updateCategory);
  const live = categories.find((c) => c.id === category.id) ?? category;

  const [form, setForm] = useState({ key: '', label: '', type: 'text' as FieldType, required: false, filterable: true, options: '' });

  const submit = () => {
    if (!form.key.trim() || !form.label.trim()) return;
    const field: CategoryField = {
      key: form.key.trim(),
      label: form.label.trim(),
      type: form.type,
      required: form.required,
      filterable: form.filterable,
      options: form.type === 'select' || form.type === 'multiselect' ? form.options.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
    };
    addCategoryField(live.id, field);
    setForm({ key: '', label: '', type: 'text', required: false, filterable: true, options: '' });
  };

  return (
    <Modal open onClose={onClose} title={`خصائص: ${live.name}`} width="max-w-lg">
      <div className="mb-4 flex items-center justify-between rounded-xl bg-paper p-3">
        <span className="text-sm font-semibold text-ink">يدعم براند/موديل</span>
        <label className="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" checked={!!live.hasBrands} onChange={() => updateCategory(live.id, { hasBrands: !live.hasBrands })} className="peer sr-only" />
          <div className="h-5 w-9 rounded-full bg-line-2 transition-colors peer-checked:bg-verify" />
          <div className="absolute right-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:-translate-x-4" />
        </label>
      </div>

      <div className="mb-4 max-h-52 space-y-2 overflow-y-auto">
        {live.fields.length === 0 ? (
          <p className="py-4 text-center text-xs text-ink-3">مفيش خصائص مضافة لسه.</p>
        ) : (
          live.fields.map((f) => (
            <div key={f.key} className="flex items-center gap-2 rounded-lg border border-line-2 px-3 py-2">
              <div className="flex-1">
                <div className="text-sm font-medium text-ink">
                  {f.label} <span className="text-xs text-ink-3">({FIELD_TYPE_LABELS[f.type]})</span>
                </div>
                <div className="mt-0.5 flex gap-1.5">
                  {f.required ? <Badge tone="danger">إلزامي</Badge> : null}
                  {f.filterable ? <Badge tone="info">فلتر</Badge> : null}
                </div>
              </div>
              <button onClick={() => removeCategoryField(live.id, f.key)} className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="space-y-3 border-t border-line-2 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink">المفتاح (إنجليزي)</span>
            <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} className="input" dir="ltr" placeholder="storage" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink">التسمية (عربي)</span>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="input" placeholder="السعة التخزينية" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink">النوع</span>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as FieldType })} className="input">
            {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
              <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>
        {form.type === 'select' || form.type === 'multiselect' ? (
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink">الخيارات (مفصولة بفاصلة)</span>
            <input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} className="input" placeholder="128GB, 256GB, 512GB" />
          </label>
        ) : null}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} /> إلزامي
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.filterable} onChange={(e) => setForm({ ...form, filterable: e.target.checked })} /> يظهر كفلتر
          </label>
        </div>
        <button onClick={submit} className="w-full rounded-xl bg-signal py-2.5 text-sm font-bold text-white">
          إضافة الخاصية
        </button>
      </div>
    </Modal>
  );
}

export default CategoriesPage;
