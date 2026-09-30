import { getState, resetAllData, setState } from './store'
import { DEFAULT_SETTINGS } from './types'
import { currentDayKey } from '../rules/time'
import type {
  AppSettings,
  AuditAction,
  AuditEntry,
  Quest,
  ReviewStatus,
  Role,
  User,
} from './types'
import {
  canAdjustPoints,
  canManageQuests,
  canManageSettings,
  canManageUsers,
  canResetData,
  canSuspendUser,
  isLastAdmin,
  ROLE_LABELS,
  type Viewer,
} from '../rules/permissions'

/**
 * Phase 6 — everything the Admin / Manager console is allowed to do.
 *
 * Same shape as the other services: the UI calls these functions, each one
 * re-checks the capability rule from src/rules/permissions.ts against the real
 * current state, then records what happened in the audit log.
 */

/** The audit log is capped so the prototype's localStorage stays small. */
const AUDIT_LIMIT = 100
const MAX_POINTS = 100_000

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function viewerFor(userId: string): Viewer | null {
  const user = getState().users.find((entry) => entry.id === userId)
  return user ? { id: user.id, role: user.role, status: user.status } : null
}

function entry(actorId: string, action: AuditAction, summary: string): AuditEntry {
  return { id: makeId('log'), at: new Date().toISOString(), actorId, action, summary }
}

function withAudit(previous: AuditEntry[], addition: AuditEntry): AuditEntry[] {
  return [...previous, addition].slice(-AUDIT_LIMIT)
}

function userName(userId: string): string {
  return getState().users.find((user) => user.id === userId)?.name ?? userId
}

/**
 * Lets any other service record a privileged action in the same log, so the
 * Activity tab shows moderation alongside admin changes.
 */
export function recordAudit(actorId: string, action: AuditAction, summary: string): void {
  setState((state) => ({
    ...state,
    auditLog: withAudit(state.auditLog, entry(actorId, action, summary)),
  }))
}

/* ------------------------------------------------------------------ *
 * Settings (the values the SRS leaves to the administrator)
 * ------------------------------------------------------------------ */

export function getSettings(): AppSettings {
  return getState().settings
}

export function updateSettings(actorId: string, patch: Partial<AppSettings>): boolean {
  if (!canManageSettings(viewerFor(actorId))) return false

  setState((state) => {
    const next: AppSettings = {
      placeApprovalPoints: clampPoints(patch.placeApprovalPoints ?? state.settings.placeApprovalPoints),
      requirePlaceReview: patch.requirePlaceReview ?? state.settings.requirePlaceReview,
      placeSubmissionsPaused: patch.placeSubmissionsPaused ?? state.settings.placeSubmissionsPaused,
      bannedWordsEnabled: patch.bannedWordsEnabled ?? state.settings.bannedWordsEnabled,
    }

    return {
      ...state,
      settings: next,
      auditLog: withAudit(state.auditLog, entry(actorId, 'settings-changed', describeSettingsChange(state.settings, next))),
    }
  })

  return true
}

function clampPoints(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.placeApprovalPoints
  return Math.max(0, Math.min(500, Math.round(value)))
}

function describeSettingsChange(before: AppSettings, after: AppSettings): string {
  const changes: string[] = []

  if (before.placeApprovalPoints !== after.placeApprovalPoints) {
    changes.push(`approval points ${before.placeApprovalPoints} → ${after.placeApprovalPoints}`)
  }
  if (before.requirePlaceReview !== after.requirePlaceReview) {
    changes.push(`place review ${after.requirePlaceReview ? 'required' : 'skipped'}`)
  }
  if (before.placeSubmissionsPaused !== after.placeSubmissionsPaused) {
    changes.push(`submissions ${after.placeSubmissionsPaused ? 'paused' : 'resumed'}`)
  }
  if (before.bannedWordsEnabled !== after.bannedWordsEnabled) {
    changes.push(`banned-word filter ${after.bannedWordsEnabled ? 'on' : 'off'}`)
  }

  return changes.length ? `Settings changed: ${changes.join(', ')}.` : 'Settings saved.'
}

export function resetSettings(actorId: string): boolean {
  if (!canManageSettings(viewerFor(actorId))) return false

  setState((state) => ({
    ...state,
    settings: { ...DEFAULT_SETTINGS },
    auditLog: withAudit(state.auditLog, entry(actorId, 'settings-changed', 'Settings reset to the defaults.')),
  }))

  return true
}

/* ------------------------------------------------------------------ *
 * Users
 * ------------------------------------------------------------------ */

export function listUsers(): User[] {
  return getState().users
}

export type AdminActionResult =
  | { ok: true }
  | { ok: false; error: 'not-allowed' | 'not-found' | 'last-admin' | 'self' }

export function setUserRole(actorId: string, targetId: string, role: Role): AdminActionResult {
  const viewer = viewerFor(actorId)
  const target = getState().users.find((user) => user.id === targetId)
  if (!target) return { ok: false, error: 'not-found' }
  if (!canManageUsers(viewer)) return { ok: false, error: 'not-allowed' }
  if (viewer?.id === target.id) return { ok: false, error: 'self' }

  if (isLastAdmin(target, getState().users)) return { ok: false, error: 'last-admin' }

  const before = ROLE_LABELS[target.role]
  const after = ROLE_LABELS[role]

  setState((state) => ({
    ...state,
    users: state.users.map((user) => (user.id === targetId ? { ...user, role } : user)),
    auditLog: withAudit(
      state.auditLog,
      entry(actorId, 'role-changed', `${target.name} moved from ${before} to ${after}.`),
    ),
  }))

  return { ok: true }
}

export function setUserSuspended(
  actorId: string,
  targetId: string,
  suspended: boolean,
): AdminActionResult {
  const viewer = viewerFor(actorId)
  const target = getState().users.find((user) => user.id === targetId)
  if (!target) return { ok: false, error: 'not-found' }
  if (!canSuspendUser(viewer, target, getState().users)) {
    return { ok: false, error: viewer?.id === target.id ? 'self' : 'last-admin' }
  }

  setState((state) => ({
    ...state,
    users: state.users.map((user) =>
      user.id === targetId ? { ...user, status: suspended ? 'suspended' : 'active' } : user,
    ),
    auditLog: withAudit(
      state.auditLog,
      entry(
        actorId,
        suspended ? 'user-suspended' : 'user-restored',
        suspended ? `${target.name}'s account was suspended.` : `${target.name}'s account was restored.`,
      ),
    ),
  }))

  return { ok: true }
}

/** Returns the new point total, or null when the change was refused. */
export function adjustUserPoints(actorId: string, targetId: string, delta: number): number | null {
  const viewer = viewerFor(actorId)
  const target = getState().users.find((user) => user.id === targetId)
  if (!target || !canAdjustPoints(viewer, target)) return null

  const next = Math.max(0, Math.min(MAX_POINTS, target.points + Math.round(delta)))

  setState((state) => ({
    ...state,
    users: state.users.map((user) => (user.id === targetId ? { ...user, points: next } : user)),
    auditLog: withAudit(
      state.auditLog,
      entry(
        actorId,
        'points-adjusted',
        `${target.name}'s points ${delta >= 0 ? '+' : ''}${Math.round(delta)} → ${next}.`,
      ),
    ),
  }))

  return next
}

/* ------------------------------------------------------------------ *
 * Quests (manager and above)
 * ------------------------------------------------------------------ */

export function setQuestReviewStatus(
  actorId: string,
  questId: string,
  status: ReviewStatus,
): boolean {
  if (!canManageQuests(viewerFor(actorId))) return false
  const quest = getState().quests.find((entry) => entry.id === questId)
  if (!quest) return false

  setState((state) => ({
    ...state,
    quests: state.quests.map((item) =>
      item.id === questId ? { ...item, reviewStatus: status } : item,
    ),
    auditLog: withAudit(
      state.auditLog,
      entry(
        actorId,
        status === 'approved' ? 'quest-approved' : 'quest-rejected',
        `Quest “${quest.name}” was ${status === 'approved' ? 'approved' : 'rejected'}.`,
      ),
    ),
  }))

  return true
}

export function setQuestLocked(actorId: string, questId: string, locked: boolean): boolean {
  if (!canManageQuests(viewerFor(actorId))) return false
  const quest = getState().quests.find((entry) => entry.id === questId)
  if (!quest) return false

  setState((state) => ({
    ...state,
    quests: state.quests.map((item) =>
      item.id === questId ? { ...item, status: locked ? 'locked' : 'unlocked' } : item,
    ),
    auditLog: withAudit(
      state.auditLog,
      entry(
        actorId,
        locked ? 'quest-locked' : 'quest-unlocked',
        `Quest “${quest.name}” was ${locked ? 'locked' : 'unlocked'}.`,
      ),
    ),
  }))

  return true
}

export function setQuestPoints(actorId: string, questId: string, points: number): boolean {
  if (!canManageQuests(viewerFor(actorId))) return false
  const quest = getState().quests.find((entry) => entry.id === questId)
  if (!quest) return false

  const next = Math.max(0, Math.min(500, Math.round(points)))
  if (next === quest.points) return true

  setState((state) => ({
    ...state,
    quests: state.quests.map((item) => (item.id === questId ? { ...item, points: next } : item)),
    auditLog: withAudit(
      state.auditLog,
      entry(
        actorId,
        'quest-points-changed',
        `Quest “${quest.name}” now awards ${next} points.`,
      ),
    ),
  }))

  return true
}

/** FR03: exactly one quest is the daily check-in spot at a time. */
export function setDailySpot(actorId: string, quest: Quest): boolean {
  if (!canManageQuests(viewerFor(actorId))) return false
  if (!getState().quests.some((item) => item.id === quest.id)) return false

  setState((state) => ({
    ...state,
    quests: state.quests.map((item) => ({ ...item, isDailySpot: item.id === quest.id })),
    auditLog: withAudit(
      state.auditLog,
      entry(actorId, 'daily-spot-changed', `Daily check-in spot set to “${quest.name}”.`),
    ),
  }))

  return true
}

/* ------------------------------------------------------------------ *
 * Data tools
 * ------------------------------------------------------------------ */

/** Back to the seed data, with the wipe itself recorded in the fresh log. */
export function resetEverything(actorId: string): boolean {
  if (!canResetData(viewerFor(actorId))) return false

  resetAllData()
  setState((state) => ({
    ...state,
    auditLog: withAudit(
      state.auditLog,
      entry(actorId, 'data-reset', 'All stored data was reset to the demo seed.'),
    ),
  }))

  return true
}

/** A JSON snapshot of everything the prototype stores. */
export function exportStateJson(): string {
  return JSON.stringify(getState(), null, 2)
}

/* ------------------------------------------------------------------ *
 * Reads used by the Admin console
 * ------------------------------------------------------------------ */

export function listAuditLog(): AuditEntry[] {
  return [...getState().auditLog].reverse()
}

export function auditEntriesBy(actorId: string): AuditEntry[] {
  return listAuditLog().filter((item) => item.actorId === actorId)
}

export function actorName(actorId: string): string {
  return userName(actorId) || 'Unknown'
}

export interface AdminStats {
  users: number
  suspended: number
  byRole: Record<Role, number>
  questsApproved: number
  questsPending: number
  questsLocked: number
  placesPending: number
  placesApproved: number
  forumPosts: number
  openReports: number
  submissionsToday: number
}

export function adminStats(): AdminStats {
  const state = getState()
  const byRole: Record<Role, number> = { user: 0, moderator: 0, manager: 0, admin: 0 }
  for (const user of state.users) byRole[user.role] += 1

  return {
    users: state.users.length,
    suspended: state.users.filter((user) => user.status === 'suspended').length,
    byRole,
    questsApproved: state.quests.filter((quest) => quest.reviewStatus === 'approved').length,
    questsPending: state.quests.filter((quest) => quest.reviewStatus === 'pending').length,
    questsLocked: state.quests.filter((quest) => quest.status === 'locked').length,
    placesPending: state.places.filter((place) => place.reviewStatus === 'pending').length,
    placesApproved: state.places.filter((place) => place.reviewStatus === 'approved').length,
    forumPosts: state.forumPosts.length,
    openReports: state.forumReports.filter((report) => report.status === 'open').length,
    submissionsToday: state.submissions.filter(
      (logEntry) => logEntry.dayKey === currentDayKey(new Date(), state.dayOffset),
    ).length,
  }
}
