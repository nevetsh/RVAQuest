import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCurrentUser, useQuests } from '../hooks/useAppState'
import { useLocation as useLocationContext } from '../app/LocationProvider'
import { toggleFavorite } from '../services'
import { haversineMeters } from '../rules/geo'
import { withDistance } from '../rules/quests'
import { FOCUSED_MAP_ZOOM } from '../lib/constants'
import { formatApproxDistance, formatPoints } from '../lib/format'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { LazyQuestMap } from '../components/map/LazyQuestMap'

export function QuestDetailPage() {
  const { questId = '' } = useParams()
  const navigate = useNavigate()
  const quests = useQuests()
  const user = useCurrentUser()
  const { coords } = useLocationContext()

  const quest = quests.find((entry) => entry.id === questId)

  if (!quest || quest.reviewStatus !== 'approved') {
    return (
      <EmptyState
        title="Quest not available"
        message="This quest is either waiting on moderator review or no longer on the map."
        action={
          <Link
            to="/quests"
            className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Back to quests
          </Link>
        }
      />
    )
  }

  const distanceMeters = coords ? haversineMeters(coords, quest.location) : null
  const saved = user.favoriteQuestIds.includes(quest.id)
  const locked = quest.status === 'locked'

  const directionsUrl = coords
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${coords.lat}%2C${coords.lng}%3B${quest.location.lat}%2C${quest.location.lng}`
    : `https://www.openstreetmap.org/?mlat=${quest.location.lat}&mlon=${quest.location.lng}#map=17/${quest.location.lat}/${quest.location.lng}`

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate('/quests')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All quests
      </button>

      <header className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{quest.category}</Badge>
          {quest.isDailySpot ? <Badge tone="success">Today’s daily spot</Badge> : null}
          <Badge tone={locked ? 'muted' : 'neutral'}>{locked ? 'Locked' : 'Unlocked'}</Badge>
        </div>

        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-bark-900 md:text-3xl">
          {quest.name}
        </h1>

        <p className="mt-1 flex items-center gap-1.5 text-sm text-bark-500">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {quest.area}
        </p>

        <p className="mt-3 text-sm text-bark-700 md:text-base">{quest.description}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Points" value={formatPoints(quest.points)} />
          <Stat label="Distance" value={distanceMeters === null ? 'Location off' : formatApproxDistance(distanceMeters)} />
          <Stat label="Category" value={quest.category} />
          <Stat label="Status" value={locked ? 'Locked' : 'Unlocked'} />
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant={saved ? 'secondary' : 'primary'}
            onClick={() => toggleFavorite(user.id, quest.id)}
            aria-pressed={saved}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 20s-7-4.4-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.6 12 20 12 20Z" strokeLinejoin="round" />
            </svg>
            {saved ? 'Saved to Favorites' : 'Save to Favorites'}
          </Button>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-700 bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3v18M12 3l-4 4M12 3l4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Get Directions
          </a>
        </div>

        <p className="mt-3 text-[11px] text-bark-500">
          {coords
            ? 'Directions open OpenStreetMap with your current position — nothing is sent until you tap.'
            : 'Turn on location to get walking directions from where you are.'}
        </p>
      </header>

      {locked ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">This quest is locked</p>
          <p className="mt-1">
            {quest.requirementsNote ?? 'Keep your daily streak going to unlock it.'}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-bark-200 bg-white p-4 shadow-card">
          <h2 className="text-sm font-bold text-bark-900">Requirements</h2>
          <ul className="mt-3 space-y-2">
            {quest.requirements.map((requirement) => (
              <li key={requirement} className="flex gap-2 text-sm text-bark-700">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {requirement}
              </li>
            ))}
          </ul>

          {quest.requirementsNote ? (
            <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-900">
              {quest.requirementsNote}
            </p>
          ) : null}
        </section>

        <section className="space-y-2">
          <LazyQuestMap
            className="h-48 md:h-56"
            quests={withDistance([quest], coords)}
            center={quest.location}
            zoom={FOCUSED_MAP_ZOOM}
            userLocation={coords}
            selectedQuestId={quest.id}
            interactive={false}
          />
          <p className="px-1 text-[11px] text-bark-500">
            Pinned at {quest.location.lat.toFixed(4)}, {quest.location.lng.toFixed(4)} · check-ins
            are accepted within 100 m of this spot.
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-dashed border-bark-200 bg-white/70 p-4 text-sm text-bark-500">
        <p className="font-semibold text-bark-700">Coming next</p>
        <p className="mt-1">
          Starting this quest and checking in daily ({quest.points} pts on completion) lands in the
          check-in phase.
        </p>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bark-50 px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-bark-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-bark-900">{value}</dd>
    </div>
  )
}
