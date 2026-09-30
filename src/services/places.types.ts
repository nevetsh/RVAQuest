import type { Coordinates, QuestCategory } from './types'

/**
 * FR05 / FR09 / FR10 — the place suggestion pipeline and the forum.
 *
 * A user suggests a place (from the map's "Add a Place" button or the forum's
 * "New Spot Suggestion" button), the place is saved with the status
 * "pending", and a linked post appears in the forum's Spot Suggestions
 * category. A moderator approves or rejects it; only approved places show on
 * the map and only an approval awards points, exactly once.
 *
 * While a suggestion is still pending its owner may edit it or withdraw it.
 * Editing keeps the same record and submission-day ledger row and bumps
 * `editCount`/`editedAt` so the moderator queue can flag that the suggestion
 * changed since it was filed. Withdrawing takes it out of the queue without
 * awarding or removing points; the forum post stays up showing "Withdrawn".
 */

/**
 * A place's review state. This is deliberately *not* the shared `ReviewStatus`
 * (used by quests): a suggestion adds "withdrawn", which only the owner can
 * cause, so a place can leave the queue without a moderator decision.
 */
export type PlaceReviewStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn'

export interface Place {
  id: string
  name: string
  /** Categories reuse the quest category list so the map legend stays simple. */
  category: QuestCategory
  /** Optional free-text address (UC03 BR01). */
  address: string
  location: Coordinates
  /** Optional detail about the spot (UC03 BR01). */
  description: string
  submittedBy: string
  submittedAt: string
  /** Richmond day key (YYYY-MM-DD) the submission counted against (BR02). */
  submittedOn: string
  reviewStatus: PlaceReviewStatus
  /** BR05: points are awarded once, on approval. Rejection awards none. */
  pointsAwarded: boolean
  /** Points the submitter earns if a moderator approves (admin-defined). */
  points: number
  /** Optional reason recorded by the moderator when rejecting. */
  reviewNote?: string
  reviewedBy?: string
  reviewedAt?: string
  /** How many times the submitter has edited the suggestion while it was pending. */
  editCount?: number
  /** When the submitter last edited the suggestion (shown to moderators). */
  editedAt?: string
  /** When the submitter withdrew the suggestion, if they did. */
  withdrawnAt?: string
  /** The forum post created by this submission (FR09/FR10). */
  forumPostId: string
}

/** The three forum categories from FR01. */
export type ForumCategory = 'achievements' | 'spot-suggestions' | 'general'

export const FORUM_CATEGORIES: Array<{ id: ForumCategory; label: string; description: string }> = [
  {
    id: 'achievements',
    label: 'Achievements',
    description: 'Streaks, badges and finished quests — share the win (FR04).',
  },
  {
    id: 'spot-suggestions',
    label: 'Spot Suggestions',
    description: 'Places suggested by explorers, waiting on (or cleared by) moderators.',
  },
  {
    id: 'general',
    label: 'General',
    description: 'Quest tips, route ideas and neighbourhood talk.',
  },
]

export function forumCategoryLabel(category: ForumCategory): string {
  return FORUM_CATEGORIES.find((entry) => entry.id === category)?.label ?? 'General'
}

/** Why a post or comment was reported — the preset list shown in the dialog. */
export const REPORT_REASONS = [
  'Spam or advertising',
  'Harassment or bullying',
  'Off topic for this category',
  'Bad language',
  'Something else',
] as const

export interface ForumReply {
  id: string
  authorId: string
  body: string
  createdAt: string
  /** User ids who liked this comment. Absent on seeded content = no likes. */
  likedBy?: string[]
  /** FR01 moderation: a removed comment is hidden from regular users. */
  removed?: boolean
  removedBy?: string
  removedAt?: string
  removedReason?: string
}

export interface ForumPost {
  id: string
  category: ForumCategory
  title: string
  body: string
  authorId: string
  createdAt: string
  /** Set for Spot Suggestions posts created by the place pipeline (FR10). */
  placeId?: string
  replies: ForumReply[]
  /** User ids who liked this post. Absent on seeded content = no likes. */
  likedBy?: string[]
  /** FR10: a moderator can keep a post at the top of its category. */
  pinned?: boolean
  /** FR01 moderation: a removed post is hidden from regular users. */
  removed?: boolean
  removedBy?: string
  removedAt?: string
  removedReason?: string
}

/** Which row a report points at. */
export type ReportTarget = 'post' | 'reply'

export type ReportStatus = 'open' | 'resolved'

/** What the moderator decided when the report was closed. */
export type ReportResolution = 'removed' | 'dismissed'

/**
 * FR01 moderation: one row per report so a moderator can work the queue.
 * Reports stay in the state after they are resolved, which is what makes the
 * "already resolved" badge on a post possible.
 */
export interface ForumReport {
  id: string
  target: ReportTarget
  /** The report's post, or the post the reported comment belongs to. */
  postId: string
  /** Set when the target is a comment. */
  replyId?: string
  reporterId: string
  reason: string
  /** Free text the reporter typed (optional). */
  details?: string
  createdAt: string
  status: ReportStatus
  resolvedBy?: string
  resolvedAt?: string
  resolution?: ReportResolution
}

/**
 * One row per accepted submission. The daily limit is counted from these
 * entries so the dev tools can reset the counter without touching the places
 * themselves.
 */
export interface SubmissionLogEntry {
  id: string
  userId: string
  placeId: string
  dayKey: string
  createdAt: string
}
