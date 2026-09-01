import { NavLink } from 'react-router-dom';
import { canAccess } from '@/lib/access';
import { navGroups } from '@/lib/nav';
import { useAdminStore } from '@/store/useAdminStore';

export function Sidebar() {
  const role = useAdminStore((s) => s.currentAdmin.role);

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-l border-line bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="font-display text-xl font-black text-ink">
          سوق مصر<span className="text-signal">.</span>
        </span>
        <span className="rounded-md bg-line-2 px-1.5 py-0.5 text-[10px] font-bold text-ink-3">Admin</span>
      </div>

      <nav className="thin-scroll flex-1 overflow-y-auto px-3 pb-4">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => canAccess(role, item.key));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.title} className="mb-4">
              <div className="px-3 pb-2 text-[10.5px] font-bold text-ink-3">{group.title}</div>
              <div className="flex flex-col gap-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.key}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive ? 'bg-ink text-white' : 'text-ink-2 hover:bg-paper'
                      }`
                    }
                  >
                    <item.icon size={17} strokeWidth={2} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
