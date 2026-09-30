/**
 * Fixed numbers from the SRS core rules. Kept in one place so the rules layer
 * and the UI can never drift apart.
 */
export const RICHMOND_TIME_ZONE = 'America/New_York'

/** Map default view: downtown Richmond, VA. */
export const RICHMOND_CENTER = { lat: 37.5407, lng: -77.436 } as const

/** Fallback zoom when the user has no location yet. */
export const DEFAULT_MAP_ZOOM = 13
export const FOCUSED_MAP_ZOOM = 16

/**
 * UC03 BR05: points for an approved place are administrator-defined. The SRS
 * does not fix a number, so the prototype uses 25 for every approved place.
 */
export const PLACE_APPROVAL_POINTS = 25

/**
 * FR01 — every post and comment is checked against this list before it is
 * published. It is a deliberately small starter list for the prototype: the
 * filter logic in src/rules/forum.ts is what matters, and swapping the list
 * out does not touch the rules or the UI.
 */
export const BANNED_WORDS = [
  'damn',
  'hell',
  'crap',
  'idiot',
  'stupid',
  'moron',
  'bastard',
  'jackass',
  'wtf',
  'shut up',
  'hate you',
  'nobody cares',
] as const

/** Field lengths from the UC04 data description (FR01). */
export const FORUM_LIMITS = {
  title: 80,
  body: 1000,
  comment: 500,
  reportReason: 200,
} as const

export const RULES = {
  /** A daily check-in counts only within this radius of the daily spot. */
  checkInRadiusMeters: 100,
  /** Same name within this radius counts as a duplicate place submission. */
  duplicateNameRadiusMeters: 50,
  /** Maximum place submissions per user per day (NFR04). */
  maxPlaceSubmissionsPerDay: 12,
} as const
