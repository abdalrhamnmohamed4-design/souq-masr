import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import { SimpleBarChart } from '@/components/ui/Charts';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Card, PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { formatDateTime, money } from '@/mock/utils';
import { useAdminStore } from '@/store/useAdminStore';
import type { Payment, PaymentStatus, PaymentType } from '@/types';
import { CircleDollarSign, TrendingDown, Wallet, XCircle } from 'lucide-react';

const TYPE_LABEL: Record<PaymentType, string> = {
  boost: 'رفع إعلان',
  featured: 'تمييز',
  subscription: 'اشتراك',
  topup: 'شحن رصيد',
  refund: 'استرجاع',
};
const STATUS_TONE: Record<PaymentStatus, BadgeTone> = {
  success: 'verify',
  failed: 'danger',
  refunded: 'gold',
  pending: 'info',
};
const STATUS_LABEL: Record<PaymentStatus, string> = {
  success: 'ناجحة',
  failed: 'فشلت',
  refunded: 'مسترجعة',
  pending: 'معلّقة',
};

function toCSV(rows: Payment[]) {
  const header = ['id', 'user', 'amount', 'type', 'status', 'method', 'date'].join(',');
  const lines = rows.map((p) => [p.id, p.userName, p.amount, p.type, p.status, p.method, p.createdAt].join(','));
  return [header, ...lines].join('\n');
}

export function PaymentsPage() {
  const payments = useAdminStore((s) => s.payments);
  const [typeFilter, setTypeFilter] = useState<PaymentType | 'all'>('all');

  const rows = typeFilter === 'all' ? payments : payments.filter((p) => p.type === typeFilter);

  const stats = useMemo(() => {
    const success = payments.filter((p) => p.status === 'success');
    const failed = payments.filter((p) => p.status === 'failed').length;
    const refunded = payments.filter((p) => p.status === 'refunded').reduce((s, p) => s + Math.abs(p.amount), 0);
    return {
      total: success.reduce((s, p) => s + p.amount, 0),
      failed,
      refunded,
      count: payments.length,
    };
  }, [payments]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments) {
      if (p.status !== 'success' || !p.category) continue;
      map.set(p.category, (map.get(p.category) ?? 0) + p.amount);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [payments]);

  const byLocation = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments) {
      if (p.status !== 'success' || !p.location) continue;
      map.set(p.location, (map.get(p.location) ?? 0) + p.amount);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [payments]);

  const columns: Column<Payment>[] = [
    { key: 'user', header: 'المستخدم', sortValue: (p) => p.userName, render: (p) => p.userName },
    { key: 'type', header: 'النوع', render: (p) => TYPE_LABEL[p.type] },
    { key: 'amount', header: 'المبلغ', sortValue: (p) => p.amount, render: (p) => money(p.amount) },
    { key: 'method', header: 'الوسيلة', render: (p) => p.method },
    { key: 'status', header: 'الحالة', render: (p) => <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge> },
    { key: 'date', header: 'التاريخ', sortValue: (p) => p.createdAt, render: (p) => formatDateTime(p.createdAt) },
  ];

  const downloadCSV = () => {
    const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payments.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="المدفوعات والإيرادات"
        description="كل المعاملات المالية على المنصة."
        actions={
          <button onClick={downloadCSV} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-ink hover:bg-paper">
            <Download size={15} /> تصدير CSV
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="إجمالي الإيرادات" value={money(stats.total)} icon={CircleDollarSign} tone="verify" />
        <StatCard label="عدد المعاملات" value={stats.count.toLocaleString('en-US')} icon={Wallet} tone="ink" />
        <StatCard label="معاملات فاشلة" value={stats.failed.toLocaleString('en-US')} icon={XCircle} tone="danger" />
        <StatCard label="إجمالي المسترجع" value={money(stats.refunded)} icon={TrendingDown} tone="gold" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="الإيرادات حسب القسم">
          <SimpleBarChart data={byCategory} color="#0F1A2E" />
        </Card>
        <Card title="الإيرادات حسب المحافظة">
          <SimpleBarChart data={byLocation} color="#F4511E" />
        </Card>
      </div>

      <div className="mt-4 mb-3 flex flex-wrap gap-2">
        {(['all', 'boost', 'featured', 'subscription', 'topup', 'refund'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              typeFilter === t ? 'bg-ink text-white' : 'border border-line bg-surface text-ink-2 hover:bg-paper'
            }`}
          >
            {t === 'all' ? 'كل الأنواع' : TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} searchText={(p) => p.userName} searchPlaceholder="دوّر باسم المستخدم..." pageSize={12} />
    </div>
  );
}

export default PaymentsPage;
