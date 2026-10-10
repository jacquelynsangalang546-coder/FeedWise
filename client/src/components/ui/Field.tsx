import type { ComponentProps, ReactNode } from 'react';

const control =
  'block w-full rounded-xl border-0 bg-surface px-3.5 text-[0.9375rem] text-ink-900 ring-1 ring-line ring-inset placeholder:text-ink-400 transition-shadow focus:ring-2 focus:ring-leaf-600 focus:outline-none disabled:bg-canvas disabled:text-ink-500 aria-[invalid=true]:ring-barn-500';

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

// Label + control + hint + per-field error message
export function Field({ label, htmlFor, error, hint, required, children, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink-700">
        {label}
        {required && <span className="ml-0.5 text-barn-600" aria-hidden>*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-sm text-barn-600" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-sm text-ink-500">{hint}</p>
      )}
    </div>
  );
}

export function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return <input className={`${control} h-11 read-only:bg-canvas read-only:text-ink-500 ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }: ComponentProps<'select'>) {
  return (
    <select className={`${control} h-11 pr-9 ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return <textarea className={`${control} min-h-24 py-2.5 ${className}`} {...props} />;
}

// Small helper so every input links to its error message for screen readers
export const errorProps = (id: string, error?: string) =>
  error ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {};
