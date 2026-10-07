// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { ProfilePage } from './ProfilePage'
import { loginErrorMessage, verifyPasswordHash } from '../rules/auth'
import { signIn, signOut } from '../services/auth'
import { getState, resetAllData } from '../services/store'

/** Phase 7 — the profile's password form, driven through real user events. */

// Globals are off in this project, so the automatic cleanup hook is not registered.
afterEach(cleanup)

beforeEach(() => {
  resetAllData()
  signOut()
  signIn('jordan', 'rvaquest')
})

function renderProfile() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  )
}

function jordan(): string | undefined {
  return getState().users.find((user) => user.id === 'jordan')?.passwordHash
}

async function updatePassword(current: string, next: string, confirmation: string) {
  const user = userEvent.setup()
  if (current) await user.type(screen.getByLabelText(/^current password$/i), current)
  if (next) await user.type(screen.getByLabelText(/^new password$/i), next)
  if (confirmation) await user.type(screen.getByLabelText(/^confirm new password$/i), confirmation)
  await user.click(screen.getByRole('button', { name: /^update password$/i }))
}

describe('ProfilePage — changing your own password', () => {
  it('stores the new password and confirms it, without closing the session', async () => {
    renderProfile()
    await updatePassword('rvaquest', 'new-rvaquest', 'new-rvaquest')

    expect(screen.getByRole('status').textContent).toMatch(/password updated/i)
    // The stored digest is salted (VULN-001), so it is verified, not compared.
    expect(verifyPasswordHash(jordan() ?? '', 'new-rvaquest')).toBe(true)
    expect(jordan()?.startsWith('v2$')).toBe(true)
    expect(getState().signedInUserId).toBe('jordan')
    // The form is emptied, so the new password is not left on screen.
    expect((screen.getByLabelText(/^current password$/i) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText(/^new password$/i) as HTMLInputElement).value).toBe('')
  })

  it('answers a wrong current password with the sign-in screen’s wording', async () => {
    renderProfile()
    const before = jordan()
    await updatePassword('almost', 'new-rvaquest', 'new-rvaquest')

    expect(screen.getByRole('alert').textContent).toBe(loginErrorMessage('wrong-password'))
    expect(jordan()).toBe(before)
  })

  it('asks for the new password twice', async () => {
    renderProfile()
    const before = jordan()
    await updatePassword('rvaquest', 'new-rvaquest', 'new-rvaquest-typo')

    expect(screen.getByRole('alert').textContent).toMatch(/do not match/i)
    expect(jordan()).toBe(before)
  })

  it('refuses to set the password that is already in use', async () => {
    renderProfile()
    await updatePassword('rvaquest', 'rvaquest', 'rvaquest')

    expect(screen.getByRole('alert').textContent).toMatch(/already your password/i)
  })
})
