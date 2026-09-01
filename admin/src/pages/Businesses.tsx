import { Ban, BadgeCheck, UserCheck } from 'lucide-react';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatDate } from '@/mock/utils';
import { useAdminStore } from '@/store/useAdminStore';
import type { BusinessAccount, BusinessPlan } from '@/types';

const PLAN_LABEL: Record<BusinessPlan, string> = { basic: 'Basic', pro: 'Pro', business: 'Business' };
const PLAN_TONE: Record<BusinessPlan, BadgeTone> = { basic: 'neutral', pro: 'info', business: 'gold' };

export function BusinessesPage() {
  const businesses = useAdminStore((s) => s.businesses);
  const setBusinessStatus = useAdminStore((s) => s.setBusinessStatus);

  const columns: Column<BusinessAccount>[] = [
    {
      key: 'name',
      header: 'التاجر',
      sortValue: (b) => b.name,
      render: (b) => (
        <div>
          <div className="flex items-center gap-1.5 font-semibold text-ink">
            {b.name}
            {b.verified ? <BadgeCheck size={13} className="text-verify" /> : null}
          </div>
          <div className="text-xs text-ink-3">{b.ownerName} · {b.category}</div>
        </div>
      ),
    },
    { key: 'plan', header: 'الباقة', render: (b) => <Badge tone={PLAN_TONE[b.plan]}>{PLAN_LABEL[b.plan]}</Badge> },
    { key: 'ends', header: 'ينتهي الاشتراك', sortValue: (b) => b.subscriptionEndsAt, render: (b) => formatDate(b.subscriptionEndsAt) },
    { key: 'listings', header: 'الإعلانات', sortValue: (b) => b.listingsCount, render: (b) => b.listingsCount },
    { key: 'leads', header: 'Leads', sortValue: (b) => b.leadsCount, render: (b) => b.leadsCount },
    {
      key: 'status',
      header: 'الحالة',
      render: (b) => (b.status === 'active' ? <Badge tone="verify">نشط</Badge> : <Badge tone="danger">موقوف</Badge>),
    },
    {
      key: 'actions',
      header: '',
      align: 'left',
      render: (b) => (
        <button
          onClick={() => setBusinessStatus(b.id, b.status === 'active' ? 'suspended' : 'active')}
          title={b.status === 'active' ? 'إيقاف الحساب' : 'إعادة التفعيل'}
          className={`rounded-lg p-1.5 text-ink-3 ${b.status === 'active' ? 'hover:bg-danger-wash hover:text-danger' : 'hover:bg-verify-wash hover:text-verify'}`}
        >
          {b.status === 'active' ? <Ban size={15} /> : <UserCheck size={15} />}
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="الحسابات التجارية" description="المحلات والشركات المسجّلة بحساب Business." />
      <DataTable columns={columns} rows={businesses} rowKey={(b) => b.id} searchText={(b) => `${b.name} ${b.ownerName}`} searchPlaceholder="دوّر باسم المتجر أو صاحبه..." pageSize={10} />
    </div>
  );
}

export default BusinessesPage;
