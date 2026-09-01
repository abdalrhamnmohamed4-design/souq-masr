import { Check, Eye, EyeOff, Star, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import Badge from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { Card, PageHeader } from '@/components/ui/PageHeader';
import { getCategory } from '@/mock/taxonomy/categories';
import { formatDate, money } from '@/mock/utils';

function categoryLabel(id: string): string {
  return getCategory(id)?.name ?? id;
}
import { useAdminStore } from '@/store/useAdminStore';
import type { AdminListing, ListingStatus } from '@/types';

const STATUS_TABS: { key: ListingStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'بانتظار المراجعة' },
  { key: 'approved', label: 'مقبولة' },
  { key: 'rejected', label: 'مرفوضة' },
  { key: 'sold', label: 'مباعة' },
  { key: 'expired', label: 'منتهية' },
  { key: 'deleted', label: 'محذوفة' },
];

function statusBadge(status: ListingStatus) {
  switch (status) {
    case 'pending':
      return <Badge tone="gold">بانتظار المراجعة</Badge>;
    case 'approved':
      return <Badge tone="verify">مقبول</Badge>;
    case 'rejected':
      return <Badge tone="danger">مرفوض</Badge>;
    case 'sold':
      return <Badge tone="info">مباع</Badge>;
    case 'expired':
      return <Badge tone="neutral">منتهي</Badge>;
    case 'deleted':
      return <Badge tone="danger">محذوف</Badge>;
  }
}

export function ListingsPage() {
  const listings = useAdminStore((s) => s.listings);
  const setListingStatus = useAdminStore((s) => s.setListingStatus);
  const toggleFeatured = useAdminStore((s) => s.toggleFeatured);
  const deleteListing = useAdminStore((s) => s.deleteListing);

  const [tab, setTab] = useState<ListingStatus | 'all'>('pending');
  const [detail, setDetail] = useState<AdminListing | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminListing | null>(null);

  const rows = useMemo(() => (tab === 'all' ? listings : listings.filter((l) => l.status === tab)), [listings, tab]);

  const columns: Column<AdminListing>[] = [
    {
      key: 'title',
      header: 'الإعلان',
      sortValue: (l) => l.title,
      render: (l) => (
        <div>
          <div className="flex items-center gap-1.5 font-semibold text-ink">
            {l.featured ? <Star size={13} className="fill-gold text-gold" /> : null}
            {l.title}
          </div>
          <div className="text-xs text-ink-3">
            {categoryLabel(l.categoryId)} · {l.sellerName}
          </div>
        </div>
      ),
    },
    { key: 'price', header: 'السعر', sortValue: (l) => l.price, render: (l) => money(l.price) },
    { key: 'location', header: 'الموقع', render: (l) => l.location },
    { key: 'views', header: 'المشاهدات', sortValue: (l) => l.views, render: (l) => l.views.toLocaleString('en-US') },
    { key: 'reports', header: 'بلاغات', sortValue: (l) => l.reportsCount, render: (l) => (l.reportsCount > 0 ? <Badge tone="danger">{l.reportsCount}</Badge> : '—') },
    { key: 'date', header: 'تاريخ النشر', sortValue: (l) => l.createdAt, render: (l) => formatDate(l.createdAt) },
    { key: 'status', header: 'الحالة', render: (l) => statusBadge(l.status) },
    {
      key: 'actions',
      header: '',
      align: 'left',
      render: (l) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => setDetail(l)} title="عرض" className="rounded-lg p-1.5 text-ink-3 hover:bg-paper hover:text-ink">
            <Eye size={15} />
          </button>
          {l.status === 'pending' ? (
            <>
              <button
                onClick={() => setListingStatus(l.id, 'approved')}
                title="قبول"
                className="rounded-lg p-1.5 text-ink-3 hover:bg-verify-wash hover:text-verify"
              >
                <Check size={15} />
              </button>
              <button
                onClick={() => setListingStatus(l.id, 'rejected')}
                title="رفض"
                className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger"
              >
                <X size={15} />
              </button>
            </>
          ) : null}
          <button
            onClick={() => toggleFeatured(l.id)}
            title={l.featured ? 'إلغاء التمييز' : 'تمييز'}
            className="rounded-lg p-1.5 text-ink-3 hover:bg-gold-wash hover:text-[#8A6300]"
          >
            <Star size={15} className={l.featured ? 'fill-gold text-gold' : ''} />
          </button>
          <button
            onClick={() => setListingStatus(l.id, l.status === 'deleted' ? 'approved' : 'deleted')}
            title={l.status === 'deleted' ? 'إظهار' : 'إخفاء'}
            className="rounded-lg p-1.5 text-ink-3 hover:bg-paper hover:text-ink"
          >
            {l.status === 'deleted' ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          <button onClick={() => setConfirmDelete(l)} title="حذف" className="rounded-lg p-1.5 text-ink-3 hover:bg-danger-wash hover:text-danger">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="الإعلانات" description={`${listings.length.toLocaleString('en-US')} إعلان على المنصة`} />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => {
          const count = t.key === 'all' ? listings.length : listings.filter((l) => l.status === t.key).length;
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

      <DataTable columns={columns} rows={rows} rowKey={(l) => l.id} searchText={(l) => `${l.title} ${l.sellerName}`} searchPlaceholder="دوّر بعنوان الإعلان أو اسم البائع..." pageSize={10} />

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title ?? ''}>
        {detail ? (
          <div className="space-y-4 text-sm">
            <Card className="!p-3">
              <p className="leading-7 text-ink-2">{detail.description}</p>
            </Card>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-paper p-3">
              <Info label="القسم" value={categoryLabel(detail.categoryId)} />
              <Info label="السعر" value={money(detail.price)} />
              <Info label="الموقع" value={detail.location} />
              <Info label="صاحب الإعلان" value={detail.sellerName} />
              <Info label="عدد الصور" value={String(detail.imagesCount)} />
              <Info label="عدد الرسائل" value={String(detail.messagesCount)} />
              <Info label="المفضلة" value={String(detail.favorites)} />
              <Info label="تاريخ النشر" value={formatDate(detail.createdAt)} />
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteListing(confirmDelete.id)}
        title="حذف الإعلان"
        description={`متأكد إنك عايز تحذف "${confirmDelete?.title}" نهائيًا؟`}
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
      <div className="font-medium text-ink">{value}</div>
    </div>
  );
}

export default ListingsPage;
