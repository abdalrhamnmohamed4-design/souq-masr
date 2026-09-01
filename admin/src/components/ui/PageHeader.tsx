import type { ReactNode } from 'react';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-xl font-extrabold text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-3">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, children, actions, className = '' }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-5 shadow-sm ${className}`}>
      {title ? (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-ink">{title}</h3>
          {actions}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export default PageHeader;
