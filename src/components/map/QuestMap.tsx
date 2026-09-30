import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import type { Coordinates } from '../../services/types'
import type { QuestWithDistance } from '../../rules/quests'
import type { MapPlace } from './types'
import { DEFAULT_MAP_ZOOM, FOCUSED_MAP_ZOOM, RICHMOND_CENTER } from '../../lib/constants'
import { formatDistance } from '../../lib/format'

/**
 * Leaflet map. This module is loaded lazily (React.lazy) so Leaflet never
 * blocks the first paint — see components/map/LazyQuestMap.tsx.
 */

interface QuestMapProps {
  quests: QuestWithDistance[]
  places?: MapPlace[]
  userLocation?: Coordinates | null
  center?: Coordinates | null
  zoom?: number
  selectedQuestId?: string | null
  onSelectQuest?: (questId: string) => void
  interactive?: boolean
  className?: string
}

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/** Approved user places wear an amber diamond so they read differently from quest pins. */
function placePinIcon(): L.DivIcon {
  return L.divIcon({
    className: 'rva-pin',
    html: '<span style="display:block;width:20px;height:20px;background:#b45309;border:2px solid #ffffff;border-radius:4px;transform:rotate(45deg);box-shadow:0 2px 6px rgba(15,23,42,.45)"></span>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  })
}

function pinIcon(selected: boolean): L.DivIcon {
  const background = selected ? '#14532d' : '#1f9d57'
  const size = selected ? 26 : 22

  return L.divIcon({
    className: 'rva-pin',
    html: `<span style="display:block;width:${size}px;height:${size}px;background:${background};border:2px solid #ffffff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(15,23,42,.45)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

/** Keeps the map view in sync with the selected quest / user location. */
function Recenter({ center, zoom }: { center: Coordinates; zoom: number }) {
  const map = useMap()

  useEffect(() => {
    map.flyTo([center.lat, center.lng], zoom, { duration: 0.6 })
  }, [map, center.lat, center.lng, zoom])

  return null
}

/** Leaflet needs a nudge when its container changes size (mobile rotate, panel toggle). */
function AutoResize() {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])

  return null
}

export default function QuestMap({
  quests,
  places = [],
  userLocation = null,
  center = null,
  zoom,
  selectedQuestId = null,
  onSelectQuest,
  interactive = true,
  className,
}: QuestMapProps) {
  const focus = useMemo<Coordinates>(() => center ?? userLocation ?? RICHMOND_CENTER, [center, userLocation])
  const focusZoom = zoom ?? (center ? FOCUSED_MAP_ZOOM : DEFAULT_MAP_ZOOM)

  return (
    <MapContainer
      center={[focus.lat, focus.lng]}
      zoom={focusZoom}
      scrollWheelZoom={interactive}
      dragging={interactive}
      zoomControl={interactive}
      className={className}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

      {userLocation ? (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={9}
          pathOptions={{ color: '#166534', weight: 2, fillColor: '#4ade80', fillOpacity: 0.45 }}
        >
          <Popup>You are here</Popup>
        </CircleMarker>
      ) : null}

      {quests.map((quest) => (
        <Marker
          key={quest.id}
          position={[quest.location.lat, quest.location.lng]}
          icon={pinIcon(quest.id === selectedQuestId)}
          eventHandlers={onSelectQuest ? { click: () => onSelectQuest(quest.id) } : undefined}
        >
          <Popup>
            <div className="min-w-[11rem] space-y-1">
              <p className="text-sm font-bold text-bark-900">{quest.name}</p>
              <p className="text-xs text-bark-500">{quest.area}</p>
              <p className="text-xs font-semibold text-brand-700">
                {quest.points} pts
                {quest.distanceMeters !== null ? ` · ${formatDistance(quest.distanceMeters)}` : ''}
              </p>
              <Link to={`/quests/${quest.id}`} className="text-xs font-bold text-brand-800 underline">
                View quest
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}

      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.location.lat, place.location.lng]}
          icon={placePinIcon()}
        >
          <Popup>
            <div className="min-w-[11rem] space-y-1">
              <p className="text-sm font-bold text-bark-900">{place.name}</p>
              <p className="text-xs text-bark-500">
                {place.category}
                {place.authorName ? ` · suggested by ${place.authorName}` : ''}
              </p>
              {place.description ? (
                <p className="text-xs text-bark-700">
                  {place.description.length > 120
                    ? `${place.description.slice(0, 117)}…`
                    : place.description}
                </p>
              ) : null}
              <Link
                to={`/forum/${place.forumPostId}`}
                className="text-xs font-bold text-brand-800 underline"
              >
                View suggestion post
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}

      <AutoResize />
      <Recenter center={focus} zoom={focusZoom} />
    </MapContainer>
  )
}
