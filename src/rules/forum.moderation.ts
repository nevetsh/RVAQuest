import type {
  ForumCategory,
  ForumPost,
  ForumReport,
  ForumReply,
  ReportTarget,
} from '../services/places.types'
import { BANNED_WORDS, FORUM_LIMITS } from '../lib/constants'
import { canModerateForum, type Viewer } from './permissions'

/**
 * Pure business rules for the moderated forum (FR01, FR04, FR10).
 *
 * No React, no storage: the forum screens and the moderation service both call
 * these functions, so the banned-word filter and "who may moderate" live in one
 * place and can be unit-tested directly (src/rules/forum.moderation.test.ts).
 *
 * Note: src/rules/forum.ts holds the read helpers the place-suggestion
 * pipeline added (linked place, newest-first ordering). This module is the
 * moderation half: filtering, permissions, visibility, likes and reports.
 */

/**
 * Who the forum checks permissions against: a role, plus whether the account
 * is suspended. Moderators, managers and administrators all inherit
 * moderation through src/rules/permissions.ts.
 */
export type ForumViewer = Viewer

export type ForumCategoryFilter = ForumCategory | 'all'

export interface ForumQuery {
  category?: ForumCategoryFilter
  query?: string
  viewer?: ForumViewer | null
  /**
   * False leaves the place-pipeline posts out. The Spot Suggestions screen
   * shows those in its pinned "Suggestion box" instead, so they are never
   * listed twice.
   */
  includeSuggestions?: boolean
}

/** Used when the category arrives from the URL, where anything can show up. */
export function isForumCategory(value: unknown): value is ForumCategory {
  return value === 'achievements' || value === 'spot-suggestions' || value === 'general'
}

/* ------------------------------------------------------------------ *
 * Banned-word filter (FR01 — checked before anything is published)
 * ------------------------------------------------------------------ */

/**
 * Cheap look-alike folding so the filter still trips on "sh1t" or "D@mn".
 * Only characters that are unambiguous in a forum post are mapped.
 */
const CONFUSABLES: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  $: 's',
  '!': 'i',
}

/**
 * Lower-cases the text and folds common look-alikes, then collapses runs of
 * the same character so "shiiiit" is caught too. The original spelling is
 * never changed for display — this is only used for matching.
 */
export function normalizeForFilter(text: string): string {
  const folded = text
    .toLowerCase()
    .replace(/[0134578@$!]/g, (char) => CONFUSABLES[char] ?? char)

  return folded.replace(/(.)\1+/g, '$1')
}

function matchesWord(haystack: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack)
}

/**
 * Punctuation-free variant, so "Damn!" and "shut up!!!" still match while the
 * look-alike folding above can keep its `!` → `i` mapping for "sh!t".
 */
export function stripPunctuation(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Every banned word the text trips, in the order of the list. */
export function findBannedWords(text: string): string[] {
  if (!text.trim()) return []

  const haystacks = [normalizeForFilter(text), stripPunctuation(text)]
  return BANNED_WORDS.filter((word) => {
    const needle = normalizeForFilter(word)
    return haystacks.some((haystack) => matchesWord(haystack, needle))
  })
}

export function hasBannedWords(text: string): boolean {
  return findBannedWords(text).length > 0
}

/* ------------------------------------------------------------------ *
 * Field validation (also FR01)
 * ------------------------------------------------------------------ */

export interface ForumPostDraft {
  category: ForumCategory | ''
  title: string
  body: string
}

export interface ForumPostErrors {
  category?: string
  title?: string
  body?: string
}

function bannedMessage(label: string, words: string[]): string {
  return `The ${label} was blocked by the banned-word filter (${words.join(
    ', ',
  )}). Rewrite it and publish again.`
}

export interface FilterOptions {
  /** Admins can switch the banned-word filter off in the Admin console. */
  bannedWords?: boolean
}

export function validateForumPost(
  draft: ForumPostDraft,
  options: FilterOptions = {},
): ForumPostErrors {
  const useFilter = options.bannedWords ?? true
  const errors: ForumPostErrors = {}

  if (!draft.category) {
    errors.category = 'Pick a category for your post.'
  }

  const title = draft.title.trim()
  const body = draft.body.trim()

  if (!title) {
    errors.title = 'Give your post a title.'
  } else if (title.length > FORUM_LIMITS.title) {
    errors.title = `Titles are limited to ${FORUM_LIMITS.title} characters (${title.length} entered).`
  } else if (useFilter) {
    const words = findBannedWords(title)
    if (words.length) errors.title = bannedMessage('title', words)
  }

  if (!body) {
    errors.body = 'Write something before publishing.'
  } else if (body.length > FORUM_LIMITS.body) {
    errors.body = `Posts are limited to ${FORUM_LIMITS.body} characters (${body.length} entered).`
  } else if (useFilter) {
    const words = findBannedWords(body)
    if (words.length) errors.body = bannedMessage('post', words)
  }

  return errors
}

export function hasForumPostErrors(errors: ForumPostErrors): boolean {
  return Object.keys(errors).length > 0
}

export interface ForumCommentErrors {
  body?: string
}

export function validateForumComment(
  body: string,
  options: FilterOptions = {},
): ForumCommentErrors {
  const value = body.trim()
  if (!value) return { body: 'Write a comment first.' }
  if (value.length > FORUM_LIMITS.comment) {
    return {
      body: `Comments are limited to ${FORUM_LIMITS.comment} characters (${value.length} entered).`,
    }
  }

  if (options.bannedWords === false) return {}

  const words = findBannedWords(value)
  return words.length ? { body: bannedMessage('comment', words) } : {}
}

export interface ForumReportDraft {
  reason: string
  details?: string
}

export interface ForumReportErrors {
  reason?: string
  details?: string
}

export function validateForumReport(draft: ForumReportDraft): ForumReportErrors {
  const errors: ForumReportErrors = {}
  const details = (draft.details ?? '').trim()

  if (!draft.reason.trim()) errors.reason = 'Pick a reason for the report.'
  if (details.length > FORUM_LIMITS.reportReason) {
    errors.details = `Keep the details under ${FORUM_LIMITS.reportReason} characters.`
  }

  return errors
}

/* ------------------------------------------------------------------ *
 * Moderation permissions (FR01)
 * ------------------------------------------------------------------ */

export function isModerator(viewer: ForumViewer | null | undefined): boolean {
  return canModerateForum(viewer)
}

/** Suspended accounts can read the forum but cannot take part in it. */
export function isSuspended(viewer: ForumViewer | null | undefined): boolean {
  return viewer?.status === 'suspended'
}

/** Only a moderator can take content down, and only while it is up. */
export function canRemovePost(post: ForumPost, viewer: ForumViewer | null | undefined): boolean {
  return isModerator(viewer) && !post.removed
}

export function canRemoveReply(reply: ForumReply, viewer: ForumViewer | null | undefined): boolean {
  return isModerator(viewer) && !reply.removed
}

/** Moderators can keep a post at the top of its category. */
export function canPinPost(post: ForumPost, viewer: ForumViewer | null | undefined): boolean {
  return isModerator(viewer) && !post.removed
}

export function canResolveReport(
  report: ForumReport,
  viewer: ForumViewer | null | undefined,
): boolean {
  return isModerator(viewer) && report.status === 'open'
}

/** Removed posts are closed for comments; otherwise any active explorer may reply. */
export function canComment(post: ForumPost, viewer: ForumViewer | null | undefined): boolean {
  if (post.removed) return false
  return !!viewer && !isSuspended(viewer)
}

/**
 * Any signed-in user can report content, but never their own, never
 * already-removed content, and only once per item while a report is open.
 */
export function canReport(
  target: { authorId: string; removed?: boolean },
  reporterId: string,
  existingReports: ForumReport[],
  reportTarget: { target: ReportTarget; postId: string; replyId?: string },
): boolean {
  if (target.authorId === reporterId) return false
  if (target.removed) return false

  return !existingReports.some(
    (report) =>
      report.status === 'open' &&
      report.reporterId === reporterId &&
      report.target === reportTarget.target &&
      report.postId === reportTarget.postId &&
      (report.replyId ?? undefined) === (reportTarget.replyId ?? undefined),
  )
}

/* ------------------------------------------------------------------ *
 * Visibility and ordering
 * ------------------------------------------------------------------ */

/**
 * Regular users never see removed content. Moderators do, flagged, because
 * the moderation queue has to link to it.
 */
export function visiblePosts(posts: ForumPost[], viewer?: ForumViewer | null): ForumPost[] {
  if (isModerator(viewer)) return posts
  return posts.filter((post) => !post.removed)
}

export function visibleReplies(post: ForumPost, viewer?: ForumViewer | null): ForumReply[] {
  if (isModerator(viewer)) return post.replies
  return post.replies.filter((reply) => !reply.removed)
}

/** Free-text search over a post's title and body. */
export function searchForumPosts<T extends ForumPost>(posts: T[], query: string): T[] {
  const term = query.trim().toLowerCase()
  if (!term) return posts

  return posts.filter((post) => `${post.title} ${post.body}`.toLowerCase().includes(term))
}

export function filterByForumCategory<T extends ForumPost>(
  posts: T[],
  category: ForumCategoryFilter,
): T[] {
  if (category === 'all') return posts
  return posts.filter((post) => post.category === category)
}

/** FR10: a suggestion post is one the place pipeline created. */
export function isSuggestionPost(post: ForumPost): boolean {
  return !!post.placeId
}

/** Pinned posts first, then newest first. */
export function sortForumPosts<T extends ForumPost>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1

    const diff = Date.parse(b.createdAt) - Date.parse(a.createdAt)
    return diff !== 0 ? diff : a.id.localeCompare(b.id)
  })
}

/** The one entry point the forum feed uses. */
export function selectForumFeed(posts: ForumPost[], options: ForumQuery = {}): ForumPost[] {
  const { category = 'all', query = '', viewer = null, includeSuggestions = true } = options

  let result = visiblePosts(posts, viewer)
  if (!includeSuggestions) result = result.filter((post) => !isSuggestionPost(post))

  return sortForumPosts(filterByForumCategory(searchForumPosts(result, query), category))
}

/** FR10: the pinned Suggestion box shown above the Spot Suggestions threads. */
export function suggestionPosts(posts: ForumPost[], viewer?: ForumViewer | null): ForumPost[] {
  return sortForumPosts(
    visiblePosts(posts, viewer).filter(
      (post) => post.category === 'spot-suggestions' && isSuggestionPost(post),
    ),
  )
}

/* ------------------------------------------------------------------ *
 * Likes (FR01)
 * ------------------------------------------------------------------ */

export function likeCount(item: { likedBy?: string[] }): number {
  return item.likedBy?.length ?? 0
}

export function isLikedBy(item: { likedBy?: string[] }, userId: string): boolean {
  return item.likedBy?.includes(userId) ?? false
}

/** Pure like/unlike — returns a new item, never mutates the one passed in. */
export function toggleLike<T extends { likedBy?: string[] }>(item: T, userId: string): T {
  const likedBy = item.likedBy ?? []
  return {
    ...item,
    likedBy: likedBy.includes(userId)
      ? likedBy.filter((id) => id !== userId)
      : [...likedBy, userId],
  }
}

export function likesReceivedBy(userId: string, posts: ForumPost[]): number {
  return posts.reduce(
    (total, post) =>
      total +
      (post.authorId === userId ? likeCount(post) : 0) +
      post.replies.reduce(
        (replies, reply) => replies + (reply.authorId === userId ? likeCount(reply) : 0),
        0,
      ),
    0,
  )
}

export function commentCount(post: ForumPost, viewer?: ForumViewer | null): number {
  return visibleReplies(post, viewer).length
}

/* ------------------------------------------------------------------ *
 * Reports (FR01 moderation queue)
 * ------------------------------------------------------------------ */

export function openReports(reports: ForumReport[]): ForumReport[] {
  return reports.filter((report) => report.status === 'open')
}

export function countOpenReports(reports: ForumReport[]): number {
  return openReports(reports).length
}

export function reportsForPost(reports: ForumReport[], postId: string): ForumReport[] {
  return reports.filter((report) => report.postId === postId)
}

export function openReportsForPost(reports: ForumReport[], postId: string): ForumReport[] {
  return openReports(reports).filter((report) => report.postId === postId)
}

/** Newest report first, so the queue reads like an inbox. */
export function sortReports(reports: ForumReport[]): ForumReport[] {
  return [...reports].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}
