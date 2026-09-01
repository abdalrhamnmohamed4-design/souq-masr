/**
 * src/pages/Skills.tsx — إدارة المهارات المرجعية (PART 38): تقنية/شخصية.
 */
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAdminStore } from '@/store/useAdminStore';
import type { SkillCategory } from '@/mock/jobs/types';

const TAB_LABEL: Record<SkillCategory, string> = { technical: 'تقنية', soft: 'شخصية' };

export function SkillsPage() {
  const skills = useAdminStore((s) => s.jobsSkills);
  const addSkill = useAdminStore((s) => s.addSkill);
  const removeSkill = useAdminStore((s) => s.removeSkill);
  const [tab, setTab] = useState<SkillCategory>('technical');
  const [name, setName] = useState('');

  const visible = skills.filter((s) => s.category === tab);

  const submit = () => {
    if (!name.trim()) return;
    addSkill({ name: name.trim(), category: tab });
    setName('');
  };

  return (
    <div>
      <PageHeader title="المهارات" description="مهارات مرجعية تظهر للمستخدم وقت بناء ملفه المهني — يقدر برضه يضيف مهارة مخصصة." />

      <div className="mb-4 flex gap-2">
        {(['technical', 'soft'] as SkillCategory[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${tab === t ? 'bg-ink text-white' : 'border border-line bg-surface text-ink-2 hover:bg-paper'}`}
          >
            {TAB_LABEL[t]} ({skills.filter((s) => s.category === t).length})
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} className="input flex-1" placeholder="اسم المهارة الجديدة" />
        <button onClick={submit} className="flex items-center gap-2 rounded-xl bg-signal px-3.5 py-2 text-sm font-bold text-white"><Plus size={15} /> إضافة</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {visible.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2">
            {s.name}
            <button onClick={() => removeSkill(s.id)} className="text-ink-3 hover:text-danger"><Trash2 size={11} /></button>
          </span>
        ))}
        {visible.length === 0 ? <p className="text-xs text-ink-3">مفيش مهارات في القسم ده.</p> : null}
      </div>
    </div>
  );
}

export default SkillsPage;
