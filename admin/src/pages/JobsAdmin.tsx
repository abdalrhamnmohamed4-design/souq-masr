/**
 * src/pages/JobsAdmin.tsx — إدارة الوظائف والتقديمات والبلاغات (PART
 * 37). فاضية عن قصد لحد ما يتوصّل باك إند مشترك مع تطبيق الموبايل —
 * الجداول والإجراءات (موافقة/رفض/تمييز/حذف) جاهزة وحقيقية.
 */
import { Ban, CheckCircle2, Eye, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatDate } from '@/mock/utils';
import { useAdminStore } from '@/store/useAdminStore';
import { APPLICATION_STATUS_LABELS, JOB_STATUS_LABELS, type Job, type JobApplicationSummary, type JobsReport, type ReportStatus } from '@/mock/jobs/types';

const JOB_STATUS_TONE: Record<Job['status'], BadgeTone> = {
  draft: 'neutral', pending: 'info', published: 'verify', paused: 'gold', closed: 'neutral', expired: 'neutral', rejected: 'danger',
};
const REPORT_STATUS_LABEL: Record<ReportStatus, string> = { pending: 'قيد المراجعة', investigating: 'بيتراجع', resolved: 'اتحل', dismissed: 'مرفوض' };
const REPORT_STATUS_TONE: Record<ReportStatus, BadgeTone> = { pending: 'info', investigating: 'gold', resolved: 'verify', dismissed: 'neutral' };

type Tab = 'jobs' | 'applications' | 'reports';

export function JobsAdminPage() {
  const [tab, setTab] = useState<Tab>('jobs');
  const jobs = useAdminStore((s) => s.jobs);
  const setJobStatus = useAdminStore((s) => s.setJobStatus);
  const toggleJobFeatured = useAdminStore((s) => s.toggleJobFeatured);
  const removeJobAdmin = useAdminStore((s) => s.removeJobAdmin);
  const jobApplications = useAdminStore((s) => s.jobApplications);
  const jobsReports = useAdminStore((s) => s.jobsReports);
  const setJobsReportStatus = useAdminStore((s) => s.setJobsReportStatus);

  const jobColumns: Column<Job>[] = [
    { key: 'title', header: 'الوظيفة', sortValue: (j) => j.title, render: (j) => <div><div className="font-semibold text-ink">{j.title}</div><div className="text-xs text-ink-3">{j.companyName}</div></div> },
    { key: 'city', header: 'المدينة', render: (j) => j.city },
    { key: 'apps', header: 'المتقدمون', sortValue: (j) => j.applicationsCount, render: (j) => j.applicationsCount },
    { key: 'status', header: 'الحالة', render: (j) => <Badge tone={JOB_STATUS_TONE[j.status]}>{JOB_STATUS_LABELS[j.status]}</Badge> },
    { key: 'posted', header: 'تاريخ النشر', sortValue: (j) => j.postedAt, render: (j) => formatDate(j.postedAt) },
    {
      key: 'actions', header: '', align: 'left',
      render: (j) => (
        <div className="flex items-center justify-end gap-1">
          {j.status === 'pending' ? (
            <button onClick={() => setJobStatus(j.id, 'published')} className="rounded-lg p-1.5 text-ink-3 hover:bg-verify-wash hover:text-verify" title="موافقة"><CheckCircle2 size={15} /></button>
          ) : null}
          <button onClick={() => toggleJobFeatured(j.id)} className={`rounded-lg p-1.5 ${j.isFeatured ? 'text-gold' : 'text-ink-3 hover:text-gold'}`} title="تمييز"><Star size={15} /></button>
          <button onClick={() => setJobStatus(j.id, j.status === 'published' ? 'paused' : 'published')} className="rounded-lg p-1.5 text-ink-3 hover:bg-paper" title="إيقاف/تفعيل"><Ban size={15} /></button>
          <button onClick={() => confirm(`حذف "${j.title}"؟`) && removeJobAdmin(j.id)} className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger" title="حذف"><Trash2 size={15} /></button>
        </div>
      ),
    },
  ];

  const appColumns: Column<JobApplicationSummary>[] = [
    { key: 'candidate', header: 'المتقدّم', sortValue: (a) => a.candidateName, render: (a) => a.candidateName },
    { key: 'job', header: 'الوظيفة', render: (a) => a.jobTitle },
    { key: 'status', header: 'الحالة', render: (a) => <Badge tone="info">{APPLICATION_STATUS_LABELS[a.status]}</Badge> },
    { key: 'date', header: 'تاريخ التقديم', sortValue: (a) => a.appliedAt, render: (a) => formatDate(a.appliedAt) },
  ];

  const reportColumns: Column<JobsReport>[] = [
    { key: 'target', header: 'المُبلَّغ عنه', render: (r) => <div><div className="font-semibold text-ink">{r.targetLabel}</div><div className="text-xs text-ink-3">{r.targetType}</div></div> },
    { key: 'type', header: 'السبب', render: (r) => r.type },
    { key: 'reporter', header: 'المُبلِّغ', render: (r) => r.reporterName },
    { key: 'status', header: 'الحالة', render: (r) => <Badge tone={REPORT_STATUS_TONE[r.status]}>{REPORT_STATUS_LABEL[r.status]}</Badge> },
    {
      key: 'actions', header: '', align: 'left',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => setJobsReportStatus(r.id, 'resolved')} className="rounded-lg p-1.5 text-ink-3 hover:bg-verify-wash hover:text-verify" title="حل"><CheckCircle2 size={15} /></button>
          <button onClick={() => setJobsReportStatus(r.id, 'dismissed')} className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger" title="رفض"><Eye size={15} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="إدارة الوظائف" description="مراجعة الوظائف المنشورة، متابعة التقديمات، وحل البلاغات." />
      <div className="mb-4 flex gap-2">
        {([
          ['jobs', `الوظائف (${jobs.length})`],
          ['applications', `التقديمات (${jobApplications.length})`],
          ['reports', `البلاغات (${jobsReports.length})`],
        ] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${tab === key ? 'bg-ink text-white' : 'border border-line bg-surface text-ink-2 hover:bg-paper'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'jobs' ? <DataTable columns={jobColumns} rows={jobs} rowKey={(j) => j.id} searchText={(j) => `${j.title} ${j.companyName}`} searchPlaceholder="دوّر بالوظيفة أو الشركة..." emptyMessage="لسه مفيش وظائف منشورة." /> : null}
      {tab === 'applications' ? <DataTable columns={appColumns} rows={jobApplications} rowKey={(a) => a.id} searchText={(a) => `${a.candidateName} ${a.jobTitle}`} searchPlaceholder="دوّر بالمتقدّم أو الوظيفة..." emptyMessage="لسه مفيش تقديمات." /> : null}
      {tab === 'reports' ? <DataTable columns={reportColumns} rows={jobsReports} rowKey={(r) => r.id} searchText={(r) => r.targetLabel} searchPlaceholder="دوّر..." emptyMessage="لسه مفيش بلاغات." /> : null}
    </div>
  );
}

export default JobsAdminPage;
