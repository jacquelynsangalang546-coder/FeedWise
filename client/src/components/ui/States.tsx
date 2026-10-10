import { CloudOff, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

const SKELETON_KEYS = ['sk-a', 'sk-b', 'sk-c', 'sk-d', 'sk-e', 'sk-f', 'sk-g', 'sk-h'];

// Skeleton shown while data loads (no blank screens)
export function LoadingState({ rows = 4, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      {SKELETON_KEYS.slice(0, rows).map((key) => (
        <div key={key} className="h-14 animate-pulse rounded-xl bg-pasture-100/60" />
      ))}
      <span className="sr-only">{label}...</span>
    </div>
  );
}

export function ErrorState({ message, onRetry, title = 'Could not load this data' }: { message: string; onRetry?: () => void; title?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl bg-barn-50/60 px-6 py-10 text-center ring-1 ring-barn-100">
      <CloudOff className="size-9 text-barn-500" aria-hidden />
      <h3 className="mt-3 text-lg font-semibold text-barn-700">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-ink-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry} icon={<RotateCw className="size-4" />}>
          Try again
        </Button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-grain-50 text-grain-600 ring-1 ring-grain-100">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-pasture-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-500">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
