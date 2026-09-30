import { getState, setState } from '../services/store'
import { currentDayKey } from '../rules/time'
import { RULES } from '../lib/constants'
import type { SubmissionLogEntry } from '../services/places.types'

/**
 * Prototype-only actions behind the Dev tools drawer. They make the time- and
 * limit-based rules demonstrable without waiting for midnight or typing twelve
 * submissions by hand.
 */

/** Moves every "today" check forward one Richmond day (UC03 BR02, UC02 BR03). */
export function jumpToTomorrow(): void {
  setState((state) => ({ ...state, dayOffset: state.dayOffset + 1 }))
}

/** Returns to the real current day. */
export function jumpToToday(): void {
  setState((state) => ({ ...state, dayOffset: 0 }))
}

/** The day key the app currently treats as today. */
export function currentRichmondDayKey(): string {
  const state = getState()
  return currentDayKey(new Date(), state.dayOffset)
}

/**
 * Clears the submission counter for the current day. The places themselves
 * stay in the store — only the "12 per day" ledger is reset.
 */
export function resetDailyLimits(): void {
  const state = getState()
  const dayKey = currentDayKey(new Date(), state.dayOffset)

  setState((current) => ({
    ...current,
    submissions: current.submissions.filter((entry) => entry.dayKey !== dayKey),
  }))
}

/** Adds submission-log rows until the user has used their full daily quota. */
export function fillDailyQuota(
  userId: string,
  limit: number = RULES.maxPlaceSubmissionsPerDay,
): void {
  setState((state) => {
    const dayKey = currentDayKey(new Date(), state.dayOffset)
    const used = state.submissions.filter(
      (entry) => entry.userId === userId && entry.dayKey === dayKey,
    ).length
    const missing = Math.max(0, limit - used)
    const stamp = new Date().toISOString()
    const seed = Date.now().toString(36)

    const additions: SubmissionLogEntry[] = Array.from({ length: missing }, (_, index) => ({
      id: `dev-quota-${seed}-${index}`,
      userId,
      placeId: `dev-quota-place-${seed}-${index}`,
      dayKey,
      createdAt: stamp,
    }))

    return { ...state, submissions: [...state.submissions, ...additions] }
  })
}
