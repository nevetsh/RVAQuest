import { Link } from 'react-router-dom'
import { useAppState, useCurrentUser } from '../../hooks/useAppState'
import { adminStats } from '../../services/admin'
import { capabilitiesFor, ROLE_LABELS } from '../../rules/permissions'
import { pluralize } from '../../lib/format'

const CAPABILITY_COPY: Record<string, string> = {
  moderateForum: 'Remove posts and comments, pin threads and work the report queue.',
  reviewPlaces: 'Approve or reject the places explorers suggest.',
  manageQuests: 'Approve, lock, retune and feature quests.',
  manageUsers: 'Promote, demote, suspend and credit any account.',
  manageSettings: 'Set the administrator-defined rules of the app.',
  resetData: 'Reset the stored data back to the demo seed.',
  viewAuditLog: 'Read the activity log of everything managers and admins did.',
}

/** The landing tab: what the signed-in manager/admin can do, and what needs them. */
export function AdminOverview() {
  const state = useAppState()
  const viewer = useCurrentUser()
  const stats = adminStats()
  const capabilities = capabilitiesFor(viewer.role)

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-bark-200 bg-white p-5 shadow-card">
        <h2 className="text-base font-bold text-bark-900">
          Signed in as {viewer.name} · {ROLE_LABELS[viewer.role]}
        </h2>
        <p className="mt-1 text-sm text-bark-500">
          {viewer.status === 'suspended'
            ? 'This account is suspended, so its management tools are locked.'
            : 'Your role can manage the parts of the app listed below.'}
        </p>

        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {capabilities.length === 0 ? (
            <li className="rounded-xl bg-bark-50 px-3 py-2 text-sm text-bark-600">
              Read-only access. Ask an administrator for a manager role.
            </li>
          ) : (
            capabilities.map((capability) => (
              <li
                key={capability}
                className="rounded-xl bg-brand-50/70 px-3 py-2 text-sm text-brand-900"
              >
                {CAPABILITY_COPY[capability] ?? capability}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Accounts" value={String(stats.users)} hint={`${stats.suspended} suspended`} />
        <Stat
          label="Quests"
          value={String(state.quests.length)}
          hint={`${stats.questsApproved} approved · ${stats.questsPending} pending`}
        />
        <Stat
          label="Suggested places"
          value={String(state.places.length)}
          hint={`${stats.placesPending} waiting on review`}
        />
        <Stat
          label="Forum"
          value={String(stats.forumPosts)}
          hint={`${stats.openReports} open ${stats.openReports === 1 ? 'report' : 'reports'}`}
        />
      </section>

      <section className="rounded-2xl border border-bark-200 bg-white p-5 shadow-card">
        <h2 className="text-sm font-bold text-bark-900">Roles in this workspace</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['user', 'moderator', 'manager', 'admin'] as const).map((role) => (
            <li key={role} className="rounded-xl bg-bark-50 px-3 py-2 text-center">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-bark-500">
                {ROLE_LABELS[role]}
              </span>
              <span className="mt-0.5 block text-lg font-extrabold text-bark-900">
                {stats.byRole[role]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-bark-200 bg-white p-5 shadow-card">
        <h2 className="text-sm font-bold text-bark-900">Needs attention</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <QueueRow
            to="/moderator"
            count={stats.placesPending}
            label={pluralize(stats.placesPending, 'suggested place')}
            suffix="waiting for review"
          />
          <QueueRow
            to="/forum"
            count={stats.openReports}
            label={pluralize(stats.openReports, 'report')}
            suffix="open in the forum"
          />
          <QueueRow
            to="/admin?tab=quests"
            count={stats.questsPending}
            label={pluralize(stats.questsPending, 'quest')}
            suffix="pending approval"
          />
        </ul>
      </section>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-bark-500">
        {label}
      </span>
      <span className="mt-1 block text-2xl font-extrabold text-bark-900">{value}</span>
      <span className="mt-0.5 block text-xs text-bark-500">{hint}</span>
    </div>
  )
}

function QueueRow({
  to,
  count,
  label,
  suffix,
}: {
  to: string
  count: number
  label: string
  suffix: string
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center justify-between rounded-xl border border-bark-200 px-3 py-2 transition hover:border-brand-400"
      >
        <span className="text-bark-700">
          <span className="font-bold text-bark-900">{count}</span> {label} {suffix}
        </span>
        <span className="text-xs font-semibold text-brand-800">
          {count === 0 ? 'Nothing to do' : 'Open ›'}
        </span>
      </Link>
    </li>
  )
}
