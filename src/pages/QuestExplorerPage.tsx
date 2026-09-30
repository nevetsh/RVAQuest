import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppState, useQuests } from '../hooks/useAppState'
import { usePlaces } from '../hooks/usePlaces'
import { useLocation as useLocationContext } from '../app/LocationProvider'
import { selectQuests, type CategoryFilter } from '../rules/quests'
import { QUEST_CATEGORIES, type QuestCategory } from '../services/types'
import { QuestCard } from '../components/quests/QuestCard'
import { QuestFilters } from '../components/quests/QuestFilters'
import { LocationPrompt } from '../components/quests/LocationPrompt'
import { LazyQuestMap } from '../components/map/LazyQuestMap'
import type { MapPlace } from '../components/map/types'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDistance, pluralize } from '../lib/format'
import { cn } from '../lib/cn'

export type ExplorerMode = 'map' | 'list'

const LIST_ICON = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" />
  </svg>
)

const MAP_ICON = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Z" strokeLinejoin="round" />
    <path d="M9 4v13M15 6.5v13" />
  </svg>
)

/**
 * FR02 — View all available outdoor quests. `/quests` opens the list,
 * `/map` opens the same data on the map; filters live in the URL so switching
 * modes keeps the search.
 */
export function QuestExplorerPage({ mode }: { mode: ExplorerMode }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const quests = useQuests()
  const places = usePlaces()
  const users = useAppState().users
  const { coords, source } = useLocationContext()
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null)

  const query = params.get('q') ?? ''
  const requestedCategory = params.get('cat') ?? 'all'
  const category: CategoryFilter = (QUEST_CATEGORIES as string[]).includes(requestedCategory)
    ? (requestedCategory as QuestCategory)
    : 'all'

  const results = useMemo(
    () => selectQuests(quests, { query, category, from: coords }),
    [quests, query, category, coords],
  )

  const selected = results.find((quest) => quest.id === selectedQuestId) ?? null
  const queryString = params.toString()

  // BR04 — only approved places ever reach the map.
  const approvedPlaces = useMemo<MapPlace[]>(
    () =>
      places
        .filter((place) => place.reviewStatus === 'approved')
        .map((place) => ({
          ...place,
          authorName: users.find((user) => user.id === place.submittedBy)?.name,
        })),
    [places, users],
  )

  function updateFilters(next: { q?: string; cat?: CategoryFilter }) {
    const merged = new URLSearchParams(params)

    if (next.q !== undefined) {
      next.q.trim() ? merged.set('q', next.q) : merged.delete('q')
    }
    if (next.cat !== undefined) {
      next.cat === 'all' ? merged.delete('cat') : merged.set('cat', next.cat)
    }

    setParams(merged, { replace: true })
  }

  const hasLocation = coords !== null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-bark-900 md:text-2xl">
            Outdoor quests
          </h1>
          <p className="text-xs text-bark-500 md:text-sm">
            {pluralize(results.length, 'quest')} {hasLocation ? 'near you' : 'available'} in Richmond
            {source === 'simulated' ? ' · simulated location' : ''}
          </p>
        </div>

        <SegmentedControl
          className="ml-auto"
          ariaLabel="Choose quest view"
          value={mode}
          onChange={(next) =>
            navigate(`/${next === 'map' ? 'map' : 'quests'}${queryString ? `?${queryString}` : ''}`)
          }
          options={[
            { value: 'list', label: 'List', icon: LIST_ICON },
            { value: 'map', label: 'Map', icon: MAP_ICON },
          ]}
        />
      </div>

      <LocationPrompt />
      <QuestFilters
        query={query}
        onQueryChange={(value) => updateFilters({ q: value })}
        category={category}
        onCategoryChange={(value) => updateFilters({ cat: value })}
      />

      {results.length === 0 ? (
        <EmptyState
          title="No quests found"
          message={
            query
              ? `Nothing matches “${query}”. Try another name or a neighborhood like Carytown or Maymont.`
              : 'No quests in this category yet. Try a different category.'
          }
          action={
            <button
              type="button"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
              className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Clear filters
            </button>
          }
          icon={
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          }
        />
      ) : mode === 'list' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((quest) => (
            <QuestCard key={quest.id} quest={quest} selected={quest.id === selectedQuestId} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="relative min-w-0">
            <LazyQuestMap
              className="h-[55vh] min-h-[320px] lg:h-[70vh]"
              quests={results}
              places={approvedPlaces}
              userLocation={coords}
              center={selected?.location ?? null}
              selectedQuestId={selectedQuestId}
              onSelectQuest={setSelectedQuestId}
            />

            <Link
              to="/places/new?from=map"
              className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-900"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Add a Place
            </Link>
          </div>

          <aside className="flex max-h-[60vh] min-w-0 flex-col rounded-2xl border border-bark-200 bg-white shadow-card">
            <header className="flex items-center justify-between border-b border-bark-200 px-4 py-3">
              <h2 className="text-sm font-bold text-bark-900">Nearby quests</h2>
              <span className="text-xs font-semibold text-bark-500">{results.length}</span>
            </header>

            <ul className="flex-1 divide-y divide-bark-100 overflow-y-auto">
              {results.map((quest) => {
                const isSelected = quest.id === selectedQuestId
                return (
                  <li key={quest.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedQuestId(quest.id)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition',
                        isSelected ? 'bg-brand-50' : 'hover:bg-bark-50',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                          isSelected ? 'bg-brand-700 text-white' : 'bg-brand-100 text-brand-800',
                        )}
                      >
                        {quest.points}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-bark-900">
                          {quest.name}
                        </span>
                        <span className="block truncate text-xs text-bark-500">{quest.area}</span>
                        {quest.distanceMeters !== null ? (
                          <span className="mt-0.5 block text-xs font-semibold text-brand-700">
                            {formatDistance(quest.distanceMeters)} away
                          </span>
                        ) : null}
                      </span>
                    </button>

                    {isSelected ? (
                      <div className="flex gap-2 px-4 pb-3">
                        <Link
                          to={`/quests/${quest.id}`}
                          className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
                        >
                          View quest
                        </Link>
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${quest.location.lat}&mlon=${quest.location.lng}#map=17/${quest.location.lat}/${quest.location.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-bark-200 px-3 py-1.5 text-xs font-semibold text-bark-700 hover:border-brand-400"
                        >
                          Directions
                        </a>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>

            <footer className="border-t border-bark-200 px-4 py-2 text-[11px] text-bark-500">
              Tap a pin or a row to focus a quest. Amber diamonds are approved explorer places
              {approvedPlaces.length > 0 ? ` (${approvedPlaces.length})` : ''}.
            </footer>
          </aside>
        </div>
      )}
    </div>
  )
}
