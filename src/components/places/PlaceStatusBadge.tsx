import { cn } from '../../lib/cn'
import { reviewStatusLabel } from '../../rules/places'
import type { PlaceReviewStatus } from '../../services/places.types'
import type { ReviewStatus } from '../../services/types'

/** Quests use `ReviewStatus`; places add "withdrawn". */
type BadgeStatus = ReviewStatus | PlaceReviewStatus

const STYLES: Record<BadgeStatus, string> = {
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-bark-100 text-bark-700',
}

const DOT_STYLES: Record<BadgeStatus, string> = {
  pending: 'bg-amber-500',
  approved: 'bg-emerald-600',
  rejected: 'bg-red-600',
  withdrawn: 'bg-bark-400',
}

export function PlaceStatusBadge({
  status,
  className,
}: {
  status: BadgeStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
        STYLES[status],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT_STYLES[status])} aria-hidden="true" />
      {reviewStatusLabel(status)}
    </span>
  )
}
