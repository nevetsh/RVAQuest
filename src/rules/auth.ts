import type { User } from '../services/types'

/**
 * Phase 7 — account sign-in rules.
 *
 * The prototype has no server, so these functions run in the browser against
 * the seeded account list in localStorage. That means the "security" is
 * simulated: passwords are compared through `verifyPasswordHash`, and the
 * sign-in screen deliberately answers the same way for an unknown username and
 * a wrong password, so the copy never reveals which accounts exist. Digests are
 * salted and stretched (`createPasswordHash`) — a fix from the security review
 * in `docs/security-review.md` — but authorization itself cannot be enforced
 * without a server; see interpretation 16 in `docs/traceability.md`.
 */

export type LoginFailure = 'unknown-username' | 'wrong-password' | 'suspended'

export type LoginResult =
  | { ok: true; user: User }
  | { ok: false; error: LoginFailure }

/** Usernames are case- and whitespace-insensitive, like place names (BR03). */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

const HASH_PREFIX = 'rva-quest:'

/**
 * The v1 digest: FNV-1a over `rva-quest:<password>`, 8 hex digits.
 *
 * A security review recovered every seeded password from these digests in
 * milliseconds (`docs/security-review.md`, VULN-001): unsalted, unstretched and
 * only 32 bits, so one table cracks every account that reused a password. It is
 * kept in the source only so a payload written by an older build can still be
 * verified and then upgraded — see `verifyPasswordHash` and
 * `needsPasswordRehash`. Nothing new is ever hashed this way.
 */
export function hashPassword(password: string): string {
  const input = `${HASH_PREFIX}${password}`
  let hash = 0x811c9dc5

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** The stored format of the digest the app writes today: `v2$<salt>$<digest>`. */
export const HASH_VERSION = 'v2'

const SALT_BYTES = 16

/**
 * Stretching rounds. One round is a full pass over `salt:digest:password`, and
 * two independent lanes are mixed, so a candidate costs ~40k mixed operations
 * instead of ~20 — enough that the offline recovery that took 62 ms against the
 * v1 digest no longer finishes in a browser session.
 */
const HASH_ROUNDS = 10_000

function fnv1a(input: string, seed = 0x811c9dc5): number {
  let hash = seed
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * A fresh 16-byte salt as 32 hex digits. `crypto.getRandomValues` is the real
 * source; the `Math.random` fallback exists only for a platform without Web
 * Crypto (it never runs in a browser or in Node 20+).
 */
export function randomSalt(): string {
  const bytes = new Uint8Array(SALT_BYTES)
  const webCrypto = globalThis.crypto

  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * The digest the app writes today: per-account salt + 10k stretching rounds + a
 * 64-bit result. Still not a real KDF — a browser-only prototype has no server
 * to run bcrypt/argon2 on, and whoever holds the browser can read the salt —
 * but it removes the two flaws that made v1 trivially reversible: the digest is
 * no longer computable in advance, and two accounts with the same password no
 * longer share a digest.
 *
 * A deployed build would POST the password over TLS and hash it server-side.
 */
export function createPasswordHash(password: string, salt = randomSalt()): string {
  let laneA = fnv1a(`${salt}:${password}`)
  let laneB = fnv1a(`${password}:${salt}`, 0x9e3779b9)

  for (let round = 0; round < HASH_ROUNDS; round += 1) {
    laneA = fnv1a(`${salt}:${laneA}:${password}`)
    laneB = fnv1a(`${laneB}:${password}:${salt}:${laneA}`)
  }

  const digest = `${laneA.toString(16).padStart(8, '0')}${laneB.toString(16).padStart(8, '0')}`
  return `${HASH_VERSION}$${salt}$${digest}`
}

/**
 * Verifies a stored digest in either format, so an account seeded by an older
 * build still signs in. The comparison is a plain string compare on purpose: an
 * attacker who can measure it already has the digest and the salt locally, and
 * constant-time work cannot be demonstrated in a client-only app.
 */
export function verifyPasswordHash(stored: string, password: string): boolean {
  const parts = stored.split('$')
  if (parts.length === 3 && parts[0] === HASH_VERSION) {
    return createPasswordHash(password, parts[1]) === stored
  }

  return stored === hashPassword(password)
}

/** True for a digest written before salting existed, so the service can upgrade it. */
export function needsPasswordRehash(stored: string): boolean {
  return !stored.startsWith(`${HASH_VERSION}$`)
}

/** The account for a username, or null. An empty username never matches. */
export function findAccountByUsername(users: readonly User[], username: string): User | null {
  const wanted = normalizeUsername(username)
  if (!wanted) return null
  return users.find((user) => normalizeUsername(user.username) === wanted) ?? null
}

/**
 * The one credential check. The password is verified before suspension is
 * reported, so guessing passwords cannot discover which accounts are suspended.
 */
export function verifyCredentials(
  users: readonly User[],
  username: string,
  password: string,
): LoginResult {
  const account = findAccountByUsername(users, username)
  if (!account) return { ok: false, error: 'unknown-username' }
  if (!verifyPasswordHash(account.passwordHash, password)) {
    return { ok: false, error: 'wrong-password' }
  }
  if (account.status === 'suspended') return { ok: false, error: 'suspended' }
  return { ok: true, user: account }
}

/**
 * Wording for the sign-in screen. Unknown usernames and wrong passwords share
 * one message on purpose (account privacy).
 */
export const LOGIN_ERROR_MESSAGES: Record<LoginFailure, string> = {
  'unknown-username':
    'That username and password do not match an account. Check them and try again.',
  'wrong-password':
    'That username and password do not match an account. Check them and try again.',
  suspended:
    'This account has been suspended. An administrator has to restore it before you can sign in.',
}

export function loginErrorMessage(error: LoginFailure): string {
  return LOGIN_ERROR_MESSAGES[error]
}

/**
 * Changing your own password (Phase 7).
 *
 * The form asks for the current password as well as the new one twice; the
 * checks run in this order, so an incomplete form is answered before the
 * credential check and a typo in the current password can never half-apply a
 * change:
 *
 * 1. both new fields are filled, 2. they match, 3. the current password is
 * right, 4. the new password is actually different.
 *
 * There is deliberately no length or complexity policy: the SRS defines none
 * and the sign-in gate enforces none either, so inventing one here would be a
 * rule the rest of the prototype does not know about (interpretation 15).
 */
export type PasswordChangeFailure =
  | 'wrong-current'
  | 'missing-new'
  | 'mismatch'
  | 'unchanged'
  | 'not-signed-in'

export type PasswordChangeResult =
  | { ok: true; passwordHash: string }
  | { ok: false; error: PasswordChangeFailure }

export const PASSWORD_CHANGE_MESSAGES: Record<PasswordChangeFailure, string> = {
  // A wrong current password gets the same wording as a failed sign-in, so the
  // one credential check in the app has one story.
  'wrong-current': LOGIN_ERROR_MESSAGES['wrong-password'],
  'missing-new': 'Enter your new password twice.',
  mismatch: 'The two new passwords do not match.',
  unchanged: 'That is already your password. Choose a different one.',
  'not-signed-in': 'Sign in before changing a password.',
}

export function passwordChangeErrorMessage(error: PasswordChangeFailure): string {
  return PASSWORD_CHANGE_MESSAGES[error]
}

/**
 * The pure check behind the profile's password form: the current password is
 * verified against the account, the new one twice, and the digest of the new
 * password comes back for the caller to store.
 */
export function verifyPasswordChange(
  account: User,
  currentPassword: string,
  newPassword: string,
  confirmation: string,
): PasswordChangeResult {
  if (!newPassword || !confirmation) return { ok: false, error: 'missing-new' }
  if (newPassword !== confirmation) return { ok: false, error: 'mismatch' }
  if (!verifyPasswordHash(account.passwordHash, currentPassword)) {
    return { ok: false, error: 'wrong-current' }
  }
  if (newPassword === currentPassword) return { ok: false, error: 'unchanged' }

  // A change always writes the salted format, so it also upgrades a legacy digest.
  return { ok: true, passwordHash: createPasswordHash(newPassword) }
}
