import { Link, useSearchParams } from 'react-router-dom'
import { useCurrentUser } from '../hooks/useAppState'
import { usePageTitle } from '../hooks/usePageTitle'
import { AdminOverview } from '../components/admin/AdminOverview'
import { AdminUsers } from '../components/admin/AdminUsers'
import { AdminQuests } from '../components/admin/AdminQuests'
import { AdminContent } from '../components/admin/AdminContent'
import { AdminSettings } from '../components/admin/AdminSettings'
import { AdminActivityLog } from '../components/admin/AdminActivityLog'
import { EmptyState } from '../components/ui/EmptyState'
import { RoleBadge } from '../components/admin/RoleBadge'
import {
  ADMIN_TABS,
  adminTabsFor,
  canAccessConsole,
  isAdminTab,
  ROLE_LABELS,
  type AdminTab,
} from '../rules/permissions'
import { cn } from '../lib/cn'

/**
 * Phase 6 — the Admin & Manager console. The tab strip and every action are
 * gated by src/rules/permissions.ts, and the services re-check the same rule,
 * so hiding a tab is never the only thing protecting it.
 */
export function AdminPage() {
  const viewer = useCurrentUser()
  const [params, setParams] = useSearchParams()

  usePageTitle('Admin')

  const allowed = adminTabsFor(viewer)
  const requested = params.get('tab')
  const tab: AdminTab = isAdminTab(requested) && allowed.includes(requested) ? requested : 'overview'

  if (!canAccessConsole(viewer)) {
    return (
      <EmptyState
        title={
          viewer.status === 'suspended'
            ? 'This account is suspended'
            : 'You do not have access to the console'
        }
        message={
          viewer.status === 'suspended'
            ? 'An administrator suspended this account, so its management tools are locked. Ask an administrator to restore it.'
            : 'The Admin & Manager console is for moderators, managers and administrators. Ask an administrator for a role if you need it.'
        }
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/quests"
              className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Back to quests
            </Link>
            <Link
              to="/profile"
              className="rounded-full border border-bark-200 px-4 py-2 text-sm font-semibold text-bark-700 hover:border-brand-400"
            >
              View your profile
            </Link>
          </div>
        }
      />
    )
  }

  const tabs = ADMIN_TABS.filter((entry) => allowed.includes(entry.id))

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-bark-900 md:text-2xl">
            Admin &amp; Manager
          </h1>
          <p className="mt-0.5 text-sm text-bark-500">
            Manage the whole app — accounts, quests, content and settings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RoleBadge role={viewer.role} />
          <span className="text-xs text-bark-500">{viewer.name}</span>
        </div>
      </header>

      <nav
        aria-label="Admin sections"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-current={tab === entry.id ? 'page' : undefined}
            onClick={() => {
              const next = new URLSearchParams(params)
              if (entry.id === 'overview') next.delete('tab')
              else next.set('tab', entry.id)
              setParams(next, { replace: true })
            }}
            className={cn(
              'whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold transition',
              tab === entry.id
                ? 'border-brand-700 bg-brand-700 text-white'
                : 'border-bark-200 bg-white text-bark-700 hover:border-brand-400',
            )}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      <p className="text-xs text-bark-500">
        {ROLE_LABELS[viewer.role]} access ·{' '}
        {allowed.length} of {ADMIN_TABS.length} sections
      </p>

      {tab === 'overview' ? <AdminOverview /> : null}
      {tab === 'users' ? <AdminUsers /> : null}
      {tab === 'quests' ? <AdminQuests /> : null}
      {tab === 'content' ? <AdminContent /> : null}
      {tab === 'settings' ? <AdminSettings /> : null}
      {tab === 'activity' ? <AdminActivityLog /> : null}
    </div>
  )
}
