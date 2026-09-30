import { Link } from 'react-router-dom'
import type { ForumPost } from '../../services/places.types'
import type { User } from '../../services/types'
import { useAppState } from '../../hooks/useAppState'
import {
  removeForumPost,
  reportForumContent,
  setForumPostPinned,
  toggleForumPostLike,
} from '../../services/forum.moderation'
import {
  canPinPost,
  canRemovePost,
  canReport,
  commentCount,
  isLikedBy,
  likeCount,
} from '../../rules/forum.moderation'
import { LikeButton } from './LikeButton'
import { ModerationControls } from './ModerationControls'
import { ReportButton } from './ReportButton'

/** The like / comment / report / moderate row shared by the list and detail screens. */
export function PostActions({
  post,
  viewer,
  showCommentsLink = false,
}: {
  post: ForumPost
  viewer: User
  showCommentsLink?: boolean
}) {
  const reports = useAppState().forumReports

  return (
    <div className="flex flex-wrap items-center gap-2">
      <LikeButton
        liked={isLikedBy(post, viewer.id)}
        count={likeCount(post)}
        onToggle={() => toggleForumPostLike(post.id, viewer.id)}
      />

      {showCommentsLink ? (
        <Link
          to={`/forum/${post.id}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-bark-200 px-2.5 py-1 text-xs font-semibold text-bark-600 transition hover:border-brand-300 hover:text-brand-800"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.4-4.2A8 8 0 1 1 21 12Z" strokeLinejoin="round" />
          </svg>
          {commentCount(post, viewer)}
        </Link>
      ) : null}

      <ReportButton
        canReport={canReport(post, viewer.id, reports, { target: 'post', postId: post.id })}
        disabledReason={
          post.authorId === viewer.id ? 'You cannot report your own post.' : 'Already reported.'
        }
        targetLabel="post"
        onSubmit={({ reason, details }) => {
          const result = reportForumContent({
            reporterId: viewer.id,
            target: 'post',
            postId: post.id,
            reason,
            details,
          })

          return result.ok
            ? { ok: true }
            : { ok: false, message: 'message' in result ? result.message : 'Pick a reason first.' }
        }}
      />

      <ModerationControls
        canRemove={canRemovePost(post, viewer)}
        canPin={canPinPost(post, viewer)}
        pinned={!!post.pinned}
        targetLabel="post"
        onRemove={() => removeForumPost(post.id, viewer.id, 'Removed by a moderator.')}
        onTogglePin={() => setForumPostPinned(post.id, viewer.id, !post.pinned)}
      />
    </div>
  )
}
