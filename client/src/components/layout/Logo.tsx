// FeedWise mark: a grain stalk on a rounded tile
export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#173A2A" />
      <path d="M16 25V11" stroke="#F2C14E" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M16 15c-3.5 0-5.5-2-6-5 3.5 0 5.5 2 6 5Zm0 0c3.5 0 5.5-2 6-5-3.5 0-5.5 2-6 5Zm0 5c-3.5 0-5.5-2-6-5 3.5 0 5.5 2 6 5Zm0 0c3.5 0 5.5-2 6-5-3.5 0-5.5 2-6 5Z"
        fill="#F2C14E"
      />
    </svg>
  );
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={`font-display text-xl font-bold tracking-tight ${inverted ? 'text-white' : 'text-pasture-900'}`}>
        FeedWise
      </span>
    </span>
  );
}
