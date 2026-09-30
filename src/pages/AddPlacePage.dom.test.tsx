// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Leaflet never loads in jsdom — the picker's coordinates are enough for these
// tests, and the form's own logic is what is under test.
vi.mock('../components/places/LazyPinPicker', () => ({
  LazyPinPicker: () => <div data-testid="pin-picker" />,
}))

import { AddPlacePage } from './AddPlacePage'
import { LocationProvider } from '../app/LocationProvider'
import { getState, resetAllData } from '../services/store'
import { switchUser } from '../services'
import { updateSettings } from '../services/admin'
import { fillDailyQuota } from '../devtools/devActions'
import { submitPlace } from '../services/places.service'
import type { PlaceDraft } from '../rules/places'

/** The hint's own heading — the page also mentions "duplicate" in body copy. */
const HINT_HEADING = /Possible duplicate — check before you submit|This looks like a duplicate/

/** Seeded approved place: 'Scuffletown Park' sits at 37.5467, -77.4577. */
const SCUFFLETOWN = { lat: 37.5467, lng: -77.4577 }
/** Empty corner of the city, far from every seeded place. */
const ELSEWHERE = { lat: 37.497, lng: -77.51 }

function renderForm(route = '/places/new') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <LocationProvider>
        <AddPlacePage />
      </LocationProvider>
    </MemoryRouter>,
  )
}

/** The dialog's lat/lng boxes are controlled and reformatted on every change. */
function setPin(lat: number, lng: number) {
  fireEvent.change(screen.getByLabelText(/latitude/i), { target: { value: String(lat) } })
  fireEvent.change(screen.getByLabelText(/longitude/i), { target: { value: String(lng) } })
}

async function choosePin(lat: number, lng: number) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /choose on map/i }))
  const dialog = screen.getByRole('dialog')
  setPin(lat, lng)
  await user.click(within(dialog).getByRole('button', { name: /confirm location/i }))
  return dialog
}

async function fillValidDraft(name: string, location = ELSEWHERE) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/place name/i), name)
  await user.selectOptions(screen.getByLabelText(/category/i), 'Outdoors')
  await choosePin(location.lat, location.lng)
  return user
}

function placesNamed(name: string) {
  return getState().places.filter((place) => place.name === name)
}

// Globals are off in this project, so the automatic cleanup hook is not registered.
afterEach(cleanup)

beforeEach(() => {
  resetAllData()
  switchUser('jordan')
})

describe('AddPlacePage — validation and error paths', () => {
  it('refuses an empty form and names every missing field', async () => {
    const user = userEvent.setup()
    renderForm()
    const before = getState().places.length

    await user.click(screen.getByRole('button', { name: /submit for review/i }))

    expect(screen.getByRole('alert').textContent).toContain(
      'Some required details are missing or invalid',
    )
    expect(screen.getByText('Enter a place name.')).toBeTruthy()
    expect(screen.getByText('Pick a category for the place.')).toBeTruthy()
    expect(screen.getByText(/Add a location — use your current location/)).toBeTruthy()
    expect(getState().places.length).toBe(before)
  })

  it('shows the administrator-set reward on the form', () => {
    updateSettings('alex', { placeApprovalPoints: 40 })
    renderForm()

    expect(screen.getByText(/Approved places earn 40 pts/)).toBeTruthy()
  })

  it('tells the submitter suggestions are paused instead of accepting one', async () => {
    updateSettings('alex', { placeSubmissionsPaused: true })
    renderForm()

    const user = await fillValidDraft('Vista Point Lookout')
    await user.click(screen.getByRole('button', { name: /submit for review/i }))

    expect(screen.getByRole('alert').textContent).toContain('paused right now')
    expect(placesNamed('Vista Point Lookout')).toHaveLength(0)
  })

  it('refuses submission once the 12-a-day allowance is used up', async () => {
    fillDailyQuota('jordan')
    renderForm()

    const user = await fillValidDraft('Vista Point Lookout')
    await user.click(screen.getByRole('button', { name: /submit for review/i }))

    expect(screen.getByRole('alert').textContent).toContain('reached the limit of 12')
    expect(placesNamed('Vista Point Lookout')).toHaveLength(0)
  })

  it('accepts a valid draft and confirms it is pending review', async () => {
    renderForm()
    const user = await fillValidDraft('Vista Point Lookout')
    await user.click(screen.getByRole('button', { name: /submit for review/i }))

    expect(screen.getByText('Suggestion received')).toBeTruthy()
    expect(screen.getByText(/you will earn 25 pts/i)).toBeTruthy()

    const created = placesNamed('Vista Point Lookout')
    expect(created).toHaveLength(1)
    expect(created[0].reviewStatus).toBe('pending')
  })
})

describe('AddPlacePage — duplicate warning while the pin moves (BR03)', () => {
  it('warns inside the picker as soon as the pin lands on a same-named place', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/place name/i), 'Scuffletown Park')
    await user.click(screen.getByRole('button', { name: /choose on map/i }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByText(HINT_HEADING)).toBeNull()

    setPin(SCUFFLETOWN.lat, SCUFFLETOWN.lng)

    // Still inside the dialog, and still nothing submitted.
    expect(within(dialog).getByText(HINT_HEADING)).toBeTruthy()
    expect(within(dialog).getByText(/“Scuffletown Park” is approved/)).toBeTruthy()
    expect(placesNamed('Scuffletown Park')).toHaveLength(1)
  })

  it('carries the warning onto the form and still refuses the duplicate on submit', async () => {
    const user = userEvent.setup()
    renderForm()
    const before = getState().places.length

    await user.type(screen.getByLabelText(/place name/i), 'Scuffletown Park')
    await user.selectOptions(screen.getByLabelText(/category/i), 'Outdoors')
    await choosePin(SCUFFLETOWN.lat, SCUFFLETOWN.lng)

    expect(screen.getByText(HINT_HEADING)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /submit for review/i }))

    expect(screen.getByRole('alert').textContent).toContain('is already suggested within 50 m')
    expect(getState().places.length).toBe(before)
  })

  it('advises rather than blocks a same-named place outside the 50 m rule', async () => {
    // ~120 m north of the seeded pin: same name, outside the block radius.
    const user = userEvent.setup()
    renderForm()
    const before = getState().places.length

    await user.type(screen.getByLabelText(/place name/i), 'Scuffletown Park')
    await user.selectOptions(screen.getByLabelText(/category/i), 'Outdoors')
    await choosePin(37.54778, -77.4577)

    expect(screen.getByText(/Possible duplicate — check before you submit/)).toBeTruthy()
    expect(screen.getByText(/you can still submit it/)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /submit for review/i }))

    expect(screen.getByText('Suggestion received')).toBeTruthy()
    expect(getState().places.length).toBe(before + 1)
  })

  it('stays quiet about a nearby place with a different name', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/place name/i), 'Something Entirely New')
    await user.selectOptions(screen.getByLabelText(/category/i), 'Outdoors')
    await choosePin(SCUFFLETOWN.lat, SCUFFLETOWN.lng)

    expect(screen.queryByText(HINT_HEADING)).toBeNull()
  })

  it('never warns a suggestion about itself while it is being edited', async () => {
    const draft: PlaceDraft = {
      name: 'Vista Point Lookout',
      category: 'Outdoors',
      address: '',
      description: '',
      location: ELSEWHERE,
    }
    const submitted = submitPlace('jordan', draft)
    expect(submitted.ok).toBe(true)
    if (!submitted.ok) return

    renderForm(`/places/new?edit=${submitted.place.id}`)

    // The form is prefilled from the suggestion itself, 0 m from its own pin.
    expect((screen.getByLabelText(/place name/i) as HTMLInputElement).value).toBe(
      'Vista Point Lookout',
    )
    expect(screen.queryByText(HINT_HEADING)).toBeNull()
  })
})
