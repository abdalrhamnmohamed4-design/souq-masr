import { BadgeCheck, Ban, Eye, ShieldCheck, Trash2, UserCheck } from 'lucide-react';
import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, type Column } from '@/components/ui/DataTable';
import type { MarketplaceUser } from '@/types';
import { useAdminStore } from '@/store/useAdminStore';
import { formatDate, formatDateTime } from '@/mock/utils';

function riskTone(score: number): 'verify' | 'gold' | 'danger' {
  if (score >= 60) return 'danger';
  if (score >= 30) return 'gold';
  return 'verify';
}

function statusBadge(status: MarketplaceUser['status']) {
  if (status === 'active') return <Badge tone="verify">نشط</Badge>;
  if (status === 'suspended') return <Badge tone="gold">موقوف مؤقتًا</Badge>;
  return <Badge tone="danger">محظور</Badge>;
}

export function UsersPage() {
  const users = useAdminStore((s) => s.users);
  const setUserStatus = useAdminStore((s) => s.setUserStatus);
  const toggleVerified = useAdminStore((s) => s.toggleVerified);
  const deleteUser = useAdminStore((s) => s.deleteUser);

  const [detail, setDetail] = useState<MarketplaceUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MarketplaceUser | null>(null);

  const columns: Column<MarketplaceUser>[] = [
    {
      key: 'name',
      header: 'المستخدم',
      sortValue: (u) => u.name,
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink font-display text-xs font-bold text-white">
            {u.name.slice(0, 2)}
          </span>
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-ink">
              {u.name}
              {u.verified ? <ShieldCheck size={13} className="text-verify" /> : null}
            </div>
            <div className="text-xs text-ink-3">{u.city}</div>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'الموبايل', render: (u) => <span dir="ltr">{u.phone}</span> },
    { key: 'ads', header: 'الإعلانات', sortValue: (u) => u.adsCount, render: (u) => u.adsCount },
    { key: 'reports', header: 'البلاغات', sortValue: (u) => u.reportsAgainst, render: (u) => u.reportsAgainst },
    {
      key: 'risk',
      header: 'Risk Score',
      sortValue: (u) => u.riskScore,
      render: (u) => <Badge tone={riskTone(u.riskScore)}>{u.riskScore}</Badge>,
    },
    { key: 'joined', header: 'تاريخ التسجيل', sortValue: (u) => u.joinedAt, render: (u) => formatDate(u.joinedAt) },
    { key: 'status', header: 'الحالة', render: (u) => statusBadge(u.status) },
    {
      key: 'actions',
      header: '',
      align: 'left',
      render: (u) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            title="عرض الملف"
            onClick={() => setDetail(u)}
            className="rounded-lg p-1.5 text-ink-3 hover:bg-paper hover:text-ink"
          >
            <Eye size={15} />
          </button>
          {u.status === 'active' ? (
            <button
              title="إيقاف مؤقت"
              onClick={() => setUserStatus(u.id, 'suspended')}
              className="rounded-lg p-1.5 text-ink-3 hover:bg-gold-wash hover:text-[#8A6300]"
            >
              <Ban size={15} />
            </button>
          ) : (
            <button
              title="إعادة تفعيل"
              onClick={() => setUserStatus(u.id, 'active')}
              className="rounded-lg p-1.5 text-ink-3 hover:bg-verify-wash hover:text-verify"
            >
              <UserCheck size={15} />
            </button>
          )}
          {u.status !== 'banned' ? (
            <button
              title="حظر نهائي"
              onClick={() => setUserStatus(u.id, 'banned')}
              className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger"
            >
              <Ban size={15} />
            </button>
          ) : null}
          <button
            title="حذف الحساب"
            onClick={() => setConfirmDelete(u)}
            className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="المستخدمون" description={`${users.length.toLocaleString('en-US')} مستخدم مسجّل على المنصة`} />
      <DataTable
        columns={columns}
        rows={users}
        rowKey={(u) => u.id}
        searchText={(u) => `${u.name} ${u.phone} ${u.email}`}
        searchPlaceholder="دوّر بالاسم أو الموبايل أو الإيميل..."
        pageSize={12}
      />

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? detail.name : ''} width="max-w-md">
        {detail ? (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink font-display text-base font-bold text-white">
                {detail.name.slice(0, 2)}
              </span>
              <div>
                <div className="flex items-center gap-1.5 font-display font-bold text-ink">
                  {detail.name}
                  {detail.verified ? <BadgeCheck size={15} className="text-verify" /> : null}
                </div>
                <div className="text-xs text-ink-3">{detail.city}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-paper p-3">
              <Info label="الموبايل" value={detail.phone} />
              <Info label="الإيميل" value={detail.email} />
              <Info label="عدد الإعلانات" value={String(detail.adsCount)} />
              <Info label="إجمالي المشاهدات" value={detail.viewsTotal.toLocaleString('en-US')} />
              <Info label="البلاغات عليه" value={String(detail.reportsAgainst)} />
              <Info label="Risk Score" value={String(detail.riskScore)} />
              <Info label="تاريخ التسجيل" value={formatDate(detail.joinedAt)} />
              <Info label="آخر نشاط" value={formatDateTime(detail.lastActiveAt)} />
            </div>
            <button
              onClick={() => toggleVerified(detail.id)}
              className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-ink hover:bg-paper"
            >
              {detail.verified ? 'إلغاء التوثيق' : 'توثيق الحساب'}
            </button>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteUser(confirmDelete.id)}
        title="حذف الحساب"
        description={`متأكد إنك عايز تحذف حساب "${confirmDelete?.name}" نهائيًا؟ الإجراء ده مش قابل للتراجع.`}
        confirmLabel="حذف نهائي"
        danger
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-ink-3">{label}</div>
      <div className="font-medium text-ink" dir="auto">
        {value}
      </div>
    </div>
  );
}

export default UsersPage;
