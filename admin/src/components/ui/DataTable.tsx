import { ChevronLeft, ChevronRight, ChevronsUpDown, Search } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  width?: string;
  align?: 'right' | 'left' | 'center';
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  searchText?: (row: T) => string;
  pageSize?: number;
  emptyMessage?: string;
  toolbarExtra?: ReactNode;
  onRowClick?: (row: T) => void;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  searchPlaceholder = 'دوّر...',
  searchText,
  pageSize = 10,
  emptyMessage = 'مفيش بيانات تتعرض هنا.',
  toolbarExtra,
  onRowClick,
}: Props<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query.trim() || !searchText) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((r) => searchText(r).toLowerCase().includes(q));
  }, [rows, query, searchText]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'ar');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  return (
    <div className="rounded-2xl border border-line bg-surface shadow-sm">
      {(searchText || toolbarExtra) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-line-2 p-3">
          {searchText ? (
            <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2">
              <Search size={15} className="text-ink-3" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
              />
            </div>
          ) : null}
          {toolbarExtra}
          <span className="text-xs text-ink-3">{sorted.length.toLocaleString('en-US')} نتيجة</span>
        </div>
      )}

      <div className="thin-scroll overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-2 text-right">
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={{ width: c.width }}
                  className={`px-4 py-3 text-xs font-semibold text-ink-3 ${c.align === 'left' ? 'text-left' : c.align === 'center' ? 'text-center' : 'text-right'}`}
                >
                  {c.sortValue ? (
                    <button
                      onClick={() => toggleSort(c.key)}
                      className="inline-flex items-center gap-1 hover:text-ink"
                    >
                      {c.header}
                      <ChevronsUpDown size={12} className={sortKey === c.key ? 'text-signal' : 'text-ink-3'} />
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-ink-3">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-line-2 last:border-b-0 ${onRowClick ? 'cursor-pointer hover:bg-paper' : ''}`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 align-middle text-ink-2 ${c.align === 'left' ? 'text-left' : c.align === 'center' ? 'text-center' : 'text-right'}`}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-line-2 px-4 py-3">
          <span className="text-xs text-ink-3">
            صفحة {page} من {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DataTable;
