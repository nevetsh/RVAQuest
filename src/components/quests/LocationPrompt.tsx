import { useLocation as useLocationContext } from '../../app/LocationProvider'
import { Button } from '../ui/Button'

/**
 * The location prompt (FR08). Three states: ask, granted, or "location off,
 * still browsing" so the quest list is never blocked.
 */
export function LocationPrompt() {
  const { coords, status, source, promptDismissed, message, requestLocation, dismissPrompt } =
    useLocationContext()

  if (coords) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-900">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-white">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6a1 1 0 0 1 1 1v2.1a9 9 0 0 1 7.9 7.9H23a1 1 0 1 1 0 2h-2.1a9 9 0 0 1-7.9 7.9V23a1 1 0 1 1-2 0v-2.1A9 9 0 0 1 3.1 13H1a1 1 0 1 1 0-2h2.1A9 9 0 0 1 11 3.1V2a1 1 0 0 1 1-1Z" />
          </svg>
        </span>
        Sorted by distance from you
        {source === 'simulated' ? (
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-brand-700">
            simulated location
          </span>
        ) : null}
        <button
          type="button"
          onClick={requestLocation}
          className="ml-auto rounded-full px-2 py-1 text-[11px] font-bold text-brand-800 underline"
        >
          Refresh
        </button>
      </div>
    )
  }

  if (promptDismissed || status === 'denied' || status === 'unavailable') {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-bark-200 bg-white px-3 py-2 text-xs text-bark-700">
        <span className="font-semibold text-bark-900">Location off</span>
        <span>{message ?? 'Showing all quests in alphabetical order.'}</span>
        <button
          type="button"
          onClick={requestLocation}
          className="ml-auto rounded-full px-2 py-1 text-[11px] font-bold text-brand-800 underline"
        >
          Enable location
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-bark-900">Find quests near you</h2>
          <p className="mt-0.5 text-xs text-bark-500">
            Turn on location to sort quests by walking distance. We only use it while you browse and
            never share it with anyone else.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={requestLocation} disabled={status === 'locating'}>
          {status === 'locating' ? 'Getting location…' : 'Enable Location'}
        </Button>
        <Button size="sm" variant="secondary" onClick={dismissPrompt}>
          Browse All Quests
        </Button>
      </div>
    </div>
  )
}
