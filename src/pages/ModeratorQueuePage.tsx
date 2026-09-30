import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppState, useCurrentUser } from '../hooks/useAppState'
import { usePlaces } from '../hooks/usePlaces'
import { usePageTitle } from '../hooks/usePageTitle'
import { reviewPlace } from '../services/places.service'
import { canReviewPlaces } from '../rules/permissions'
import { PlaceStatusBadge } from '../components/places/PlaceStatusBadge'
import { LazyQuestMap } from '../components/map/LazyQuestMap'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDateTime, formatRelativeTime } from '../lib/dates'
import { FOCUSED_MAP_ZOOM } from '../lib/constants'
import { pluralize } from '../lib/format'
import type { Place } from '../services/places.types'

/**
 * FR09 — moderator queue for suggested places. Approve puts the place on the
 * map and pays the submitter once; reject keeps it off the map and awards no
 * points, with an optional reason that the forum post shows.
 */
export function ModeratorQueuePage() {
  const user = useCurrentUser()
  const users = useAppState().users
  const places = usePlaces()

  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  usePageTitle('Moderation queue')

  // Phase 6: the same capability ladder as the Admin console decides this, so
  // managers and administrators can work the queue too (the console links here).
  if (!canReviewPlaces(user)) {
    return (
      <EmptyState
        title="Reviewers only"
        message="Approving suggested places is for moderators, managers and administrators. Switch to Dana Whitfield (Moderator) in the Dev tools drawer to work the queue."
        action={
          <Link
            to="/profile"
            className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Back to profile
          </Link>
        }
      />
    )
  }

  const pending = places
    .filter((place) => place.reviewStatus === 'pending')
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))

  // Withdrawn suggestions were never reviewed by a moderator, so they stay out
  // of the "recently reviewed" list (their owner sees them on the profile).
  const reviewed = places
    .filter((place) => place.reviewStatus === 'approved' || place.reviewStatus === 'rejected')
    .sort((a, b) => (b.reviewedAt ?? b.submittedAt).localeCompare(a.reviewedAt ?? a.submittedAt))
    .slice(0, 6)

  function userName(id: string): string {
    return users.find((entry) => entry.id === id)?.name ?? 'Explorer'
  }

  function approve(place: Place) {
    const result = reviewPlace(place.id, user.id, 'approve')
    if (!result.ok) {
      if (result.error === 'withdrawn') {
        setFeedback(
          `${userName(place.submittedBy)} withdrew “${place.name}”, so it is no longer in the queue.`,
        )
      }
      return
    }
    setFeedback(
      `Approved “${place.name}”. It now shows on the map, and ${userName(
        place.submittedBy,
      )} earns ${place.points} pts — awarded once.`,
    )
    setRejectingId(null)
    setReason('')
  }

  function reject(place: Place) {
    const result = reviewPlace(place.id, user.id, 'reject', reason)
    if (!result.ok) {
      if (result.error === 'withdrawn') {
        setFeedback(
          `${userName(place.submittedBy)} withdrew “${place.name}”, so it is no longer in the queue.`,
        )
      }
      return
    }
    setFeedback(
      `Rejected “${place.name}”. No points were awarded${
        reason.trim() ? ', and the forum post shows your reason.' : ', and no reason was recorded.'
      }`,
    )
    setRejectingId(null)
    setReason('')
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <h1 className="text-xl font-extrabold tracking-tight text-bark-900 md:text-2xl">
          Moderation queue
        </h1>
        <p className="text-xs text-bark-500 md:text-sm">
          {pluralize(pending.length, 'suggested place')} waiting. Approving adds it to the map and
          pays the submitter once; rejecting awards no points (FR05, FR09).
        </p>
      </header>

      {feedback ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900"
        >
          {feedback}
        </div>
      ) : null}

      {pending.length === 0 ? (
        <EmptyState
          title="All caught up"
          message="There are no places waiting for review. New suggestions from the map or the forum land here."
          action={
            <Link
              to="/forum?cat=spot-suggestions"
              className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Open Spot Suggestions
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {pending.map((place) => {
            const rejecting = rejectingId === place.id
            return (
              <li
                key={place.id}
                className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card md:p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-bark-900">{place.name}</h2>
                  <PlaceStatusBadge status={place.reviewStatus} />
                  <Badge tone="brand">{place.category}</Badge>
                  {place.editCount ? (
                    <Badge tone="warning">
                      Edited {pluralize(place.editCount, 'time')} since it was filed
                    </Badge>
                  ) : null}
                </div>

                <p className="mt-1 text-xs text-bark-500">
                  Suggested by {userName(place.submittedBy)} · {formatRelativeTime(place.submittedAt)}
                  {place.address ? ` · ${place.address}` : ''}
                </p>

                {place.editedAt ? (
                  <p className="mt-1 text-xs font-semibold text-amber-800">
                    The submitter changed this suggestion{' '}
                    {formatRelativeTime(place.editedAt)} — check the new details before deciding.
                  </p>
                ) : null}

                {place.description ? (
                  <p className="mt-2 text-sm text-bark-700">{place.description}</p>
                ) : null}

                <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
                  <LazyQuestMap
                    className="h-44"
                    quests={[]}
                    places={[place]}
                    center={place.location}
                    zoom={FOCUSED_MAP_ZOOM}
                    interactive={false}
                  />

                  <div className="space-y-2 text-xs text-bark-500">
                    <p>
                      Pin: {place.location.lat.toFixed(6)}, {place.location.lng.toFixed(6)}
                    </p>
                    <p>Submitted {formatDateTime(place.submittedAt)}</p>
                    {place.editedAt ? (
                      <p>Last edited {formatDateTime(place.editedAt)}</p>
                    ) : null}
                    <p>
                      Reward: <span className="font-bold text-bark-700">{place.points} pts on approval</span>
                    </p>
                    <Link
                      to={`/forum/${place.forumPostId}`}
                      className="inline-block font-bold text-brand-800 underline"
                    >
                      Open the forum post
                    </Link>
                  </div>
                </div>

                {rejecting ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                    <label htmlFor={`reject-reason-${place.id}`} className="block text-xs font-bold text-red-900">
                      Reason for rejection <span className="font-normal">(optional — shown on the post)</span>
                    </label>
                    <textarea
                      id={`reject-reason-${place.id}`}
                      rows={2}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="e.g. Already covered by another place pin"
                      className="mt-1 w-full resize-y rounded-xl border border-red-200 px-3 py-2 text-sm text-bark-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button variant="danger" size="sm" onClick={() => reject(place)}>
                        Confirm rejection
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRejectingId(null)
                          setReason('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-bark-100 pt-3">
                    <Button size="sm" onClick={() => approve(place)}>
                      Approve place
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setRejectingId(place.id)
                        setReason('')
                        setFeedback(null)
                      }}
                    >
                      Reject…
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {reviewed.length > 0 ? (
        <section className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card">
          <h2 className="text-sm font-bold text-bark-900">Recently reviewed</h2>
          <ul className="mt-3 divide-y divide-bark-100">
            {reviewed.map((place) => (
              <li key={place.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="text-sm font-semibold text-bark-900">{place.name}</span>
                <PlaceStatusBadge status={place.reviewStatus} />
                <span className="text-xs text-bark-500">
                  by {userName(place.submittedBy)}
                  {place.reviewNote ? ` · ${place.reviewNote}` : ''}
                </span>
                <Link
                  to={`/forum/${place.forumPostId}`}
                  className="ml-auto text-xs font-bold text-brand-800 underline"
                >
                  Post
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
