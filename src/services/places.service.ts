import { getState, setState } from './store'
import type { Coordinates } from './types'
import type { ForumPost, Place, SubmissionLogEntry } from './places.types'
import {
  approvePlace,
  canEditPlace,
  canWithdrawPlace,
  editPlace,
  findDuplicatePlace,
  findDuplicatePlaceForEdit,
  hasErrors,
  hasReachedDailyLimit,
  rejectPlace,
  submissionsRemaining,
  validatePlaceDraft,
  withdrawPlace,
  type PlaceDraft,
  type PlaceFieldErrors,
} from '../rules/places'
import { currentDayKey } from '../rules/time'
import { RULES } from '../lib/constants'

/**
 * The one place-submission pipeline (UC03). Both entry points — the map's
 * "Add a Place" button and the forum's "New Spot Suggestion" button — call
 * `submitPlace` with the same draft and get the same rules applied.
 */

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export type SubmitPlaceResult =
  | { ok: true; place: Place; post: ForumPost }
  | { ok: false; error: 'paused' }
  | { ok: false; error: 'invalid'; fieldErrors: PlaceFieldErrors }
  | { ok: false; error: 'duplicate'; existing: Place }
  | { ok: false; error: 'limit'; limit: number }

/**
 * BR01 valid → BR02 daily limit → BR03 duplicate. On success the place is
 * saved as "Pending review" and a linked Spot Suggestions post is created.
 */
export function submitPlace(userId: string, draft: PlaceDraft): SubmitPlaceResult {
  const state = getState()
  const dayKey = currentDayKey(new Date(), state.dayOffset)
  const now = new Date()
  const createdAt = now.toISOString()
  const { placeApprovalPoints, placeSubmissionsPaused, requirePlaceReview } = state.settings

  // The administrators' kill switch (Admin → Settings) short-circuits both entry
  // points — the map and the forum — so the whole pipeline closes at once.
  if (placeSubmissionsPaused) {
    return { ok: false, error: 'paused' }
  }

  const fieldErrors = validatePlaceDraft(draft)
  if (hasErrors(fieldErrors)) {
    return { ok: false, error: 'invalid', fieldErrors }
  }

  if (hasReachedDailyLimit(state.submissions, userId, dayKey)) {
    return { ok: false, error: 'limit', limit: RULES.maxPlaceSubmissionsPerDay }
  }

  const duplicate = findDuplicatePlace(draft, state.places)
  if (duplicate) {
    return { ok: false, error: 'duplicate', existing: duplicate }
  }

  // validatePlaceDraft guarantees this is a coordinate.
  const location = draft.location as Coordinates
  const placeId = makeId('place')
  const postId = makeId('post')
  const name = draft.name.trim()

  // "Review suggested places before they appear on the map" (Admin → Settings).
  // With review switched off a suggestion is published and credited straight
  // away instead of waiting in the moderator queue.
  const autoApproved = !requirePlaceReview

  const place: Place = {
    id: placeId,
    name,
    category: draft.category as Place['category'],
    address: draft.address.trim(),
    location,
    description: draft.description.trim(),
    submittedBy: userId,
    submittedAt: createdAt,
    submittedOn: dayKey,
    reviewStatus: autoApproved ? 'approved' : 'pending',
    pointsAwarded: autoApproved,
    points: placeApprovalPoints,
    reviewedAt: autoApproved ? createdAt : undefined,
    forumPostId: postId,
  }

  const post: ForumPost = {
    id: postId,
    category: 'spot-suggestions',
    title: `New spot: ${name}`,
    body: buildSuggestionBody(place),
    authorId: userId,
    createdAt,
    placeId,
    replies: [],
  }

  const logEntry: SubmissionLogEntry = {
    id: makeId('log'),
    userId,
    placeId,
    dayKey,
    createdAt,
  }

  setState((previous) => ({
    ...previous,
    places: [...previous.places, place],
    forumPosts: [post, ...previous.forumPosts],
    submissions: [...previous.submissions, logEntry],
    users: autoApproved
      ? previous.users.map((user) =>
          user.id === userId ? { ...user, points: user.points + placeApprovalPoints } : user,
        )
      : previous.users,
  }))

  return { ok: true, place, post }
}

function buildSuggestionBody(place: Place): string {
  const parts = [place.description || 'Suggested via the RVA Quest place pipeline.']
  if (place.address) parts.push(`Address: ${place.address}`)
  parts.push(
    place.reviewStatus === 'approved'
      ? `Place review is switched off right now, so this spot went live straight away and the ${place.points} points were credited.`
      : 'Only approved places appear on the map. Points are awarded once a moderator approves.',
  )
  return parts.join('\n\n')
}

/**
 * Keeps the linked Spot Suggestions post in step with its place: the title,
 * summary and (on withdraw) the closing note. Returns the post untouched when
 * there is nothing to change.
 */
function syncSuggestionPost(post: ForumPost, place: Place, options: { withdrawn?: boolean } = {}): ForumPost {
  if (options.withdrawn) {
    const notice =
      'The submitter withdrew this suggestion, so it is no longer in the moderator queue.'
    if (post.body.includes(notice)) return post
    return { ...post, body: `${post.body}\n\n${notice}` }
  }

  return {
    ...post,
    title: `New spot: ${place.name}`,
    body: buildSuggestionBody(place),
  }
}

/* --------------------------- edit / withdraw --------------------------- */

export type UpdatePlaceResult =
  | { ok: true; place: Place; post: ForumPost }
  | { ok: false; error: 'invalid'; fieldErrors: PlaceFieldErrors }
  | { ok: false; error: 'duplicate'; existing: Place }
  | { ok: false; error: 'not-found' | 'not-owner' | 'not-editable' }

/**
 * Edits a pending suggestion. The rules are the same as a new submission —
 * mandatory fields, 50 m duplicate — except that the place cannot collide
 * with itself and no new daily-limit row is written (the suggestion already
 * counted against today's allowance).
 */
export function updatePlace(userId: string, placeId: string, draft: PlaceDraft): UpdatePlaceResult {
  const state = getState()
  const existing = state.places.find((place) => place.id === placeId)

  if (!existing) return { ok: false, error: 'not-found' }
  if (existing.submittedBy !== userId) return { ok: false, error: 'not-owner' }
  if (!canEditPlace(existing, userId)) return { ok: false, error: 'not-editable' }

  const fieldErrors = validatePlaceDraft(draft)
  if (hasErrors(fieldErrors)) return { ok: false, error: 'invalid', fieldErrors }

  const duplicate = findDuplicatePlaceForEdit(placeId, draft, state.places)
  if (duplicate) return { ok: false, error: 'duplicate', existing: duplicate }

  const place = editPlace(existing, draft)
  const post = state.forumPosts.find((entry) => entry.id === existing.forumPostId)
  const updatedPost = post ? syncSuggestionPost(post, place) : undefined

  setState((previous) => ({
    ...previous,
    places: previous.places.map((entry) => (entry.id === placeId ? place : entry)),
    forumPosts: updatedPost
      ? previous.forumPosts.map((entry) => (entry.id === updatedPost.id ? updatedPost : entry))
      : previous.forumPosts,
  }))

  return { ok: true, place, post: updatedPost ?? post ?? fallbackPost(place) }
}

export type WithdrawPlaceResult =
  | { ok: true; place: Place }
  | { ok: false; error: 'not-found' | 'not-owner' | 'not-editable' }

/**
 * Takes a pending suggestion out of the queue. The place and its forum post
 * stay for the record; the submission still counts against the day's 12
 * (BR02 counts suggestions made, and the ledger row is kept so withdrawing is
 * not a way to get the allowance back).
 */
export function withdrawSubmittedPlace(userId: string, placeId: string): WithdrawPlaceResult {
  const state = getState()
  const existing = state.places.find((place) => place.id === placeId)

  if (!existing) return { ok: false, error: 'not-found' }
  if (existing.submittedBy !== userId) return { ok: false, error: 'not-owner' }
  if (!canWithdrawPlace(existing, userId)) return { ok: false, error: 'not-editable' }

  const place = withdrawPlace(existing)
  const post = state.forumPosts.find((entry) => entry.id === existing.forumPostId)
  const updatedPost = post ? syncSuggestionPost(post, place, { withdrawn: true }) : undefined

  setState((previous) => ({
    ...previous,
    places: previous.places.map((entry) => (entry.id === placeId ? place : entry)),
    forumPosts: updatedPost
      ? previous.forumPosts.map((entry) => (entry.id === updatedPost.id ? updatedPost : entry))
      : previous.forumPosts,
  }))

  return { ok: true, place }
}

function fallbackPost(place: Place): ForumPost {
  return {
    id: place.forumPostId,
    category: 'spot-suggestions',
    title: `New spot: ${place.name}`,
    body: buildSuggestionBody(place),
    authorId: place.submittedBy,
    createdAt: place.submittedAt,
    placeId: place.id,
    replies: [],
  }
}

export type ReviewDecision = 'approve' | 'reject'

export type ReviewPlaceResult =
  | {
      ok: true
      place: Place
      /** True only when this call credited the submitter (BR05). */
      pointsAwarded: boolean
      submitterId: string
      submitterPoints: number
    }
  | { ok: false; error: 'not-found' | 'already-reviewed' | 'withdrawn' }

/**
 * Moderator decision for one pending place. Approval awards the submitter's
 * points exactly once; rejection awards none and stores the optional reason.
 */
export function reviewPlace(
  placeId: string,
  reviewerId: string,
  decision: ReviewDecision,
  reason = '',
): ReviewPlaceResult {
  const state = getState()
  const existing = state.places.find((place) => place.id === placeId)

  if (!existing) return { ok: false, error: 'not-found' }
  if (existing.reviewStatus === 'withdrawn') return { ok: false, error: 'withdrawn' }
  if (existing.reviewStatus !== 'pending') return { ok: false, error: 'already-reviewed' }

  const review =
    decision === 'approve'
      ? approvePlace(existing, reviewerId)
      : { place: rejectPlace(existing, reviewerId, reason), awardPoints: false }

  const submitter = state.users.find((user) => user.id === existing.submittedBy)
  const pointsAwarded = review.awardPoints && !!submitter
  // BR05: the administrator decides what an approved place is worth
  // (Admin → Settings), so approval reads the live value rather than whatever the
  // constant said when the spot was filed. The credited amount is stored on the
  // place so the receipt matches what the submitter actually received.
  const creditedPoints = state.settings.placeApprovalPoints
  const approvedPlace = pointsAwarded ? { ...review.place, points: creditedPoints } : review.place
  const submitterPoints = submitter ? submitter.points + (pointsAwarded ? creditedPoints : 0) : 0

  setState((previous) => ({
    ...previous,
    places: previous.places.map((place) => (place.id === placeId ? approvedPlace : place)),
    users:
      pointsAwarded && submitter
        ? previous.users.map((user) =>
            user.id === submitter.id ? { ...user, points: user.points + creditedPoints } : user,
          )
        : previous.users,
  }))

  return {
    ok: true,
    place: approvedPlace,
    pointsAwarded,
    submitterId: existing.submittedBy,
    submitterPoints,
  }
}

/* ------------------------------- reads ------------------------------- */

export function listPlaces(): Place[] {
  return getState().places
}

export function getPlaceById(id: string): Place | undefined {
  return getState().places.find((place) => place.id === id)
}

/** BR04 — only approved places are shown on the map. */
export function listApprovedPlaces(): Place[] {
  return getState().places.filter((place) => place.reviewStatus === 'approved')
}

export function listPendingPlaces(): Place[] {
  return getState().places.filter((place) => place.reviewStatus === 'pending')
}

/** Suggestions their owner has taken back — shown on the profile, not the queue. */
export function listWithdrawnPlaces(): Place[] {
  return getState().places.filter((place) => place.reviewStatus === 'withdrawn')
}

export function listPlacesByUser(userId: string): Place[] {
  return getState()
    .places.map((place, index) => ({ place, index }))
    .filter(({ place }) => place.submittedBy === userId)
    .sort((a, b) => b.place.submittedAt.localeCompare(a.place.submittedAt) || b.index - a.index)
    .map(({ place }) => place)
}

export function getPlaceByForumPostId(postId: string): Place | undefined {
  return getState().places.find((place) => place.forumPostId === postId)
}

export function submissionsUsedToday(userId: string): number {
  const state = getState()
  const dayKey = currentDayKey(new Date(), state.dayOffset)
  return state.submissions.filter((entry) => entry.userId === userId && entry.dayKey === dayKey)
    .length
}

/** "submissions left today: N of 12" on the add-place form. */
export function submissionsLeftToday(userId: string): number {
  const state = getState()
  const dayKey = currentDayKey(new Date(), state.dayOffset)
  return submissionsRemaining(state.submissions, userId, dayKey)
}
