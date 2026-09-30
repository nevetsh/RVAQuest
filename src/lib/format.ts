/** Display helpers — no business rules live here. */

export function formatDistance(meters: number | null): string {
  if (meters === null || !Number.isFinite(meters)) return '—'
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}

export function formatPoints(points: number): string {
  return `${points} ${points === 1 ? 'pt' : 'pts'}`
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** "3 days ago" style timestamps for forum posts and comments. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ''

  const seconds = Math.max(0, Math.round((now.getTime() - then) / 1000))
  if (seconds < 45) return 'just now'

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return minutes <= 1 ? '1 min ago' : `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return hours <= 1 ? '1 hour ago' : `${hours} hours ago`

  const days = Math.round(hours / 24)
  if (days < 7) return days === 1 ? 'yesterday' : `${days} days ago`

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(then),
  )
}

/** Neutral wording for a distance that is only known roughly (GPS jitter). */
export function formatApproxDistance(meters: number | null): string {
  if (meters === null) return 'Distance unavailable'
  if (meters < 60) return 'Right here'
  return `About ${formatDistance(meters)} away`
}
