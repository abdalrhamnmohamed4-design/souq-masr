/**
 * src/pages/ServiceCategories.tsx — إدارة تصنيفات المهن والخدمات (PART
 * 38): قسم (Construction...) ومهنة حرفية (Plumber...) جوّاه. منفصل
 * تمامًا عن تصنيفات الوظائف (شركات).
 */
import * as Icons from 'lucide-react';
import { ChevronDown, ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { useAdminStore } from '@/store/useAdminStore';

function CatIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Package;
  return <Cmp size={size} />;
}

export function ServiceCategoriesPage() {
  const serviceCategories = useAdminStore((s) => s.serviceCategories);
  const trades = useAdminStore((s) => s.trades);
  const addTrade = useAdminStore((s) => s.addTrade);
  const removeTrade = useAdminStore((s) => s.removeTrade);
  const addServiceCategory = useAdminStore((s) => s.addServiceCategory);
  const removeServiceCategory = useAdminStore((s) => s.removeServiceCategory);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', nameEn: '', icon: 'Wrench' });
  const [tradeModalFor, setTradeModalFor] = useState<string | null>(null);
  const [tradeForm, setTradeForm] = useState({ name: '', nameEn: '' });

  const submitCategory = () => {
    if (!catForm.name.trim()) return;
    addServiceCategory({ id: `sc-${Date.now()}`, name: catForm.name, nameEn: catForm.nameEn, icon: catForm.icon || 'Wrench' });
    setCatForm({ name: '', nameEn: '', icon: 'Wrench' });
    setCatModal(false);
  };

  const submitTrade = (categoryId: string) => {
    if (!tradeForm.name.trim()) return;
    addTrade({ id: `tr-${Date.now()}`, categoryId, name: tradeForm.name, nameEn: tradeForm.nameEn || tradeForm.name });
    setTradeForm({ name: '', nameEn: '' });
    setTradeModalFor(null);
  };

  return (
    <div>
      <PageHeader
        title="تصنيفات المهن والخدمات"
        description="الحرف والخدمات (كهربائي، سباك...) اللي بتظهر في قسم «المهن والخدمات» في تطبيق الموبايل — منفصل عن تصنيفات الوظائف."
        actions={
          <button onClick={() => setCatModal(true)} className="flex items-center gap-2 rounded-xl bg-signal px-3.5 py-2 text-sm font-bold text-white">
            <Plus size={15} /> قسم جديد
          </button>
        }
      />
      <div className="space-y-2">
        {serviceCategories.map((c) => {
          const catTrades = trades.filter((t) => t.categoryId === c.id);
          const isOpen = expanded === c.id;
          return (
            <div key={c.id} className="rounded-2xl border border-line bg-surface">
              <button onClick={() => setExpanded(isOpen ? null : c.id)} className="flex w-full items-center gap-3 px-4 py-3">
                {isOpen ? <ChevronDown size={16} className="text-ink-3" /> : <ChevronLeft size={16} className="text-ink-3" />}
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper text-gold">
                  <CatIcon name={c.icon} />
                </div>
                <span className="flex-1 text-right text-sm font-bold text-ink">{c.name}</span>
                <span className="text-xs text-ink-3">{catTrades.length} مهنة</span>
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm(`حذف "${c.name}" وكل مهنه؟`)) removeServiceCategory(c.id); }}
                  className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </button>
              {isOpen ? (
                <div className="border-t border-line px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {catTrades.map((t) => (
                      <span key={t.id} className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-2">
                        {t.name}
                        <button onClick={() => removeTrade(t.id)} className="text-ink-3 hover:text-danger"><Trash2 size={11} /></button>
                      </span>
                    ))}
                    <button onClick={() => setTradeModalFor(c.id)} className="flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-xs font-semibold text-signal">
                      <Plus size={12} /> إضافة مهنة
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <Modal open={catModal} onClose={() => setCatModal(false)} title="إضافة قسم" width="max-w-sm">
        <div className="space-y-3">
          <Field label="اسم القسم"><input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className="input" placeholder="مثلاً: خدمات الحدائق" /></Field>
          <Field label="الاسم بالإنجليزي"><input value={catForm.nameEn} onChange={(e) => setCatForm({ ...catForm, nameEn: e.target.value })} className="input" dir="ltr" placeholder="Gardening Services" /></Field>
          <Field label="اسم أيقونة Lucide"><input value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} className="input" dir="ltr" placeholder="Trees" /></Field>
          <button onClick={submitCategory} className="mt-2 w-full rounded-xl bg-signal py-2.5 text-sm font-bold text-white">إضافة</button>
        </div>
      </Modal>

      <Modal open={!!tradeModalFor} onClose={() => setTradeModalFor(null)} title="إضافة مهنة" width="max-w-sm">
        <div className="space-y-3">
          <Field label="اسم المهنة"><input value={tradeForm.name} onChange={(e) => setTradeForm({ ...tradeForm, name: e.target.value })} className="input" placeholder="مثلاً: منسّق حدائق" /></Field>
          <Field label="الاسم بالإنجليزي"><input value={tradeForm.nameEn} onChange={(e) => setTradeForm({ ...tradeForm, nameEn: e.target.value })} className="input" dir="ltr" placeholder="Landscaper" /></Field>
          <button onClick={() => tradeModalFor && submitTrade(tradeModalFor)} className="mt-2 w-full rounded-xl bg-signal py-2.5 text-sm font-bold text-white">إضافة</button>
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

export default ServiceCategoriesPage;
