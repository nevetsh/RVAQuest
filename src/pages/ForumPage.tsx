import { Link, useSearchParams } from 'react-router-dom'
import { useAppState, useCurrentUser } from '../hooks/useAppState'
import { FORUM_CATEGORIES } from '../services/places.types'
import {
  isForumCategory,
  openReportsForPost,
  selectForumFeed,
  suggestionPosts,
  visiblePosts,
  type ForumCategoryFilter,
} from '../rules/forum.moderation'
import { Chip } from '../components/ui/Chip'
import { EmptyState } from '../components/ui/EmptyState'
import { SearchInput } from '../components/ui/SearchInput'
import { ModerationQueue } from '../components/forum/ModerationQueue'
import { PostCard } from '../components/forum/PostCard'
import { SuggestionBox } from '../components/forum/SuggestionBox'
import { pluralize } from '../lib/format'

/**
 * FR01 — the moderated forum: category filter, search, likes and comments,
 * with the moderator tools (reported items, remove, pin) layered on top.
 */
export function ForumPage() {
  const { forumPosts, forumReports } = useAppState()
  const viewer = useCurrentUser()
  const [params, setParams] = useSearchParams()

  const catParam = params.get('cat')
  const category: ForumCategoryFilter = isForumCategory(catParam) ? catParam : 'all'
  const query = params.get('q') ?? ''

  const showingSuggestions = category === 'spot-suggestions'
  const suggestions = suggestionPosts(forumPosts, viewer)
  const posts = selectForumFeed(forumPosts, {
    category,
    query,
    viewer,
    includeSuggestions: !showingSuggestions,
  })

  const selected = FORUM_CATEGORIES.find((entry) => entry.id === category)

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-bark-900 md:text-2xl">Forum</h1>
          <p className="mt-0.5 text-sm text-bark-500">
            {pluralize(visiblePosts(forumPosts, viewer).length, 'post')} in Richmond · every post is
            checked by the banned-word filter
          </p>
        </div>

        <Link
          to="/forum/new"
          className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          New post
        </Link>
      </header>

      <ModerationQueue viewer={viewer} />

      <div className="space-y-3">
        <SearchInput
          value={query}
          onChange={(value) => setParam('q', value || null)}
          placeholder="Search posts by title or text"
        />

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip label="All" active={category === 'all'} onClick={() => setParam('cat', null)} />
          {FORUM_CATEGORIES.map((entry) => (
            <Chip
              key={entry.id}
              label={entry.label}
              active={category === entry.id}
              onClick={() => setParam('cat', entry.id)}
            />
          ))}
        </div>

        {selected ? <p className="text-xs text-bark-500">{selected.description}</p> : null}
      </div>

      {showingSuggestions ? <SuggestionBox posts={suggestions} viewer={viewer} /> : null}

      {posts.length === 0 && showingSuggestions && suggestions.length > 0 ? (
        <p className="rounded-2xl border border-dashed border-bark-200 bg-white/70 p-4 text-center text-sm text-bark-500">
          No other threads here yet. The suggestion box above stays pinned to the top of this
          category.
        </p>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.4-4.2A8 8 0 1 1 21 12Z" strokeLinejoin="round" />
              <path d="M9 11h6M9 14h3" strokeLinecap="round" />
            </svg>
          }
          title="No posts found"
          message={
            query
              ? `Nothing matches “${query}”. Try another word or a different category.`
              : 'Nothing in this category yet — start the first thread.'
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {query || category !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setParams(new URLSearchParams(), { replace: true })}
                  className="rounded-full border border-bark-200 px-4 py-2 text-sm font-semibold text-bark-700 transition hover:border-brand-400"
                >
                  Clear filters
                </button>
              ) : null}
              <Link
                to="/forum/new"
                className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Write a post
              </Link>
            </div>
          }
        />
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard
                post={post}
                viewer={viewer}
                openReportCount={openReportsForPost(forumReports, post.id).length}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
