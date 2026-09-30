// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Leaflet never loads in jsdom; the queue's decisions are what is under test.
vi.mock('../components/map/LazyQuestMap', () => ({
  LazyQuestMap: () => <div data-testid="queue-map" />,
}))

import { ModeratorQueuePage } from './ModeratorQueuePage'
import { getState, resetAllData } from '../services/store'
import { switchUser } from '../services'
import { reviewPlace, submitPlace, withdrawSubmittedPlace } from '../services/places.service'
import type { PlaceDraft } from '../rules/places'

const DRAFT: PlaceDraft = {
  name: 'Shockoe Bottom Night Market',
  category: 'Food & Drink',
  address: '17th St',
  description: 'Friday evening stalls under the bridge.',
  location: { lat: 37.5312, lng: -77.4253 },
}

function renderQueue() {
  return render(
    <MemoryRouter>
      <ModeratorQueuePage />
    </MemoryRouter>,
  )
}

function pointsOf(userId: string): number {
  return getState().users.find((user) => user.id === userId)!.points
}

function placeById(id: string) {
  return getState().places.find((place) => place.id === id)!
}

/** The seed ships one pending suggestion; tests that count the queue clear it. */
function clearSeededQueue() {
  for (const place of getState().places.filter((entry) => entry.reviewStatus === 'pending')) {
    reviewPlace(place.id, 'dana', 'reject', 'cleared for this test')
  }
}

/** Files a pending suggestion as Casey and returns its id. */
function pendingSuggestion(): string {
  const submitted = submitPlace('casey', DRAFT)
  if (!submitted.ok) throw new Error('the test suggestion was refused')
  return submitted.place.id
}

// Globals are off in this project, so the automatic cleanup hook is not registered.
afterEach(cleanup)

beforeEach(() => {
  resetAllData()
  switchUser('dana')
  clearSeededQueue()
})

describe('ModeratorQueuePage — who may work the queue', () => {
  it('locks an explorer out of the review queue', () => {
    switchUser('jordan')
    renderQueue()

    expect(screen.getByText('Reviewers only')).toBeTruthy()
    expect(screen.queryByText('Moderation queue')).toBeNull()
  })

  it('lets a manager review places, not just a moderator (Phase 6 ladder)', () => {
    switchUser('morgan')
    renderQueue()

    expect(screen.queryByText('Reviewers only')).toBeNull()
    expect(screen.getByText('Moderation queue')).toBeTruthy()
    expect(screen.getByText('All caught up')).toBeTruthy()
  })

  it('shows the empty state when nothing is waiting', () => {
    renderQueue()

    expect(screen.getByText('All caught up')).toBeTruthy()
    expect(screen.getByText(/0 suggested places waiting/)).toBeTruthy()
  })
})

describe('ModeratorQueuePage — approving', () => {
  it('approves a suggestion, pays the submitter once and clears the queue', async () => {
    const user = userEvent.setup()
    const placeId = pendingSuggestion()
    const before = pointsOf('casey')

    renderQueue()
    expect(screen.getByText('Shockoe Bottom Night Market')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /approve place/i }))

    expect(screen.getByRole('status').textContent).toContain('Approved “Shockoe Bottom Night Market”')
    expect(placeById(placeId).reviewStatus).toBe('approved')
    // Casey is named in the receipt and in the store.
    expect(screen.getByRole('status').textContent).toContain('Casey Nguyen earns 25 pts')
    expect(pointsOf('casey')).toBe(before + 25)

    // The suggestion has left the queue.
    expect(screen.getByText('All caught up')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /approve place/i })).toBeNull()
  })

  it('pays the administrator-set reward, not the constant', async () => {
    const user = userEvent.setup()
    const { updateSettings } = await import('../services/admin')
    updateSettings('alex', { placeApprovalPoints: 40 })

    const placeId = pendingSuggestion()
    const before = pointsOf('casey')

    renderQueue()
    await user.click(screen.getByRole('button', { name: /approve place/i }))

    expect(pointsOf('casey')).toBe(before + 40)
    expect(placeById(placeId).points).toBe(40)
  })
})

describe('ModeratorQueuePage — rejecting', () => {
  it('rejects with a reason, awards nothing and clears the queue', async () => {
    const user = userEvent.setup()
    const placeId = pendingSuggestion()
    const before = pointsOf('casey')

    renderQueue()
    await user.click(screen.getByRole('button', { name: /reject…/i }))

    await user.type(screen.getByLabelText(/reason for rejection/i), 'Not open to the public.')
    await user.click(screen.getByRole('button', { name: /confirm rejection/i }))

    expect(screen.getByRole('status').textContent).toContain('Rejected “Shockoe Bottom Night Market”')
    expect(placeById(placeId).reviewStatus).toBe('rejected')
    expect(placeById(placeId).reviewNote).toBe('Not open to the public.')
    expect(pointsOf('casey')).toBe(before)
    expect(screen.getByText('All caught up')).toBeTruthy()
  })

  it('lets the moderator back out of the rejection form', async () => {
    const user = userEvent.setup()
    const placeId = pendingSuggestion()

    renderQueue()
    await user.click(screen.getByRole('button', { name: /reject…/i }))
    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(screen.queryByLabelText(/reason for rejection/i)).toBeNull()
    expect(placeById(placeId).reviewStatus).toBe('pending')
  })
})

describe('ModeratorQueuePage — error paths', () => {
  it('takes a suggestion out of the queue when its owner withdraws mid-review', async () => {
    const placeId = pendingSuggestion()
    const before = pointsOf('casey')

    renderQueue()
    expect(screen.getByRole('button', { name: /approve place/i })).toBeTruthy()

    // The owner withdraws from their profile while the moderator is looking at
    // the queue, so there is nothing left to decide. Wrapped in act() because
    // the store update comes from outside a React event.
    await act(async () => {
      expect(withdrawSubmittedPlace('casey', placeId).ok).toBe(true)
    })

    expect(screen.getByText('All caught up')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /approve place/i })).toBeNull()
    expect(placeById(placeId).reviewStatus).toBe('withdrawn')
    expect(pointsOf('casey')).toBe(before)
  })
})
