import { cn } from '../../lib/cn'

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4 animate-spin text-current', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function MapSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-brand-50 text-sm font-medium text-brand-800',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="flex items-center gap-2">
        <Spinner />
        Loading map…
      </span>
    </div>
  )
}
