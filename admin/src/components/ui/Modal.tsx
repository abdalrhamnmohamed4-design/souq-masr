import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[85vh] w-full ${width} overflow-y-auto rounded-2xl bg-surface p-5 shadow-2xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-3 hover:bg-paper hover:text-ink">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'تأكيد',
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-sm">
      <p className="text-sm leading-7 text-ink-2">{description}</p>
      <div className="mt-5 flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl border border-line py-2.5 text-sm font-semibold text-ink hover:bg-paper"
        >
          إلغاء
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white ${danger ? 'bg-danger' : 'bg-signal'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default Modal;
