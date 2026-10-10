import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';

export function SearchInput({ className = '', ...props }: ComponentProps<'input'>) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
      <input
        type="search"
        className="h-11 w-full rounded-xl border-0 bg-surface pr-3 pl-10 text-[0.9375rem] ring-1 ring-line ring-inset placeholder:text-ink-400 focus:ring-2 focus:ring-leaf-600 focus:outline-none"
        {...props}
      />
    </div>
  );
}
