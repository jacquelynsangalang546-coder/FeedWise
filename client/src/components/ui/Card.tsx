import type { ComponentProps, ReactNode } from 'react';

export function Card({ className = '', children, ...props }: ComponentProps<'div'>) {
  return (
    <div className={`min-w-0 rounded-2xl bg-surface shadow-card ring-1 ring-line/70 ${className}`} {...props}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-pasture-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
