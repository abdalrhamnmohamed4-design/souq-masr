import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { adminAccounts, ROLE_LABELS } from '@/mock/adminAccounts';
import { useAdminStore } from '@/store/useAdminStore';

export function Topbar() {
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const setCurrentAdmin = useAdminStore((s) => s.setCurrentAdmin);
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-line bg-surface px-6">
      <div className="text-sm text-ink-3">
        متصفّح كـ <span className="font-semibold text-ink">{ROLE_LABELS[currentAdmin.role]}</span> — للتجربة فقط، هيتحول
        لتسجيل دخول حقيقي مع الباك إند.
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2.5 rounded-xl border border-line bg-paper py-1.5 pr-1.5 pl-3 hover:bg-line-2"
        >
          <span className="text-sm font-semibold text-ink">{currentAdmin.name}</span>
          <ChevronDown size={14} className="text-ink-3" />
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink font-display text-xs font-bold text-white">
            {currentAdmin.initials}
          </span>
        </button>
        {open ? (
          <div className="absolute left-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
            {adminAccounts.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  setCurrentAdmin(a.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-right text-sm hover:bg-paper ${
                  a.id === currentAdmin.id ? 'bg-paper' : ''
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink font-display text-xs font-bold text-white">
                  {a.initials}
                </span>
                <span className="flex-1">
                  <span className="block font-medium text-ink">{a.name}</span>
                  <span className="block text-xs text-ink-3">{ROLE_LABELS[a.role]}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export default Topbar;
