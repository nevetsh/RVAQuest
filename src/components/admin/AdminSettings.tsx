import { useState } from 'react'
import { useAppState, useCurrentUser } from '../../hooks/useAppState'
import {
  exportStateJson,
  getSettings,
  resetEverything,
  resetSettings,
  updateSettings,
} from '../../services/admin'
import { BANNED_WORDS, RULES } from '../../lib/constants'
import { DEFAULT_SETTINGS } from '../../services/types'
import { canManageSettings, canResetData } from '../../rules/permissions'
import { pluralize } from '../../lib/format'

/**
 * Phase 6 — the switchboard. Only the values the SRS leaves open are editable;
 * the core rules (100 m check-in radius, 12 submissions a day, the 50 m
 * duplicate rule) are quoted below as fixed, because the SRS fixes them.
 */
export function AdminSettings() {
  const state = useAppState()
  const viewer = useCurrentUser()
  const settings = getSettings()

  const [pointsDraft, setPointsDraft] = useState(String(settings.placeApprovalPoints))
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mayEdit = canManageSettings(viewer)
  const mayReset = canResetData(viewer)

  function save(patch: Parameters<typeof updateSettings>[1], message: string) {
    if (updateSettings(viewer.id, patch)) {
      setNotice(message)
      setError(null)
    } else {
      setError('Only an administrator can change the settings.')
    }
  }

  function download() {
    const blob = new Blob([exportStateJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'rva-quest-state.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card sm:p-5">
        <h2 className="text-sm font-bold text-bark-900">App settings</h2>
        <p className="text-xs text-bark-500">
          Administrator-defined policy. Every change is written to the activity log.
        </p>

        {!mayEdit ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Read-only: changing settings needs the Administrator role.
          </p>
        ) : null}

        {notice ? (
          <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-bark-500">
              Points for an approved place
              <input
                type="number"
                min={0}
                max={500}
                value={pointsDraft}
                disabled={!mayEdit}
                onChange={(event) => setPointsDraft(event.target.value)}
                className="mt-1 block w-28 rounded-xl border border-bark-200 px-3 py-2 text-sm font-bold text-bark-900 disabled:opacity-50"
              />
            </label>
            <button
              type="button"
              disabled={!mayEdit}
              onClick={() => save({ placeApprovalPoints: Number(pointsDraft) }, 'Approval points saved.')}
              className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50"
            >
              Save points
            </button>
            <p className="text-xs text-bark-500">
              Currently {settings.placeApprovalPoints} pts · UC03 BR05 leaves this to the
              administrator.
            </p>
          </div>

          <Toggle
            label="Review suggested places before they appear on the map"
            hint={
              settings.requirePlaceReview
                ? 'New suggestions stay “Pending review” until a moderator decides.'
                : 'Suggestions are published and credited straight away.'
            }
            checked={settings.requirePlaceReview}
            disabled={!mayEdit}
            onChange={(checked) =>
              save(
                { requirePlaceReview: checked },
                checked ? 'Place review is required again.' : 'Place review is now skipped.',
              )
            }
          />

          <Toggle
            label="Pause new place suggestions"
            hint="A kill switch for demos and maintenance. Existing places and quests keep working."
            checked={settings.placeSubmissionsPaused}
            disabled={!mayEdit}
            onChange={(checked) =>
              save(
                { placeSubmissionsPaused: checked },
                checked ? 'Place submissions paused.' : 'Place submissions resumed.',
              )
            }
          />

          <Toggle
            label="Banned-word filter on posts and comments"
            hint={`${pluralize(BANNED_WORDS.length, 'word')} in the list. Turning it off skips only the word check — length and required fields still apply.`}
            checked={settings.bannedWordsEnabled}
            disabled={!mayEdit}
            onChange={(checked) =>
              save(
                { bannedWordsEnabled: checked },
                checked ? 'The banned-word filter is on.' : 'The banned-word filter is off.',
              )
            }
          />

          <button
            type="button"
            disabled={!mayEdit}
            onClick={() => {
              if (resetSettings(viewer.id)) {
                setPointsDraft(String(DEFAULT_SETTINGS.placeApprovalPoints))
                setNotice('Settings reset to the defaults.')
              }
            }}
            className="rounded-full border border-bark-200 px-4 py-2 text-sm font-semibold text-bark-700 transition hover:border-brand-400 disabled:opacity-50"
          >
            Reset to defaults
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card sm:p-5">
        <h2 className="text-sm font-bold text-bark-900">Fixed by the SRS</h2>
        <p className="text-xs text-bark-500">
          These numbers come from the course specification, so they are not editable.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          <Fixed label="Check-in radius" value={`${RULES.checkInRadiusMeters} m`} />
          <Fixed label="Submissions per day" value={`${RULES.maxPlaceSubmissionsPerDay}`} />
          <Fixed label="Duplicate place radius" value={`${RULES.duplicateNameRadiusMeters} m`} />
        </ul>
      </section>

      <section className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card sm:p-5">
        <h2 className="text-sm font-bold text-bark-900">Data</h2>
        <p className="text-xs text-bark-500">
          The prototype stores everything in this browser. {state.users.length} accounts,{' '}
          {state.quests.length} quests, {state.places.length} places, {state.forumPosts.length} forum
          posts.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={download}
            className="rounded-full border border-bark-200 px-4 py-2 text-sm font-semibold text-bark-700 transition hover:border-brand-400"
          >
            Export JSON
          </button>
          <button
            type="button"
            disabled={!mayReset}
            onClick={() => {
              if (
                window.confirm(
                  'Reset every account, quest, place, forum post and setting back to the demo seed?',
                )
              ) {
                if (resetEverything(viewer.id)) setNotice('Everything was reset to the demo seed.')
              }
            }}
            className="rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
          >
            Reset everything
          </button>
        </div>
        {!mayReset ? (
          <p className="mt-2 text-xs text-bark-500">Only an administrator can reset the data.</p>
        ) : null}
      </section>
    </div>
  )
}

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-bark-200 px-3 py-2.5">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-brand-700 disabled:opacity-50"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-bark-800">{label}</span>
        <span className="mt-0.5 block text-xs text-bark-500">{hint}</span>
      </span>
    </label>
  )
}

function Fixed({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-xl bg-bark-50 px-3 py-2">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-bark-500">
        {label}
      </span>
      <span className="mt-0.5 block text-sm font-bold text-bark-900">{value}</span>
    </li>
  )
}
