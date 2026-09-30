import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  message?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, message, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-bark-200 bg-white/70 px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? <div className="text-brand-600">{icon}</div> : null}
      <h2 className="text-base font-bold text-bark-900">{title}</h2>
      {message ? <p className="max-w-sm text-sm text-bark-500">{message}</p> : null}
      {action}
    </div>
  )
}
