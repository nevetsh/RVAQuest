import { describe, expect, it } from 'vitest'
import type { Coordinates, Quest } from '../services/types'
import {
  filterByCategory,
  searchQuests,
  selectQuests,
  sortByDistance,
  visibleQuests,
  withDistance,
} from './quests'

/**
 * Phase 1 acceptance tests for the quest list: search, "only approved quests
 * are shown" and "sort by distance when location is on".
 */

const DOWNTOWN: Coordinates = { lat: 37.5407, lng: -77.436 }
const BELLE_ISLE: Coordinates = { lat: 37.5295, lng: -77.45 }
const MAYMONT: Coordinates = { lat: 37.534, lng: -77.478 }
const PETERSBURG: Coordinates = { lat: 37.2279, lng: -77.4019 }

function makeQuest(overrides: Partial<Quest> & Pick<Quest, 'id' | 'name'>): Quest {
  return {
    description: 'A test quest.',
    category: 'Outdoors',
    location: DOWNTOWN,
    area: 'Downtown',
    points: 30,
    requirements: ['Take a photo'],
    status: 'unlocked',
    reviewStatus: 'approved',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const belleIsle = makeQuest({
  id: 'belle-isle',
  name: 'Belle Isle Loop',
  area: 'Belle Isle',
  category: 'Outdoors',
  location: BELLE_ISLE,
})

const maymont = makeQuest({
  id: 'maymont',
  name: 'Maymont Gardens',
  area: 'Maymont',
  category: 'Parks',
  location: MAYMONT,
})

const carytownMural = makeQuest({
  id: 'carytown-mural',
  name: 'Carytown Mural Walk',
  area: 'Carytown',
  category: 'Art',
  location: { lat: 37.5523, lng: -77.481 },
})

const pendingQuest = makeQuest({
  id: 'pending-pipeline',
  name: 'Pipeline Overlook',
  area: 'Shockoe Slip',
  reviewStatus: 'pending',
})

const rejectedQuest = makeQuest({
  id: 'rejected-floodwall',
  name: 'Floodwall Steps',
  area: 'Riverfront',
  reviewStatus: 'rejected',
})

const allQuests = [belleIsle, maymont, carytownMural, pendingQuest, rejectedQuest]

describe('searchQuests', () => {
  it('returns every quest for an empty or whitespace-only query', () => {
    expect(searchQuests(allQuests, '')).toHaveLength(allQuests.length)
    expect(searchQuests(allQuests, '   ')).toHaveLength(allQuests.length)
  })

  it('matches on quest name', () => {
    expect(searchQuests(allQuests, 'maymont').map((q) => q.id)).toEqual(['maymont'])
  })

  it('matches on location / neighbourhood, not just the name', () => {
    // "Carytown" only appears in the area field of the mural quest.
    expect(searchQuests(allQuests, 'carytown').map((q) => q.id)).toEqual(['carytown-mural'])
  })

  it('matches on category', () => {
    expect(searchQuests(allQuests, 'art').map((q) => q.id)).toEqual(['carytown-mural'])
  })

  it('is case-insensitive and ignores surrounding whitespace', () => {
    expect(searchQuests(allQuests, '  bELLe isLE  ').map((q) => q.id)).toEqual(['belle-isle'])
  })

  it('returns an empty list when nothing matches', () => {
    expect(searchQuests(allQuests, 'shenandoah')).toEqual([])
  })

  it('does not mutate the input array', () => {
    const before = [...allQuests]
    searchQuests(allQuests, 'belle')
    expect(allQuests).toEqual(before)
  })
})

describe('filterByCategory', () => {
  it('returns everything for "all"', () => {
    expect(filterByCategory(allQuests, 'all')).toHaveLength(allQuests.length)
  })

  it('keeps only the requested category', () => {
    expect(filterByCategory(allQuests, 'Parks').map((q) => q.id)).toEqual(['maymont'])
  })
})

describe('visibleQuests', () => {
  it('hides pending and rejected quests, keeping only approved ones', () => {
    expect(visibleQuests(allQuests).map((q) => q.id)).toEqual([
      'belle-isle',
      'maymont',
      'carytown-mural',
    ])
  })
})

describe('withDistance', () => {
  it('attaches a null distance when no location is known', () => {
    const result = withDistance([belleIsle], null)
    expect(result[0].distanceMeters).toBeNull()
  })

  it('measures from the user to each quest', () => {
    const result = withDistance([belleIsle, maymont], DOWNTOWN)
    // Downtown to Belle Isle is ~1.75 km, to Maymont ~3.78 km.
    expect(result[0].distanceMeters).toBeCloseTo(1754, -2)
    expect(result[1].distanceMeters).toBeCloseTo(3777, -2)
  })

  it('does not mutate the original quests', () => {
    withDistance([belleIsle], DOWNTOWN)
    expect('distanceMeters' in belleIsle).toBe(false)
  })
})

describe('sortByDistance', () => {
  const scattered = [carytownMural, maymont, belleIsle]

  it('orders nearest first from the user location', () => {
    expect(sortByDistance(scattered, DOWNTOWN).map((q) => q.id)).toEqual([
      'belle-isle',
      'maymont',
      'carytown-mural',
    ])
  })

  it('leaves every distance unknown, and orders by name, without a location', () => {
    const result = sortByDistance(scattered, null)
    expect(result.every((q) => q.distanceMeters === null)).toBe(true)
    expect(result.map((q) => q.id)).toEqual(['belle-isle', 'carytown-mural', 'maymont'])
  })

  it('falls back to name order when distances tie', () => {
    const sameSpot = [
      makeQuest({ id: 'zulu', name: 'Zulu Quest' }),
      makeQuest({ id: 'alpha', name: 'Alpha Quest' }),
    ]
    expect(sortByDistance(sameSpot, DOWNTOWN).map((q) => q.id)).toEqual(['alpha', 'zulu'])
  })

  it('is stable enough to put a far-away quest last', () => {
    const far = makeQuest({
      id: 'petersburg',
      name: 'Petersburg Walk',
      location: PETERSBURG,
      area: 'Petersburg',
    })
    expect(sortByDistance([far, maymont, belleIsle], DOWNTOWN).map((q) => q.id)).toEqual([
      'belle-isle',
      'maymont',
      'petersburg',
    ])
  })
})

describe('selectQuests', () => {
  it('only ever returns approved quests', () => {
    const ids = selectQuests(allQuests).map((q) => q.id)
    expect(ids).not.toContain('pending-pipeline')
    expect(ids).not.toContain('rejected-floodwall')
  })

  it('sorts alphabetically when the user has no location', () => {
    expect(selectQuests(allQuests, { from: null }).map((q) => q.name)).toEqual([
      'Belle Isle Loop',
      'Carytown Mural Walk',
      'Maymont Gardens',
    ])
  })

  it('sorts by distance when the user has a location and marks distances known', () => {
    const result = selectQuests(allQuests, { from: DOWNTOWN })
    expect(result.map((q) => q.id)).toEqual(['belle-isle', 'maymont', 'carytown-mural'])
    expect(result.every((q) => q.distanceMeters !== null)).toBe(true)
  })

  it('combines search text with a category chip', () => {
    expect(selectQuests(allQuests, { query: 'walk', category: 'Art' }).map((q) => q.id)).toEqual([
      'carytown-mural',
    ])
    expect(selectQuests(allQuests, { query: 'walk', category: 'Parks' })).toEqual([])
  })

  it('returns nothing for a query that matches no approved quest', () => {
    expect(selectQuests(allQuests, { query: 'Pipeline' })).toEqual([])
  })
})
