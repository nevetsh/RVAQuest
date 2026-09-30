import { RICHMOND_TIME_ZONE } from '../lib/constants'

/**
 * Day boundaries are Richmond local time (UC02 BR03, UC03 BR02). Everything
 * that talks about "today" — the daily check-in, the 12 submissions/day limit
 * — goes through here so there is exactly one definition of a day.
 */

/** `YYYY-MM-DD` for the given instant, in Richmond local time. */
export function richmondDayKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RICHMOND_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const value = (type: 'year' | 'month' | 'day') =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${value('year')}-${value('month')}-${value('day')}`
}

/** Shifts an instant by whole days (backs the Dev tools "jump to tomorrow"). */
export function shiftDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

/**
 * The day key the app should treat as "today". `dayOffset` is a prototype-only
 * knob set by the Dev tools drawer so a demo can skip to tomorrow without
 * waiting for midnight.
 */
export function currentDayKey(now: Date = new Date(), dayOffset = 0): string {
  return richmondDayKey(shiftDays(now, dayOffset))
}
