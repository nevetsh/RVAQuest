import type { AppState } from './types'
import { createSeedState } from './seed'
import { STORAGE_SCHEMA_VERSION, clearState, loadState, saveState } from './storage'

/**
 * Tiny observable store over the localStorage state. React reads it with
 * useSyncExternalStore (see hooks/useAppState) so screens never pass data
 * through props.
 */

let state: AppState = loadState() ?? createSeedState(STORAGE_SCHEMA_VERSION)

const listeners = new Set<() => void>()

export function getState(): AppState {
  return state
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit(): void {
  for (const listener of listeners) listener()
}

/** Applies a pure updater to the state, persists it and notifies subscribers. */
export function setState(updater: (previous: AppState) => AppState): void {
  const next = updater(state)
  if (next === state) return

  state = next
  saveState(state)
  emit()
}

/** Wipes the stored state and rebuilds it from the seed data. */
export function resetAllData(): void {
  clearState()
  state = createSeedState(STORAGE_SCHEMA_VERSION)
  saveState(state)
  emit()
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Handy for poking at the state from the browser console (and skipped in
  // Node-based unit tests, where there is no window).
  ;(window as unknown as Record<string, unknown>).__rvaQuest = {
    getState,
    setState,
    resetAllData,
  }
}
