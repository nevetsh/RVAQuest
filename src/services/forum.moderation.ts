import { getState, setState } from './store'
import type {
  ForumCategory,
  ForumPost,
  ForumReport,
  ForumReply,
  ReportResolution,
  ReportTarget,
} from './places.types'
import { createForumPost, replyToForumPost } from './forum.service'
import { recordAudit } from './admin'
import {
  canRemovePost,
  canRemoveReply,
  canReport,
  canResolveReport,
  hasForumPostErrors,
  isModerator,
  isSuspended,
  toggleLike,
  validateForumComment,
  validateForumPost,
  validateForumReport,
  type ForumCommentErrors,
  type ForumPostDraft,
  type ForumPostErrors,
  type ForumReportErrors,
} from '../rules/forum.moderation'

/**
 * FR01 — the moderation and engagement half of the forum service.
 *
 * Publishing goes through here (never straight through forum.service) so the
 * banned-word filter always runs first, and every moderator action re-checks
 * the permission rule from src/rules/forum.ts against the real current user.
 * The UI is therefore unable to publish filtered text or moderate as a
 * regular explorer.
 */

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function viewerFor(userId: string) {
  const user = getState().users.find((entry) => entry.id === userId)
  return user ? { id: user.id, role: user.role, status: user.status } : null
}

/** Administrator-defined policy from the Admin console. */
function filterOptions() {
  return { bannedWords: getState().settings.bannedWordsEnabled }
}

/* ------------------------------------------------------------------ *
 * Publishing (banned-word filter first)
 * ------------------------------------------------------------------ */

export type PublishPostResult =
  | { ok: true; post: ForumPost }
  | { ok: false; errors: ForumPostErrors }

export function publishForumPost(userId: string, draft: ForumPostDraft): PublishPostResult {
  const viewer = viewerFor(userId)
  if (isSuspended(viewer)) {
    return { ok: false, errors: { body: 'This account is suspended, so it cannot publish posts.' } }
  }

  const errors = validateForumPost(draft, filterOptions())
  if (hasForumPostErrors(errors)) return { ok: false, errors }

  const result = createForumPost(userId, {
    title: draft.title.trim(),
    body: draft.body.trim(),
    category: draft.category as ForumCategory,
  })

  if (!result.ok) {
    return {
      ok: false,
      errors: {
        category: 'Spot Suggestions posts come from the “Suggest a spot” form so a moderator can review the place itself.',
      },
    }
  }

  return { ok: true, post: result.post }
}

export type PublishCommentResult =
  | { ok: true; post: ForumPost }
  | { ok: false; errors: ForumCommentErrors }

export function publishForumComment(
  postId: string,
  userId: string,
  body: string,
): PublishCommentResult {
  const viewer = viewerFor(userId)
  if (isSuspended(viewer)) {
    return { ok: false, errors: { body: 'This account is suspended, so it cannot comment.' } }
  }

  const errors = validateForumComment(body, filterOptions())
  if (errors.body) return { ok: false, errors }

  const post = replyToForumPost(postId, userId, body)
  if (!post) return { ok: false, errors: { body: 'That post is no longer available.' } }

  return { ok: true, post }
}

/* ------------------------------------------------------------------ *
 * Likes
 * ------------------------------------------------------------------ */

function updatePost(postId: string, update: (post: ForumPost) => ForumPost): void {
  setState((previous) => ({
    ...previous,
    forumPosts: previous.forumPosts.map((post) => (post.id === postId ? update(post) : post)),
  }))
}

/** Returns the new liked state, or undefined when the post is gone. */
export function toggleForumPostLike(postId: string, userId: string): boolean | undefined {
  if (isSuspended(viewerFor(userId))) return undefined

  const post = getState().forumPosts.find((entry) => entry.id === postId)
  if (!post) return undefined

  const next = toggleLike(post, userId)
  updatePost(postId, () => next)
  return next.likedBy?.includes(userId) ?? false
}

export function toggleForumReplyLike(
  postId: string,
  replyId: string,
  userId: string,
): boolean | undefined {
  if (isSuspended(viewerFor(userId))) return undefined

  const post = getState().forumPosts.find((entry) => entry.id === postId)
  const reply = post?.replies.find((entry) => entry.id === replyId)
  if (!post || !reply) return undefined

  const next = toggleLike(reply, userId)
  updatePost(postId, (current) => ({
    ...current,
    replies: current.replies.map((entry) => (entry.id === replyId ? next : entry)),
  }))

  return next.likedBy?.includes(userId) ?? false
}

/* ------------------------------------------------------------------ *
 * Moderator actions
 * ------------------------------------------------------------------ */

function resolveReportsFor(
  reports: ForumReport[],
  match: (report: ForumReport) => boolean,
  moderatorId: string,
  resolution: ReportResolution,
): ForumReport[] {
  const now = new Date().toISOString()

  return reports.map((report) =>
    match(report) && report.status === 'open'
      ? {
          ...report,
          status: 'resolved' as const,
          resolvedBy: moderatorId,
          resolvedAt: now,
          resolution,
        }
      : report,
  )
}

/**
 * Takes a post down and closes every open report against it in one step, so
 * handling a reported post never leaves a stale row in the queue.
 */
export function removeForumPost(
  postId: string,
  moderatorId: string,
  reason = '',
): boolean {
  const state = getState()
  const post = state.forumPosts.find((entry) => entry.id === postId)
  const moderator = viewerFor(moderatorId)
  if (!post || !canRemovePost(post, moderator)) return false

  const now = new Date().toISOString()
  const removed: ForumPost = {
    ...post,
    removed: true,
    removedBy: moderatorId,
    removedAt: now,
    removedReason: reason.trim() || undefined,
  }

  setState((previous) => ({
    ...previous,
    forumPosts: previous.forumPosts.map((entry) => (entry.id === postId ? removed : entry)),
    forumReports: resolveReportsFor(
      previous.forumReports,
      (report) => report.postId === postId && report.target === 'post',
      moderatorId,
      'removed',
    ),
  }))

  recordAudit(
    moderatorId,
    'post-removed',
    `Post “${post.title}” was removed${reason.trim() ? ` (${reason.trim()})` : ''}.`,
  )

  return true
}

export function removeForumReply(
  postId: string,
  replyId: string,
  moderatorId: string,
  reason = '',
): boolean {
  const state = getState()
  const post = state.forumPosts.find((entry) => entry.id === postId)
  const reply = post?.replies.find((entry) => entry.id === replyId)
  if (!post || !reply || !canRemoveReply(reply, viewerFor(moderatorId))) return false

  const now = new Date().toISOString()
  const removed: ForumReply = {
    ...reply,
    removed: true,
    removedBy: moderatorId,
    removedAt: now,
    removedReason: reason.trim() || undefined,
  }

  setState((previous) => ({
    ...previous,
    forumPosts: previous.forumPosts.map((entry) =>
      entry.id === postId
        ? { ...entry, replies: entry.replies.map((item) => (item.id === replyId ? removed : item)) }
        : entry,
    ),
    forumReports: resolveReportsFor(
      previous.forumReports,
      (report) => report.postId === postId && report.target === 'reply' && report.replyId === replyId,
      moderatorId,
      'removed',
    ),
  }))

  recordAudit(
    moderatorId,
    'comment-removed',
    `A comment on “${post.title}” was removed${reason.trim() ? ` (${reason.trim()})` : ''}.`,
  )

  return true
}

/** FR10: keep a post at the top of its category (moderators only). */
export function setForumPostPinned(postId: string, moderatorId: string, pinned: boolean): boolean {
  const post = getState().forumPosts.find((entry) => entry.id === postId)
  if (!post || !isModerator(viewerFor(moderatorId)) || post.removed) return false

  updatePost(postId, (current) => ({ ...current, pinned }))
  return true
}

/** Closes a report without touching the content (the "Dismiss" action). */
export function resolveForumReport(
  reportId: string,
  moderatorId: string,
  resolution: ReportResolution = 'dismissed',
): boolean {
  const report = getState().forumReports.find((entry) => entry.id === reportId)
  if (!report || !canResolveReport(report, viewerFor(moderatorId))) return false

  setState((previous) => ({
    ...previous,
    forumReports: resolveReportsFor(
      previous.forumReports,
      (entry) => entry.id === reportId,
      moderatorId,
      resolution,
    ),
  }))

  recordAudit(
    moderatorId,
    'report-resolved',
    `Report on ${report.target === 'reply' ? 'a comment' : 'a post'} was ${
      resolution === 'removed' ? 'actioned' : 'dismissed'
    } (${report.reason}).`,
  )

  return true
}

/* ------------------------------------------------------------------ *
 * Reporting (any signed-in user)
 * ------------------------------------------------------------------ */

export type ReportContentResult =
  | { ok: true; report: ForumReport }
  | { ok: false; error: 'not-found' | 'not-allowed'; message?: string }
  | { ok: false; errors: ForumReportErrors }

export function reportForumContent(input: {
  reporterId: string
  target: ReportTarget
  postId: string
  replyId?: string
  reason: string
  details?: string
}): ReportContentResult {
  const state = getState()
  if (isSuspended(viewerFor(input.reporterId))) {
    return { ok: false, error: 'not-allowed', message: 'This account is suspended.' }
  }

  const post = state.forumPosts.find((entry) => entry.id === input.postId)
  if (!post) return { ok: false, error: 'not-found' }

  const target =
    input.target === 'reply'
      ? post.replies.find((reply) => reply.id === input.replyId)
      : post
  if (!target) return { ok: false, error: 'not-found' }

  const allowed = canReport(
    target,
    input.reporterId,
    state.forumReports,
    { target: input.target, postId: input.postId, replyId: input.replyId },
  )
  if (!allowed) {
    return target.authorId === input.reporterId
      ? { ok: false, error: 'not-allowed', message: 'You cannot report your own post.' }
      : {
          ok: false,
          error: 'not-allowed',
          message: 'You already reported this — a moderator will take a look.',
        }
  }

  const errors = validateForumReport({ reason: input.reason, details: input.details })
  if (errors.reason || errors.details) return { ok: false, errors }

  const report: ForumReport = {
    id: makeId('report'),
    target: input.target,
    postId: input.postId,
    replyId: input.target === 'reply' ? input.replyId : undefined,
    reporterId: input.reporterId,
    reason: input.reason.trim(),
    details: input.details?.trim() || undefined,
    createdAt: new Date().toISOString(),
    status: 'open',
  }

  setState((previous) => ({ ...previous, forumReports: [...previous.forumReports, report] }))
  return { ok: true, report }
}

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

export function listForumReports(): ForumReport[] {
  return getState().forumReports
}

export function getForumReportById(id: string): ForumReport | undefined {
  return getState().forumReports.find((report) => report.id === id)
}
