import type { AppState } from './types'

/**
 * localStorage is the whole "database" for the prototype. Everything is
 * namespaced under one key and versioned so a schema change can be detected
 * instead of crashing the app.
 */

export const STORAGE_SCHEMA_VERSION = 3
const STORAGE_KEY = 'rva-quest:state'

function storageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

export function loadState(): AppState | null {
  if (!storageAvailable()) return null

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<AppState>
    if (parsed?.schemaVersion !== STORAGE_SCHEMA_VERSION) return null
    if (!Array.isArray(parsed.users) || !Array.isArray(parsed.quests)) return null
    if (!Array.isArray(parsed.places) || !Array.isArray(parsed.forumPosts)) return null
    if (!Array.isArray(parsed.forumReports)) return null
    if (!Array.isArray(parsed.submissions)) return null
    if (typeof parsed.dayOffset !== 'number') return null
    if (!parsed.settings || typeof parsed.settings.placeApprovalPoints !== 'number') return null
    if (!Array.isArray(parsed.auditLog)) return null
    if (!parsed.users.some((user) => user.id === parsed.currentUserId)) return null

    return parsed as AppState
  } catch {
    return null
  }
}

export function saveState(state: AppState): void {
  if (!storageAvailable()) return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be full or blocked — the app still works for this session.
  }
}

export function clearState(): void {
  if (!storageAvailable()) return

  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing useful to do.
  }
}
