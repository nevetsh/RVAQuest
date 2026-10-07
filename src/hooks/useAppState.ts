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

/**
 * The signed-in account, or null while the sign-in gate is up (Phase 7).
 * Components inside the shell can keep using `useCurrentUser`; this hook is for
 * the gate itself.
 */
export function useSignedInUser(): User | null {
  const state = useAppState()
  if (!state.signedInUserId) return null
  return state.users.find((user) => user.id === state.signedInUserId) ?? null
}

export function useQuests(): Quest[] {
  return useAppState().quests
}
