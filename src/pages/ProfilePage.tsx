import { Link } from 'react-router-dom'
import { useAppState, useCurrentUser, useQuests } from '../hooks/useAppState'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { AchievementList } from '../components/profile/AchievementList'
import { MySubmissions } from '../components/profile/MySubmissions'
import { PasswordForm } from '../components/profile/PasswordForm'
import { RoleBadge } from '../components/admin/RoleBadge'
import { canAccessConsole, ROLE_LABELS } from '../rules/permissions'
import { formatPoints, pluralize } from '../lib/format'

export function ProfilePage() {
  const user = useCurrentUser()
  const quests = useQuests()
  const { forumPosts } = useAppState()

  const favorites = quests.filter((quest) => user.favoriteQuestIds.includes(quest.id))
  const managesSomething = canAccessConsole(user)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold tracking-tight text-bark-900 md:text-2xl">Profile</h1>

      <section className="rounded-2xl border border-bark-200 bg-white p-5 shadow-card">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-lg font-extrabold text-brand-900">
            {user.name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)}
          </span>
          <div>
            <h2 className="text-lg font-bold text-bark-900">{user.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <RoleBadge role={user.role} />
              {user.status === 'suspended' ? <Badge tone="warning">Suspended</Badge> : null}
              <span className="text-xs text-bark-500">Richmond, VA</span>
            </div>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Points" value={String(user.points)} />
          <Stat label="Day streak" value={pluralize(user.streak, 'day')} />
          <Stat label="Favorites" value={String(user.favoriteQuestIds.length)} />
        </dl>

        {managesSomething ? (
          <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-900">
            You have {ROLE_LABELS[user.role]} access: open the{' '}
            <Link to="/admin" className="font-bold underline">
              {user.role === 'admin' ? 'Admin' : 'management'} console
            </Link>{' '}
            for accounts, quests, content and settings — or the{' '}
            <Link to="/forum" className="font-bold underline">
              report queue
            </Link>{' '}
            in the forum.
          </p>
        ) : null}

        {user.status === 'suspended' ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            This account is suspended. An administrator has to restore it before you can post,
            comment or suggest places.
          </p>
        ) : null}
      </section>

      <PasswordForm />

      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-bark-900">Saved quests</h2>
          <span className="text-xs font-semibold text-bark-500">FR06</span>
        </header>

        {favorites.length === 0 ? (
          <EmptyState
            title="No saved quests yet"
            message="Tap “Save to Favorites” on a quest and it shows up here."
            action={
              <Link
                to="/quests"
                className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Browse quests
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {favorites.map((quest) => (
              <li key={quest.id}>
                <Link
                  to={`/quests/${quest.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-bark-200 bg-white px-4 py-3 shadow-card hover:border-brand-400"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-800">
                    {quest.points}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-bark-900">
                      {quest.name}
                    </span>
                    <span className="block truncate text-xs text-bark-500">
                      {quest.category} · {formatPoints(quest.points)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AchievementList user={user} posts={forumPosts} />

      <MySubmissions />

      <p className="rounded-2xl border border-dashed border-bark-200 bg-white/70 p-4 text-xs text-bark-500">
        Your profile, favorites and submissions live only in this browser (localStorage) — nothing
        is shared with third parties (NFR01).
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bark-50 px-3 py-2 text-center">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-bark-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-bark-900">{value}</dd>
    </div>
  )
}
