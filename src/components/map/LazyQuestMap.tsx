import { Suspense, lazy } from 'react'
import { MapSkeleton } from '../ui/Spinner'
import { cn } from '../../lib/cn'
import type { QuestMapProps } from './types'

/**
 * Leaflet + its CSS live in their own chunk, so the list view and the first
 * paint never wait for the map.
 */
const QuestMap = lazy(() => import('./QuestMap'))

export function LazyQuestMap({ className, ...props }: QuestMapProps & { className?: string }) {
  return (
    <div
      className={cn(
        // min-w-0 lets the map shrink inside grid/flex columns: Leaflet's
        // container otherwise reports a min-content width wider than the phone.
        'relative isolate z-0 min-w-0 overflow-hidden rounded-2xl border border-bark-200',
        className,
      )}
    >
      <Suspense fallback={<MapSkeleton />}>
        <QuestMap {...props} />
      </Suspense>
    </div>
  )
}
