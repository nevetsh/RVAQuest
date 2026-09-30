import { cn } from '../../lib/cn'

/** FR01 — one like per user per post/comment, toggleable. */
export function LikeButton({
  liked,
  count,
  onToggle,
  disabled = false,
  className,
}: {
  liked: boolean
  count: number
  onToggle: () => void
  disabled?: boolean
  className?: string
}) {
  const label = liked ? 'Unlike' : 'Like'

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={liked}
      aria-label={`${label} (${count})`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition',
        liked
          ? 'border-brand-300 bg-brand-50 text-brand-800'
          : 'border-bark-200 text-bark-600 hover:border-brand-300 hover:text-brand-800',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path
          d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7 2.7C19 15.6 12 20 12 20Z"
          strokeLinejoin="round"
        />
      </svg>
      {count}
    </button>
  )
}
