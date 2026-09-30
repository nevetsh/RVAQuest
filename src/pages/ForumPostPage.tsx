import { Link, useParams } from 'react-router-dom'
import { useAppState, useCurrentUser } from '../hooks/useAppState'
import { forumCategoryLabel } from '../services/places.types'
import { isModerator, openReportsForPost } from '../rules/forum.moderation'
import { formatRelativeTime } from '../lib/dates'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { PlaceStatusBadge } from '../components/places/PlaceStatusBadge'
import { AuthorLine } from '../components/forum/AuthorLine'
import { CommentList } from '../components/forum/CommentList'
import { PostActions } from '../components/forum/PostActions'

/** FR01 — one thread: the post, its comments and the moderation actions. */
export function ForumPostPage() {
  const { postId } = useParams()
  const state = useAppState()
  const viewer = useCurrentUser()

  const post = state.forumPosts.find((entry) => entry.id === postId)

  if (!post) {
    return (
      <EmptyState
        title="Post not found"
        message="This thread may have been removed, or the link is out of date."
        action={
          <Link
            to="/forum"
            className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Back to the forum
          </Link>
        }
      />
    )
  }

  const isMod = isModerator(viewer)
  const hiddenFromViewer = !!post.removed && !isMod
  const place = post.placeId
    ? state.places.find((entry) => entry.id === post.placeId)
    : undefined
  const openReportCount = openReportsForPost(state.forumReports, post.id).length

  return (
    <div className="space-y-4">
      <Link to="/forum" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-800">
        <span aria-hidden="true">‹</span> All posts
      </Link>

      <article className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={post.category === 'achievements' ? 'brand' : 'neutral'}>
            {forumCategoryLabel(post.category)}
          </Badge>
          {post.pinned ? <Badge tone="success">Pinned</Badge> : null}
          {post.removed ? <Badge tone="warning">Removed by a moderator</Badge> : null}
          {isMod && openReportCount > 0 ? (
            <Badge tone="warning">
              {openReportCount} open {openReportCount === 1 ? 'report' : 'reports'}
            </Badge>
          ) : null}
        </div>

        <h1 className="mt-2 text-lg font-extrabold tracking-tight text-bark-900 sm:text-xl">
          {post.title}
        </h1>
        <AuthorLine userId={post.authorId} createdAt={post.createdAt} className="mt-2" />

        {hiddenFromViewer ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <h2 className="text-sm font-bold text-red-800">This post was removed by a moderator</h2>
            <p className="mt-1 text-sm text-red-700">
              The content is hidden from explorers. A moderator closed the report after taking it
              down.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-bark-700">
              {post.body}
            </p>

            {isMod && post.removed ? (
              <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                Removed by {post.removedBy}
                {post.removedReason ? ` — ${post.removedReason}` : ''} · still visible to moderators
              </p>
            ) : null}
          </>
        )}

        {place && !hiddenFromViewer ? (
          <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/60 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-brand-800">
                Suggested spot
              </span>
              <PlaceStatusBadge status={place.reviewStatus} />
            </div>
            <p className="mt-1 text-sm font-semibold text-bark-900">{place.name}</p>
            <p className="text-xs text-bark-600">
              {place.category}
              {place.address ? ` · ${place.address}` : ''}
            </p>
            {place.reviewNote ? (
              <p className="mt-1 text-xs text-bark-600">Moderator note: {place.reviewNote}</p>
            ) : null}
            {place.editedAt ? (
              <p className="mt-1 text-xs text-bark-600">
                Edited by the submitter {formatRelativeTime(place.editedAt)} — the details above are
                the latest version.
              </p>
            ) : null}
            {place.reviewStatus === 'withdrawn' ? (
              <p className="mt-1 text-xs text-bark-600">
                Withdrawn by the submitter
                {place.withdrawnAt ? ` ${formatRelativeTime(place.withdrawnAt)}` : ''} — this spot is
                no longer under review.
              </p>
            ) : null}
            <Link
              to={`/quests?q=${encodeURIComponent(place.name)}`}
              className="mt-1.5 inline-block text-xs font-semibold text-brand-800 hover:underline"
            >
              See it on the quest list
            </Link>
          </div>
        ) : null}

        <div className="mt-4 border-t border-bark-100 pt-3">
          <PostActions post={post} viewer={viewer} />
        </div>
      </article>

      {hiddenFromViewer ? (
        <p className="rounded-2xl border border-dashed border-bark-200 bg-white/70 p-4 text-xs text-bark-500">
          Comments on removed posts stay hidden too.
        </p>
      ) : (
        <CommentList post={post} viewer={viewer} />
      )}
    </div>
  )
}
