import type { ForumPost, ForumReport, Place, SubmissionLogEntry } from './places.types'

/** Shared domain model for the RVA Quest prototype. */

export interface Coordinates {
  lat: number
  lng: number
}

/**
 * Phase 6 role ladder: an explorer can be promoted to moderator, manager or
 * administrator. Capabilities live in src/rules/permissions.ts.
 */
export type Role = 'user' | 'moderator' | 'manager' | 'admin'

/** An account an administrator has switched off keeps its data but loses access. */
export type UserStatus = 'active' | 'suspended'

export type QuestCategory = 'Outdoors' | 'Parks' | 'Art' | 'History' | 'Food & Drink' | 'Landmarks'

export const QUEST_CATEGORIES: QuestCategory[] = [
  'Outdoors',
  'Parks',
  'Art',
  'History',
  'Food & Drink',
  'Landmarks',
]

/** Review state of anything a user can submit (quests today, places later). */
export type ReviewStatus = 'approved' | 'pending' | 'rejected'

/** BR01: only unlocked quests can be selected or started. */
export type QuestStatus = 'unlocked' | 'locked'

export interface Quest {
  id: string
  name: string
  description: string
  category: QuestCategory
  /** Where the quest is pinned on the map. */
  location: Coordinates
  /** Human readable location, also searched by the search box. */
  area: string
  /** Points awarded once the quest is completed. */
  points: number
  /** What the user has to do to complete the quest. */
  requirements: string[]
  requirementsNote?: string
  status: QuestStatus
  reviewStatus: ReviewStatus
  /** True for the spot featured by the daily check-in quest (later phase). */
  isDailySpot?: boolean
  createdBy?: string
  createdAt: string
}

export interface User {
  id: string
  name: string
  role: Role
  points: number
  streak: number
  /** Saved favourites (FR06). */
  favoriteQuestIds: string[]
  /** Absent means active, so the older seed data keeps working. */
  status?: UserStatus
}

/**
 * Administrator-defined policy (Phase 6). The SRS core rules — the 100 m
 * check-in radius, the 12 submissions/day limit, the 50 m duplicate rule —
 * stay fixed; only the values the SRS leaves open are settable here.
 */
export interface AppSettings {
  /** UC03 BR05: points for an approved place are administrator-defined. */
  placeApprovalPoints: number
  /** False publishes a suggested place straight away, skipping the review step. */
  requirePlaceReview: boolean
  /** Kill switch for the whole submission pipeline (demo or maintenance). */
  placeSubmissionsPaused: boolean
  /** FR01: whether the banned-word filter runs before anything is published. */
  bannedWordsEnabled: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  placeApprovalPoints: 25,
  requirePlaceReview: true,
  placeSubmissionsPaused: false,
  bannedWordsEnabled: true,
}

/** Every privileged action leaves one of these behind (Phase 6). */
export type AuditAction =
  | 'role-changed'
  | 'user-suspended'
  | 'user-restored'
  | 'points-adjusted'
  | 'quest-approved'
  | 'quest-rejected'
  | 'quest-locked'
  | 'quest-unlocked'
  | 'quest-points-changed'
  | 'daily-spot-changed'
  | 'settings-changed'
  | 'data-reset'
  | 'post-removed'
  | 'comment-removed'
  | 'report-resolved'
  | 'place-approved'
  | 'place-rejected'

export interface AuditEntry {
  id: string
  at: string
  actorId: string
  action: AuditAction
  /** One readable line, written where the action happened. */
  summary: string
}

/** Everything the prototype persists, in one versioned object. */
export interface AppState {
  schemaVersion: number
  users: User[]
  currentUserId: string
  quests: Quest[]
  /** FR05/FR09/FR10: places suggested by users, in every review state. */
  places: Place[]
  /** FR01/FR09/FR10: forum posts and their replies. */
  forumPosts: ForumPost[]
  /** FR01: the moderator report queue, open and already resolved. */
  forumReports: ForumReport[]
  /** One row per accepted place submission — the 12/day counter (NFR04). */
  submissions: SubmissionLogEntry[]
  /** Phase 6: the administrator-defined rules of the app. */
  settings: AppSettings
  /** Phase 6: who changed what, newest last. */
  auditLog: AuditEntry[]
  /** Prototype only: Dev tools "jump to tomorrow" offset in days. */
  dayOffset: number
  /** Set by the dev tools drawer to fake a GPS fix. */
  simulatedLocation: Coordinates | null
  /** Set when the user says "no" to the location prompt. */
  locationDenied: boolean
}
