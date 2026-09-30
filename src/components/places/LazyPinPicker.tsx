import { Suspense, lazy } from 'react'
import { MapSkeleton } from '../ui/Spinner'
import { cn } from '../../lib/cn'
import type { Coordinates } from '../../services/types'

/** Leaflet stays in its own chunk — the picker only loads it when opened. */
const PinPickerMap = lazy(() => import('./PinPickerMap'))

export function LazyPinPicker({
  value,
  onChange,
  recenterSignal,
  className,
}: {
  value: Coordinates
  onChange: (coords: Coordinates) => void
  recenterSignal?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative isolate z-0 overflow-hidden rounded-xl border border-bark-200',
        className,
      )}
    >
      <Suspense fallback={<MapSkeleton />}>
        <PinPickerMap value={value} onChange={onChange} recenterSignal={recenterSignal} />
      </Suspense>
    </div>
  )
}
