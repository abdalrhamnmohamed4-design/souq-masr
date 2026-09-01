import { useMemo } from 'react';
import {
  BadgeCheck,
  Eye,
  Flag,
  MessageSquare,
  Package,
  PackageX,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { Card, PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { SimpleBarChart, TrendArea } from '@/components/ui/Charts';
import { dau, newUsersDaily, revenueDaily, topCategories } from '@/mock/analytics';
import { useAdminStore } from '@/store/useAdminStore';

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function Dashboard() {
  const users = useAdminStore((s) => s.users);
  const listings = useAdminStore((s) => s.listings);
  const reports = useAdminStore((s) => s.reports);
  const payments = useAdminStore((s) => s.payments);
  const businesses = useAdminStore((s) => s.businesses);

  const stats = useMemo(() => {
    const newToday = users.filter((u) => daysSince(u.joinedAt) < 1).length;
    const newWeek = users.filter((u) => daysSince(u.joinedAt) < 7).length;
    const newMonth = users.filter((u) => daysSince(u.joinedAt) < 30).length;
    const totalViews = listings.reduce((s, l) => s + l.views, 0);
    const totalMessages = listings.reduce((s, l) => s + l.messagesCount, 0);
    const revenue30d = payments
      .filter((p) => p.status === 'success' && daysSince(p.createdAt) < 30)
      .reduce((s, p) => s + p.amount, 0);
    return {
      totalUsers: users.length,
      newToday,
      newWeek,
      newMonth,
      totalListings: listings.length,
      newListings: listings.filter((l) => daysSince(l.createdAt) < 7).length,
      pending: listings.filter((l) => l.status === 'pending').length,
      rejected: listings.filter((l) => l.status === 'rejected').length,
      soldClosed: listings.filter((l) => l.status === 'sold' || l.status === 'deleted').length,
      totalViews,
      totalMessages,
      openReports: reports.filter((r) => r.status === 'pending' || r.status === 'investigating').length,
      revenue30d,
      paidSubs: businesses.filter((b) => b.plan !== 'basic').length,
      featuredAds: listings.filter((l) => l.featured).length,
    };
  }, [users, listings, reports, payments, businesses]);

  return (
    <div>
      <PageHeader title="نظرة عامة" description="ملخّص أداء السوق في نظرة واحدة." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="إجمالي المستخدمين" value={stats.totalUsers.toLocaleString('en-US')} icon={Users} tone="ink" />
        <StatCard
          label="مستخدمون جدد (اليوم/أسبوع/شهر)"
          value={`${stats.newToday} / ${stats.newWeek} / ${stats.newMonth}`}
          icon={UserPlus}
          tone="verify"
        />
        <StatCard label="إجمالي الإعلانات" value={stats.totalListings.toLocaleString('en-US')} icon={Package} tone="ink" />
        <StatCard label="إعلانات جديدة (7 أيام)" value={stats.newListings.toLocaleString('en-US')} icon={Package} tone="signal" />
        <StatCard label="بانتظار المراجعة" value={stats.pending.toLocaleString('en-US')} icon={PackageX} tone="gold" />
        <StatCard label="إعلانات مرفوضة" value={stats.rejected.toLocaleString('en-US')} icon={XCircle} tone="danger" />
        <StatCard label="مباعة / مغلقة" value={stats.soldClosed.toLocaleString('en-US')} icon={BadgeCheck} tone="verify" />
        <StatCard label="إجمالي المشاهدات" value={stats.totalViews.toLocaleString('en-US')} icon={Eye} tone="ink" />
        <StatCard label="عدد المحادثات" value={stats.totalMessages.toLocaleString('en-US')} icon={MessageSquare} tone="ink" />
        <StatCard label="بلاغات مفتوحة" value={stats.openReports.toLocaleString('en-US')} icon={Flag} tone="danger" />
        <StatCard label="إيرادات آخر 30 يوم" value={stats.revenue30d.toLocaleString('en-US') + ' ج.م'} icon={Wallet} tone="gold" />
        <StatCard label="اشتراكات مدفوعة" value={stats.paidSubs.toLocaleString('en-US')} icon={BadgeCheck} tone="signal" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="مستخدمون نشطون يوميًا (30 يوم)" className="lg:col-span-2">
          <TrendArea data={dau} color="#0F1A2E" />
        </Card>
        <Card title="أكثر الأقسام مشاهدة">
          <SimpleBarChart data={topCategories.map((c) => ({ name: c.name, value: c.views }))} color="#F4511E" />
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="مستخدمون جدد يوميًا">
          <TrendArea data={newUsersDaily} color="#0E9469" />
        </Card>
        <Card title="الإيرادات اليومية">
          <TrendArea data={revenueDaily} color="#E0A106" />
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;
