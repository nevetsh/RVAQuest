import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppState, useCurrentUser } from '../hooks/useAppState'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePlace } from '../hooks/usePlaces'
import { useLocation as useLocationContext } from '../app/LocationProvider'
import { QUEST_CATEGORIES, type Coordinates, type QuestCategory } from '../services/types'
import type { ForumPost, Place } from '../services/places.types'
import { submitPlace, submissionsLeftToday, updatePlace } from '../services/places.service'
import {
  PLACE_FIELD_LIMITS,
  canEditPlace,
  hasErrors,
  validatePlaceDraft,
  type PlaceDraft,
  type PlaceFieldErrors,
} from '../rules/places'
import { RULES } from '../lib/constants'
import { LocationPicker } from '../components/places/LocationPicker'
import { PlaceStatusBadge } from '../components/places/PlaceStatusBadge'
import { Button, buttonClasses } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { cn } from '../lib/cn'

/**
 * UC03 — Add a new local place (FR05, FR09). This one screen serves both entry
 * points: the map's "Add a Place" button (?from=map) and the forum's
 * "New Spot Suggestion" button (?from=forum).
 *
 * The same form is reused to edit a pending suggestion (`?edit=<placeId>`):
 * same fields, same rules, but the record keeps its id, its place in the
 * queue and its daily-limit row instead of creating a new submission.
 */

const INPUT_CLASS =
  'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-bark-900 placeholder:text-bark-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200'
const LABEL_CLASS = 'block text-xs font-bold text-bark-700'

interface Confirmation {
  place: Place
  post: ForumPost
  /** A brand-new suggestion, or changes saved onto one that was already pending. */
  mode: 'created' | 'updated'
}

function draftFromPlace(place: Place | undefined): PlaceDraft {
  return {
    name: place?.name ?? '',
    category: place?.category ?? '',
    address: place?.address ?? '',
    description: place?.description ?? '',
    location: place?.location ?? null,
  }
}

export function AddPlacePage() {
  const user = useCurrentUser()
  const { settings } = useAppState()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const from = params.get('from')
  const editingId = params.get('edit')
  const editing = usePlace(editingId ?? undefined)
  const editMode = Boolean(editingId)

  const backTo = editMode
    ? '/profile'
    : from === 'forum'
      ? '/forum?cat=spot-suggestions'
      : '/map'
  const backLabel = editMode
    ? 'Back to my profile'
    : from === 'forum'
      ? 'Back to the forum'
      : 'Back to the map'

  const { coords, status, requestLocation } = useLocationContext()

  const [draft, setDraft] = useState<PlaceDraft>(() => draftFromPlace(editing))
  const [fieldErrors, setFieldErrors] = useState<PlaceFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [locating, setLocating] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  const alertRef = useRef<HTMLDivElement>(null)
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    category: useRef<HTMLSelectElement>(null),
    address: useRef<HTMLInputElement>(null),
    description: useRef<HTMLTextAreaElement>(null),
    location: useRef<HTMLFieldSetElement>(null),
  }

  usePageTitle(
    confirmation
      ? confirmation.mode === 'updated'
        ? 'Suggestion updated'
        : 'Suggestion received'
      : editMode
        ? 'Edit a suggestion'
        : 'Add a place',
  )

  const remaining = submissionsLeftToday(user.id)
  const limitReached = remaining === 0

  // "Use My Current Location" fills the field once the fix arrives.
  useEffect(() => {
    if (!locating) return

    if (coords) {
      setDraft((previous) => ({ ...previous, location: coords }))
      setLocating(false)
      setFieldErrors((previous) => ({ ...previous, location: undefined }))
      return
    }

    if (status === 'denied' || status === 'unavailable') {
      setLocating(false)
      setFormError(
        status === 'denied'
          ? 'Location access is blocked, so we could not read your position. Turn it on in your browser, or use Choose on Map.'
          : 'We could not get a location fix. Move somewhere with a clearer signal, or use Choose on Map.',
      )
    }
  }, [locating, coords, status])

  useEffect(() => {
    if (formError) alertRef.current?.focus()
  }, [formError])

  function updateDraft<K extends keyof PlaceDraft>(key: K, value: PlaceDraft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }))
    setFieldErrors((previous) => {
      if (!(key in previous)) return previous
      const next = { ...previous }
      delete next[key as keyof PlaceFieldErrors]
      return next
    })
    setFormError(null)
  }

  function focusFirstError(errors: PlaceFieldErrors) {
    const order: Array<keyof PlaceFieldErrors> = ['name', 'category', 'location', 'address', 'description']
    const first = order.find((key) => errors[key])
    if (first) fieldRefs[first].current?.focus()
  }

  function applyCurrentLocation() {
    setFormError(null)
    if (coords) {
      updateDraft('location', coords)
      return
    }

    // [E04] Location unavailable — say so and point at Choose on Map instead
    // of starting a request that cannot succeed.
    if (status === 'denied' || status === 'unavailable') {
      setFormError(
        status === 'denied'
          ? 'Location access is switched off, so we could not read your position. Turn it on in your browser, or use Choose on Map.'
          : 'We could not get a location fix. Try again somewhere with a clearer signal, or use Choose on Map.',
      )
      return
    }

    setLocating(true)
    requestLocation()
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    const errors = validatePlaceDraft(draft)
    setFieldErrors(errors)
    if (hasErrors(errors)) {
      setFormError('Some required details are missing or invalid. Check the highlighted fields.')
      focusFirstError(errors)
      return
    }

    if (editing) {
      const updated = updatePlace(user.id, editing.id, draft)

      if (updated.ok) {
        setConfirmation({ place: updated.place, post: updated.post, mode: 'updated' })
        return
      }

      if (updated.error === 'invalid') {
        setFieldErrors(updated.fieldErrors)
        setFormError('Some required details are missing or invalid. Check the highlighted fields.')
        focusFirstError(updated.fieldErrors)
        return
      }

      if (updated.error === 'duplicate') {
        setFormError(
          `“${updated.existing.name}” is already suggested within ${RULES.duplicateNameRadiusMeters} m of this location. Pick a different name or move the pin.`,
        )
        return
      }

      setFormError(
        updated.error === 'not-editable'
          ? 'This suggestion can no longer be edited — a moderator has already reviewed it.'
          : 'That suggestion is not on this account, so it could not be changed.',
      )
      return
    }

    const result = submitPlace(user.id, draft)

    if (result.ok) {
      setConfirmation({ place: result.place, post: result.post, mode: 'created' })
      return
    }

    if (result.error === 'invalid') {
      setFieldErrors(result.fieldErrors)
      setFormError('Some required details are missing or invalid. Check the highlighted fields.')
      focusFirstError(result.fieldErrors)
      return
    }

    if (result.error === 'limit') {
      setFormError(
        `You have reached the limit of ${result.limit} place submissions per day. Your allowance resets tomorrow (Richmond time).`,
      )
      return
    }

    // An administrator can pause suggestions from the console (Admin → Settings).
    if (result.error === 'paused') {
      setFormError(
        'New place suggestions are paused right now. Existing places and quests still work — check back later.',
      )
      return
    }

    setFormError(
      `“${result.existing.name}” is already suggested within ${RULES.duplicateNameRadiusMeters} m of this location. Pick a different name or move the pin.`,
    )
  }

  // The edit screen is only for the owner's own suggestion, while it is pending.
  if (editMode && !editing) {
    return (
      <EmptyState
        title="Suggestion not found"
        message="That suggestion no longer exists, or the link is out of date."
        action={
          <Link
            to="/profile"
            className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Back to my profile
          </Link>
        }
      />
    )
  }

  if (editing && !canEditPlace(editing, user.id)) {
    return (
      <EmptyState
        title="This suggestion can no longer be edited"
        message="Only the explorer who made a suggestion can change it, and only while it is still pending. Once a moderator has approved or rejected it, the decision is final."
        action={
          <Link
            to="/profile"
            className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Back to my profile
          </Link>
        }
      />
    )
  }

  if (confirmation) {
    return (
      <PlaceSubmitted
        place={confirmation.place}
        post={confirmation.post}
        mode={confirmation.mode}
      />
    )
  }

  const categoryError = fieldErrors.category
  const locationError = fieldErrors.location

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {backLabel}
      </Link>

      <header className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card md:p-5">
        <h1 className="text-xl font-extrabold tracking-tight text-bark-900 md:text-2xl">
          {editMode ? 'Edit your suggestion' : 'Add a place'}
        </h1>
        <p className="mt-1 text-sm text-bark-500">
          {editMode
            ? 'This suggestion is still pending, so you can change any of the details. Moderators see that it was edited.'
            : 'Know a spot that belongs on the RVA Quest map? Suggest it here. A moderator reviews new spots before they go live (FR09, FR10).'}
        </p>

        {editMode ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900">
            Editing a pending suggestion — this does not use a new submission today
          </p>
        ) : (
          <>
            <p
              role="status"
              className={cn(
                'mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold',
                limitReached ? 'bg-amber-100 text-amber-900' : 'bg-brand-50 text-brand-800',
              )}
            >
              Submissions left today: {remaining} of {RULES.maxPlaceSubmissionsPerDay}
            </p>

            {limitReached ? (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                You have used all {RULES.maxPlaceSubmissionsPerDay} submissions for today. You can
                suggest another place tomorrow.
              </p>
            ) : null}
          </>
        )}
      </header>

      {formError ? (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <p className="font-bold">
            {editing ? 'We could not save your changes' : 'We could not save this suggestion'}
          </p>
          <p className="mt-0.5">{formError}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-2xl border border-bark-200 bg-white p-4 shadow-card md:p-5">
        <div>
          <label htmlFor="place-name" className={LABEL_CLASS}>
            Place name <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id="place-name"
            ref={fieldRefs.name}
            value={draft.name}
            onChange={(event) => updateDraft('name', event.target.value)}
            required
            aria-required="true"
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby={fieldErrors.name ? 'place-name-error' : undefined}
            placeholder="e.g. Great Shiplock Park"
            className={cn(INPUT_CLASS, fieldErrors.name ? 'border-red-400' : 'border-bark-200')}
          />
          {fieldErrors.name ? (
            <p id="place-name-error" className="mt-1 text-xs font-semibold text-red-700">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="place-category" className={LABEL_CLASS}>
            Category <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <select
            id="place-category"
            ref={fieldRefs.category}
            value={draft.category}
            onChange={(event) =>
              updateDraft('category', event.target.value as QuestCategory | '')
            }
            required
            aria-required="true"
            aria-invalid={categoryError ? true : undefined}
            aria-describedby={categoryError ? 'place-category-error' : undefined}
            className={cn(INPUT_CLASS, categoryError ? 'border-red-400' : 'border-bark-200')}
          >
            <option value="">Choose a category…</option>
            {QUEST_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {categoryError ? (
            <p id="place-category-error" className="mt-1 text-xs font-semibold text-red-700">
              {categoryError}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="place-address" className={LABEL_CLASS}>
            Address <span className="font-normal text-bark-500">(optional)</span>
          </label>
          <input
            id="place-address"
            ref={fieldRefs.address}
            value={draft.address}
            onChange={(event) => updateDraft('address', event.target.value)}
            aria-invalid={fieldErrors.address ? true : undefined}
            aria-describedby={fieldErrors.address ? 'place-address-error' : 'place-address-hint'}
            placeholder="Street address or nearest cross street"
            className={cn(INPUT_CLASS, fieldErrors.address ? 'border-red-400' : 'border-bark-200')}
          />
          {fieldErrors.address ? (
            <p id="place-address-error" className="mt-1 text-xs font-semibold text-red-700">
              {fieldErrors.address}
            </p>
          ) : (
            <p id="place-address-hint" className="mt-1 text-[11px] text-bark-500">
              Helps moderators find the spot. Up to {PLACE_FIELD_LIMITS.address} characters.
            </p>
          )}
        </div>

        <fieldset
          ref={fieldRefs.location}
          tabIndex={-1}
          aria-invalid={locationError ? true : undefined}
          aria-describedby={locationError ? 'place-location-error' : 'place-location-hint'}
          className="rounded-2xl border border-bark-200 p-3"
        >
          <legend className="px-1 text-xs font-bold text-bark-700">
            Location <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </legend>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={draft.location ? 'secondary' : 'primary'}
              onClick={applyCurrentLocation}
              disabled={locating}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              {locating ? 'Getting location…' : 'Use My Current Location'}
            </Button>

            <Button size="sm" variant="outline" onClick={() => setShowPicker(true)}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Z" strokeLinejoin="round" />
                <path d="M9 4v13M15 6.5v13" />
              </svg>
              Choose on Map
            </Button>

            {draft.location ? (
              <Button size="sm" variant="ghost" onClick={() => updateDraft('location', null)}>
                Clear location
              </Button>
            ) : null}
          </div>

          {draft.location ? (
            <p className="mt-2 text-xs font-semibold text-brand-800">
              Pinned at {draft.location.lat.toFixed(6)}, {draft.location.lng.toFixed(6)}
            </p>
          ) : (
            <p id="place-location-hint" className="mt-2 text-[11px] text-bark-500">
              Use your current location, or drop a pin with Choose on Map if location is unavailable.
            </p>
          )}

          {locating ? (
            <p role="status" className="mt-2 text-xs font-semibold text-bark-700">
              Asking your device for a location fix…
            </p>
          ) : null}

          {locationError ? (
            <p id="place-location-error" className="mt-2 text-xs font-semibold text-red-700">
              {locationError}
            </p>
          ) : null}
        </fieldset>

        <div>
          <label htmlFor="place-description" className={LABEL_CLASS}>
            Description <span className="font-normal text-bark-500">(optional)</span>
          </label>
          <textarea
            id="place-description"
            ref={fieldRefs.description}
            value={draft.description}
            onChange={(event) => updateDraft('description', event.target.value)}
            rows={4}
            aria-invalid={fieldErrors.description ? true : undefined}
            aria-describedby={
              fieldErrors.description ? 'place-description-error' : 'place-description-hint'
            }
            placeholder="What makes this spot worth a visit?"
            className={cn(INPUT_CLASS, 'resize-y', fieldErrors.description ? 'border-red-400' : 'border-bark-200')}
          />
          {fieldErrors.description ? (
            <p id="place-description-error" className="mt-1 text-xs font-semibold text-red-700">
              {fieldErrors.description}
            </p>
          ) : (
            <p id="place-description-hint" className="mt-1 text-[11px] text-bark-500">
              {draft.description.trim().length}/{PLACE_FIELD_LIMITS.description} characters
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-bark-100 pt-4">
          <Button type="submit">{editMode ? 'Save changes' : 'Submit for review'}</Button>
          <Button variant="ghost" onClick={() => navigate(backTo)}>
            Cancel
          </Button>
          <p className="text-[11px] text-bark-500">
            Approved places earn {settings.placeApprovalPoints} pts, awarded once.
          </p>
        </div>
      </form>

      <p className="rounded-2xl border border-dashed border-bark-200 bg-white/70 p-4 text-xs text-bark-500">
        A place is a duplicate when an approved or pending place has the same name within{' '}
        {RULES.duplicateNameRadiusMeters} m. New spots stay “Pending review” and are hidden from the
        map until a moderator approves them (BR03, BR04).
        {editMode ? (
          <>
            {' '}
            You can keep editing or withdraw this suggestion from your profile until a moderator
            decides.
          </>
        ) : null}
      </p>

      <LocationPicker
        open={showPicker}
        initial={draft.location}
        onConfirm={(coords: Coordinates) => {
          updateDraft('location', coords)
          setShowPicker(false)
        }}
        onClose={() => setShowPicker(false)}
      />
    </div>
  )
}

/** [PRO03] Submission confirmation screen. */
function PlaceSubmitted({ place, post, mode }: Confirmation) {
  const user = useCurrentUser()
  const remaining = submissionsLeftToday(user.id)
  const updated = mode === 'updated'

  return (
    <div className="mx-auto max-w-2xl space-y-4" role="status">
      <section className="rounded-2xl border border-brand-200 bg-white p-6 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-800">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        <h1 className="mt-3 text-xl font-extrabold tracking-tight text-bark-900">
          {updated ? 'Suggestion updated' : 'Suggestion received'}
        </h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-bark-500">
          {updated ? (
            <>
              “{place.name}” is still in the moderator queue with your changes, and it is hidden
              from the map until it is approved.
            </>
          ) : (
            <>“{place.name}” is in the moderator queue and is hidden from the map until it is approved.</>
          )}
        </p>

        <div className="mt-3 flex justify-center">
          <PlaceStatusBadge status={place.reviewStatus} />
        </div>

        <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-900">
          Points: you will earn {place.points} pts <strong>once</strong>, as soon as a moderator
          approves this place. Rejected suggestions earn no points (BR05).
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to={`/forum/${post.id}`} className={buttonClasses('primary', 'md')}>
            View the forum post
          </Link>
          <Link to={updated ? '/profile' : '/map'} className={buttonClasses('outline', 'md')}>
            {updated ? 'Back to my profile' : 'Back to the map'}
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card">
        <h2 className="text-sm font-bold text-bark-900">What happens next</h2>
        <ol className="mt-2 space-y-2 text-sm text-bark-700">
          <li>1. Your post appears in Forum › Spot Suggestions with the status “Pending review”.</li>
          <li>2. A moderator approves or rejects it, and the post shows the decision.</li>
          <li>3. Approved places appear on the map for everyone.</li>
        </ol>

        <p className="mt-3 text-xs text-bark-500">
          {updated
            ? 'Your daily allowance is unchanged — an edit is not a new suggestion.'
            : `Submissions left today: ${remaining} of ${RULES.maxPlaceSubmissionsPerDay}.`}
        </p>
      </section>
    </div>
  )
}
