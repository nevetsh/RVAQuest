// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { LoginPage } from './LoginPage'
import { getState, resetAllData } from '../services/store'
import { getSignedInUser, signOut } from '../services/auth'
import { loginErrorMessage } from '../rules/auth'
import { SEED_ACCOUNTS } from '../services/seed'

/** Phase 7 — the gate itself, driven through real user events. */

// Globals are off in this project, so the automatic cleanup hook is not registered.
afterEach(cleanup)

beforeEach(() => {
  resetAllData()
  signOut()
})

function renderLogin() {
  return render(<LoginPage />)
}

async function submitForm(username?: string, password?: string) {
  const user = userEvent.setup()
  if (username !== undefined) await user.type(screen.getByLabelText(/username/i), username)
  if (password !== undefined) await user.type(screen.getByLabelText(/^password$/i), password)
  await user.click(screen.getByRole('button', { name: /^sign in$/i }))
}

describe('LoginPage — the sign-in gate', () => {
  it('renders the sign-in screen and nothing from the app shell', () => {
    renderLogin()

    expect(screen.getByRole('heading', { level: 1, name: /sign in/i })).toBeTruthy()
    // No app navigation (and therefore no shell, routes or Dev tools) is mounted.
    expect(screen.queryByRole('navigation', { name: /main navigation/i })).toBeNull()
    expect(getState().signedInUserId).toBeNull()
  })

  it('refuses an empty form without touching the session', async () => {
    renderLogin()
    await submitForm()

    expect(screen.getByRole('alert').textContent).toMatch(/enter your username and password/i)
    expect(getState().signedInUserId).toBeNull()
  })

  it('answers a wrong password with the generic message', async () => {
    renderLogin()
    await submitForm('nevetsh', 'almost')

    expect(screen.getByRole('alert').textContent).toBe(loginErrorMessage('wrong-password'))
    expect(getState().signedInUserId).toBeNull()
  })

  it('answers an unknown username the same way, so accounts cannot be probed', async () => {
    renderLogin()
    await submitForm('ghost', 'Hollyduck123!')

    expect(screen.getByRole('alert').textContent).toBe(loginErrorMessage('unknown-username'))
    expect(getState().signedInUserId).toBeNull()
  })

  it('signs Steven Huynh in as an administrator', async () => {
    renderLogin()
    await submitForm('nevetsh', 'Hollyduck123!')

    expect(screen.queryByRole('alert')).toBeNull()
    expect(getState().signedInUserId).toBe('nevetsh')
    expect(getSignedInUser()?.name).toBe('Steven Huynh')
    expect(getSignedInUser()?.role).toBe('admin')
  })

  it('fills the form from the demo account list', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /Steven Huynh/ }))

    expect((screen.getByLabelText(/username/i) as HTMLInputElement).value).toBe('nevetsh')
    expect((screen.getByLabelText(/^password$/i) as HTMLInputElement).value).toBe('Hollyduck123!')

    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(getState().signedInUserId).toBe('nevetsh')
  })

  it('names the demo accounts without printing their passwords', () => {
    renderLogin()
    const list = screen.getByRole('region', { name: /demo accounts/i })

    expect(list.textContent).toMatch(/Steven Huynh/)
    expect(list.textContent).toMatch(/nevetsh/)
    expect(list.textContent).toMatch(/Administrator/)
    // The secrets stay in the README (and, honestly, in the bundle: VULN-006).
    for (const account of SEED_ACCOUNTS) {
      expect(list.textContent).not.toContain(account.password)
    }
  })
})
