import type { Coordinates } from '../services/types'

/** Mean earth radius in meters. */
const EARTH_RADIUS_M = 6371008.8

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function isValidCoordinate(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') return false
  const { lat, lng } = value as Coordinates
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

/** Great-circle distance in meters between two points. */
export function haversineMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** True when two points are no further apart than `radiusMeters`. */
export function isWithinMeters(a: Coordinates, b: Coordinates, radiusMeters: number): boolean {
  return haversineMeters(a, b) <= radiusMeters
}
