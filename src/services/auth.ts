import type { User } from './types'
import { getState, setState } from './store'
import {
  createPasswordHash,
  needsPasswordRehash,
  verifyCredentials,
  verifyPasswordChange,
  type LoginResult,
  type PasswordChangeFailure,
} from '../rules/auth'

/**
 * Phase 7 — the sign-in session.
 *
 * `signedInUserId` is the only thing that decides whether the gate is up. The
 * account it points at is always read from the store, so switching users in
 * the Dev tools and an administrator suspending an account are both reflected
 * without keeping a second copy of the session anywhere.
 */

export type SignInResult = LoginResult

/** Checks the credentials and, when they pass, opens the session. */
export function signIn(username: string, password: string): SignInResult {
  const result = verifyCredentials(getState().users, username, password)
  if (!result.ok) return result

  // A digest written before salting (VULN-001 in docs/security-review.md) is
  // upgraded here, because a successful sign-in is the only moment the
  // plaintext is available to rehash.
  const upgraded = needsPasswordRehash(result.user.passwordHash)
    ? createPasswordHash(password)
    : null

  setState((state) => ({
    ...state,
    users: upgraded
      ? state.users.map((user) =>
          user.id === result.user.id ? { ...user, passwordHash: upgraded } : user,
        )
      : state.users,
    signedInUserId: result.user.id,
    // Keep the "data on screen" pointer on the same account, so components
    // that read the current user directly (profile, permissions) agree with
    // the session.
    currentUserId: result.user.id,
  }))

  return result
}

/** Closes the session. The account and its data are untouched. */
export function signOut(): void {
  setState((state) => (state.signedInUserId === null ? state : { ...state, signedInUserId: null }))
}

/** The signed-in account, or null while the sign-in gate is up. */
export function getSignedInUser(): User | null {
  const { users, signedInUserId } = getState()
  if (!signedInUserId) return null
  return users.find((user) => user.id === signedInUserId) ?? null
}

export type ChangePasswordResult = { ok: true } | { ok: false; error: PasswordChangeFailure }

/**
 * Lets the signed-in account rotate its own password (Phase 7).
 *
 * Only the caller's own record is written and only its `passwordHash` changes,
 * so points, favourites, submissions and the session itself are untouched. A
 * change is refused while signed out: there is no account to verify the
 * current password against, and every change path starts from an account the
 * browser is already using.
 */
export function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmation: string,
): ChangePasswordResult {
  const { users, signedInUserId } = getState()
  const account = users.find((user) => user.id === signedInUserId)
  if (!account) return { ok: false, error: 'not-signed-in' }

  const checked = verifyPasswordChange(account, currentPassword, newPassword, confirmation)
  if (!checked.ok) return checked

  setState((state) => ({
    ...state,
    users: state.users.map((user) =>
      user.id === account.id ? { ...user, passwordHash: checked.passwordHash } : user,
    ),
  }))

  return { ok: true }
}
