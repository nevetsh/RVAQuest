import { useAppState } from '../../hooks/useAppState'
import { formatRelativeTime } from '../../lib/format'
import { ROLE_LABELS } from '../../rules/permissions'
import { cn } from '../../lib/cn'

/** Shared by the post cards, the post screen and every comment. */
export function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function AuthorLine({
  userId,
  createdAt,
  className,
  size = 'md',
}: {
  userId: string
  createdAt?: string
  className?: string
  size?: 'sm' | 'md'
}) {
  const state = useAppState()
  const user = state.users.find((entry) => entry.id === userId)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'flex items-center justify-center rounded-full bg-brand-100 font-bold text-brand-900',
          size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs',
        )}
        aria-hidden="true"
      >
        {user ? initialsOf(user.name) : '??'}
      </span>
      <span className="min-w-0 text-xs text-bark-500">
        <span className="font-semibold text-bark-700">{user?.name ?? 'Explorer'}</span>
        {user && user.role !== 'user' ? (
          <span className="ml-1 text-brand-700">· {ROLE_LABELS[user.role]}</span>
        ) : null}
        {user?.status === 'suspended' ? (
          <span className="ml-1 text-amber-700">· Suspended</span>
        ) : null}
        {createdAt ? <span className="ml-1">· {formatRelativeTime(createdAt)}</span> : null}
      </span>
    </div>
  )
}
