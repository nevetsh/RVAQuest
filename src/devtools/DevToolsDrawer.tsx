import { useState, type ReactNode } from 'react'
import { useAppState, useCurrentUser, useQuests } from '../hooks/useAppState'
import { useLocation as useLocationContext } from '../app/LocationProvider'
import { resetAllData, setLocationDenied, setSimulatedLocation, switchUser } from '../services'
import type { Coordinates } from '../services/types'
import { RICHMOND_CENTER, RULES } from '../lib/constants'
import { currentDayKey } from '../rules/time'
import { fillDailyQuota, jumpToToday, jumpToTomorrow, resetDailyLimits } from './devActions'
import { RoleBadge, StatusBadge } from '../components/admin/RoleBadge'
import { cn } from '../lib/cn'

/**
 * Prototype-only drawer used to demo the rules without walking around
 * Richmond: fake a GPS fix, deny location, switch role or wipe the data.
 */

const LOCATION_PRESETS: Array<{ label: string; coords: Coordinates }> = [
  { label: 'Downtown / Capitol', coords: RICHMOND_CENTER },
  { label: 'Belle Isle', coords: { lat: 37.5295, lng: -77.45 } },
  { label: 'Maymont', coords: { lat: 37.534, lng: -77.478 } },
  { label: 'Carytown', coords: { lat: 37.5523, lng: -77.481 } },
  // Deliberately far away, to show the "nothing nearby" state.
  { label: 'Far away (Petersburg)', coords: { lat: 37.2279, lng: -77.4019 } },
]

export function DevToolsDrawer() {
  const [open, setOpen] = useState(false)
  const state = useAppState()
  const user = useCurrentUser()
  const quests = useQuests()
  const { coords, source, requestLocation } = useLocationContext()

  const pendingCount = quests.filter((quest) => quest.reviewStatus === 'pending').length
  const dayKey = currentDayKey(new Date(), state.dayOffset)
  const submissionsUsedToday = state.submissions.filter(
    (entry) => entry.userId === user.id && entry.dayKey === dayKey,
  ).length

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-bark-900 px-3 py-2 text-xs font-bold text-white shadow-lg hover:bg-bark-700 md:bottom-6"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M14.7 6.3a4 4 0 0 1 5 5L9 22H2v-7l10.7-8.7Z" strokeLinejoin="round" />
          <path d="m13 8 3 3" strokeLinecap="round" />
        </svg>
        Dev tools
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Dev tools">
          <button
            type="button"
            aria-label="Close dev tools"
            onClick={() => setOpen(false)}
            className="flex-1 bg-bark-900/40"
          />

          <div className="flex h-full w-[22rem] max-w-full flex-col overflow-y-auto bg-white shadow-2xl">
            <header className="sticky top-0 flex items-center justify-between border-b border-bark-200 bg-white px-4 py-3">
              <div>
                <h2 className="text-sm font-extrabold text-bark-900">Dev tools</h2>
                <p className="text-[11px] text-bark-500">Prototype only — not part of the app UI</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-bark-500 hover:bg-bark-100"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className="space-y-5 px-4 py-4 text-sm">
              <Section title="Location">
                <p className="mb-2 text-xs text-bark-500">
                  {coords
                    ? `${source === 'simulated' ? 'Simulated' : 'GPS'} fix · ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                    : 'No location fix yet'}
                </p>

                <div className="grid gap-1.5">
                  {LOCATION_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setSimulatedLocation(preset.coords)}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-left text-xs font-semibold transition',
                        source === 'simulated' &&
                          coords?.lat === preset.coords.lat &&
                          coords?.lng === preset.coords.lng
                          ? 'border-brand-600 bg-brand-50 text-brand-900'
                          : 'border-bark-200 text-bark-700 hover:border-brand-400',
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <DevButton onClick={requestLocation}>Use real GPS</DevButton>
                  <DevButton onClick={() => setSimulatedLocation(null)}>Clear simulated</DevButton>
                  <DevButton
                    onClick={() => {
                      setSimulatedLocation(null)
                      setLocationDenied(true)
                    }}
                  >
                    Deny location
                  </DevButton>
                </div>
              </Section>

              <Section title="Day & limits">
                <p className="mb-2 text-xs text-bark-500">
                  Today: <span className="font-semibold text-bark-700">{dayKey}</span>
                  {state.dayOffset !== 0
                    ? ` · jumped ${state.dayOffset} day${state.dayOffset === 1 ? '' : 's'} ahead`
                    : ''}
                  {' · '}
                  {submissionsUsedToday} of {RULES.maxPlaceSubmissionsPerDay} place submissions used
                  by {user.name}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  <DevButton
                    onClick={jumpToTomorrow}
                    title="Move every “today” check forward one Richmond day"
                  >
                    Jump to tomorrow
                  </DevButton>
                  {state.dayOffset !== 0 ? (
                    <DevButton onClick={jumpToToday}>Back to today</DevButton>
                  ) : null}
                  <DevButton
                    onClick={resetDailyLimits}
                    title="Clear the 12/day submission ledger for today"
                  >
                    Reset daily limits
                  </DevButton>
                  <DevButton
                    onClick={() => fillDailyQuota(user.id)}
                    title="Log 12 submissions so the daily-limit error can be demoed"
                  >
                    Fill today’s quota
                  </DevButton>
                </div>
                <p className="mt-2 text-[11px] text-bark-500">
                  Days roll over at midnight Richmond time. Reset clears today’s ledger without
                  touching the places themselves.
                </p>
              </Section>

              <Section title="User & role">
                <div className="grid gap-1.5">
                  {state.users.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => switchUser(entry.id)}
                      className={cn(
                        'flex items-center justify-between rounded-xl border px-3 py-2 text-left transition',
                        entry.id === user.id
                          ? 'border-brand-600 bg-brand-50'
                          : 'border-bark-200 hover:border-brand-400',
                      )}
                    >
                      <span>
                        <span className="block text-xs font-bold text-bark-900">{entry.name}</span>
                        <span className="block text-[11px] text-bark-500">
                          {entry.points} pts · {entry.streak}-day streak
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        {entry.status === 'suspended' ? <StatusBadge status={entry.status} /> : null}
                        <RoleBadge role={entry.role} />
                      </span>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Data">
                <p className="mb-2 text-xs text-bark-500">
                  {quests.length} quests stored ({pendingCount} pending review) · schema v
                  {state.schemaVersion}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset all quests, users and favourites back to the seed data?')) {
                      resetAllData()
                    }
                  }}
                  className="w-full rounded-xl border border-red-300 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                >
                  Reset all data
                </button>
              </Section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-bark-500">{title}</h3>
      {children}
    </section>
  )
}

function DevButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded-full border border-bark-200 px-2.5 py-1.5 text-[11px] font-semibold text-bark-700 transition hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}
