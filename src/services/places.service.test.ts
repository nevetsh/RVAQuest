import { beforeEach, describe, expect, it } from 'vitest'
import { resetAllData } from './store'
import { getState } from './store'
import {
  listPlacesByUser,
  listPendingPlaces,
  reviewPlace,
  submissionsLeftToday,
  submitPlace,
  updatePlace,
  withdrawSubmittedPlace,
} from './places.service'
import { getForumPostById } from './forum.service'
import { updateSettings } from './admin'
import type { PlaceDraft } from '../rules/places'

function draft(overrides: Partial<PlaceDraft> = {}): PlaceDraft {
  return {
    name: 'Slipway Coffee Stop',
    category: 'Food & Drink',
    address: '1200 E Cary St',
    description: 'Tiny counter by the canal with a bench outside.',
    location: { lat: 37.5351, lng: -77.438 },
    ...overrides,
  }
}

beforeEach(() => {
  resetAllData()
})

describe('submitPlace (UC03 basic path)', () => {
  it('saves the place as Pending review and creates the linked forum post', () => {
    const result = submitPlace('jordan', draft())

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.place.reviewStatus).toBe('pending')
    expect(result.place.pointsAwarded).toBe(false)
    expect(result.post.category).toBe('spot-suggestions')
    expect(result.post.placeId).toBe(result.place.id)
    expect(result.post.authorId).toBe('jordan')
    expect(getForumPostById(result.post.id)?.title).toContain('Slipway Coffee Stop')
  })

  it('rejects an invalid draft without writing anything', () => {
    const before = getState().places.length
    const result = submitPlace('jordan', draft({ name: '  ', location: null }))

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('invalid')
    expect(getState().places.length).toBe(before)
  })

  it('blocks a duplicate: same name within 50 m of an existing place', () => {
    // 'scuffletown-park' is seeded approved at 37.5467, -77.4577.
    const result = submitPlace(
      'jordan',
      draft({ name: 'Scuffletown Park', location: { lat: 37.54672, lng: -77.45772 } }),
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('duplicate')
    if (result.error !== 'duplicate') return
    expect(result.existing.name).toBe('Scuffletown Park')
  })

  it('allows the same name further than 50 m away', () => {
    const result = submitPlace(
      'jordan',
      draft({ name: 'Scuffletown Park', location: { lat: 37.5601, lng: -77.4577 } }),
    )

    expect(result.ok).toBe(true)
  })

  it('enforces 12 submissions per user per day', () => {
    for (let index = 0; index < 12; index += 1) {
      const result = submitPlace(
        'jordan',
        draft({
          name: `Quota Spot ${index}`,
          location: { lat: 37.55 + index * 0.001, lng: -77.46 },
        }),
      )
      expect(result.ok).toBe(true)
    }

    expect(submissionsLeftToday('jordan')).toBe(0)

    const blocked = submitPlace('jordan', draft({ name: 'One Too Many' }))
    expect(blocked.ok).toBe(false)
    if (blocked.ok) return
    expect(blocked.error).toBe('limit')

    // A different explorer still has their own allowance.
    expect(submitPlace('casey', draft({ name: 'Casey Spot' })).ok).toBe(true)
  })
})

describe('reviewPlace (UC03 BR04/BR05 — points once)', () => {
  it('awards the submitter points exactly once on approval', () => {
    const submitted = submitPlace('jordan', draft())
    expect(submitted.ok).toBe(true)
    if (!submitted.ok) return

    const before = getState().users.find((user) => user.id === 'jordan')!.points

    const approved = reviewPlace(submitted.place.id, 'dana', 'approve')
    expect(approved.ok).toBe(true)
    if (!approved.ok) return
    expect(approved.pointsAwarded).toBe(true)
    expect(approved.place.reviewStatus).toBe('approved')

    const after = getState().users.find((user) => user.id === 'jordan')!.points
    expect(after).toBe(before + submitted.place.points)

    // Approving the same place again must not pay out twice.
    const again = reviewPlace(submitted.place.id, 'dana', 'approve')
    expect(again.ok).toBe(false)
    if (again.ok) return
    expect(again.error).toBe('already-reviewed')
    expect(getState().users.find((user) => user.id === 'jordan')!.points).toBe(after)
  })

  it('awards nothing on rejection and stores the optional reason', () => {
    const submitted = submitPlace('casey', draft({ name: 'Private Lot' }))
    expect(submitted.ok).toBe(true)
    if (!submitted.ok) return

    const before = getState().users.find((user) => user.id === 'casey')!.points
    const rejected = reviewPlace(submitted.place.id, 'dana', 'reject', 'Not open to the public.')

    expect(rejected.ok).toBe(true)
    if (!rejected.ok) return
    expect(rejected.pointsAwarded).toBe(false)
    expect(rejected.place.reviewStatus).toBe('rejected')
    expect(rejected.place.reviewNote).toBe('Not open to the public.')
    expect(getState().users.find((user) => user.id === 'casey')!.points).toBe(before)
  })

  it('keeps a rejected place out of the queue and out of the map list', () => {
    const submitted = submitPlace('casey', draft({ name: 'Private Lot' }))
    expect(submitted.ok).toBe(true)
    if (!submitted.ok) return

    expect(listPendingPlaces().some((place) => place.id === submitted.place.id)).toBe(true)
    reviewPlace(submitted.place.id, 'dana', 'reject')
    expect(listPendingPlaces().some((place) => place.id === submitted.place.id)).toBe(false)
    expect(
      getState().places.find((place) => place.id === submitted.place.id)?.reviewStatus,
    ).toBe('rejected')
  })

  it('tracks a user submission history from newest to oldest', () => {
    submitPlace('jordan', draft({ name: 'One' }))
    submitPlace('jordan', draft({ name: 'Two', location: { lat: 37.531, lng: -77.44 } }))

    const mine = listPlacesByUser('jordan')
    expect(mine.length).toBeGreaterThanOrEqual(2)
    expect(mine[0].name).toBe('Two')
  })
})

describe('editing a pending suggestion (UC03)', () => {
  it('applies the change to the same place and its forum post, without using a new submission', () => {
    const submitted = submitPlace('jordan', draft())
    expect(submitted.ok).toBe(true)
    if (!submitted.ok) return

    const leftBefore = submissionsLeftToday('jordan')
    const logCountBefore = getState().submissions.length

    const updated = updatePlace(
      'jordan',
      submitted.place.id,
      draft({ name: 'Slipway Espresso', address: '1300 E Cary St' }),
    )
    expect(updated.ok).toBe(true)
    if (!updated.ok) return

    expect(updated.place.id).toBe(submitted.place.id)
    expect(updated.place.name).toBe('Slipway Espresso')
    expect(updated.place.reviewStatus).toBe('pending')
    expect(updated.place.editCount).toBe(1)
    expect(updated.place.editedAt).toBeDefined()

    // The moderator queue and the linked post both follow the change.
    expect(listPendingPlaces().map((place) => place.name)).toContain('Slipway Espresso')
    const post = getForumPostById(submitted.post.id)
    expect(post?.title).toContain('Slipway Espresso')
    expect(post?.body).toContain('1300 E Cary St')

    // BR02 counts suggestions made: an edit is not a new one.
    expect(getState().submissions.length).toBe(logCountBefore)
    expect(submissionsLeftToday('jordan')).toBe(leftBefore)
  })

  it('refuses an edit from another explorer', () => {
    const submitted = submitPlace('jordan', draft())
    if (!submitted.ok) return

    expect(updatePlace('casey', submitted.place.id, draft({ name: 'Hijacked' }))).toEqual({
      ok: false,
      error: 'not-owner',
    })
    expect(getState().places.find((place) => place.id === submitted.place.id)?.name).toBe(
      'Slipway Coffee Stop',
    )
  })

  it('refuses an edit once a moderator has decided', () => {
    const submitted = submitPlace('jordan', draft())
    if (!submitted.ok) return
    reviewPlace(submitted.place.id, 'dana', 'approve')

    expect(updatePlace('jordan', submitted.place.id, draft({ name: 'Too late' }))).toEqual({
      ok: false,
      error: 'not-editable',
    })
  })

  it('applies the same mandatory-field validation as a new suggestion', () => {
    const submitted = submitPlace('jordan', draft())
    if (!submitted.ok) return

    const result = updatePlace('jordan', submitted.place.id, draft({ name: '   ', location: null }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('invalid')
    expect(getState().places.find((place) => place.id === submitted.place.id)?.name).toBe(
      'Slipway Coffee Stop',
    )
  })

  it('blocks an edit that would duplicate a different nearby suggestion', () => {
    const first = submitPlace('jordan', draft())
    if (!first.ok) return
    const second = submitPlace(
      'jordan',
      draft({ name: 'Canal Bench', location: { lat: 37.5352, lng: -77.4381 } }),
    )
    if (!second.ok) return

    const result = updatePlace('jordan', second.place.id, draft({ name: 'Slipway Coffee Stop' }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('duplicate')
    if (result.error !== 'duplicate') return
    expect(result.existing.id).toBe(first.place.id)
  })
})

describe('withdrawing a pending suggestion (UC03)', () => {
  it('takes it out of the queue, notes it on the post, and moves no points', () => {
    const submitted = submitPlace('jordan', draft())
    if (!submitted.ok) return

    const pointsBefore = getState().users.find((user) => user.id === 'jordan')!.points
    const leftBefore = submissionsLeftToday('jordan')

    const result = withdrawSubmittedPlace('jordan', submitted.place.id)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.place.reviewStatus).toBe('withdrawn')
    expect(result.place.withdrawnAt).toBeDefined()
    expect(result.place.pointsAwarded).toBe(false)
    expect(listPendingPlaces().some((place) => place.id === submitted.place.id)).toBe(false)
    expect(getForumPostById(submitted.post.id)?.body).toContain('withdrew this suggestion')

    // No points moved, and the submission still counts against today's allowance.
    expect(getState().users.find((user) => user.id === 'jordan')!.points).toBe(pointsBefore)
    expect(submissionsLeftToday('jordan')).toBe(leftBefore)

    // A moderator can no longer decide on it.
    expect(reviewPlace(submitted.place.id, 'dana', 'approve')).toEqual({
      ok: false,
      error: 'withdrawn',
    })
    expect(getState().users.find((user) => user.id === 'jordan')!.points).toBe(pointsBefore)
  })

  it('frees the name and location so the explorer can suggest it again', () => {
    const submitted = submitPlace('jordan', draft())
    if (!submitted.ok) return
    withdrawSubmittedPlace('jordan', submitted.place.id)

    expect(submitPlace('jordan', draft()).ok).toBe(true)
  })

  it("refuses to withdraw someone else's suggestion", () => {
    const submitted = submitPlace('jordan', draft())
    if (!submitted.ok) return

    expect(withdrawSubmittedPlace('casey', submitted.place.id)).toEqual({
      ok: false,
      error: 'not-owner',
    })
    expect(getState().places.find((place) => place.id === submitted.place.id)?.reviewStatus).toBe(
      'pending',
    )
  })
})

describe('administrator policy from the console (Admin → Settings)', () => {
  it('closes the pipeline while submissions are paused, then reopens it', () => {
    updateSettings('alex', { placeSubmissionsPaused: true })

    expect(submitPlace('jordan', draft())).toEqual({ ok: false, error: 'paused' })
    expect(getState().places.some((place) => place.name === 'Slipway Coffee Stop')).toBe(false)

    updateSettings('alex', { placeSubmissionsPaused: false })
    expect(submitPlace('jordan', draft()).ok).toBe(true)
  })

  it('publishes and credits immediately when place review is switched off', () => {
    updateSettings('alex', { requirePlaceReview: false, placeApprovalPoints: 40 })
    const before = getState().users.find((user) => user.id === 'jordan')!.points

    const result = submitPlace('jordan', draft())
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.place.reviewStatus).toBe('approved')
    expect(result.place.points).toBe(40)
    expect(listPendingPlaces().some((place) => place.id === result.place.id)).toBe(false)
    expect(getState().users.find((user) => user.id === 'jordan')!.points).toBe(before + 40)
  })

  it('pays the value the administrator set after the spot was filed', () => {
    const submitted = submitPlace('jordan', draft())
    expect(submitted.ok).toBe(true)
    if (!submitted.ok) return

    updateSettings('alex', { placeApprovalPoints: 40 })
    const before = getState().users.find((user) => user.id === 'jordan')!.points

    const approved = reviewPlace(submitted.place.id, 'dana', 'approve')
    expect(approved.ok).toBe(true)
    if (!approved.ok) return

    expect(approved.pointsAwarded).toBe(true)
    expect(approved.place.points).toBe(40)
    expect(getState().users.find((user) => user.id === 'jordan')!.points).toBe(before + 40)
  })
})
