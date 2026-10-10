import type { ReactNode } from 'react';

export interface ShareRow {
  id: string;
  label: ReactNode;
  value: ReactNode;
  share: number; // 0-100
  barClass: string;
}

// Horizontal bars showing each row's share of a total
export function ShareBars({ rows }: { rows: ShareRow[] }) {
  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.id}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-ink-900">{row.label}</span>
            <span className="shrink-0 text-ink-700 tabular">{row.value}</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-pasture-50">
            <div className={`h-full rounded-full ${row.barClass}`} style={{ width: `${Math.max(row.share, 1.5)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
