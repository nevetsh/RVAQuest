import { Link } from 'react-router-dom'
import type { ForumPost } from '../../services/places.types'
import type { User } from '../../services/types'
import { useAppState } from '../../hooks/useAppState'
import { commentCount } from '../../rules/forum.moderation'
import { formatRelativeTime } from '../../lib/format'
import { PlaceStatusBadge } from '../places/PlaceStatusBadge'

/**
 * FR10 — the pinned "Suggestion box" pinned to the top of the Spot
 * Suggestions category. Every row is a place that was suggested through the
 * pipeline, with the moderator's review status beside it.
 */
export function SuggestionBox({ posts, viewer }: { posts: ForumPost[]; viewer: User }) {
  const places = useAppState().places

  return (
    <section className="rounded-2xl border-2 border-brand-200 bg-brand-50/60 p-4 shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-brand-900">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 17v5M9 3h6l-.7 4.2 3.2 3.3A5 5 0 0 1 19 14H5a5 5 0 0 1 1.5-3.5l3.2-3.3L9 3Z" strokeLinejoin="round" />
            </svg>
            Suggestion box
          </h2>
          <p className="mt-0.5 text-xs text-brand-800">
            Pinned to the top of Spot Suggestions. New places are reviewed by a moderator before they
            appear on the map.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-800">
            FR10
          </span>
          <Link
            to="/places/new?from=forum"
            className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-800"
          >
            New Spot Suggestion
          </Link>
        </div>
      </header>

      {posts.length === 0 ? (
        <p className="mt-3 rounded-xl bg-white px-3 py-4 text-center text-sm text-bark-500">
          No spot suggestions yet — tap “New Spot Suggestion” to add the first one.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {posts.map((post) => {
            const place = places.find((entry) => entry.id === post.placeId)

            return (
              <li key={post.id}>
                <Link
                  to={`/forum/${post.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-brand-200 bg-white px-3 py-2.5 transition hover:border-brand-400"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-bark-900">
                      {place?.name ?? post.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-bark-500">
                      {post.authorId === viewer.id ? 'Suggested by you' : post.title}
                      {place?.address ? ` · ${place.address}` : ''} ·{' '}
                      {formatRelativeTime(post.createdAt)}
                    </span>
                  </span>

                  {place ? <PlaceStatusBadge status={place.reviewStatus} /> : null}

                  <span className="text-xs font-semibold text-bark-500">
                    {commentCount(post, viewer)}{' '}
                    {commentCount(post, viewer) === 1 ? 'comment' : 'comments'}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
