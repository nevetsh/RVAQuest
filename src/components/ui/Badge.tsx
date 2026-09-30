import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type BadgeTone = 'brand' | 'neutral' | 'success' | 'warning' | 'muted'

const TONES: Record<BadgeTone, string> = {
  brand: 'bg-brand-100 text-brand-800',
  neutral: 'bg-bark-100 text-bark-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  muted: 'bg-bark-100 text-bark-500',
}

interface BadgeProps {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
