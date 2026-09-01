/**
 * src/pages/JobCategories.tsx — إدارة تصنيفات الوظائف والمهن (PART 38):
 * قسم وظيفي (Accounting & Finance...) ومهنة (Accountant...) جوّاه.
 * التعديلات هنا محلية لتطبيق الأدمن (زي باقي الشجرة) — هتتوحّد مع
 * الموبايل تلقائيًا لما يتوصّل باك إند حقيقي.
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

export function JobCategoriesPage() {
  const jobCategories = useAdminStore((s) => s.jobCategories);
  const professions = useAdminStore((s) => s.professions);
  const addProfession = useAdminStore((s) => s.addProfession);
  const removeProfession = useAdminStore((s) => s.removeProfession);
  const addJobCategory = useAdminStore((s) => s.addJobCategory);
  const removeJobCategory = useAdminStore((s) => s.removeJobCategory);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ id: '', name: '', nameEn: '', icon: 'Briefcase' });
  const [profModalFor, setProfModalFor] = useState<string | null>(null);
  const [profForm, setProfForm] = useState({ name: '', nameEn: '' });

  const submitCategory = () => {
    if (!catForm.name.trim()) return;
    addJobCategory({ id: catForm.id || `jc-${Date.now()}`, name: catForm.name, nameEn: catForm.nameEn, icon: catForm.icon || 'Briefcase' });
    setCatForm({ id: '', name: '', nameEn: '', icon: 'Briefcase' });
    setCatModal(false);
  };

  const submitProfession = (categoryId: string) => {
    if (!profForm.name.trim()) return;
    addProfession({ id: `pr-${Date.now()}`, categoryId, name: profForm.name, nameEn: profForm.nameEn || profForm.name });
    setProfForm({ name: '', nameEn: '' });
    setProfModalFor(null);
  };

  return (
    <div>
      <PageHeader
        title="تصنيفات الوظائف والمهن"
        description="الأقسام الوظيفية والمهن اللي بتظهر في تطبيق الموبايل وقت نشر وظيفة أو بناء الملف المهني."
        actions={
          <button onClick={() => setCatModal(true)} className="flex items-center gap-2 rounded-xl bg-signal px-3.5 py-2 text-sm font-bold text-white">
            <Plus size={15} /> قسم جديد
          </button>
        }
      />
      <div className="space-y-2">
        {jobCategories.map((c) => {
          const catProfessions = professions.filter((p) => p.categoryId === c.id);
          const isOpen = expanded === c.id;
          return (
            <div key={c.id} className="rounded-2xl border border-line bg-surface">
              <button onClick={() => setExpanded(isOpen ? null : c.id)} className="flex w-full items-center gap-3 px-4 py-3">
                {isOpen ? <ChevronDown size={16} className="text-ink-3" /> : <ChevronLeft size={16} className="text-ink-3" />}
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper text-signal">
                  <CatIcon name={c.icon} />
                </div>
                <span className="flex-1 text-right text-sm font-bold text-ink">{c.name}</span>
                <span className="text-xs text-ink-3">{catProfessions.length} مهنة</span>
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm(`حذف "${c.name}" وكل مهنه؟`)) removeJobCategory(c.id); }}
                  className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </button>
              {isOpen ? (
                <div className="border-t border-line px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {catProfessions.map((p) => (
                      <span key={p.id} className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-2">
                        {p.name}
                        <button onClick={() => removeProfession(p.id)} className="text-ink-3 hover:text-danger"><Trash2 size={11} /></button>
                      </span>
                    ))}
                    <button onClick={() => setProfModalFor(c.id)} className="flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-xs font-semibold text-signal">
                      <Plus size={12} /> إضافة مهنة
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <Modal open={catModal} onClose={() => setCatModal(false)} title="إضافة قسم وظيفي" width="max-w-sm">
        <div className="space-y-3">
          <Field label="اسم القسم"><input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className="input" placeholder="مثلاً: الزراعة" /></Field>
          <Field label="الاسم بالإنجليزي"><input value={catForm.nameEn} onChange={(e) => setCatForm({ ...catForm, nameEn: e.target.value })} className="input" dir="ltr" placeholder="Agriculture" /></Field>
          <Field label="اسم أيقونة Lucide"><input value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} className="input" dir="ltr" placeholder="Sprout" /></Field>
          <button onClick={submitCategory} className="mt-2 w-full rounded-xl bg-signal py-2.5 text-sm font-bold text-white">إضافة</button>
        </div>
      </Modal>

      <Modal open={!!profModalFor} onClose={() => setProfModalFor(null)} title="إضافة مهنة" width="max-w-sm">
        <div className="space-y-3">
          <Field label="اسم المهنة"><input value={profForm.name} onChange={(e) => setProfForm({ ...profForm, name: e.target.value })} className="input" placeholder="مثلاً: مهندس زراعي" /></Field>
          <Field label="الاسم بالإنجليزي"><input value={profForm.nameEn} onChange={(e) => setProfForm({ ...profForm, nameEn: e.target.value })} className="input" dir="ltr" placeholder="Agricultural Engineer" /></Field>
          <button onClick={() => profModalFor && submitProfession(profModalFor)} className="mt-2 w-full rounded-xl bg-signal py-2.5 text-sm font-bold text-white">إضافة</button>
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

export default JobCategoriesPage;
