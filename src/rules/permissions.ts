import type { Role, User, UserStatus } from '../services/types'

/**
 * Phase 6 — who may manage what.
 *
 * One role ladder (explorer → moderator → manager → administrator) and one
 * list of capabilities, so the Admin console, the forum, the place queue and
 * the services all ask the same question instead of comparing role strings.
 * Pure and unit-tested (src/rules/permissions.test.ts).
 */

export type Capability =
  /** Remove posts/comments, pin, work the report queue. */
  | 'moderateForum'
  /** Approve or reject suggested places. */
  | 'reviewPlaces'
  /** Approve, lock, retune and feature quests. */
  | 'manageQuests'
  /** Change other people's roles, suspend accounts, adjust points. */
  | 'manageUsers'
  /** Change the administrator-defined rules of the app. */
  | 'manageSettings'
  /** Wipe the stored data back to the seed. */
  | 'resetData'
  /** Read the admin activity log. */
  | 'viewAuditLog'

export const ROLE_ORDER: Role[] = ['user', 'moderator', 'manager', 'admin']

export const ROLE_LABELS: Record<Role, string> = {
  user: 'Explorer',
  moderator: 'Moderator',
  manager: 'Manager',
  admin: 'Administrator',
}

const ROLE_RANK: Record<Role, number> = {
  user: 0,
  moderator: 1,
  manager: 2,
  admin: 3,
}

const CAPABILITIES: Record<Role, Capability[]> = {
  user: [],
  moderator: ['moderateForum', 'reviewPlaces'],
  manager: ['moderateForum', 'reviewPlaces', 'manageQuests', 'viewAuditLog'],
  admin: [
    'moderateForum',
    'reviewPlaces',
    'manageQuests',
    'manageUsers',
    'manageSettings',
    'resetData',
    'viewAuditLog',
  ],
}

/** The minimum a permission check needs: a role, and whether it is suspended. */
export interface Viewer {
  id?: string
  role: Role
  status?: UserStatus
}

export function isAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}

export function capabilitiesFor(role: Role): Capability[] {
  return CAPABILITIES[role] ?? []
}

/**
 * The single capability check. A suspended account keeps its role on the
 * record but loses every privilege until an administrator restores it.
 */
export function can(capability: Capability, viewer: Viewer | null | undefined): boolean {
  if (!viewer) return false
  if (viewer.status === 'suspended') return false
  return capabilitiesFor(viewer.role).includes(capability)
}

export function canModerateForum(viewer: Viewer | null | undefined): boolean {
  return can('moderateForum', viewer)
}

export function canReviewPlaces(viewer: Viewer | null | undefined): boolean {
  return can('reviewPlaces', viewer)
}

export function canManageQuests(viewer: Viewer | null | undefined): boolean {
  return can('manageQuests', viewer)
}

export function canManageUsers(viewer: Viewer | null | undefined): boolean {
  return can('manageUsers', viewer)
}

export function canManageSettings(viewer: Viewer | null | undefined): boolean {
  return can('manageSettings', viewer)
}

export function canResetData(viewer: Viewer | null | undefined): boolean {
  return can('resetData', viewer)
}

export function canViewAuditLog(viewer: Viewer | null | undefined): boolean {
  return can('viewAuditLog', viewer)
}

/** Does this role have anything to do in the Admin console at all? */
export function canAccessConsole(viewer: Viewer | null | undefined): boolean {
  if (!viewer) return false
  if (viewer.status === 'suspended') return false
  return capabilitiesFor(viewer.role).length > 0
}

export type AdminTab = 'overview' | 'users' | 'quests' | 'content' | 'settings' | 'activity'

export const ADMIN_TABS: Array<{ id: AdminTab; label: string; capability: Capability | null }> = [
  { id: 'overview', label: 'Overview', capability: null },
  { id: 'users', label: 'Users', capability: 'manageUsers' },
  { id: 'quests', label: 'Quests', capability: 'manageQuests' },
  { id: 'content', label: 'Content', capability: 'reviewPlaces' },
  { id: 'settings', label: 'Settings', capability: 'manageSettings' },
  { id: 'activity', label: 'Activity', capability: 'viewAuditLog' },
]

/** The tabs this viewer is allowed to open (Overview is always first). */
export function adminTabsFor(viewer: Viewer | null | undefined): AdminTab[] {
  if (!canAccessConsole(viewer)) return []
  return ADMIN_TABS.filter(
    (tab) => tab.capability === null || can(tab.capability, viewer),
  ).map((tab) => tab.id)
}

export function isAdminTab(value: unknown): value is AdminTab {
  return ADMIN_TABS.some((tab) => tab.id === value)
}

/* ------------------------------------------------------------------ *
 * Managing other accounts
 * ------------------------------------------------------------------ */

/** Admins and above hand out any role; nobody else hands out anything. */
export function assignableRoles(viewer: Viewer | null | undefined): Role[] {
  return canManageUsers(viewer) ? ROLE_ORDER : []
}

function adminIds(users: User[]): string[] {
  return users.filter((user) => user.role === 'admin' && user.status !== 'suspended').map((u) => u.id)
}

/** Standing down the only administrator would lock everyone out of the app. */
export function isLastAdmin(target: Pick<User, 'id' | 'role'>, users: User[]): boolean {
  if (target.role !== 'admin') return false
  return adminIds(users).filter((id) => id !== target.id).length === 0
}

export function canChangeRole(
  viewer: Viewer | null | undefined,
  target: Pick<User, 'id' | 'role'>,
  users: User[],
): boolean {
  if (!canManageUsers(viewer)) return false
  if (viewer?.id === target.id) return false
  return !isLastAdmin(target, users)
}

export function canSuspendUser(
  viewer: Viewer | null | undefined,
  target: Pick<User, 'id' | 'role'>,
  users: User[],
): boolean {
  if (!canManageUsers(viewer)) return false
  if (viewer?.id === target.id) return false
  // Suspending the last administrator would be just as final as demoting them.
  return !isLastAdmin(target, users)
}

export function canAdjustPoints(
  viewer: Viewer | null | undefined,
  target: Pick<User, 'id'>,
): boolean {
  return canManageUsers(viewer) && viewer?.id !== target.id
}

/**
 * Whether an account may take part at all: sign in, post, submit places.
 * Everyone else is blocked from user-generated content by the services.
 */
export function isActive(user: Pick<User, 'status'> | null | undefined): boolean {
  return user?.status !== 'suspended'
}
