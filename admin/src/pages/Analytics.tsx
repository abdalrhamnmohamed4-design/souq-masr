import { Activity, Eye, TrendingUp, UserPlus } from 'lucide-react';
import { SimpleBarChart, TrendArea } from '@/components/ui/Charts';
import { Card, PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import {
  dau,
  newListingsDaily,
  newUsersDaily,
  retention,
  topCategories,
  topLocations,
  topSellers,
} from '@/mock/analytics';

export function AnalyticsPage() {
  return (
    <div>
      <PageHeader title="التحليلات" description="مؤشرات نمو المستخدمين والإعلانات والسوق ككل." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="مستخدمون نشطون يوميًا (تجريبي)" value={retention.dau.toLocaleString('en-US')} icon={Activity} tone="ink" />
        <StatCard label="مستخدمون نشطون شهريًا" value={retention.mau.toLocaleString('en-US')} icon={TrendingUp} tone="verify" />
        <StatCard label="مستخدمون جدد (30 يوم) (تجريبي)" value={retention.newUsers30d.toLocaleString('en-US')} icon={UserPlus} tone="signal" />
        <StatCard label="إجمالي المشاهدات (تقديري)" value={(retention.dau * 14).toLocaleString('en-US')} icon={Eye} tone="gold" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="المستخدمون النشطون (DAU) — 30 يوم">
          <DemoDataNote />
          <TrendArea data={dau} color="#0F1A2E" />
        </Card>
        <Card title="إعلانات جديدة يوميًا">
          <DemoDataNote />
          <TrendArea data={newListingsDaily} color="#F4511E" />
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="أكثر الأقسام مشاهدة">
          <SimpleBarChart data={topCategories.map((c) => ({ name: c.name, value: c.views }))} color="#F4511E" />
        </Card>
        <Card title="أكثر البائعين نشاطًا">
          <SimpleBarChart data={topSellers.map((s) => ({ name: s.name, value: s.views }))} color="#0F1A2E" />
        </Card>
        <Card title="أفضل المحافظات أداءً">
          <SimpleBarChart data={topLocations.map((l) => ({ name: l.name, value: l.count }))} color="#0E9469" />
        </Card>
      </div>

      <div className="mt-4">
        <Card title="نمو المستخدمين الجدد">
          <DemoDataNote />
          <TrendArea data={newUsersDaily} color="#0E9469" />
        </Card>
      </div>
    </div>
  );
}

/** الشارت ده شكل اتجاه تجريبي (seeded random walk) مش بيانات مستخدمين
 * حقيقية — لسه مفيش تتبّع تاريخي فعلي للأحداث في الأرشيتكتشر ده (فرق عن
 * "أكتر الأقسام مشاهدة"/"أكتر البائعين نشاطًا" اللي فعلاً مبنية على بيانات
 * حقيقية). هيتشال أول ما يتوصّل باك إند بيسجّل الأحداث تاريخيًا. */
function DemoDataNote() {
  return <p className="mb-2 text-[11px] text-ink-3">بيانات تجريبية توضيحية — مش أرقام حقيقية بعد (محتاجة تتبّع تاريخي من الباك إند)</p>;
}

export default AnalyticsPage;
