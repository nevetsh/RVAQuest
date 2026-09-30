import type { ReactElement } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { useCurrentUser } from '../../hooks/useAppState'
import { canAccessConsole } from '../../rules/permissions'
import type { Role, UserStatus } from '../../services/types'

interface NavItem {
  to: string
  label: string
  icon: (props: IconProps) => ReactElement
}

const BASE_ITEMS: NavItem[] = [
  { to: '/map', label: 'Map', icon: MapIcon },
  { to: '/quests', label: 'Quests', icon: QuestIcon },
  { to: '/forum', label: 'Forum', icon: ForumIcon },
  { to: '/profile', label: 'Profile', icon: ProfileIcon },
]

/**
 * Phase 6 — moderators, managers and administrators also get the console tab,
 * named after what their role is actually for. The whole viewer is passed in so
 * a suspended account keeps its role but loses the tab.
 */
function navItems(viewer: { role: Role; status?: UserStatus }): NavItem[] {
  if (!canAccessConsole(viewer)) return BASE_ITEMS

  return [
    ...BASE_ITEMS,
    { to: '/admin', label: viewer.role === 'admin' ? 'Admin' : 'Manage', icon: AdminIcon },
  ]
}

function navClasses(active: boolean): string {
  return cn(
    'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition',
    active ? 'text-brand-800' : 'text-bark-500 hover:text-bark-700',
  )
}

export function BottomNav() {
  const user = useCurrentUser()

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-bark-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch gap-1 px-2 py-1.5">
        {navItems(user).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => navClasses(isActive)}>
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function TopNavLinks({ className }: { className?: string }) {
  const user = useCurrentUser()

  return (
    <div className={cn('hidden items-center gap-1 md:flex', className)}>
      {navItems(user).map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'rounded-full px-3 py-1.5 text-sm font-semibold transition',
              isActive ? 'bg-brand-100 text-brand-900' : 'text-bark-700 hover:bg-bark-100',
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </div>
  )
}

interface IconProps {
  active?: boolean
}

function base(active?: boolean) {
  return {
    className: cn('h-6 w-6', active ? 'text-brand-700' : 'text-current'),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: active ? 2.2 : 1.8,
    'aria-hidden': true,
  } as const
}

function MapIcon({ active }: IconProps) {
  return (
    <svg {...base(active)}>
      <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Z" strokeLinejoin="round" />
      <path d="M9 4v13M15 6.5v13" />
    </svg>
  )
}

function QuestIcon({ active }: IconProps) {
  return (
    <svg {...base(active)}>
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function ForumIcon({ active }: IconProps) {
  return (
    <svg {...base(active)}>
      <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.4-4.2A8 8 0 1 1 21 12Z" strokeLinejoin="round" />
      <path d="M8.5 11h7M8.5 14h4" strokeLinecap="round" />
    </svg>
  )
}

function ProfileIcon({ active }: IconProps) {
  return (
    <svg {...base(active)}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
    </svg>
  )
}

function AdminIcon({ active }: IconProps) {
  return (
    <svg {...base(active)}>
      <path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3Z" strokeLinejoin="round" />
      <path d="M9.5 12.2l1.8 1.8 3.4-3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
