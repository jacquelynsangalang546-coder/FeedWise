import type { ReactNode } from 'react';
import type { CategoryColor, ExpiryStatus, SaleStatus, StockStatus } from '../../types';

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'teal' | 'rose' | 'slate';

const tones: Record<Tone, string> = {
  green: 'bg-leaf-50 text-leaf-700 ring-leaf-100',
  amber: 'bg-grain-50 text-grain-700 ring-grain-100',
  red: 'bg-barn-50 text-barn-700 ring-barn-100',
  blue: 'bg-sky-50 text-sky-800 ring-sky-100',
  violet: 'bg-violet-50 text-violet-800 ring-violet-100',
  teal: 'bg-teal-50 text-teal-800 ring-teal-100',
  rose: 'bg-rose-50 text-rose-800 ring-rose-100',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export function Badge({ tone = 'slate', children, dot = false }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${tones[tone]}`}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const categoryTone: Record<CategoryColor, Tone> = {
  green: 'green',
  amber: 'amber',
  blue: 'blue',
  rose: 'rose',
  violet: 'violet',
  teal: 'teal',
  slate: 'slate',
};

export function CategoryBadge({ name, color }: { name: string; color: CategoryColor }) {
  return <Badge tone={categoryTone[color]}>{name}</Badge>;
}

const stockLabels: Record<StockStatus, { tone: Tone; label: string }> = {
  ok: { tone: 'green', label: 'In stock' },
  low: { tone: 'amber', label: 'Low stock' },
  out: { tone: 'red', label: 'Out of stock' },
};

export function StockBadge({ status }: { status: StockStatus }) {
  const { tone, label } = stockLabels[status];
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}

export function ExpiryBadge({ status }: { status: ExpiryStatus }) {
  if (status === 'expired') return <Badge tone="red">Expired</Badge>;
  if (status === 'near-expiry') return <Badge tone="amber">Expiring soon</Badge>;
  return null;
}

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  return status === 'completed' ? <Badge tone="green">Completed</Badge> : <Badge tone="red">Voided</Badge>;
}

export const categoryDotClass: Record<CategoryColor, string> = {
  green: 'bg-leaf-500',
  amber: 'bg-grain-400',
  blue: 'bg-sky-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  teal: 'bg-teal-500',
  slate: 'bg-slate-400',
};

export const categoryHex: Record<CategoryColor, string> = {
  green: '#38935e',
  amber: '#e0a92e',
  blue: '#0ea5e9',
  rose: '#e11d48',
  violet: '#8b5cf6',
  teal: '#14b8a6',
  slate: '#94a3b8',
};
