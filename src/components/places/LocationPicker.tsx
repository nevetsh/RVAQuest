import { useEffect, useRef, useState } from 'react'
import type { Coordinates } from '../../services/types'
import { RICHMOND_CENTER } from '../../lib/constants'
import type { PossibleDuplicate } from '../../rules/places'
import { DuplicateHint } from './DuplicateHint'
import { LazyPinPicker } from './LazyPinPicker'
import { Button } from '../ui/Button'

/**
 * UC03 [A01]/[A02] — "Choose on Map".
 *
 * Modal with a movable pin: drag it, tap the map, or type coordinates (a
 * keyboard-accessible alternative to dragging). Back keeps the form data and
 * leaves the pin unapplied; Confirm Location fills the form's location.
 */

interface LocationPickerProps {
  open: boolean
  initial: Coordinates | null
  onConfirm: (coords: Coordinates) => void
  onClose: () => void
  /**
   * BR03 advice for wherever the pin currently is, so the submitter finds out
   * about a likely duplicate while they drag rather than after they submit.
   */
  duplicateHint?: (coords: Coordinates) => PossibleDuplicate | null
}

export function LocationPicker({
  open,
  initial,
  onConfirm,
  onClose,
  duplicateHint,
}: LocationPickerProps) {
  const [pin, setPin] = useState<Coordinates>(initial ?? RICHMOND_CENTER)
  // Bumped when the coordinates are typed so the map follows the pin.
  const [typedSignal, setTypedSignal] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  // Fresh pin each time the dialog opens; the Confirm button takes focus.
  useEffect(() => {
    if (!open) return
    setPin(initial ?? RICHMOND_CENTER)
    restoreFocusRef.current = document.activeElement as HTMLElement | null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Escape closes; Tab is kept inside the dialog while it is open.
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      restoreFocusRef.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const lat = pin.lat.toFixed(6)
  const lng = pin.lng.toFixed(6)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bark-900/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-picker-title"
    >
      <div
        ref={dialogRef}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between border-b border-bark-200 px-4 py-3">
          <div>
            <h2 id="location-picker-title" className="text-sm font-extrabold text-bark-900">
              Choose the location on the map
            </h2>
            <p className="text-[11px] text-bark-500">
              Drag the pin, tap the map, or type coordinates below.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to the form"
            className="rounded-full p-1.5 text-bark-500 hover:bg-bark-100"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 px-4 py-3">
          <LazyPinPicker
            value={pin}
            onChange={setPin}
            recenterSignal={typedSignal}
            className="h-64 sm:h-72"
          />

          <DuplicateHint duplicate={duplicateHint?.(pin) ?? null} className="mt-3" />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-bark-700">
              Latitude
              <input
                type="number"
                step="0.000001"
                min={-90}
                max={90}
                value={lat}
                onChange={(event) => {
                  setPin((previous) => ({ ...previous, lat: Number(event.target.value) }))
                  setTypedSignal((signal) => signal + 1)
                }}
                className="mt-1 w-full rounded-xl border border-bark-200 px-3 py-2 text-sm font-normal text-bark-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>
            <label className="text-xs font-semibold text-bark-700">
              Longitude
              <input
                type="number"
                step="0.000001"
                min={-180}
                max={180}
                value={lng}
                onChange={(event) => {
                  setPin((previous) => ({ ...previous, lng: Number(event.target.value) }))
                  setTypedSignal((signal) => signal + 1)
                }}
                className="mt-1 w-full rounded-xl border border-bark-200 px-3 py-2 text-sm font-normal text-bark-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-bark-200 px-4 py-3">
          <Button autoFocus onClick={() => onConfirm(pin)}>
            Confirm Location
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Back
          </Button>
          <p className="ml-auto text-[11px] text-bark-500">Your form entries are kept.</p>
        </footer>
      </div>
    </div>
  )
}
