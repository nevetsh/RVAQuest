import { Link } from 'react-router-dom'
import type { User } from '../../services/types'
import { useAppState } from '../../hooks/useAppState'
import { removeForumPost, removeForumReply, resolveForumReport } from '../../services/forum.moderation'
import { isModerator, openReports, sortReports } from '../../rules/forum.moderation'
import { formatRelativeTime } from '../../lib/format'
import { Badge } from '../ui/Badge'

/**
 * FR01 — the moderator's inbox: every open report with the action it needs.
 * Removing the content also closes the report, so the queue drains.
 */
export function ModerationQueue({ viewer }: { viewer: User }) {
  const { forumReports, forumPosts } = useAppState()

  if (!isModerator(viewer)) return null

  const queue = sortReports(openReports(forumReports))

  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50/60 p-4 shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-amber-900">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 3 2 20h20L12 3Z" strokeLinejoin="round" />
            <path d="M12 10v4M12 17h.01" strokeLinecap="round" />
          </svg>
          Reported items
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900">
            {queue.length}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-amber-800">Moderator only</span>
          <Link
            to="/moderator"
            className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
          >
            Suggested places
          </Link>
        </div>
      </header>

      {queue.length === 0 ? (
        <p className="mt-3 rounded-xl bg-white px-3 py-4 text-center text-sm text-bark-500">
          Nothing reported. The queue is clear.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {queue.map((report) => {
            const post = forumPosts.find((entry) => entry.id === report.postId)
            const reply = report.replyId
              ? post?.replies.find((entry) => entry.id === report.replyId)
              : undefined
            const reporter = report.reporterId
            const author = reply?.authorId ?? post?.authorId

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
                    {post ? post.title : 'This post no longer exists'}
                  </Link>
                  <span className="text-[11px] text-bark-500">
                    {formatRelativeTime(report.createdAt)}
                  </span>
                </div>

                {reply ? (
                  <p className="mt-2 line-clamp-2 rounded-lg bg-bark-50 px-3 py-2 text-xs text-bark-600">
                    “{reply.body}”
                  </p>
                ) : null}

                <p className="mt-2 text-xs text-bark-600">
                  <span className="font-semibold text-bark-800">{report.reason}</span>
                  {report.details ? ` — ${report.details}` : ''} · reported by{' '}
                  {reporter === viewer.id ? 'you' : reporter}
                  {author ? ` · written by ${author}` : ''}
                </p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {report.target === 'reply' && report.replyId ? (
                    <button
                      type="button"
                      onClick={() =>
                        removeForumReply(report.postId, report.replyId as string, viewer.id, report.reason)
                      }
                      className="rounded-full border border-red-300 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                    >
                      Remove comment
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeForumPost(report.postId, viewer.id, report.reason)}
                      className="rounded-full border border-red-300 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                    >
                      Remove post
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => resolveForumReport(report.id, viewer.id, 'dismissed')}
                    className="rounded-full border border-bark-200 px-2.5 py-1 text-xs font-semibold text-bark-700 hover:border-brand-400"
                  >
                    Dismiss report
                  </button>

                  <Link
                    to={`/forum/${report.postId}`}
                    className="rounded-full px-2.5 py-1 text-xs font-semibold text-brand-800 hover:bg-brand-50"
                  >
                    Open post
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-3 text-[11px] text-amber-800">
        {forumReports.length - queue.length} report{forumReports.length - queue.length === 1 ? '' : 's'}{' '}
        already handled.
      </p>
    </section>
  )
}
