import { Link } from 'react-router-dom'
import type { ForumPost } from '../../services/places.types'
import { forumCategoryLabel } from '../../services/places.types'
import type { User } from '../../services/types'
import { Badge } from '../ui/Badge'
import { AuthorLine } from './AuthorLine'
import { PostActions } from './PostActions'
import { isModerator } from '../../rules/forum.moderation'
// Forum rules live in rules/forum.moderation.ts (the moderation half).
import { cn } from '../../lib/cn'

function excerpt(body: string, limit = 180): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  return flat.length > limit ? `${flat.slice(0, limit).trimEnd()}…` : flat
}

export function PostCard({
  post,
  viewer,
  openReportCount = 0,
  className,
}: {
  post: ForumPost
  viewer: User
  openReportCount?: number
  className?: string
}) {
  const isMod = isModerator(viewer)

  return (
    <article
      className={cn(
        'rounded-2xl border bg-white p-4 shadow-card',
        post.removed ? 'border-red-200 bg-red-50/60' : 'border-bark-200 hover:border-brand-400',
        className,
      )}
    >
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

      <Link to={`/forum/${post.id}`} className="mt-2 block focus-visible:outline-none">
        <h3 className="text-base font-bold text-bark-900 hover:text-brand-800">{post.title}</h3>
        <p className="mt-1 text-sm text-bark-600">{excerpt(post.body)}</p>
      </Link>

      <AuthorLine userId={post.authorId} createdAt={post.createdAt} className="mt-3" />

      {post.removed && isMod && post.removedReason ? (
        <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs text-red-700">
          Reason: {post.removedReason}
        </p>
      ) : null}

      <div className="mt-3 border-t border-bark-100 pt-3">
        <PostActions post={post} viewer={viewer} showCommentsLink />
      </div>
    </article>
  )
}
