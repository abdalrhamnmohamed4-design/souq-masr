import { Check, X } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { Card, PageHeader } from '@/components/ui/PageHeader';
import { adminAccounts, ROLE_LABELS, ROLE_SECTION_ACCESS } from '@/mock/adminAccounts';
import { allNavItems } from '@/lib/nav';
import { formatDateTime } from '@/mock/utils';
import type { AdminRole } from '@/types';

const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  super_admin: 'كل الصلاحيات — إدارة كاملة للنظام والمشرفين.',
  moderator: 'مراجعة الإعلانات والبلاغات ومراقبة المحادثات.',
  finance: 'المدفوعات والإيرادات والتسعير والحسابات التجارية.',
  support: 'دعم المستخدمين ومتابعة البلاغات.',
  marketing: 'الإشعارات والبانرات وأكواد الخصم والتحليلات.',
};

export function AdminUsersPage() {
  const roles = Object.keys(ROLE_LABELS) as AdminRole[];

  return (
    <div>
      <PageHeader title="المشرفون والصلاحيات" description="ماينفعش كل موظف يشوف كل حاجة — كل دور له صلاحيات محددة." />

      <Card title="حسابات المشرفين" className="mb-4">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-line-2 text-right text-xs text-ink-3">
                <th className="px-3 py-2">المشرف</th>
                <th className="px-3 py-2">الدور</th>
                <th className="px-3 py-2">آخر دخول</th>
                <th className="px-3 py-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {adminAccounts.map((a) => (
                <tr key={a.id} className="border-b border-line-2 last:border-b-0">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink font-display text-xs font-bold text-white">{a.initials}</span>
                      <div>
                        <div className="font-medium text-ink">{a.name}</div>
                        <div className="text-xs text-ink-3" dir="ltr">{a.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone="info">{ROLE_LABELS[a.role]}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-ink-2">{formatDateTime(a.lastLogin)}</td>
                  <td className="px-3 py-2.5">{a.active ? <Badge tone="verify">نشط</Badge> : <Badge tone="neutral">موقوف</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="مصفوفة الصلاحيات">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line-2 text-right text-xs text-ink-3">
                <th className="px-3 py-2">القسم</th>
                {roles.map((r) => (
                  <th key={r} className="px-3 py-2 text-center">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allNavItems.map((item) => (
                <tr key={item.key} className="border-b border-line-2 last:border-b-0">
                  <td className="flex items-center gap-2 px-3 py-2.5 text-ink-2">
                    <item.icon size={14} className="text-ink-3" />
                    {item.label}
                  </td>
                  {roles.map((r) => {
                    const allowed = ROLE_SECTION_ACCESS[r].includes('*') || ROLE_SECTION_ACCESS[r].includes(item.key);
                    return (
                      <td key={r} className="px-3 py-2.5 text-center">
                        {allowed ? <Check size={15} className="mx-auto text-verify" /> : <X size={15} className="mx-auto text-ink-3/40" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => (
          <Card key={r} className="!p-4">
            <div className="font-display text-sm font-bold text-ink">{ROLE_LABELS[r]}</div>
            <p className="mt-1.5 text-xs leading-6 text-ink-3">{ROLE_DESCRIPTIONS[r]}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default AdminUsersPage;
