'use client';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total?: number;
  onChange: (nextPage: number) => void;
  compact?: boolean;
}

const buildVisiblePages = (page: number, totalPages: number) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const visible = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  return Array.from(visible)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
};

export const PaginationControls = ({
  page,
  totalPages,
  total,
  onChange,
  compact = false,
}: PaginationControlsProps) => {
  if (totalPages <= 1) return null;
  const visiblePages = buildVisiblePages(page, totalPages);

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ? 'text-xs' : 'text-sm'}`}>
      <div className="text-slate-500">
        Page {page} of {totalPages}
        {typeof total === 'number' ? ` | ${total} total` : ''}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
        >
          Previous
        </button>

        {visiblePages.map((p, i) => {
          const prev = visiblePages[i - 1];
          const showGap = i > 0 && prev && p - prev > 1;

          return (
            <span key={p} className="inline-flex items-center gap-1.5">
              {showGap && <span className="px-1 text-slate-400">...</span>}
              <button
                type="button"
                onClick={() => onChange(p)}
                className={`min-w-8 h-8 px-2 rounded-md border text-xs font-semibold ${
                  p === page
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            </span>
          );
        })}

        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};
