import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppState, useCurrentUser } from '../../hooks/useAppState'
import {
  setDailySpot,
  setQuestLocked,
  setQuestPoints,
  setQuestReviewStatus,
} from '../../services/admin'
import type { Quest, ReviewStatus } from '../../services/types'
import { canManageQuests } from '../../rules/permissions'
import { Chip } from '../ui/Chip'
import { PlaceStatusBadge } from '../places/PlaceStatusBadge'

type ReviewFilter = ReviewStatus | 'all'

/** Manager and above: the whole quest catalogue in one table. */
export function AdminQuests() {
  const state = useAppState()
  const viewer = useCurrentUser()
  const [filter, setFilter] = useState<ReviewFilter>('all')
  const [draftPoints, setDraftPoints] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)

  const allowed = canManageQuests(viewer)
  const quests = state.quests.filter(
    (quest) => filter === 'all' || quest.reviewStatus === filter,
  )

  function report(message: string) {
    setNotice(message)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card">
        <h2 className="text-sm font-bold text-bark-900">Quest catalogue</h2>
        <p className="text-xs text-bark-500">
          Approving a quest makes it visible to explorers; locking keeps it visible but unplayable.
          Point values are the reward on completion.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {(['all', 'approved', 'pending', 'rejected'] as const).map((option) => (
            <Chip
              key={option}
              label={option === 'all' ? 'All quests' : option[0].toUpperCase() + option.slice(1)}
              active={filter === option}
              onClick={() => setFilter(option)}
            />
          ))}
        </div>

        {!allowed ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Read-only: managing quests needs the Manager role.
          </p>
        ) : null}

        {notice ? (
          <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800">
            {notice}
          </p>
        ) : null}
      </section>

      <ul className="space-y-2">
        {quests.map((quest: Quest) => {
          const pointsValue = draftPoints[quest.id] ?? String(quest.points)

          return (
            <li key={quest.id} className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/quests/${quest.id}`}
                      className="text-sm font-bold text-bark-900 hover:text-brand-800"
                    >
                      {quest.name}
                    </Link>
                    <PlaceStatusBadge status={quest.reviewStatus} />
                    {quest.status === 'locked' ? (
                      <span className="rounded-full bg-bark-100 px-2 py-0.5 text-xs font-semibold text-bark-600">
                        Locked
                      </span>
                    ) : null}
                    {quest.isDailySpot ? (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-800">
                        Daily spot
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-bark-500">
                    {quest.category} · {quest.area}
                    {quest.createdBy ? ` · suggested by ${quest.createdBy}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-bark-500">
                    Points
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={pointsValue}
                      disabled={!allowed}
                      onChange={(event) =>
                        setDraftPoints((previous) => ({ ...previous, [quest.id]: event.target.value }))
                      }
                      className="w-20 rounded-full border border-bark-200 px-2 py-1 text-xs font-bold text-bark-800 disabled:opacity-50"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={!allowed}
                    onClick={() => {
                      if (setQuestPoints(viewer.id, quest.id, Number(pointsValue))) {
                        report(`“${quest.name}” now awards ${Number(pointsValue)} points.`)
                      }
                    }}
                    className="rounded-full border border-bark-200 px-2.5 py-1 text-xs font-bold text-bark-700 transition hover:border-brand-400 disabled:opacity-50"
                  >
                    Save
                  </button>

                  {quest.reviewStatus !== 'approved' ? (
                    <button
                      type="button"
                      disabled={!allowed}
                      onClick={() => {
                        if (setQuestReviewStatus(viewer.id, quest.id, 'approved')) {
                          report(`“${quest.name}” was approved and is now visible.`)
                        }
                      }}
                      className="rounded-full bg-brand-700 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-brand-800 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!allowed}
                      onClick={() => {
                        if (setQuestReviewStatus(viewer.id, quest.id, 'rejected')) {
                          report(`“${quest.name}” was rejected and is hidden from explorers.`)
                        }
                      }}
                      className="rounded-full border border-red-300 px-2.5 py-1 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={!allowed}
                    onClick={() => {
                      const locked = quest.status !== 'locked'
                      if (setQuestLocked(viewer.id, quest.id, locked)) {
                        report(`“${quest.name}” was ${locked ? 'locked' : 'unlocked'}.`)
                      }
                    }}
                    className="rounded-full border border-bark-200 px-2.5 py-1 text-xs font-bold text-bark-700 transition hover:border-brand-400 disabled:opacity-50"
                  >
                    {quest.status === 'locked' ? 'Unlock' : 'Lock'}
                  </button>

                  <button
                    type="button"
                    disabled={!allowed || quest.isDailySpot}
                    onClick={() => {
                      if (setDailySpot(viewer.id, quest)) {
                        report(`“${quest.name}” is now the daily check-in spot.`)
                      }
                    }}
                    className="rounded-full border border-bark-200 px-2.5 py-1 text-xs font-bold text-bark-700 transition hover:border-brand-400 disabled:opacity-50"
                  >
                    {quest.isDailySpot ? 'Daily spot' : 'Feature today'}
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
