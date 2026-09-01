/**
 * src/pages/JobCompanies.tsx — الشركات صاحبة الوظائف (PART 21/37) —
 * كيان منفصل عن "الحسابات التجارية" في السوق العام (Businesses.tsx).
 */
import { BadgeCheck, ShieldAlert, ShieldCheck } from 'lucide-react';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatDate } from '@/mock/utils';
import { useAdminStore } from '@/store/useAdminStore';
import type { Company, JobsVerificationStatus } from '@/mock/jobs/types';

const V_LABEL: Record<JobsVerificationStatus, string> = { unverified: 'غير موثّقة', pending: 'قيد المراجعة', verified: 'موثّقة', rejected: 'مرفوضة' };
const V_TONE: Record<JobsVerificationStatus, BadgeTone> = { unverified: 'neutral', pending: 'info', verified: 'verify', rejected: 'danger' };

export function JobCompaniesPage() {
  const companies = useAdminStore((s) => s.jobCompanies);
  const setVerification = useAdminStore((s) => s.setJobCompanyVerification);

  const columns: Column<Company>[] = [
    {
      key: 'name', header: 'الشركة', sortValue: (c) => c.name,
      render: (c) => (
        <div className="flex items-center gap-1.5 font-semibold text-ink">
          {c.name} {c.verification === 'verified' ? <BadgeCheck size={13} className="text-verify" /> : null}
        </div>
      ),
    },
    { key: 'industry', header: 'القطاع', render: (c) => c.industry },
    { key: 'city', header: 'المدينة', render: (c) => c.city },
    { key: 'jobs', header: 'الوظائف النشطة', sortValue: (c) => c.activeJobsCount, render: (c) => c.activeJobsCount },
    { key: 'status', header: 'التوثيق', render: (c) => <Badge tone={V_TONE[c.verification]}>{V_LABEL[c.verification]}</Badge> },
    { key: 'joined', header: 'تاريخ الانضمام', sortValue: (c) => c.createdAt, render: (c) => formatDate(c.createdAt) },
    {
      key: 'actions', header: '', align: 'left',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          {c.verification !== 'verified' ? (
            <button onClick={() => setVerification(c.id, 'verified')} className="rounded-lg p-1.5 text-ink-3 hover:bg-verify-wash hover:text-verify" title="توثيق"><ShieldCheck size={15} /></button>
          ) : (
            <button onClick={() => setVerification(c.id, 'rejected')} className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger" title="إلغاء التوثيق"><ShieldAlert size={15} /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="الشركات (الوظائف)" description="الشركات اللي بتنشر وظائف — التوثيق بيدّي علامة موثوقية تظهر للمتقدمين." />
      <DataTable columns={columns} rows={companies} rowKey={(c) => c.id} searchText={(c) => `${c.name} ${c.industry}`} searchPlaceholder="دوّر باسم الشركة..." emptyMessage="لسه مفيش شركات مسجّلة." />
    </div>
  );
}

export default JobCompaniesPage;
