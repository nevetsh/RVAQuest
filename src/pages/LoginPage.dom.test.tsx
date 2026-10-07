// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
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
    await submitForm('admin', 'almost')

    expect(screen.getByRole('alert').textContent).toBe(loginErrorMessage('wrong-password'))
    expect(getState().signedInUserId).toBeNull()
  })

  it('answers an unknown username the same way, so accounts cannot be probed', async () => {
    renderLogin()
    await submitForm('ghost', 'wrong-one')

    expect(screen.getByRole('alert').textContent).toBe(loginErrorMessage('unknown-username'))
    expect(getState().signedInUserId).toBeNull()
  })

  it('signs the admin test account in as an administrator', async () => {
    renderLogin()
    await submitForm('admin', 'admin')

    expect(screen.queryByRole('alert')).toBeNull()
    expect(getState().signedInUserId).toBe('admin')
    expect(getSignedInUser()?.name).toBe('Admin')
    expect(getSignedInUser()?.role).toBe('admin')
  })

  it('fills the form from the demo account list', async () => {
    const user = userEvent.setup()
    renderLogin()

    // Each demo button's accessible name runs its display name, username and role
    // together, so it is matched on the display name that leads it.
    const list = screen.getByRole('region', { name: /demo accounts/i })
    await user.click(within(list).getByRole('button', { name: /^Admin/ }))

    expect((screen.getByLabelText(/username/i) as HTMLInputElement).value).toBe('admin')
    expect((screen.getByLabelText(/^password$/i) as HTMLInputElement).value).toBe('admin')

    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(getState().signedInUserId).toBe('admin')
  })

  it('names the demo accounts without printing their passwords', () => {
    renderLogin()
    const list = screen.getByRole('region', { name: /demo accounts/i })

    expect(list.textContent).toMatch(/Admin/)
    expect(list.textContent).toMatch(/Administrator/)
    // No password reaches the screen (the demo ones do ship in the bundle: VULN-006).
    // The test account's password is its own username, so it is the one account
    // whose secret cannot be told apart from its label on this list.
    for (const account of SEED_ACCOUNTS) {
      if (account.password === account.username) continue
      expect(list.textContent).not.toContain(account.password)
    }
  })
})
