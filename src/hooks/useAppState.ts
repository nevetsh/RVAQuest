import { useSyncExternalStore } from 'react'
import type { AppState, Quest, User } from '../services/types'
import { getState, subscribe } from '../services/store'

/** Subscribes a component to the whole app state. */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState)
}

export function useCurrentUser(): User {
  const state = useAppState()
  return state.users.find((user) => user.id === state.currentUserId) ?? state.users[0]
}

export function useQuests(): Quest[] {
  return useAppState().quests
}
