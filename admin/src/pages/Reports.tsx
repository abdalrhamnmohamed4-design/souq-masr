import { CheckCircle2, SearchCheck, XCircle } from 'lucide-react';
import { useState } from 'react';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatDateTime } from '@/mock/utils';
import { useAdminStore } from '@/store/useAdminStore';
import type { Report, ReportStatus, ReportType } from '@/types';

const TYPE_LABELS: Record<ReportType, string> = {
  scam: 'نصب',
  fake_listing: 'إعلان وهمي',
  fake_price: 'سعر غير حقيقي',
  prohibited_item: 'منتج ممنوع',
  inappropriate_images: 'صور غير مناسبة',
  duplicate: 'تكرار إعلان',
  spam: 'Spam',
  suspicious_account: 'حساب مشبوه',
};

const STATUS_TONE: Record<ReportStatus, BadgeTone> = {
  pending: 'gold',
  investigating: 'info',
  resolved: 'verify',
  dismissed: 'neutral',
};
const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: 'بانتظار المراجعة',
  investigating: 'تحت التحقيق',
  resolved: 'تم الحل',
  dismissed: 'مرفوض',
};

export function ReportsPage() {
  const reports = useAdminStore((s) => s.reports);
  const setReportStatus = useAdminStore((s) => s.setReportStatus);
  const [tab, setTab] = useState<ReportStatus | 'all'>('pending');

  const rows = tab === 'all' ? reports : reports.filter((r) => r.status === tab);

  const columns: Column<Report>[] = [
    { key: 'type', header: 'نوع البلاغ', render: (r) => TYPE_LABELS[r.type] },
    {
      key: 'target',
      header: 'العنصر المبلّغ عنه',
      render: (r) => (
        <div>
          <div className="font-semibold text-ink">{r.targetLabel}</div>
          <div className="text-xs text-ink-3">{r.targetType === 'listing' ? 'إعلان' : r.targetType === 'user' ? 'مستخدم' : 'محادثة'}</div>
        </div>
      ),
    },
    { key: 'reporter', header: 'المبلّغ', render: (r) => r.reporterName },
    { key: 'date', header: 'التاريخ', sortValue: (r) => r.createdAt, render: (r) => formatDateTime(r.createdAt) },
    { key: 'status', header: 'الحالة', render: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'left',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          {r.status !== 'investigating' && r.status !== 'resolved' ? (
            <button
              onClick={() => setReportStatus(r.id, 'investigating')}
              title="بدء التحقيق"
              className="rounded-lg p-1.5 text-ink-3 hover:bg-info-wash hover:text-info"
            >
              <SearchCheck size={15} />
            </button>
          ) : null}
          <button
            onClick={() => setReportStatus(r.id, 'resolved')}
            title="تم الحل"
            className="rounded-lg p-1.5 text-ink-3 hover:bg-verify-wash hover:text-verify"
          >
            <CheckCircle2 size={15} />
          </button>
          <button
            onClick={() => setReportStatus(r.id, 'dismissed')}
            title="رفض البلاغ"
            className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger"
          >
            <XCircle size={15} />
          </button>
        </div>
      ),
    },
  ];

  const tabs: { key: ReportStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'pending', label: 'بانتظار المراجعة' },
    { key: 'investigating', label: 'تحت التحقيق' },
    { key: 'resolved', label: 'تم الحل' },
    { key: 'dismissed', label: 'مرفوضة' },
  ];

  return (
    <div>
      <PageHeader title="البلاغات والشكاوى" description="دورة البلاغ: استلام ← تحقيق ← إجراء ← إغلاق." />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const count = t.key === 'all' ? reports.length : reports.filter((r) => r.status === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                tab === t.key ? 'bg-ink text-white' : 'border border-line bg-surface text-ink-2 hover:bg-paper'
              }`}
            >
              {t.label} · {count}
            </button>
          );
        })}
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} searchText={(r) => `${r.targetLabel} ${r.reporterName}`} searchPlaceholder="دوّر بالعنصر أو اسم المبلّغ..." pageSize={12} />
    </div>
  );
}

export default ReportsPage;
