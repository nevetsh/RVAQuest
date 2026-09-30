import { describe, expect, it } from 'vitest'
import type { Coordinates } from '../services/types'
import { haversineMeters, isWithinMeters, isValidCoordinate, toRadians } from './geo'

const RICHMOND: Coordinates = { lat: 37.5407, lng: -77.436 }

describe('haversineMeters', () => {
  it('is zero for a point against itself', () => {
    expect(haversineMeters(RICHMOND, RICHMOND)).toBe(0)
  })

  it('is symmetric', () => {
    const monticello: Coordinates = { lat: 38.0084, lng: -78.4529 }
    expect(haversineMeters(RICHMOND, monticello)).toBeCloseTo(
      haversineMeters(monticello, RICHMOND),
      6,
    )
  })

  it('matches the known ~111.2 km per degree of latitude', () => {
    const oneDegreeNorth: Coordinates = { lat: RICHMOND.lat + 1, lng: RICHMOND.lng }
    expect(haversineMeters(RICHMOND, oneDegreeNorth)).toBeGreaterThan(110_000)
    expect(haversineMeters(RICHMOND, oneDegreeNorth)).toBeLessThan(112_000)
  })
})

describe('isWithinMeters', () => {
  it('accepts a point just inside the check-in radius', () => {
    // ~55.6 m north of downtown.
    const nearby: Coordinates = { lat: RICHMOND.lat + 0.0005, lng: RICHMOND.lng }
    expect(isWithinMeters(RICHMOND, nearby, 100)).toBe(true)
  })

  it('rejects a point beyond the check-in radius', () => {
    // ~111.2 m north of downtown.
    const justOver: Coordinates = { lat: RICHMOND.lat + 0.001, lng: RICHMOND.lng }
    expect(isWithinMeters(RICHMOND, justOver, 100)).toBe(false)
  })
})

describe('isValidCoordinate', () => {
  it('accepts a real lat/lng pair', () => {
    expect(isValidCoordinate(RICHMOND)).toBe(true)
  })

  it.each([
    ['null', null],
    ['NaN latitude', { lat: Number.NaN, lng: 0 }],
    ['out-of-range latitude', { lat: 91, lng: 0 }],
    ['missing longitude', { lat: 37 }],
    ['a string', '37.5407,-77.436'],
  ])('rejects %s', (_label, value) => {
    expect(isValidCoordinate(value)).toBe(false)
  })
})

describe('toRadians', () => {
  it('converts 180 degrees to PI', () => {
    expect(toRadians(180)).toBeCloseTo(Math.PI, 12)
  })
})
