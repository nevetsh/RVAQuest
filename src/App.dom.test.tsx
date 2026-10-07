// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import App from './App'
import { LocationProvider } from './app/LocationProvider'
import { signOut } from './services/auth'
import { getState, resetAllData } from './services/store'

/**
 * Phase 7 — the requirement at the app level: nothing in the product (routes,
 * shell or Dev tools) is reachable until somebody signs in, and signing out
 * puts the gate back up.
 */

// Globals are off in this project, so the automatic cleanup hook is not registered.
afterEach(cleanup)

beforeEach(() => {
  resetAllData()
  signOut()
})

/** Renders the real `App` at a URL, the same way `main.tsx` mounts it. */
function renderAppAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProvider>
        <App />
      </LocationProvider>
    </MemoryRouter>,
  )
}

async function signInAs(username: string, password: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/username/i), username)
  await user.type(screen.getByLabelText(/^password$/i), password)
  await user.click(screen.getByRole('button', { name: /^sign in$/i }))
}

describe('App — the signed-out gate', () => {
  it('replaces a deep link with the sign-in screen and mounts no app chrome', () => {
    renderAppAt('/admin')

    expect(screen.getByRole('heading', { level: 1, name: /sign in/i })).toBeTruthy()
    // The console the URL asked for is not rendered…
    expect(screen.queryByRole('heading', { name: /admin & manager/i })).toBeNull()
    // …and neither is the shell, its navigation or the prototype Dev tools.
    expect(screen.queryByRole('navigation', { name: /main navigation/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /dev tools/i })).toBeNull()
    expect(getState().signedInUserId).toBeNull()
  })

  it('opens the deep-linked screen, Dev tools included, once the administrator signs in', async () => {
    renderAppAt('/admin')
    await signInAs('nevetsh', 'Hollyduck123!')

    expect(screen.getByRole('heading', { name: /admin & manager/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /dev tools/i })).toBeTruthy()
    expect(getState().signedInUserId).toBe('nevetsh')
  })

  it('signing out puts the gate back and forgets the URL the last account opened', async () => {
    const user = userEvent.setup()
    renderAppAt('/admin')
    await signInAs('nevetsh', 'Hollyduck123!')

    await user.click(screen.getByRole('button', { name: /sign out of steven huynh/i }))

    expect(screen.getByRole('heading', { level: 1, name: /sign in/i })).toBeTruthy()
    expect(getState().signedInUserId).toBeNull()

    // A different account signs in and lands on the quest list, not on the
    // console the previous person was looking at.
    await signInAs('jordan', 'rvaquest')
    expect(screen.getByRole('heading', { name: /outdoor quests/i })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /admin & manager/i })).toBeNull()
  })
})
