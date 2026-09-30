import type { Coordinates, Quest, QuestCategory } from '../services/types'
import { haversineMeters } from './geo'

export interface QuestWithDistance extends Quest {
  /** Meters from the user when a location is known, otherwise null. */
  distanceMeters: number | null
}

export type CategoryFilter = QuestCategory | 'all'

export interface QuestQuery {
  query?: string
  category?: CategoryFilter
  from?: Coordinates | null
}

/**
 * Only approved quests are ever shown to users; pending and rejected
 * submissions stay hidden until a moderator approves them.
 */
export function visibleQuests(quests: Quest[]): Quest[] {
  return quests.filter((quest) => quest.reviewStatus === 'approved')
}

/** Free-text search over quest name, location (area) and category. */
export function searchQuests<T extends Quest>(quests: T[], query: string): T[] {
  const term = query.trim().toLowerCase()
  if (!term) return quests

  return quests.filter((quest) => {
    const haystack = `${quest.name} ${quest.area} ${quest.category}`.toLowerCase()
    return haystack.includes(term)
  })
}

export function filterByCategory<T extends Quest>(
  quests: T[],
  category: CategoryFilter,
): T[] {
  if (category === 'all') return quests
  return quests.filter((quest) => quest.category === category)
}

/** Attaches the distance from `from` to each quest. */
export function withDistance<T extends Quest>(
  quests: T[],
  from?: Coordinates | null,
): QuestWithDistance[] {
  return quests.map((quest) => ({
    ...quest,
    distanceMeters: from ? haversineMeters(from, quest.location) : null,
  }))
}

function byName(a: Quest, b: Quest): number {
  return a.name.localeCompare(b.name)
}

/** Nearest first. Quests without a known distance sink to the bottom. */
export function sortByDistance<T extends Quest>(
  quests: T[],
  from?: Coordinates | null,
): QuestWithDistance[] {
  const withDistances = withDistance(quests, from)
  return [...withDistances].sort((a, b) => {
    const da = a.distanceMeters ?? Number.POSITIVE_INFINITY
    const db = b.distanceMeters ?? Number.POSITIVE_INFINITY
    return da === db ? byName(a, b) : da - db
  })
}

export function sortByName<T extends Quest>(quests: T[]): T[] {
  return [...quests].sort(byName)
}

export function countByDistance<T extends Quest>(quests: T[], from: Coordinates, radiusMeters: number): number {
  return quests.filter((quest) => haversineMeters(from, quest.location) <= radiusMeters).length
}

/**
 * The single entry point the quest screens use: hide unapproved quests,
 * narrow by category and search text, then order by distance when the user's
 * location is known (alphabetical otherwise).
 */
export function selectQuests(quests: Quest[], options: QuestQuery = {}): QuestWithDistance[] {
  const { query = '', category = 'all', from = null } = options

  const filtered = filterByCategory(searchQuests(visibleQuests(quests), query), category)
  return from ? sortByDistance(filtered, from) : withDistance(sortByName(filtered), null)
}
