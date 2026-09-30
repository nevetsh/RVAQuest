import { Link } from 'react-router-dom'
import type { QuestWithDistance } from '../../rules/quests'
import { Badge } from '../ui/Badge'
import { cn } from '../../lib/cn'
import { formatDistance, formatPoints } from '../../lib/format'

interface QuestCardProps {
  quest: QuestWithDistance
  selected?: boolean
  compact?: boolean
}

export function QuestCard({ quest, selected = false, compact = false }: QuestCardProps) {
  const locked = quest.status === 'locked'

  return (
    <Link
      to={`/quests/${quest.id}`}
      className={cn(
        'group block rounded-2xl border bg-white p-4 shadow-card transition',
        selected ? 'border-brand-600 ring-2 ring-brand-200' : 'border-bark-200 hover:border-brand-400',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-bark-900 group-hover:text-brand-800">
            {quest.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-bark-500">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {quest.area}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800">
          {formatPoints(quest.points)}
        </span>
      </div>

      {!compact ? (
        <p className="mt-2 line-clamp-2 text-sm text-bark-700">{quest.description}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{quest.category}</Badge>
        {quest.isDailySpot ? <Badge tone="success">Today’s daily spot</Badge> : null}
        {locked ? <Badge tone="muted">Locked</Badge> : null}
        {quest.distanceMeters !== null ? (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-bark-700">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3v18M12 3l-4 4M12 3l4 4M12 21l-4-4M12 21l4-4" strokeLinecap="round" />
            </svg>
            {formatDistance(quest.distanceMeters)}
          </span>
        ) : null}
      </div>
    </Link>
  )
}
