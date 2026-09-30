import { Link } from 'react-router-dom'
import { useAppState, useCurrentUser } from '../../hooks/useAppState'
import { reviewPlace } from '../../services/places.service'
import { recordAudit } from '../../services/admin'
import { canModerateForum, canReviewPlaces } from '../../rules/permissions'
import { openReports, sortReports } from '../../rules/forum.moderation'
import { formatRelativeTime, pluralize } from '../../lib/format'
import { PlaceStatusBadge } from '../places/PlaceStatusBadge'
import { Badge } from '../ui/Badge'

/**
 * Phase 6 — the content desk. Everything user-generated passes through here:
 * suggested places waiting on a decision and the forum reports. The place
 * review itself reuses the same rule as the moderator screen, so an admin
 * cannot award points twice.
 */
export function AdminContent() {
  const state = useAppState()
  const viewer = useCurrentUser()

  const pendingPlaces = state.places.filter((place) => place.reviewStatus === 'pending')
  const reports = sortReports(openReports(state.forumReports))
  const mayReview = canReviewPlaces(viewer)
  const mayModerate = canModerateForum(viewer)

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-bark-900">Suggested places</h2>
            <p className="text-xs text-bark-500">
              {pluralize(pendingPlaces.length, 'place')} waiting · approval awards the submitter{' '}
              {state.settings.placeApprovalPoints} points, once.
            </p>
          </div>
          <Link
            to="/moderator"
            className="rounded-full border border-bark-200 px-3 py-1.5 text-xs font-bold text-bark-700 transition hover:border-brand-400"
          >
            Full review screen
          </Link>
        </div>

        {!mayReview ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Read-only: reviewing places needs the Moderator role.
          </p>
        ) : null}

        {pendingPlaces.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-bark-200 px-3 py-4 text-center text-sm text-bark-500">
            Nothing waiting on review.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pendingPlaces.map((place) => {
              const submitter = state.users.find((user) => user.id === place.submittedBy)

              return (
                <li
                  key={place.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-bark-900">{place.name}</span>
                      <PlaceStatusBadge status={place.reviewStatus} />
                    </div>
                    <p className="mt-0.5 text-xs text-bark-600">
                      {place.category}
                      {place.address ? ` · ${place.address}` : ''} · suggested by{' '}
                      {submitter?.name ?? place.submittedBy} {formatRelativeTime(place.submittedAt)}
                    </p>
                    {place.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-bark-500">{place.description}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!mayReview}
                      onClick={() => {
                        const result = reviewPlace(place.id, viewer.id, 'approve')
                        if (result.ok) {
                          recordAudit(
                            viewer.id,
                            'place-approved',
                            result.pointsAwarded
                              ? `Place “${place.name}” was approved and its submitter credited.`
                              : `Place “${place.name}” was approved (points already awarded).`,
                          )
                        }
                      }}
                      className="rounded-full bg-brand-700 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-brand-800 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={!mayReview}
                      onClick={() => {
                        if (reviewPlace(place.id, viewer.id, 'reject', 'Rejected from the admin console.').ok) {
                          recordAudit(
                            viewer.id,
                            'place-rejected',
                            `Place “${place.name}” was rejected from the admin console.`,
                          )
                        }
                      }}
                      className="rounded-full border border-red-300 px-2.5 py-1 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <Link
                      to={`/forum/${place.forumPostId}`}
                      className="rounded-full px-2.5 py-1 text-xs font-semibold text-brand-800 hover:bg-brand-50"
                    >
                      Forum post
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-amber-300 bg-amber-50/50 p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-amber-900">Reported forum items</h2>
            <p className="text-xs text-amber-800">
              {pluralize(reports.length, 'open report')} · removing content closes its reports.
            </p>
          </div>
          <Link
            to="/forum"
            className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
          >
            Work the queue
          </Link>
        </div>

        {!mayModerate ? (
          <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-amber-800">
            Read-only: handling reports needs the Moderator role.
          </p>
        ) : null}

        {reports.length === 0 ? (
          <p className="mt-3 rounded-xl bg-white px-3 py-4 text-center text-sm text-bark-500">
            The queue is clear.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {reports.slice(0, 6).map((report) => {
              const post = state.forumPosts.find((entry) => entry.id === report.postId)

              return (
                <li key={report.id} className="rounded-xl border border-amber-200 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={report.target === 'reply' ? 'neutral' : 'warning'}>
                      {report.target === 'reply' ? 'Comment' : 'Post'}
                    </Badge>
                    <Link
                      to={`/forum/${report.postId}`}
                      className="min-w-0 flex-1 truncate text-sm font-semibold text-bark-900 hover:text-brand-800"
                    >
                      {post?.title ?? 'Post no longer available'}
                    </Link>
                    <span className="text-[11px] text-bark-500">
                      {formatRelativeTime(report.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-bark-600">
                    <span className="font-semibold text-bark-800">{report.reason}</span>
                    {report.details ? ` — ${report.details}` : ''}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
