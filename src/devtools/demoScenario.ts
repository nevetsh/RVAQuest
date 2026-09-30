import { getState, resetAllData } from '../services/store'
import { switchUser } from '../services'
import { submitPlace } from '../services/places.service'
import type { PlaceDraft } from '../rules/places'

/**
 * One click for the walkthrough. The scenario rebuilds the demo data, files a
 * fresh pending suggestion *through the real pipeline* (so the moderator queue,
 * the daily-limit ledger and the linked forum post are all genuine records, not
 * hand-written fixtures) and signs in as the moderator who reviews it.
 *
 * Prototype-only, like the rest of the dev tools: it lives behind the drawer so
 * none of it ships in the app UI.
 */

/** Named so the drawer can tell whether the demo spot has been approved yet. */
export const DEMO_SUGGESTION_NAME = 'Rocketts Landing Riverwalk'

/** Checked by the drawer to keep step 1 honest (the queue really is non-empty). */
export const DEMO_SUBMITTER_ID = 'casey'
export const DEMO_REVIEWER_ID = 'dana'

const DEMO_DRAFT: PlaceDraft = {
  name: DEMO_SUGGESTION_NAME,
  category: 'Outdoors',
  address: '5000 Old Osborne Turnpike',
  description:
    'Boardwalk along the James with downtown skyline views, a fishable pier and benches facing the water.',
  location: { lat: 37.5257, lng: -77.4234 },
}

export interface DemoScenario {
  /** True when the seeded suggestion reached the review queue. */
  pending: boolean
  placeId: string | null
  postId: string | null
  submitterName: string
  reviewerName: string
}

export function startDemoScenario(): DemoScenario {
  resetAllData()

  const submitted = submitPlace(DEMO_SUBMITTER_ID, DEMO_DRAFT)
  switchUser(DEMO_REVIEWER_ID)

  const users = getState().users
  const name = (id: string) => users.find((user) => user.id === id)?.name ?? id

  return {
    pending: submitted.ok,
    placeId: submitted.ok ? submitted.place.id : null,
    postId: submitted.ok ? submitted.post.id : null,
    submitterName: name(DEMO_SUBMITTER_ID),
    reviewerName: name(DEMO_REVIEWER_ID),
  }
}
