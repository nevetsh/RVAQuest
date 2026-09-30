import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Coordinates } from '../services/types'
import { setLocationDenied } from '../services'
import { useAppState } from '../hooks/useAppState'

/**
 * Wraps the browser Geolocation API once for the whole app. The dev tools
 * drawer can override it with a simulated fix, which always wins.
 */

export type LocationStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable'
export type LocationSource = 'gps' | 'simulated'

interface LocationContextValue {
  /** Effective coordinates used for distance sorting, or null. */
  coords: Coordinates | null
  status: LocationStatus
  source: LocationSource | null
  /** True once the user picked "Browse All Quests" or blocked the prompt. */
  promptDismissed: boolean
  message: string | null
  requestLocation: () => void
  dismissPrompt: () => void
}

const LocationContext = createContext<LocationContextValue | null>(null)

export function LocationProvider({ children }: { children: ReactNode }) {
  const { simulatedLocation, locationDenied } = useAppState()
  const [gpsCoords, setGpsCoords] = useState<Coordinates | null>(null)
  const [status, setStatus] = useState<LocationStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const requestLocation = useCallback(() => {
    setLocationDenied(false)

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable')
      setMessage('This device does not report a location. Browse all quests instead.')
      return
    }

    setStatus('locating')
    setMessage(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
        setStatus('granted')
        setMessage(null)
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus('denied')
          setMessage('Location is blocked. Quests are listed alphabetically instead.')
        } else {
          setStatus('unavailable')
          setMessage('We could not get a fix. Quests are listed alphabetically instead.')
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }, [])

  const dismissPrompt = useCallback(() => {
    setLocationDenied(true)
  }, [])

  // If the browser already granted permission earlier, ask quietly on load.
  useEffect(() => {
    if (simulatedLocation) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    if (typeof navigator.permissions?.query !== 'function') return

    let cancelled = false

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (!cancelled && result.state === 'granted') requestLocation()
      })
      .catch(() => {
        // Permissions API unsupported for geolocation — wait for the prompt.
      })

    return () => {
      cancelled = true
    }
  }, [requestLocation, simulatedLocation])

  const value = useMemo<LocationContextValue>(() => {
    if (simulatedLocation) {
      return {
        coords: simulatedLocation,
        status: 'granted',
        source: 'simulated',
        promptDismissed: locationDenied,
        message: null,
        requestLocation,
        dismissPrompt,
      }
    }

    // The Dev tools "Deny location" switch (and "Browse All Quests") puts the
    // app in the same state as a browser-level denial, so the E04 message can
    // be demonstrated without touching browser settings.
    const resolvedStatus: LocationStatus =
      locationDenied && status !== 'locating' ? 'denied' : status

    return {
      coords: resolvedStatus === 'granted' ? gpsCoords : null,
      status: resolvedStatus,
      source: resolvedStatus === 'granted' && gpsCoords ? 'gps' : null,
      promptDismissed: locationDenied,
      message: locationDenied ? 'Location is off. Quests are listed alphabetically instead.' : message,
      requestLocation,
      dismissPrompt,
    }
  }, [simulatedLocation, locationDenied, status, gpsCoords, message, requestLocation, dismissPrompt])

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocation(): LocationContextValue {
  const context = useContext(LocationContext)
  if (!context) throw new Error('useLocation must be used inside a LocationProvider')
  return context
}
