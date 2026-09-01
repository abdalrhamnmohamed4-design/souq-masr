import { Rocket } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui/PageHeader';
import { money } from '@/mock/utils';
import { useAdminStore } from '@/store/useAdminStore';

const TYPE_LABEL: Record<string, string> = {
  boost: 'رفع الإعلان',
  featured: 'إعلان مميز',
  vip: 'عضوية VIP',
  pinned: 'تثبيت أعلى القسم',
};

export function BoostPage() {
  const boostServices = useAdminStore((s) => s.boostServices);
  const updateBoostPrice = useAdminStore((s) => s.updateBoostPrice);
  const toggleBoostActive = useAdminStore((s) => s.toggleBoostActive);

  return (
    <div>
      <PageHeader
        title="الإعلانات المدفوعة"
        description="تحكّم في أسعار ومدة خدمات الرفع والتمييز — أي تعديل هنا بيتفعّل فورًا في التطبيق من غير تحديث."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {boostServices.map((service) => (
          <Card key={service.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-wash text-signal-2">
                  <Rocket size={16} />
                </span>
                <div>
                  <div className="font-display text-sm font-bold text-ink">{service.name}</div>
                  <div className="text-xs text-ink-3">{TYPE_LABEL[service.type]} · {service.durationLabel}</div>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={service.active}
                  onChange={() => toggleBoostActive(service.id)}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-line-2 transition-colors peer-checked:bg-verify" />
                <div className="absolute right-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:-translate-x-4" />
              </label>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <div className="flex flex-1 items-center gap-1 rounded-xl border border-line bg-paper px-3 py-2">
                <input
                  type="number"
                  value={service.priceEGP}
                  onChange={(e) => updateBoostPrice(service.id, Number(e.target.value) || 0)}
                  className="w-full bg-transparent font-display text-lg font-bold text-ink outline-none"
                />
                <span className="text-xs text-ink-3">ج.م</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-ink-3">السعر الحالي: {money(service.priceEGP)}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default BoostPage;
