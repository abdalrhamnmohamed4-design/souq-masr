/**
 * src/pages/ProfessionalsAdmin.tsx — المحترفين والخدمات (PART 37).
 */
import { Ban, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatDate } from '@/mock/utils';
import { useAdminStore } from '@/store/useAdminStore';
import type { ProfessionalProfileSummary, Service, JobsVerificationStatus } from '@/mock/jobs/types';

const V_LABEL: Record<JobsVerificationStatus, string> = { unverified: 'غير موثّق', pending: 'قيد المراجعة', verified: 'موثّق', rejected: 'مرفوض' };
const V_TONE: Record<JobsVerificationStatus, BadgeTone> = { unverified: 'neutral', pending: 'info', verified: 'verify', rejected: 'danger' };
const SERVICE_STATUS_LABEL = { active: 'نشطة', paused: 'موقوفة', deleted: 'محذوفة' } as const;
const SERVICE_STATUS_TONE: Record<Service['status'], BadgeTone> = { active: 'verify', paused: 'gold', deleted: 'danger' };

type Tab = 'professionals' | 'services';

export function ProfessionalsAdminPage() {
  const [tab, setTab] = useState<Tab>('professionals');
  const professionals = useAdminStore((s) => s.professionals);
  const setVerification = useAdminStore((s) => s.setProfessionalVerification);
  const services = useAdminStore((s) => s.jobsServices);
  const setServiceStatus = useAdminStore((s) => s.setJobsServiceStatus);

  const proColumns: Column<ProfessionalProfileSummary>[] = [
    { key: 'name', header: 'المحترف', sortValue: (p) => p.name, render: (p) => p.name },
    { key: 'city', header: 'المدينة', render: (p) => p.city },
    { key: 'services', header: 'عدد الخدمات', sortValue: (p) => p.servicesCount, render: (p) => p.servicesCount },
    { key: 'status', header: 'التوثيق', render: (p) => <Badge tone={V_TONE[p.verification]}>{V_LABEL[p.verification]}</Badge> },
    { key: 'joined', header: 'تاريخ الانضمام', sortValue: (p) => p.createdAt, render: (p) => formatDate(p.createdAt) },
    {
      key: 'actions', header: '', align: 'left',
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          {p.verification !== 'verified' ? (
            <button onClick={() => setVerification(p.id, 'verified')} className="rounded-lg p-1.5 text-ink-3 hover:bg-verify-wash hover:text-verify" title="توثيق"><ShieldCheck size={15} /></button>
          ) : null}
        </div>
      ),
    },
  ];

  const serviceColumns: Column<Service>[] = [
    { key: 'title', header: 'الخدمة', sortValue: (s) => s.title, render: (s) => <div><div className="font-semibold text-ink">{s.title}</div><div className="text-xs text-ink-3">{s.professionalName}</div></div> },
    { key: 'price', header: 'السعر', sortValue: (s) => s.price ?? 0, render: (s) => (s.price ? `${s.price.toLocaleString('en-US')} ج.م` : '—') },
    { key: 'reports', header: 'بلاغات', sortValue: (s) => s.reportsCount, render: (s) => s.reportsCount },
    { key: 'status', header: 'الحالة', render: (s) => <Badge tone={SERVICE_STATUS_TONE[s.status]}>{SERVICE_STATUS_LABEL[s.status]}</Badge> },
    {
      key: 'actions', header: '', align: 'left',
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => setServiceStatus(s.id, s.status === 'active' ? 'paused' : 'active')} className="rounded-lg p-1.5 text-ink-3 hover:bg-paper" title="إيقاف/تفعيل"><Ban size={15} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="المحترفين والخدمات" description="إدارة أصحاب الحرف والخدمات المنشورة." />
      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('professionals')} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${tab === 'professionals' ? 'bg-ink text-white' : 'border border-line bg-surface text-ink-2 hover:bg-paper'}`}>محترفون ({professionals.length})</button>
        <button onClick={() => setTab('services')} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${tab === 'services' ? 'bg-ink text-white' : 'border border-line bg-surface text-ink-2 hover:bg-paper'}`}>خدمات ({services.length})</button>
      </div>
      {tab === 'professionals' ? <DataTable columns={proColumns} rows={professionals} rowKey={(p) => p.id} searchText={(p) => p.name} searchPlaceholder="دوّر باسم المحترف..." emptyMessage="لسه مفيش محترفين مسجّلين." /> : null}
      {tab === 'services' ? <DataTable columns={serviceColumns} rows={services} rowKey={(s) => s.id} searchText={(s) => s.title} searchPlaceholder="دوّر بالخدمة..." emptyMessage="لسه مفيش خدمات منشورة." /> : null}
    </div>
  );
}

export default ProfessionalsAdminPage;
