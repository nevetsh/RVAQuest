import { describe, expect, it } from 'vitest'
import type { Coordinates } from '../services/types'
import type { Place, SubmissionLogEntry } from '../services/places.types'
import {
  DUPLICATE_WARNING_RADIUS_METERS,
  approvePlace,
  canEditPlace,
  canWithdrawPlace,
  countSubmissionsOn,
  editPlace,
  findDuplicatePlace,
  findDuplicatePlaceForEdit,
  findPossibleDuplicate,
  formatDistance,
  hasErrors,
  hasReachedDailyLimit,
  rejectPlace,
  reviewStatusLabel,
  submissionsRemaining,
  validatePlaceDraft,
  withdrawPlace,
} from './places'

const LOCATION: Coordinates = { lat: 37.5407, lng: -77.436 }

/** Roughly 40 m east of LOCATION — inside the 50 m duplicate radius. */
const NEARBY: Coordinates = { lat: 37.5407, lng: -77.43555 }
/** Roughly 150 m east — outside the duplicate radius. */
const FAR: Coordinates = { lat: 37.5407, lng: -77.4344 }

function makePlace(overrides: Partial<Place> = {}): Place {
  return {
    id: 'place-1',
    name: 'Riverside Steps',
    category: 'Outdoors',
    address: '',
    location: LOCATION,
    description: '',
    submittedBy: 'jordan',
    submittedAt: '2026-09-30T14:00:00.000Z',
    submittedOn: '2026-09-30',
    reviewStatus: 'pending',
    pointsAwarded: false,
    points: 25,
    forumPostId: 'post-1',
    ...overrides,
  }
}

function makeLogEntry(overrides: Partial<SubmissionLogEntry> = {}): SubmissionLogEntry {
  return {
    id: 'entry-1',
    userId: 'jordan',
    placeId: 'place-1',
    dayKey: '2026-09-30',
    createdAt: '2026-09-30T14:00:00.000Z',
    ...overrides,
  }
}

describe('validatePlaceDraft (UC03 BR01)', () => {
  it('accepts a draft with the three mandatory fields filled in', () => {
    const errors = validatePlaceDraft({
      name: 'Riverside Steps',
      category: 'Outdoors',
      address: '',
      description: '',
      location: LOCATION,
    })

    expect(hasErrors(errors)).toBe(false)
  })

  it('flags a missing name, category and location', () => {
    const errors = validatePlaceDraft({
      name: '   ',
      category: '',
      address: '',
      description: '',
      location: null,
    })

    expect(errors.name).toBeDefined()
    expect(errors.category).toBeDefined()
    expect(errors.location).toBeDefined()
  })

  it('enforces the UC03 field lengths', () => {
    const errors = validatePlaceDraft({
      name: 'n'.repeat(51),
      category: 'Outdoors',
      address: 'a'.repeat(101),
      description: 'd'.repeat(251),
      location: LOCATION,
    })

    expect(errors.name).toBeDefined()
    expect(errors.address).toBeDefined()
    expect(errors.description).toBeDefined()
  })
})

describe('findDuplicatePlace (UC03 BR03 — same name within 50 m)', () => {
  const draft = { name: 'Riverside Steps', location: NEARBY }

  it('matches a pending place with the same name inside 50 m', () => {
    const existing = makePlace({ reviewStatus: 'pending' })
    expect(findDuplicatePlace(draft, [existing])?.id).toBe(existing.id)
  })

  it('matches an approved place with the same name inside 50 m', () => {
    const existing = makePlace({ reviewStatus: 'approved' })
    expect(findDuplicatePlace(draft, [existing])?.id).toBe(existing.id)
  })

  it('ignores the same name further than 50 m away', () => {
    const existing = makePlace({ location: FAR })
    expect(findDuplicatePlace(draft, [existing])).toBeNull()
  })

  it('ignores a different name at the same spot', () => {
    const existing = makePlace({ name: 'Pipeline Overlook' })
    expect(findDuplicatePlace(draft, [existing])).toBeNull()
  })

  it('does not treat rejected places as blocking duplicates', () => {
    const existing = makePlace({ reviewStatus: 'rejected' })
    expect(findDuplicatePlace(draft, [existing])).toBeNull()
  })

  it('compares names case- and whitespace-insensitively', () => {
    const existing = makePlace({ name: '  RIVERSIDE   steps ' })
    expect(findDuplicatePlace(draft, [existing])?.id).toBe(existing.id)
  })

  it('returns null when the draft has no location yet', () => {
    expect(findDuplicatePlace({ name: 'Riverside Steps', location: null }, [makePlace()])).toBeNull()
  })
})

describe('daily submission limit (UC03 BR02 / NFR04 — 12 per day)', () => {
  const logs = Array.from({ length: 12 }, (_, index) =>
    makeLogEntry({ id: `entry-${index}`, placeId: `place-${index}` }),
  )

  it('counts only the given user and day', () => {
    const entries = [
      ...logs,
      makeLogEntry({ id: 'other-user', userId: 'casey' }),
      makeLogEntry({ id: 'other-day', dayKey: '2026-10-01' }),
    ]

    expect(countSubmissionsOn(entries, 'jordan', '2026-09-30')).toBe(12)
  })

  it('tracks how many submissions are left today', () => {
    expect(submissionsRemaining(logs.slice(0, 5), 'jordan', '2026-09-30')).toBe(7)
  })

  it('never reports a negative remainder', () => {
    const entries = [...logs, makeLogEntry({ id: 'extra', placeId: 'place-extra' })]
    expect(submissionsRemaining(entries, 'jordan', '2026-09-30')).toBe(0)
  })

  it('reaches the limit on the twelfth submission and not before', () => {
    expect(hasReachedDailyLimit(logs.slice(0, 11), 'jordan', '2026-09-30')).toBe(false)
    expect(hasReachedDailyLimit(logs.slice(0, 12), 'jordan', '2026-09-30')).toBe(true)
  })

  it('gives the user a fresh allowance the next day', () => {
    expect(hasReachedDailyLimit(logs, 'jordan', '2026-10-01')).toBe(false)
    expect(submissionsRemaining(logs, 'jordan', '2026-10-01')).toBe(12)
  })
})

describe('review transitions (UC03 BR04/BR05 — points once, only on approval)', () => {
  it('approves a pending place and awards points on that transition', () => {
    const result = approvePlace(makePlace(), 'dana')

    expect(result.place.reviewStatus).toBe('approved')
    expect(result.awardPoints).toBe(true)
    expect(result.place.pointsAwarded).toBe(true)
    expect(result.place.reviewedBy).toBe('dana')
  })

  it('never awards points a second time when approve runs twice', () => {
    const first = approvePlace(makePlace(), 'dana')
    const second = approvePlace(first.place, 'dana')

    expect(first.awardPoints).toBe(true)
    expect(second.awardPoints).toBe(false)
    expect(second.place.reviewStatus).toBe('approved')
  })

  it('rejects with no points and keeps an optional reason', () => {
    const rejected = rejectPlace(makePlace(), 'dana', '  Not a public place.  ')

    expect(rejected.reviewStatus).toBe('rejected')
    expect(rejected.pointsAwarded).toBe(false)
    expect(rejected.reviewNote).toBe('Not a public place.')
    expect(rejected.reviewedBy).toBe('dana')
  })

  it('rejects without a reason (the reason is optional)', () => {
    const rejected = rejectPlace(makePlace(), 'dana')

    expect(rejected.reviewStatus).toBe('rejected')
    expect(rejected.reviewNote).toBeUndefined()
  })
})

describe('editing and withdrawing a pending suggestion', () => {
  const editedDraft = {
    name: 'Riverside Steps Revisited',
    category: 'Outdoors' as const,
    address: '  12 Dock St  ',
    description: '  A better description of the steps.  ',
    location: NEARBY,
  }

  it('lets only the owner edit or withdraw, and only while the suggestion is pending', () => {
    const pending = makePlace()
    expect(canEditPlace(pending, 'jordan')).toBe(true)
    expect(canWithdrawPlace(pending, 'jordan')).toBe(true)

    expect(canEditPlace(pending, 'casey')).toBe(false)
    expect(canWithdrawPlace(makePlace({ reviewStatus: 'approved' }), 'jordan')).toBe(false)
    expect(canEditPlace(makePlace({ reviewStatus: 'rejected' }), 'jordan')).toBe(false)
    expect(canEditPlace(makePlace({ reviewStatus: 'withdrawn' }), 'jordan')).toBe(false)
  })

  it('keeps the same record, day and queue position and counts the revision', () => {
    const edited = editPlace(makePlace(), editedDraft, new Date('2026-09-30T16:00:00.000Z'))

    expect(edited.id).toBe('place-1')
    expect(edited.forumPostId).toBe('post-1')
    expect(edited.submittedOn).toBe('2026-09-30')
    expect(edited.submittedAt).toBe('2026-09-30T14:00:00.000Z')
    expect(edited.reviewStatus).toBe('pending')
    expect(edited.name).toBe('Riverside Steps Revisited')
    expect(edited.address).toBe('12 Dock St')
    expect(edited.description).toBe('A better description of the steps.')
    expect(edited.location).toEqual(NEARBY)
    expect(edited.editCount).toBe(1)
    expect(edited.editedAt).toBe('2026-09-30T16:00:00.000Z')
  })

  it('counts every further revision', () => {
    const twice = editPlace(editPlace(makePlace(), editedDraft), editedDraft)
    expect(twice.editCount).toBe(2)
  })

  it('an edit cannot be a duplicate of the place being edited', () => {
    // The place already carries the edited name, so a plain duplicate check
    // would flag the edit as a collision with itself.
    const existing = makePlace({ name: 'Riverside Steps Revisited' })
    expect(findDuplicatePlace(editedDraft, [existing])?.id).toBe('place-1')
    expect(findDuplicatePlaceForEdit('place-1', editedDraft, [existing])).toBeNull()
  })

  it('still blocks an edit that collides with a different nearby place', () => {
    const existing = [
      makePlace(),
      makePlace({ id: 'place-2', name: 'Riverside Steps Revisited' }),
    ]
    expect(findDuplicatePlaceForEdit('place-1', editedDraft, existing)?.id).toBe('place-2')
  })

  it('takes a withdrawn place out of the duplicate check', () => {
    const withdrawn = withdrawPlace(makePlace())

    expect(withdrawn.reviewStatus).toBe('withdrawn')
    expect(withdrawn.withdrawnAt).toBeDefined()
    expect(withdrawn.pointsAwarded).toBe(false)
    expect(findDuplicatePlace(editedDraft, [withdrawn])).toBeNull()
  })

  it('labels the withdrawn status for the screens', () => {
    expect(reviewStatusLabel('withdrawn')).toBe('Withdrawn')
  })
})

describe('live duplicate hint while the form is still being filled in (BR03)', () => {
  /** ~30 m east of LOCATION — inside the 50 m block radius. */
  const BLOCKING = { lat: 37.5407, lng: -77.43566 }
  /** ~120 m east — outside the block radius, inside the warning radius. */
  const WARNING_ONLY = { lat: 37.5407, lng: -77.43464 }
  /** ~400 m east — outside every radius. */
  const CLEAR = { lat: 37.5407, lng: -77.43197 }

  it('warns about a same-named place that is too far away to be refused', () => {
    const hint = findPossibleDuplicate(
      { name: 'Riverside Steps', location: WARNING_ONLY },
      [makePlace()],
    )

    expect(hint).not.toBeNull()
    expect(hint?.place.id).toBe('place-1')
    expect(hint?.blocking).toBe(false)
    expect(hint?.distanceMeters).toBeGreaterThan(100)
    expect(hint?.distanceMeters).toBeLessThan(DUPLICATE_WARNING_RADIUS_METERS)
  })

  it('marks the hint as blocking once the pin is inside the 50 m rule', () => {
    const hint = findPossibleDuplicate(
      { name: 'Riverside Steps', location: BLOCKING },
      [makePlace()],
    )

    expect(hint?.blocking).toBe(true)
    expect(hint?.distanceMeters).toBeLessThan(50)
  })

  it('stays quiet about the same name further than the warning radius', () => {
    expect(
      findPossibleDuplicate({ name: 'Riverside Steps', location: CLEAR }, [makePlace()]),
    ).toBeNull()
  })

  it('stays quiet about a nearby place with a different name', () => {
    expect(
      findPossibleDuplicate({ name: 'Slipway Coffee Stop', location: BLOCKING }, [makePlace()]),
    ).toBeNull()
  })

  it('matches names the way the rule does — case and padding do not matter', () => {
    const hint = findPossibleDuplicate(
      { name: '  riverside   STEPS ', location: BLOCKING },
      [makePlace({ name: 'Riverside Steps' })],
    )

    expect(hint?.place.id).toBe('place-1')
  })

  it('warns about pending, approved and withdrawn places but not rejected ones', () => {
    const draft = { name: 'Riverside Steps', location: BLOCKING }

    expect(findPossibleDuplicate(draft, [makePlace({ reviewStatus: 'pending' })])).not.toBeNull()
    expect(findPossibleDuplicate(draft, [makePlace({ reviewStatus: 'approved' })])).not.toBeNull()
    expect(findPossibleDuplicate(draft, [makePlace({ reviewStatus: 'withdrawn' })])).not.toBeNull()
    expect(findPossibleDuplicate(draft, [makePlace({ reviewStatus: 'rejected' })])).toBeNull()
  })

  it('needs both a name and a location to say anything', () => {
    expect(findPossibleDuplicate({ name: '   ', location: BLOCKING }, [makePlace()])).toBeNull()
    expect(findPossibleDuplicate({ name: 'Riverside Steps', location: null }, [makePlace()])).toBeNull()
  })

  it('reports the closest of several same-named places', () => {
    const hint = findPossibleDuplicate(
      { name: 'Riverside Steps', location: WARNING_ONLY },
      [
        makePlace({ id: 'place-far', location: LOCATION }),
        makePlace({ id: 'place-near', location: WARNING_ONLY }),
      ],
    )

    expect(hint?.place.id).toBe('place-near')
  })

  it('never warns a suggestion about itself while it is being edited', () => {
    const editing = makePlace({ location: WARNING_ONLY })
    const draft = { name: 'Riverside Steps', location: WARNING_ONLY }

    // Without the exclusion the edit would collide with its own record at 0 m.
    expect(findPossibleDuplicate(draft, [editing])?.blocking).toBe(true)
    expect(findPossibleDuplicate(draft, [editing], { ignoreId: 'place-1' })).toBeNull()
  })

  it('still warns an edit about a different nearby place with the same name', () => {
    // place-1 is the suggestion being edited (same spot as the pin); place-2 is
    // a different spot with the same name ~120 m away, so the hint must still fire.
    const hint = findPossibleDuplicate(
      { name: 'Riverside Steps', location: WARNING_ONLY },
      [makePlace({ location: WARNING_ONLY }), makePlace({ id: 'place-2', location: LOCATION })],
      { ignoreId: 'place-1' },
    )

    expect(hint?.place.id).toBe('place-2')
    expect(hint?.blocking).toBe(false)
  })

  it('honours a custom warning radius', () => {
    const draft = { name: 'Riverside Steps', location: CLEAR }

    expect(findPossibleDuplicate(draft, [makePlace()])).toBeNull()
    expect(findPossibleDuplicate(draft, [makePlace()], { warnRadiusMeters: 500 })).not.toBeNull()
  })

  it('formats the distance for the hint', () => {
    expect(formatDistance(38)).toBe('38 m')
    expect(formatDistance(1200)).toBe('1.2 km')
    // A pin dropped on top of an existing one must not read as "0 m".
    expect(formatDistance(0)).toBe('less than 1 m')
  })
})
