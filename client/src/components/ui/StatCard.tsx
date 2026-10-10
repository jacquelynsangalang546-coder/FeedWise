import type { ReactNode } from 'react';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: ReactNode;
  footnote?: ReactNode;
  icon: ReactNode;
  tone?: 'leaf' | 'grain' | 'barn' | 'pasture';
}

const iconTones = {
  leaf: 'bg-leaf-50 text-leaf-600',
  grain: 'bg-grain-50 text-grain-600',
  barn: 'bg-barn-50 text-barn-600',
  pasture: 'bg-pasture-50 text-pasture-800',
};

export function StatCard({ label, value, footnote, icon, tone = 'leaf' }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <span className={`flex size-9 items-center justify-center rounded-xl ${iconTones[tone]}`}>{icon}</span>
      </div>
      <p className="mt-2 font-display text-[1.75rem] leading-none font-bold text-pasture-900 tabular">{value}</p>
      {footnote && <div className="mt-2 text-sm text-ink-500">{footnote}</div>}
    </Card>
  );
}
