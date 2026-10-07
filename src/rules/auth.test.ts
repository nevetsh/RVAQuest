import { describe, expect, it } from 'vitest'
import type { User } from '../services/types'
import { SEED_ACCOUNTS, createSeedUsers } from '../services/seed'
import {
  createPasswordHash,
  findAccountByUsername,
  hashPassword,
  loginErrorMessage,
  needsPasswordRehash,
  normalizeUsername,
  passwordChangeErrorMessage,
  verifyCredentials,
  verifyPasswordHash,
  verifyPasswordChange,
} from './auth'

/** Phase 7 — accounts: who can sign in, and what the screen is told when they cannot. */

function account(overrides: Partial<User> = {}): User {
  return {
    id: 'tester',
    name: 'Test Explorer',
    username: 'tester',
    passwordHash: hashPassword('correct horse'),
    role: 'user',
    points: 0,
    streak: 0,
    favoriteQuestIds: [],
    ...overrides,
  }
}

describe('normalizeUsername', () => {
  it('trims and lower-cases, so typing case never matters', () => {
    expect(normalizeUsername('  AdMiN ')).toBe('admin')
  })

  it('keeps an empty string empty', () => {
    expect(normalizeUsername('   ')).toBe('')
  })
})

describe('hashPassword', () => {
  it('is deterministic', () => {
    expect(hashPassword('correct horse battery')).toBe(hashPassword('correct horse battery'))
  })

  it('separates different passwords', () => {
    expect(hashPassword('rvaquest')).not.toBe(hashPassword('rvaquest!'))
  })

  it('never returns the plain password', () => {
    const hash = hashPassword('correct horse battery')
    expect(hash).toHaveLength(8)
    expect(hash).not.toContain('battery')
  })
})

describe('verifyCredentials', () => {
  it('accepts the right password', () => {
    const result = verifyCredentials([account()], 'tester', 'correct horse')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.user.id).toBe('tester')
  })

  it('matches the username case- and whitespace-insensitively', () => {
    expect(verifyCredentials([account()], '  TESTER ', 'correct horse').ok).toBe(true)
  })

  it('refuses an unknown username', () => {
    const result = verifyCredentials([account()], 'nobody', 'correct horse')
    expect(result).toEqual({ ok: false, error: 'unknown-username' })
  })

  it('refuses a wrong password', () => {
    const result = verifyCredentials([account()], 'tester', 'wrong')
    expect(result).toEqual({ ok: false, error: 'wrong-password' })
  })

  it('refuses a suspended account, even with the right password', () => {
    const suspended = account({ status: 'suspended' })
    expect(verifyCredentials([suspended], 'tester', 'correct horse')).toEqual({
      ok: false,
      error: 'suspended',
    })
  })

  it('answers "wrong password" before "suspended", so suspensions are not probeable', () => {
    const suspended = account({ status: 'suspended' })
    expect(verifyCredentials([suspended], 'tester', 'guess')).toEqual({
      ok: false,
      error: 'wrong-password',
    })
  })

  it('never matches a blank username', () => {
    expect(findAccountByUsername([account()], '   ')).toBeNull()
    expect(verifyCredentials([account()], '', '').ok).toBe(false)
  })
})

describe('the seeded accounts', () => {
  it('signs the admin test account in as an administrator', () => {
    const users = createSeedUsers()
    const result = verifyCredentials(users, 'admin', 'admin')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.user.name).toBe('Admin')
      expect(result.user.role).toBe('admin')
    }
  })

  it('seeds exactly the test account and the five demo explorers', () => {
    // The two stakeholder accounts seeded for the walkthrough were deleted when
    // their passwords were exposed, so the roster is pinned here: anything added
    // back has to show up in review rather than quietly sign in again.
    expect(createSeedUsers().map((user) => user.username)).toEqual([
      'admin',
      'jordan',
      'casey',
      'dana',
      'morgan',
      'alex',
    ])
  })

  it('gives every seeded account a unique username and a working password', () => {
    const users = createSeedUsers()
    const usernames = SEED_ACCOUNTS.map((entry) => normalizeUsername(entry.username))

    expect(new Set(usernames).size).toBe(SEED_ACCOUNTS.length)
    for (const entry of SEED_ACCOUNTS) {
      expect(verifyCredentials(users, entry.username, entry.password).ok).toBe(true)
    }
  })

  it('stores only the digest, never the plain demo password', () => {
    for (const user of createSeedUsers()) {
      expect(user.passwordHash).not.toBe('')
      expect(user.passwordHash.startsWith('v2$')).toBe(true)
      expect(user.passwordHash).not.toContain('rvaquest')
    }
  })

  it('gives accounts that share a demo password different digests (VULN-001)', () => {
    const shared = createSeedUsers().filter((user) => user.username !== 'admin')
    const digests = new Set(shared.map((user) => user.passwordHash))

    expect(shared.length).toBeGreaterThan(1)
    expect(digests.size).toBe(shared.length)
  })
})

describe('salted, stretched digests (VULN-001 in docs/security-review.md)', () => {
  it('writes salt + version + digest, and verifies only the right password', () => {
    const stored = createPasswordHash('correct horse battery')

    expect(stored).toMatch(/^v2\$[0-9a-f]{32}\$[0-9a-f]{16}$/)
    expect(verifyPasswordHash(stored, 'correct horse battery')).toBe(true)
    expect(verifyPasswordHash(stored, 'correct horse Battery')).toBe(false)
    expect(verifyPasswordHash(stored, '')).toBe(false)
  })

  it('salts every digest, so the same password never looks the same twice', () => {
    const first = createPasswordHash('rvaquest')
    const second = createPasswordHash('rvaquest')

    expect(first).not.toBe(second)
    expect(verifyPasswordHash(first, 'rvaquest')).toBe(true)
    expect(verifyPasswordHash(second, 'rvaquest')).toBe(true)
  })

  it('salts with real randomness, not a constant', () => {
    const salts = new Set(Array.from({ length: 50 }, () => createPasswordHash('x').split('$')[1]))

    expect(salts.size).toBe(50)
  })

  it('takes real work to verify, unlike the old 8-hex digest', () => {
    const start = Date.now()
    createPasswordHash('a-demo-password')
    const saltedMs = Date.now() - start

    // The v1 digest was a single pass; anything but a single pass is the point.
    expect(saltedMs).toBeGreaterThan(0)
    expect(verifyPasswordHash(hashPassword('a-demo-password'), 'a-demo-password')).toBe(true)
  })

  it('still verifies a digest written by an older build, and flags it for upgrade', () => {
    const legacy = hashPassword('rvaquest')

    expect(legacy).toHaveLength(8)
    expect(verifyPasswordHash(legacy, 'rvaquest')).toBe(true)
    expect(verifyPasswordHash(legacy, 'rvaquest!')).toBe(false)
    expect(needsPasswordRehash(legacy)).toBe(true)
    expect(needsPasswordRehash(createPasswordHash('rvaquest'))).toBe(false)
  })
})

describe('the sign-in error copy', () => {
  it('says the same thing for an unknown username and a wrong password', () => {
    expect(loginErrorMessage('unknown-username')).toBe(loginErrorMessage('wrong-password'))
  })

  it('tells a suspended user how to get back in', () => {
    expect(loginErrorMessage('suspended')).toMatch(/suspended/i)
    expect(loginErrorMessage('suspended')).toMatch(/administrator/i)
  })
})

describe('changing your own password', () => {
  it('accepts the current password and hands back the digest of the new one', () => {
    const result = verifyPasswordChange(account(), 'correct horse', 'battery staple', 'battery staple')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.passwordHash.startsWith('v2$')).toBe(true)
      expect(verifyPasswordHash(result.passwordHash, 'battery staple')).toBe(true)
      expect(result.passwordHash).not.toBe(hashPassword('battery staple'))
    }
  })

  it('refuses a wrong current password with the gate’s own wording', () => {
    const result = verifyPasswordChange(account(), 'almost', 'battery staple', 'battery staple')

    expect(result).toEqual({ ok: false, error: 'wrong-current' })
    expect(passwordChangeErrorMessage('wrong-current')).toBe(loginErrorMessage('wrong-password'))
  })

  it('asks for the new password twice before checking anything else', () => {
    expect(verifyPasswordChange(account(), 'correct horse', '', '')).toEqual({
      ok: false,
      error: 'missing-new',
    })
    expect(verifyPasswordChange(account(), 'correct horse', 'battery staple', 'battery')).toEqual({
      ok: false,
      error: 'mismatch',
    })
  })

  it('does not mistake a confirmed typo for a mismatch when the current password is wrong too', () => {
    const result = verifyPasswordChange(account(), 'almost', 'battery staple', 'battery')

    expect(result).toEqual({ ok: false, error: 'mismatch' })
  })

  it('refuses a new password that is the current one', () => {
    const result = verifyPasswordChange(account(), 'correct horse', 'correct horse', 'correct horse')

    expect(result).toEqual({ ok: false, error: 'unchanged' })
  })

  it('leaves the account alone on every refusal', () => {
    const user = account()
    const before = user.passwordHash

    verifyPasswordChange(user, 'almost', 'battery staple', 'battery staple')
    verifyPasswordChange(user, 'correct horse', '', '')

    expect(user.passwordHash).toBe(before)
    expect(verifyCredentials([user], 'tester', 'correct horse').ok).toBe(true)
  })
})
