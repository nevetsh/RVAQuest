import type { Coordinates, Quest, User } from './types'
import { getState, resetAllData, setState } from './store'
import { visibleQuests } from '../rules/quests'

/** Read/write helpers the UI calls instead of touching the store directly. */

export { resetAllData }

export function listQuests(): Quest[] {
  return getState().quests
}

export function getQuestById(id: string): Quest | undefined {
  return getState().quests.find((quest) => quest.id === id)
}

/** FR02: quests a regular user is allowed to see. */
export function listVisibleQuests(): Quest[] {
  return visibleQuests(getState().quests)
}

export function listUsers(): User[] {
  return getState().users
}

export function getCurrentUser(): User {
  const { users, currentUserId } = getState()
  return users.find((user) => user.id === currentUserId) ?? users[0]
}

export function switchUser(userId: string): void {
  setState((state) =>
    state.users.some((user) => user.id === userId) ? { ...state, currentUserId: userId } : state,
  )
}

export function isFavorite(userId: string, questId: string): boolean {
  const user = getState().users.find((entry) => entry.id === userId)
  return !!user?.favoriteQuestIds.includes(questId)
}

/** FR06: save or unsave a quest for the current user. */
export function toggleFavorite(userId: string, questId: string): boolean {
  let saved = false

  setState((state) => ({
    ...state,
    users: state.users.map((user) => {
      if (user.id !== userId) return user

      const alreadySaved = user.favoriteQuestIds.includes(questId)
      saved = !alreadySaved

      return {
        ...user,
        favoriteQuestIds: alreadySaved
          ? user.favoriteQuestIds.filter((id) => id !== questId)
          : [...user.favoriteQuestIds, questId],
      }
    }),
  }))

  return saved
}

/** Used by the dev tools drawer to fake a GPS fix. */
export function setSimulatedLocation(location: Coordinates | null): void {
  setState((state) => ({ ...state, simulatedLocation: location }))
}

export function setLocationDenied(denied: boolean): void {
  setState((state) => ({ ...state, locationDenied: denied }))
}
