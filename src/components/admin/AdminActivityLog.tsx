import { useState } from 'react'
import { useAppState, useCurrentUser } from '../../hooks/useAppState'
import { listAuditLog } from '../../services/admin'
import { canViewAuditLog } from '../../rules/permissions'
import { formatRelativeTime } from '../../lib/format'
import type { AuditAction } from '../../services/types'
import { Badge } from '../ui/Badge'
import { RoleBadge } from './RoleBadge'

const ACTION_TONES: Record<string, 'brand' | 'neutral' | 'success' | 'warning' | 'muted'> = {
  'role-changed': 'brand',
  'user-suspended': 'warning',
  'user-restored': 'success',
  'points-adjusted': 'brand',
  'quest-approved': 'success',
  'quest-rejected': 'warning',
  'data-reset': 'warning',
  'settings-changed': 'brand',
}

type LogGroupId = 'all' | 'accounts' | 'content' | 'moderation' | 'system'

interface LogGroup {
  id: LogGroupId
  label: string
  /** Omitted for "Everything", which matches every action. */
  match?: readonly AuditAction[]
}

const GROUPS: LogGroup[] = [
  { id: 'all', label: 'Everything' },
  {
    id: 'accounts',
    label: 'Accounts',
    match: ['role-changed', 'user-suspended', 'user-restored', 'points-adjusted'],
  },
  {
    id: 'content',
    label: 'Content',
    match: [
      'quest-approved',
      'quest-rejected',
      'quest-locked',
      'quest-unlocked',
      'quest-points-changed',
      'daily-spot-changed',
      'place-approved',
      'place-rejected',
    ],
  },
  {
    id: 'moderation',
    label: 'Moderation',
    match: ['post-removed', 'comment-removed', 'report-resolved'],
  },
  { id: 'system', label: 'System', match: ['settings-changed', 'data-reset'] },
]

/** Manager and above: what everyone with power has been doing. */
export function AdminActivityLog() {
  const state = useAppState()
  const viewer = useCurrentUser()
  const [group, setGroup] = useState<LogGroupId>('all')

  if (!canViewAuditLog(viewer)) {
    return (
      <p className="rounded-2xl border border-dashed border-bark-200 bg-white/70 p-4 text-center text-sm text-bark-500">
        The activity log is available to managers and administrators.
      </p>
    )
  }

  const selected = GROUPS.find((entry) => entry.id === group)
  const entries = listAuditLog().filter(
    (entry) => !selected?.match || selected.match.includes(entry.action),
  )

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card">
        <h2 className="text-sm font-bold text-bark-900">Activity</h2>
        <p className="text-xs text-bark-500">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'} · the newest 100 actions are
          kept.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {GROUPS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setGroup(option.id)}
              aria-pressed={group === option.id}
              className={
                group === option.id
                  ? 'rounded-full border border-brand-700 bg-brand-700 px-3 py-1.5 text-sm font-medium text-white'
                  : 'rounded-full border border-bark-200 bg-white px-3 py-1.5 text-sm font-medium text-bark-700 hover:border-brand-400'
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-bark-200 bg-white/70 p-4 text-center text-sm text-bark-500">
          Nothing recorded in this group yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((item) => {
            const actor = state.users.find((user) => user.id === item.actorId)

            return (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-bark-200 bg-white p-3 shadow-card"
              >
                <div className="min-w-0">
                  <p className="text-sm text-bark-800">{item.summary}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-bark-500">
                    <span>{actor ? actor.name : 'Unknown account'}</span>
                    {actor ? <RoleBadge role={actor.role} /> : null}
                    <span>{formatRelativeTime(item.at)}</span>
                  </p>
                </div>
                <Badge tone={ACTION_TONES[item.action] ?? 'muted'}>{item.action}</Badge>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
