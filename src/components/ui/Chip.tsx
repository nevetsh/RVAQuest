import { cn } from '../../lib/cn'

interface ChipProps {
  label: string
  active?: boolean
  onClick?: () => void
  className?: string
}

export function Chip({ label, active = false, onClick, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'border-brand-700 bg-brand-700 text-white'
          : 'border-bark-200 bg-white text-bark-700 hover:border-brand-400 hover:text-brand-800',
        className,
      )}
    >
      {label}
    </button>
  )
}
