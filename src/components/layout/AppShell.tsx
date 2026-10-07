import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../hooks/useAppState'
import { signOut } from '../../services/auth'
import { BottomNav, TopNavLinks } from './nav'
import { DevToolsDrawer } from '../../devtools/DevToolsDrawer'

export function AppShell() {
  const user = useCurrentUser()
  const navigate = useNavigate()

  function handleSignOut(): void {
    // Reset the URL first so the next person lands on the quest list instead of
    // a screen their account may not be allowed to open (e.g. /admin).
    navigate('/quests', { replace: true })
    signOut()
  }

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)

  return (
    <div className="flex min-h-full flex-col bg-bark-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 border-b border-bark-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/quests" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M19 4c0 8-4.6 12-10.5 12H8C8 9.5 12.5 4 19 4Z" />
              </svg>
            </span>
            <span className="text-lg font-extrabold tracking-tight text-bark-900">
              RVA <span className="text-brand-700">Quest</span>
            </span>
          </Link>

          <TopNavLinks className="ml-4" />

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800 sm:flex">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                <path d="M12 3l2.5 5.6 6 .7-4.5 4.1 1.2 5.9L12 16.6 6.8 19.3l1.2-5.9L3.5 9.3l6-.7L12 3Z" />
              </svg>
              {user.points} pts
            </span>
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-full border border-bark-200 py-1 pl-1 pr-3 hover:border-brand-400"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-900">
                {initials}
              </span>
              <span className="hidden text-xs font-semibold text-bark-700 sm:block">{user.name}</span>
              <span className="sr-only">Open profile</span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label={`Sign out of ${user.name}`}
              title="Sign out"
              className="rounded-full border border-bark-200 p-2 text-bark-500 transition hover:border-brand-400 hover:text-bark-700"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M14 5h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4" strokeLinecap="round" />
                <path d="m9 8-4 4 4 4M5 12h9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-4 outline-none md:pb-10"
      >
        <Outlet />
      </main>

      <DevToolsDrawer />
      <BottomNav />
    </div>
  )
}
