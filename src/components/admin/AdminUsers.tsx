import { useState } from 'react'
import { useAppState, useCurrentUser } from '../../hooks/useAppState'
import { switchUser } from '../../services'
import { adjustUserPoints, setUserRole, setUserSuspended } from '../../services/admin'
import type { Role } from '../../services/types'
import {
  assignableRoles,
  canAdjustPoints,
  canChangeRole,
  canManageUsers,
  canSuspendUser,
  ROLE_LABELS,
} from '../../rules/permissions'
import { formatPoints, pluralize } from '../../lib/format'
import { RoleBadge, StatusBadge } from './RoleBadge'
import { SearchInput } from '../ui/SearchInput'
import { PlaceStatusBadge } from '../places/PlaceStatusBadge'

/**
 * Phase 6 — user management. Administrators can hand out roles, suspend an
 * account and credit points; the guards live in services/admin.ts, so an
 * accidental click can never lock everyone out of the app.
 */
export function AdminUsers() {
  const state = useAppState()
  const viewer = useCurrentUser()
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const allowed = canManageUsers(viewer)
  const term = query.trim().toLowerCase()
  const users = state.users.filter(
    (user) => !term || user.name.toLowerCase().includes(term) || user.id.includes(term),
  )

  function run(result: { ok: boolean }, success: string, failure: string) {
    setNotice(result.ok ? success : null)
    setError(result.ok ? null : failure)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-bark-900">Accounts</h2>
            <p className="text-xs text-bark-500">
              {pluralize(state.users.length, 'account')} · {pluralize(state.users.filter((u) => u.status === 'suspended').length, 'suspension')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-bark-500">Manage the whole software</span>
          </div>
        </div>

        <div className="mt-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search accounts by name or id"
          />
        </div>

        {!allowed ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Read-only: managing accounts needs the Administrator role.
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
      </section>

      <ul className="space-y-2">
        {users.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-bark-200 bg-white/70 p-4 text-center text-sm text-bark-500">
            No account matches “{query}”.
          </li>
        ) : null}

        {users.map((user) => {
          const isSelf = user.id === viewer.id
          const changeable = canChangeRole(viewer, user, state.users)
          const suspendable = canSuspendUser(viewer, user, state.users)
          const scoreable = canAdjustPoints(viewer, user)
          const submissions = state.places.filter((place) => place.submittedBy === user.id)
          const posts = state.forumPosts.filter((post) => post.authorId === user.id)

          return (
            <li key={user.id} className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-bark-900">{user.name}</h3>
                    <RoleBadge role={user.role} />
                    <StatusBadge status={user.status} />
                    {isSelf ? <span className="text-xs font-semibold text-bark-500">you</span> : null}
                  </div>
                  <p className="mt-1 text-xs text-bark-500">
                    {user.id} · {formatPoints(user.points)} · {pluralize(user.streak, 'day')} streak ·{' '}
                    {pluralize(user.favoriteQuestIds.length, 'favourite')}
                  </p>
                  <p className="mt-0.5 text-xs text-bark-500">
                    {pluralize(posts.length, 'forum post')} · {pluralize(submissions.length, 'place suggestion')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-bark-500">
                    Role
                    <select
                      value={user.role}
                      disabled={!changeable}
                      onChange={(event) => {
                        const role = event.target.value as Role
                        run(
                          setUserRole(viewer.id, user.id, role),
                          `${user.name} is now ${ROLE_LABELS[role]}.`,
                          user.id === viewer.id
                            ? 'You cannot change your own role.'
                            : 'That role change is not allowed (the last administrator must stay).',
                        )
                      }}
                      className="rounded-full border border-bark-200 px-2 py-1 text-xs font-semibold text-bark-800 disabled:opacity-50"
                    >
                      {(assignableRoles(viewer).length ? assignableRoles(viewer) : [user.role]).map(
                        (role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <button
                    type="button"
                    disabled={!scoreable}
                    onClick={() => {
                      const next = adjustUserPoints(viewer.id, user.id, 50)
                      if (next === null) setError('Points can only be changed by an administrator.')
                      else {
                        setError(null)
                        setNotice(`${user.name} now has ${formatPoints(next)}.`)
                      }
                    }}
                    className="rounded-full border border-bark-200 px-2.5 py-1 text-xs font-bold text-bark-700 transition hover:border-brand-400 disabled:opacity-50"
                  >
                    +50 pts
                  </button>

                  <button
                    type="button"
                    disabled={!scoreable || user.points === 0}
                    onClick={() => {
                      const next = adjustUserPoints(viewer.id, user.id, -50)
                      if (next === null) setError('Points can only be changed by an administrator.')
                      else {
                        setError(null)
                        setNotice(`${user.name} now has ${formatPoints(next)}.`)
                      }
                    }}
                    className="rounded-full border border-bark-200 px-2.5 py-1 text-xs font-bold text-bark-700 transition hover:border-brand-400 disabled:opacity-50"
                  >
                    −50 pts
                  </button>

                  <button
                    type="button"
                    disabled={!suspendable}
                    onClick={() => {
                      run(
                        setUserSuspended(viewer.id, user.id, user.status !== 'suspended'),
                        user.status === 'suspended'
                          ? `${user.name}'s account was restored.`
                          : `${user.name}'s account was suspended.`,
                        'You cannot suspend yourself or the last administrator.',
                      )
                    }}
                    className="rounded-full border border-red-300 px-2.5 py-1 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {user.status === 'suspended' ? 'Restore' : 'Suspend'}
                  </button>

                  {!isSelf ? (
                    <button
                      type="button"
                      onClick={() => switchUser(user.id)}
                      className="rounded-full bg-brand-700 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-brand-800"
                    >
                      Sign in as
                    </button>
                  ) : null}
                </div>
              </div>

              {submissions.length ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-bark-100 pt-3">
                  {submissions.slice(0, 4).map((place) => (
                    <span
                      key={place.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-bark-50 px-2 py-1 text-xs text-bark-600"
                    >
                      {place.name}
                      <PlaceStatusBadge status={place.reviewStatus} />
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
