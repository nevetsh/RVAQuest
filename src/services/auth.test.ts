import { beforeEach, describe, expect, it } from 'vitest'
import { getState, resetAllData, setState } from './store'
import { hashPassword, verifyPasswordHash } from '../rules/auth'
import { changePassword, getSignedInUser, signIn, signOut } from './auth'
import { switchUser } from './index'
import { setUserSuspended } from './admin'

/** Phase 7 — the session itself: opening it, closing it, and surviving a reset. */

beforeEach(() => {
  // resetAllData keeps a live session, so close it explicitly between tests.
  resetAllData()
  signOut()
})

describe('signing in', () => {
  it('starts every fresh seed signed out', () => {
    expect(getState().signedInUserId).toBeNull()
    expect(getSignedInUser()).toBeNull()
  })

  it('opens the session and points the screens at the same account', () => {
    const result = signIn('nevetsh', 'Hollyduck123!')

    expect(result.ok).toBe(true)
    expect(getState().signedInUserId).toBe('nevetsh')
    expect(getState().currentUserId).toBe('nevetsh')
    expect(getSignedInUser()?.name).toBe('Steven Huynh')
    expect(getSignedInUser()?.role).toBe('admin')
  })

  it('leaves the session closed on a wrong password', () => {
    const result = signIn('nevetsh', 'almost')

    expect(result).toEqual({ ok: false, error: 'wrong-password' })
    expect(getState().signedInUserId).toBeNull()
  })

  it('leaves the session closed for an unknown username', () => {
    expect(signIn('ghost', 'Hollyduck123!')).toEqual({ ok: false, error: 'unknown-username' })
    expect(getSignedInUser()).toBeNull()
  })

  it('keeps the current session when a later sign-in fails', () => {
    signIn('nevetsh', 'Hollyduck123!')
    signIn('casey', 'wrong')

    expect(getSignedInUser()?.id).toBe('nevetsh')
  })

  it('upgrades a legacy digest the moment the account signs in (VULN-001)', () => {
    // Put the old 8-hex digest every earlier build wrote into the store.
    setState((state) => ({
      ...state,
      users: state.users.map((user) =>
        user.id === 'jordan' ? { ...user, passwordHash: hashPassword('rvaquest') } : user,
      ),
    }))

    expect(signIn('jordan', 'rvaquest').ok).toBe(true)

    const stored = getState().users.find((user) => user.id === 'jordan')?.passwordHash ?? ''
    expect(stored.startsWith('v2$')).toBe(true)
    expect(verifyPasswordHash(stored, 'rvaquest')).toBe(true)
    // …and the upgraded digest still signs the account in.
    signOut()
    expect(signIn('jordan', 'rvaquest').ok).toBe(true)
  })

  it('refuses a suspended account', () => {
    const suspended = setUserSuspended('nevetsh', 'casey', true)
    expect(suspended.ok).toBe(true)

    expect(signIn('casey', 'rvaquest')).toEqual({ ok: false, error: 'suspended' })
    expect(getSignedInUser()).toBeNull()
  })
})

describe('signing out', () => {
  it('closes the session but keeps the account and its data', () => {
    signIn('jordan', 'rvaquest')
    const points = getSignedInUser()?.points

    signOut()

    expect(getState().signedInUserId).toBeNull()
    expect(getSignedInUser()).toBeNull()
    expect(getState().users.find((user) => user.id === 'jordan')?.points).toBe(points)
    expect(getState().currentUserId).toBe('jordan')
  })

  it('is a no-op when nobody is signed in', () => {
    signOut()
    expect(getState().signedInUserId).toBeNull()
  })

  it('does not touch saved quests or the audit log', () => {
    signIn('jordan', 'rvaquest')
    const before = JSON.stringify({
      favorites: getState().users.find((user) => user.id === 'jordan')?.favoriteQuestIds,
      audit: getState().auditLog.length,
    })

    signOut()

    const after = JSON.stringify({
      favorites: getState().users.find((user) => user.id === 'jordan')?.favoriteQuestIds,
      audit: getState().auditLog.length,
    })
    expect(after).toBe(before)
  })
})

describe('changing your own password', () => {
  it('refuses a change while signed out', () => {
    const result = changePassword('rvaquest', 'new-one', 'new-one')

    expect(result).toEqual({ ok: false, error: 'not-signed-in' })
  })

  it('rewrites only the signed-in account, and keeps the session open', () => {
    signIn('jordan', 'rvaquest')
    const danaBefore = getState().users.find((user) => user.id === 'dana')?.passwordHash

    expect(changePassword('rvaquest', 'new-rvaquest', 'new-rvaquest')).toEqual({ ok: true })

    expect(getSignedInUser()?.id).toBe('jordan')
    expect(getState().users.find((user) => user.id === 'dana')?.passwordHash).toBe(danaBefore)
    // The new password works through the real sign-in path, the old one does not.
    signOut()
    expect(signIn('jordan', 'new-rvaquest').ok).toBe(true)
    signOut()
    expect(signIn('jordan', 'rvaquest')).toEqual({ ok: false, error: 'wrong-password' })
  })

  it('leaves the stored digest alone when the current password is wrong', () => {
    signIn('jordan', 'rvaquest')
    const before = getState().users.find((user) => user.id === 'jordan')?.passwordHash

    expect(changePassword('almost', 'new-rvaquest', 'new-rvaquest')).toEqual({
      ok: false,
      error: 'wrong-current',
    })

    expect(getState().users.find((user) => user.id === 'jordan')?.passwordHash).toBe(before)
    expect(getState().signedInUserId).toBe('jordan')
  })

  it('keeps the account’s points, favourites and submissions untouched', () => {
    signIn('jordan', 'rvaquest')
    const before = getState().users.find((user) => user.id === 'jordan')

    changePassword('rvaquest', 'new-rvaquest', 'new-rvaquest')

    const after = getState().users.find((user) => user.id === 'jordan')
    expect({ ...after, passwordHash: 'ignored' }).toEqual({ ...before, passwordHash: 'ignored' })
    expect(after?.passwordHash).not.toBe(before?.passwordHash)
  })

  it('never writes to the currentUserId pointer or the audit log', () => {
    signIn('casey', 'rvaquest')
    const auditBefore = getState().auditLog.length

    changePassword('rvaquest', 'casey-secret', 'casey-secret')

    expect(getState().currentUserId).toBe('casey')
    expect(getState().auditLog).toHaveLength(auditBefore)
  })
})

describe('the prototype switchUser shortcut', () => {
  it('signs the browser in as the target account', () => {
    switchUser('dana')

    expect(getState().signedInUserId).toBe('dana')
    expect(getState().currentUserId).toBe('dana')
    expect(getSignedInUser()?.name).toBe('Dana Whitfield')
  })

  it('ignores an unknown user id', () => {
    signIn('nevetsh', 'Hollyduck123!')
    switchUser('nobody')

    expect(getSignedInUser()?.id).toBe('nevetsh')
  })
})

describe('resetting the demo data', () => {
  it('keeps a session whose account still exists in the seed', () => {
    signIn('nevetsh', 'Hollyduck123!')
    resetAllData()

    expect(getState().signedInUserId).toBe('nevetsh')
    expect(getSignedInUser()?.name).toBe('Steven Huynh')
    expect(getState().auditLog).toHaveLength(2)
  })
})
