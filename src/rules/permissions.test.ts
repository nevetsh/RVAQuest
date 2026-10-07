import { describe, expect, it } from 'vitest'
import type { Role, User } from '../services/types'
import {
  adminTabsFor,
  assignableRoles,
  can,
  canAccessConsole,
  canAdjustPoints,
  canChangeRole,
  canManageQuests,
  canManageSettings,
  canManageUsers,
  canModerateForum,
  canResetData,
  canReviewPlaces,
  canSuspendUser,
  canViewAuditLog,
  capabilitiesFor,
  isActive,
  isAdminTab,
  isAtLeast,
  isLastAdmin,
  ROLE_LABELS,
  ROLE_ORDER,
} from './permissions'

/** Phase 6 acceptance tests: the role ladder and who may manage what. */

function user(id: string, role: Role, status: User['status'] = 'active'): User {
  return {
    id,
    name: id,
    username: id,
    passwordHash: 'demo-hash',
    role,
    points: 0,
    streak: 0,
    favoriteQuestIds: [],
    status,
  }
}

const ADMIN = user('alex', 'admin')
const MANAGER = user('morgan', 'manager')
const MOD = user('dana', 'moderator')
const EXPLORER = user('jordan', 'user')

describe('the role ladder', () => {
  it('ranks explorer < moderator < manager < administrator', () => {
    expect(ROLE_ORDER).toEqual(['user', 'moderator', 'manager', 'admin'])
    expect(isAtLeast('admin', 'manager')).toBe(true)
    expect(isAtLeast('moderator', 'manager')).toBe(false)
    expect(isAtLeast('manager', 'moderator')).toBe(true)
    expect(isAtLeast('user', 'user')).toBe(true)
  })

  it('labels every role for the UI', () => {
    expect(ROLE_LABELS.admin).toBe('Administrator')
    expect(ROLE_LABELS.user).toBe('Explorer')
  })
})

describe('capabilities', () => {
  it('gives an explorer nothing', () => {
    expect(capabilitiesFor('user')).toEqual([])
    expect(canAccessConsole(EXPLORER)).toBe(false)
    expect(adminTabsFor(EXPLORER)).toEqual([])
    expect(can('manageQuests', EXPLORER)).toBe(false)
  })

  it('gives a moderator the two review queues', () => {
    expect(canModerateForum(MOD)).toBe(true)
    expect(canReviewPlaces(MOD)).toBe(true)
    expect(canManageQuests(MOD)).toBe(false)
    expect(adminTabsFor(MOD)).toEqual(['overview', 'content'])
  })

  it('gives a manager quest management on top of moderation', () => {
    expect(canManageQuests(MANAGER)).toBe(true)
    expect(canModerateForum(MANAGER)).toBe(true)
    expect(canViewAuditLog(MANAGER)).toBe(true)
    // …but not user accounts or the app settings.
    expect(canManageUsers(MANAGER)).toBe(false)
    expect(canManageSettings(MANAGER)).toBe(false)
    expect(adminTabsFor(MANAGER)).toEqual(['overview', 'quests', 'content', 'activity'])
  })

  it('gives an administrator everything', () => {
    const adminCapabilities = capabilitiesFor('admin')
    for (const role of ROLE_ORDER) {
      for (const capability of capabilitiesFor(role)) {
        expect(adminCapabilities).toContain(capability)
      }
    }
    expect(canManageUsers(ADMIN)).toBe(true)
    expect(canManageSettings(ADMIN)).toBe(true)
    expect(canResetData(ADMIN)).toBe(true)
    expect(adminTabsFor(ADMIN)).toEqual([
      'overview',
      'users',
      'quests',
      'content',
      'settings',
      'activity',
    ])
  })

  it('refuses everything for a missing viewer', () => {
    expect(can('manageUsers', null)).toBe(false)
    expect(canAccessConsole(undefined)).toBe(false)
  })

  it('strips capabilities from a suspended account, whatever its role', () => {
    const suspended = user('alex', 'admin', 'suspended')

    expect(can('manageUsers', suspended)).toBe(false)
    expect(canModerateForum(suspended)).toBe(false)
    expect(canAccessConsole(suspended)).toBe(false)
    expect(isActive(suspended)).toBe(false)
    expect(isActive(ADMIN)).toBe(true)
  })
})

describe('assignable roles', () => {
  it('is empty for anyone but an administrator', () => {
    expect(assignableRoles(MANAGER)).toEqual([])
    expect(assignableRoles(MOD)).toEqual([])
    expect(assignableRoles(ADMIN)).toEqual(ROLE_ORDER)
  })
})

describe('changing and suspending accounts', () => {
  const users = [ADMIN, MANAGER, MOD, EXPLORER]

  it('lets an administrator promote an explorer, but not themselves', () => {
    expect(canChangeRole(ADMIN, EXPLORER, users)).toBe(true)
    expect(canChangeRole(ADMIN, ADMIN, users)).toBe(false)
  })

  it('stops a manager or moderator changing roles at all', () => {
    expect(canChangeRole(MANAGER, EXPLORER, users)).toBe(false)
    expect(canChangeRole(MOD, EXPLORER, users)).toBe(false)
  })

  it('protects the last active administrator', () => {
    expect(isLastAdmin(ADMIN, users)).toBe(true)
    expect(canChangeRole(ADMIN, ADMIN, users)).toBe(false)

    const twoAdmins = [...users, user('sam', 'admin')]
    expect(isLastAdmin(ADMIN, twoAdmins)).toBe(false)
    expect(canChangeRole(ADMIN, ADMIN, twoAdmins)).toBe(false) // still self
    expect(canChangeRole(user('sam', 'admin'), ADMIN, twoAdmins)).toBe(true)
  })

  it('will not let an administrator suspend themselves or the last admin', () => {
    expect(canSuspendUser(ADMIN, EXPLORER, users)).toBe(true)
    expect(canSuspendUser(ADMIN, ADMIN, users)).toBe(false)
    expect(canSuspendUser(MANAGER, EXPLORER, users)).toBe(false)
  })

  it('adjusts points for others only', () => {
    expect(canAdjustPoints(ADMIN, EXPLORER)).toBe(true)
    expect(canAdjustPoints(ADMIN, ADMIN)).toBe(false)
    expect(canAdjustPoints(MANAGER, EXPLORER)).toBe(false)
  })
})

describe('admin tab parsing', () => {
  it('only accepts the known tabs', () => {
    expect(isAdminTab('users')).toBe(true)
    expect(isAdminTab('activity')).toBe(true)
    expect(isAdminTab('secrets')).toBe(false)
    expect(isAdminTab(null)).toBe(false)
  })
})
