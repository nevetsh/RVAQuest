import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Coordinates } from '../../services/types'
import { FOCUSED_MAP_ZOOM } from '../../lib/constants'

/**
 * UC03 [A01] — the "Choose on Map" pin picker. Drag the pin or tap the map.
 * Leaflet is lazy-loaded (see LazyPinPicker) so the form opens instantly.
 */

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: 'rva-pin',
    html: '<span style="display:block;width:28px;height:28px;background:#b45309;border:2px solid #ffffff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(15,23,42,.45)"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  })
}

/**
 * Keyboard path: when coordinates are typed the map follows the pin so the
 * user can see where it landed. Dragging/tapping does not recenter (the pin is
 * already where the user pointed).
 */
function FollowPin({ value, signal }: { value: Coordinates; signal: number }) {
  const map = useMap()

  useEffect(() => {
    if (!signal) return
    map.setView([value.lat, value.lng], map.getZoom(), { animate: true })
    // Only react to typed coordinates, not to drags.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal])

  return null
}

function ClickToMove({ onMove }: { onMove: (coords: Coordinates) => void }) {
  useMapEvents({
    click(event) {
      onMove({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })

  return null
}

interface PinPickerMapProps {
  value: Coordinates
  onChange: (coords: Coordinates) => void
  /** Bumped when the coordinates were typed, so the map can follow the pin. */
  recenterSignal?: number
}

export default function PinPickerMap({ value, onChange, recenterSignal = 0 }: PinPickerMapProps) {
  return (
    <MapContainer
      center={[value.lat, value.lng]}
      zoom={FOCUSED_MAP_ZOOM}
      className="h-full w-full"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

      <Marker
        position={[value.lat, value.lng]}
        icon={pinIcon()}
        draggable
        eventHandlers={{
          dragend(event) {
            const position = event.target.getLatLng()
            onChange({ lat: position.lat, lng: position.lng })
          },
        }}
      />

      <ClickToMove onMove={onChange} />
      <FollowPin value={value} signal={recenterSignal} />
    </MapContainer>
  )
}
