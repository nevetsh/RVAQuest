import { useState } from 'react'
import type { ForumPost } from '../../services/places.types'
import type { User } from '../../services/types'
import { useAppState } from '../../hooks/useAppState'
import {
  publishForumComment,
  removeForumReply,
  reportForumContent,
  toggleForumReplyLike,
} from '../../services/forum.moderation'
import {
  canComment,
  canRemoveReply,
  canReport,
  isLikedBy,
  likeCount,
  visibleReplies,
} from '../../rules/forum.moderation'
import { FORUM_LIMITS } from '../../lib/constants'
import { AuthorLine } from './AuthorLine'
import { LikeButton } from './LikeButton'
import { ModerationControls } from './ModerationControls'
import { ReportButton } from './ReportButton'
import { cn } from '../../lib/cn'

/** FR01 — comments on a post, plus the composer at the bottom. */
export function CommentList({ post, viewer }: { post: ForumPost; viewer: User }) {
  const reports = useAppState().forumReports
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const comments = visibleReplies(post, viewer)
  const canWrite = canComment(post, viewer)

  function submit() {
    const result = publishForumComment(post.id, viewer.id, body)

    if (!result.ok) {
      setError(result.errors.body ?? 'That comment could not be published.')
      return
    }

    setBody('')
    setError(null)
    setNotice('Comment published.')
    window.setTimeout(() => setNotice(null), 2500)
  }

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-bark-900">
          {comments.length === 0 ? 'Comments' : `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`}
        </h2>
        <span className="text-xs font-semibold text-bark-500">FR01</span>
      </header>

      {comments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-bark-200 bg-white/70 px-4 py-6 text-center text-sm text-bark-500">
          No comments yet — be the first to reply.
        </p>
      ) : (
        <ul className="space-y-2">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className={cn(
                'rounded-2xl border bg-white p-3 shadow-card',
                comment.removed ? 'border-red-200 bg-red-50/60' : 'border-bark-200',
              )}
            >
              <AuthorLine userId={comment.authorId} createdAt={comment.createdAt} size="sm" />
              <p className="mt-2 whitespace-pre-line text-sm text-bark-700">{comment.body}</p>
              {comment.removed ? (
                <p className="mt-2 text-xs font-semibold text-red-700">
                  Removed by a moderator{comment.removedReason ? ` — ${comment.removedReason}` : ''}.
                </p>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <LikeButton
                  liked={isLikedBy(comment, viewer.id)}
                  count={likeCount(comment)}
                  onToggle={() => toggleForumReplyLike(post.id, comment.id, viewer.id)}
                />

                <ReportButton
                  canReport={canReport(comment, viewer.id, reports, {
                    target: 'reply',
                    postId: post.id,
                    replyId: comment.id,
                  })}
                  disabledReason={
                    comment.authorId === viewer.id
                      ? 'You cannot report your own comment.'
                      : 'Already reported.'
                  }
                  targetLabel="comment"
                  onSubmit={({ reason, details }) => {
                    const result = reportForumContent({
                      reporterId: viewer.id,
                      target: 'reply',
                      postId: post.id,
                      replyId: comment.id,
                      reason,
                      details,
                    })

                    return result.ok
                      ? { ok: true }
                      : {
                          ok: false,
                          message: 'message' in result ? result.message : 'Pick a reason first.',
                        }
                  }}
                />

                <ModerationControls
                  canRemove={canRemoveReply(comment, viewer)}
                  targetLabel="comment"
                  onRemove={() => removeForumReply(post.id, comment.id, viewer.id, 'Reported comment.')}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {canWrite ? (
        <div className="rounded-2xl border border-bark-200 bg-white p-3 shadow-card">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-bark-500">
              Add a comment
            </span>
            <textarea
              value={body}
              onChange={(event) => {
                setBody(event.target.value)
                setError(null)
              }}
              rows={3}
              maxLength={FORUM_LIMITS.comment}
              placeholder="Share a tip or answer the question."
              className="mt-1 w-full rounded-xl border border-bark-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>

          {error ? (
            <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-bark-500">
              {body.trim().length}/{FORUM_LIMITS.comment} · checked by the banned-word filter
            </span>
            <div className="flex items-center gap-2">
              {notice ? <span className="text-xs font-semibold text-brand-700">{notice}</span> : null}
              <button
                type="button"
                onClick={submit}
                disabled={!body.trim()}
                className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Post comment
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-bark-200 bg-white/70 p-3 text-xs text-bark-500">
          This post is no longer open for comments.
        </p>
      )}
    </section>
  )
}
