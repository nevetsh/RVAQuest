import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../hooks/useAppState'
import { usePlaces } from '../../hooks/usePlaces'
import { withdrawSubmittedPlace } from '../../services/places.service'
import { PlaceStatusBadge } from '../places/PlaceStatusBadge'
import { EmptyState } from '../ui/EmptyState'
import { formatRelativeTime } from '../../lib/dates'
import { pluralize } from '../../lib/format'

/**
 * FR05 — "my submissions and their statuses" on the profile: every place the
 * explorer has suggested, where it is in the review pipeline, and a link to
 * the forum post moderators decided on.
 *
 * While a suggestion is still pending its owner can edit it (same form, same
 * rules) or withdraw it. Withdrawn suggestions stay listed with their status
 * so the decision is on the record.
 */
export function MySubmissions() {
  const user = useCurrentUser()
  const places = usePlaces()

  const [feedback, setFeedback] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const mine = places
    .map((place, index) => ({ place, index }))
    .filter(({ place }) => place.submittedBy === user.id)
    .sort((a, b) => b.place.submittedAt.localeCompare(a.place.submittedAt) || b.index - a.index)
    .map(({ place }) => place)

  const approved = mine.filter((place) => place.reviewStatus === 'approved').length
  const pointsEarned = mine
    .filter((place) => place.pointsAwarded)
    .reduce((total, place) => total + place.points, 0)

  function withdraw(placeId: string, name: string) {
    const result = withdrawSubmittedPlace(user.id, placeId)
    setConfirmingId(null)
    setFeedback(
      result.ok
        ? `Withdrew “${name}”. It is no longer waiting for review.`
        : 'That suggestion could not be withdrawn.',
    )
  }

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-bark-900">My submissions</h2>
        <span className="text-xs font-semibold text-bark-500">
          FR05 · {pluralize(mine.length, 'suggestion')} · {approved} approved · {pointsEarned} pts
          earned
        </span>
      </header>

      {feedback ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-900"
        >
          {feedback}
        </p>
      ) : null}

      {mine.length === 0 ? (
        <EmptyState
          title="No suggestions yet"
          message="Spotted a trail, park or landmark that belongs on the map? Suggest it and track its review here."
          action={
            <Link
              to="/places/new?from=profile"
              className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Suggest a spot
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {mine.map((place) => {
            const pending = place.reviewStatus === 'pending'
            return (
              <li
                key={place.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-bark-200 bg-white px-4 py-3 shadow-card"
              >
                {/* Full width on phones so the name is not squeezed by the actions. */}
                <span className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <span className="block truncate text-sm font-semibold text-bark-900">
                    {place.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-bark-500">
                    {place.category} · {formatRelativeTime(place.submittedAt)}
                    {place.reviewNote ? ` · ${place.reviewNote}` : ''}
                  </span>
                  {place.editedAt ? (
                    <span className="mt-0.5 block text-xs font-semibold text-amber-800">
                      Edited {pluralize(place.editCount ?? 1, 'time')} · last edit{' '}
                      {formatRelativeTime(place.editedAt)}
                    </span>
                  ) : null}
                  {place.reviewStatus === 'withdrawn' && place.withdrawnAt ? (
                    <span className="mt-0.5 block text-xs text-bark-500">
                      Withdrawn {formatRelativeTime(place.withdrawnAt)}
                    </span>
                  ) : null}
                </span>

                {place.pointsAwarded ? (
                  <span className="text-xs font-bold text-brand-800">+{place.points} pts</span>
                ) : null}

                <PlaceStatusBadge status={place.reviewStatus} />

                {pending ? (
                  <span className="flex items-center gap-2">
                    <Link
                      to={`/places/new?edit=${place.id}`}
                      className="rounded-full border border-bark-200 px-2.5 py-1 text-xs font-bold text-bark-700 hover:border-brand-400"
                    >
                      Edit
                      <span className="sr-only"> {place.name}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(place.id)}
                      aria-expanded={confirmingId === place.id}
                      className="rounded-full border border-red-200 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                    >
                      Withdraw
                      <span className="sr-only"> {place.name}</span>
                    </button>
                  </span>
                ) : null}

                <Link
                  to={`/forum/${place.forumPostId}`}
                  className="text-xs font-bold text-brand-800 underline"
                >
                  Post
                </Link>

                {confirmingId === place.id ? (
                  <div
                    role="group"
                    aria-label={`Confirm withdrawing ${place.name}`}
                    className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2.5"
                  >
                    <p className="text-xs text-red-900">
                      Withdraw “{place.name}”? It leaves the moderator queue straight away, and you
                      would have to suggest it again.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        autoFocus
                        onClick={() => withdraw(place.id, place.name)}
                        className="rounded-full bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800"
                      >
                        Yes, withdraw it
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="rounded-full border border-bark-200 bg-white px-3 py-1.5 text-xs font-bold text-bark-700 hover:border-brand-400"
                      >
                        Keep it pending
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
