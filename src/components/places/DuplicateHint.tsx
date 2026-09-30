import { Link } from 'react-router-dom'
import { formatDistance, reviewStatusLabel, type PossibleDuplicate } from '../../rules/places'
import { RULES } from '../../lib/constants'
import { cn } from '../../lib/cn'

/**
 * BR03 as advice instead of a refusal. The submitter sees this while the form
 * is still open — as they type the name or drag the pin in the map picker — so
 * they find out before they press submit, not after. The hard rule still runs
 * on submit: same name within 50 m is still rejected.
 *
 * `findPossibleDuplicate` (src/rules/places.ts) decides what to pass in.
 */
export function DuplicateHint({
  duplicate,
  className,
}: {
  duplicate: PossibleDuplicate | null
  className?: string
}) {
  if (!duplicate) return null

  const { place, distanceMeters, blocking } = duplicate

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'rounded-xl border px-3 py-2.5 text-xs',
        blocking
          ? 'border-red-300 bg-red-50 text-red-900'
          : 'border-amber-300 bg-amber-50 text-amber-900',
        className,
      )}
    >
      <p className="font-bold">
        {blocking
          ? 'This looks like a duplicate — submitting will be refused'
          : 'Possible duplicate — check before you submit'}
      </p>
      <p className="mt-1">
        “{place.name}” is {reviewStatusLabel(place.reviewStatus).toLowerCase()} and sits{' '}
        {formatDistance(distanceMeters)} from this pin.{' '}
        {blocking
          ? `A place with the same name within ${RULES.duplicateNameRadiusMeters} m counts as a duplicate (BR03), so change the name or move the pin.`
          : `That is outside the ${RULES.duplicateNameRadiusMeters} m duplicate radius, so you can still submit it — just check it is not the same spot.`}
      </p>
      <Link
        to={`/forum/${place.forumPostId}`}
        className={cn(
          'mt-1 inline-block font-bold underline',
          blocking ? 'text-red-900' : 'text-amber-900',
        )}
      >
        Open the existing suggestion
      </Link>
    </div>
  )
}
