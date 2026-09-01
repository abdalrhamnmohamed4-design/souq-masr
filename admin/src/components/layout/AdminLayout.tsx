import { ShieldAlert } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { canAccess } from '@/lib/access';
import { allNavItems } from '@/lib/nav';
import { useAdminStore } from '@/store/useAdminStore';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AdminLayout() {
  const role = useAdminStore((s) => s.currentAdmin.role);
  const location = useLocation();

  const currentItem = allNavItems.find((i) => (i.path === '/' ? location.pathname === '/' : location.pathname.startsWith(i.path)));
  const allowed = !currentItem || canAccess(role, currentItem.key);

  return (
    <div className="flex h-screen bg-paper" dir="rtl">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="thin-scroll flex-1 overflow-y-auto p-6">
          {allowed ? (
            <Outlet />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-wash text-danger">
                <ShieldAlert size={26} />
              </div>
              <h2 className="font-display text-lg font-bold text-ink">مفيش صلاحية</h2>
              <p className="max-w-xs text-sm text-ink-3">
                دورك الحالي مالوش صلاحية يشوف القسم ده. بدّل الحساب من الأعلى أو ارجع للرئيسية.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
