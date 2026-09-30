import type { Coordinates, QuestCategory } from '../services/types'
import type { Place, PlaceReviewStatus, SubmissionLogEntry } from '../services/places.types'
import { RULES } from '../lib/constants'
import { haversineMeters, isValidCoordinate, isWithinMeters } from './geo'

/**
 * Pure business rules for UC03 "Add a new local place" (FR05, FR09, FR10).
 * No UI, no storage — the screens and services call these functions so the
 * fixed numbers live in one place and can be unit-tested directly.
 */

/** Field lengths from the UC03 data description. */
export const PLACE_FIELD_LIMITS = {
  name: 50,
  category: 20,
  address: 100,
  description: 250,
} as const

export interface PlaceDraft {
  name: string
  category: QuestCategory | ''
  address: string
  description: string
  location: Coordinates | null
}

export interface PlaceFieldErrors {
  name?: string
  category?: string
  address?: string
  description?: string
  location?: string
}

/** BR01 — place name, category and location are mandatory; the rest optional. */
export function validatePlaceDraft(draft: PlaceDraft): PlaceFieldErrors {
  const errors: PlaceFieldErrors = {}

  const name = draft.name.trim()
  if (!name) {
    errors.name = 'Enter a place name.'
  } else if (name.length > PLACE_FIELD_LIMITS.name) {
    errors.name = `Place names are limited to ${PLACE_FIELD_LIMITS.name} characters (${name.length} entered).`
  }

  if (!draft.category) {
    errors.category = 'Pick a category for the place.'
  }

  if (!isValidCoordinate(draft.location)) {
    errors.location =
      'Add a location — use your current location or drop a pin on the map.'
  }

  if (draft.address.trim().length > PLACE_FIELD_LIMITS.address) {
    errors.address = `Addresses are limited to ${PLACE_FIELD_LIMITS.address} characters.`
  }

  if (draft.description.trim().length > PLACE_FIELD_LIMITS.description) {
    errors.description = `Descriptions are limited to ${PLACE_FIELD_LIMITS.description} characters (${draft.description.trim().length} entered).`
  }

  return errors
}

export function hasErrors(errors: PlaceFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

/** Case- and whitespace-insensitive comparison, as the 50 m rule implies. */
export function normalizePlaceName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * BR03 — a place is a duplicate when an existing approved or pending place
 * has the same name and sits within 50 m of the submitted location.
 * Rejected and withdrawn places never block a new suggestion (and a place
 * never blocks an edit of itself — see `duplicateForEdit`).
 */
export function findDuplicatePlace(
  draft: Pick<PlaceDraft, 'name' | 'location'>,
  existing: Place[],
): Place | null {
  const name = normalizePlaceName(draft.name)
  if (!name || !isValidCoordinate(draft.location)) return null

  return (
    existing.find(
      (place) =>
        (place.reviewStatus === 'approved' || place.reviewStatus === 'pending') &&
        normalizePlaceName(place.name) === name &&
        isWithinMeters(place.location, draft.location as Coordinates, RULES.duplicateNameRadiusMeters),
    ) ?? null
  )
}

/**
 * The same check while editing a suggestion: every other approved/pending
 * place still blocks, but the place being edited cannot collide with itself.
 */
export function findDuplicatePlaceForEdit(
  placeId: string,
  draft: Pick<PlaceDraft, 'name' | 'location'>,
  existing: Place[],
): Place | null {
  return findDuplicatePlace(
    draft,
    existing.filter((place) => place.id !== placeId),
  )
}

/**
 * How far away an existing place with the same name still earns a warning while
 * the submitter is still typing or moving the pin. Deliberately wider than the
 * hard `RULES.duplicateNameRadiusMeters` block below: the hint is meant to land
 * *before* the submission is refused, not instead of refusing it.
 */
export const DUPLICATE_WARNING_RADIUS_METERS = 150

export interface PossibleDuplicate {
  /** The existing place that looks like the one being typed. */
  place: Place
  distanceMeters: number
  /** True when this is close enough that submitting will be refused (BR03). */
  blocking: boolean
}

/**
 * The advisory half of BR03 — same name as an existing approved or pending
 * place, but within the wider warning radius. Callers show this while the form
 * is still being filled in; `findDuplicatePlace` remains the rule that decides
 * whether a submission is actually accepted.
 */
export function findPossibleDuplicate(
  draft: Pick<PlaceDraft, 'name' | 'location'>,
  existing: Place[],
  warnRadiusMeters: number = DUPLICATE_WARNING_RADIUS_METERS,
): PossibleDuplicate | null {
  const name = normalizePlaceName(draft.name)
  if (!name || !isValidCoordinate(draft.location)) return null

  const location = draft.location
  let closest: PossibleDuplicate | null = null

  for (const place of existing) {
    if (place.reviewStatus === 'rejected') continue
    if (normalizePlaceName(place.name) !== name) continue

    const distanceMeters = haversineMeters(place.location, location)
    if (distanceMeters > warnRadiusMeters) continue

    if (!closest || distanceMeters < closest.distanceMeters) {
      closest = {
        place,
        distanceMeters,
        blocking: distanceMeters <= RULES.duplicateNameRadiusMeters,
      }
    }
  }

  return closest
}

/** Meters rendered for a human: "38 m" up close, "1.2 km" further out. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

/** BR02 / NFR04 — how many submissions this user already made on a day. */
export function countSubmissionsOn(
  entries: SubmissionLogEntry[],
  userId: string,
  dayKey: string,
): number {
  return entries.filter((entry) => entry.userId === userId && entry.dayKey === dayKey).length
}

export function submissionsRemaining(
  entries: SubmissionLogEntry[],
  userId: string,
  dayKey: string,
  limit: number = RULES.maxPlaceSubmissionsPerDay,
): number {
  return Math.max(0, limit - countSubmissionsOn(entries, userId, dayKey))
}

export function hasReachedDailyLimit(
  entries: SubmissionLogEntry[],
  userId: string,
  dayKey: string,
  limit: number = RULES.maxPlaceSubmissionsPerDay,
): boolean {
  return countSubmissionsOn(entries, userId, dayKey) >= limit
}

export interface ReviewResult {
  place: Place
  /**
   * BR05 — true only on the transition that credits the submitter. Calling
   * approve twice never awards points twice.
   */
  awardPoints: boolean
}

export function approvePlace(
  place: Place,
  reviewerId: string,
  now: Date = new Date(),
): ReviewResult {
  const awardPoints = place.reviewStatus !== 'approved' && !place.pointsAwarded

  return {
    place: {
      ...place,
      reviewStatus: 'approved',
      pointsAwarded: place.pointsAwarded || awardPoints,
      reviewNote: undefined,
      reviewedBy: reviewerId,
      reviewedAt: now.toISOString(),
    },
    awardPoints,
  }
}

/**
 * A suggestion can only be changed by its owner, and only while it is still
 * pending — once a moderator has decided, the record is final.
 */
export function canEditPlace(place: Place, userId: string): boolean {
  return place.submittedBy === userId && place.reviewStatus === 'pending'
}

/** Withdrawing follows exactly the same rule as editing. */
export function canWithdrawPlace(place: Place, userId: string): boolean {
  return canEditPlace(place, userId)
}

/**
 * Applies an edited draft to a pending place. The record keeps its id, its
 * submission day and its daily-limit row; only the content changes, and the
 * edit is recorded so moderators can see the suggestion moved.
 */
export function editPlace(
  place: Place,
  draft: PlaceDraft,
  now: Date = new Date(),
): Place {
  return {
    ...place,
    name: draft.name.trim(),
    category: draft.category as Place['category'],
    address: draft.address.trim(),
    description: draft.description.trim(),
    location: draft.location as Coordinates,
    editCount: (place.editCount ?? 0) + 1,
    editedAt: now.toISOString(),
  }
}

/** Takes a pending suggestion out of the moderator queue. No points move. */
export function withdrawPlace(place: Place, now: Date = new Date()): Place {
  return {
    ...place,
    reviewStatus: 'withdrawn',
    withdrawnAt: now.toISOString(),
  }
}

/** BR05 — rejection awards no points. The reason is optional (FR09). */
export function rejectPlace(
  place: Place,
  reviewerId: string,
  reason = '',
  now: Date = new Date(),
): Place {
  return {
    ...place,
    reviewStatus: 'rejected',
    reviewedBy: reviewerId,
    reviewedAt: now.toISOString(),
    reviewNote: reason.trim() || undefined,
  }
}

/** Status wording shared by the forum, profile and moderator screens. */
export function reviewStatusLabel(status: PlaceReviewStatus): string {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  if (status === 'withdrawn') return 'Withdrawn'
  return 'Pending review'
}
