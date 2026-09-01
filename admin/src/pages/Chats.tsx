import { CheckCircle2, MessageSquareWarning, XCircle } from 'lucide-react';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Card, PageHeader } from '@/components/ui/PageHeader';
import { formatDateTime } from '@/mock/utils';
import { useAdminStore } from '@/store/useAdminStore';
import type { ReportedChat, ReportStatus } from '@/types';

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

export function ChatsPage() {
  const reportedChats = useAdminStore((s) => s.reportedChats);
  const setChatStatus = useAdminStore((s) => s.setChatStatus);

  const columns: Column<ReportedChat>[] = [
    {
      key: 'parties',
      header: 'الأطراف',
      render: (c) => (
        <div>
          <div className="font-semibold text-ink">
            {c.buyerName} ↔ {c.sellerName}
          </div>
          <div className="text-xs text-ink-3">{c.listingTitle}</div>
        </div>
      ),
    },
    { key: 'reason', header: 'سبب البلاغ', render: (c) => c.reason },
    {
      key: 'keywords',
      header: 'كلمات مرصودة',
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.flaggedKeywords.map((k) => (
            <Badge key={k} tone="danger">
              {k}
            </Badge>
          ))}
        </div>
      ),
    },
    { key: 'date', header: 'تاريخ البلاغ', sortValue: (c) => c.reportedAt, render: (c) => formatDateTime(c.reportedAt) },
    { key: 'status', header: 'الحالة', render: (c) => <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'left',
      render: (c) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => setChatStatus(c.id, 'resolved')} title="تم الحل" className="rounded-lg p-1.5 text-ink-3 hover:bg-verify-wash hover:text-verify">
            <CheckCircle2 size={15} />
          </button>
          <button onClick={() => setChatStatus(c.id, 'dismissed')} title="تجاهل" className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger">
            <XCircle size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="مراقبة المحادثات"
        description="مش قراءة عشوائية للمحادثات — النظام بيدير البلاغات المرتبطة بالشات بس (كلمات نصب مرصودة، Spam، حسابات محظورة)."
      />
      <Card className="mb-4 flex items-center gap-3 !py-3 text-sm text-ink-2">
        <MessageSquareWarning size={18} className="text-signal-2" />
        محادثات فيها كلمات مشبوهة أو بلاغات بيتم رصدها هنا تلقائيًا للمراجعة.
      </Card>
      <DataTable
        columns={columns}
        rows={reportedChats}
        rowKey={(c) => c.id}
        searchText={(c) => `${c.buyerName} ${c.sellerName} ${c.listingTitle}`}
        searchPlaceholder="دوّر بالأطراف أو اسم الإعلان..."
        pageSize={10}
      />
    </div>
  );
}

export default ChatsPage;
