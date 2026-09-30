import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useCurrentUser } from '../hooks/useAppState'
import { FORUM_CATEGORIES, type ForumCategory } from '../services/places.types'
import { publishForumPost } from '../services/forum.moderation'
import { isForumCategory, type ForumPostErrors } from '../rules/forum.moderation'
import { FORUM_LIMITS } from '../lib/constants'
import { Chip } from '../components/ui/Chip'
import { cn } from '../lib/cn'

/**
 * FR01 + FR04 — writing a post. The banned-word filter runs inside
 * publishForumPost, so filtered text can never reach the store, and the
 * Achievements button on the Profile screen lands here with a draft already
 * filled in.
 */

interface ComposePrefill {
  category?: ForumCategory
  title?: string
  body?: string
  /** Set by "Share to forum" so the screen can explain where the text came from. */
  source?: string
}

/** Spot Suggestions posts come from the place pipeline, not from here. */
const POSTABLE_CATEGORIES = FORUM_CATEGORIES.filter((entry) => entry.id !== 'spot-suggestions')

export function ForumComposePage() {
  const viewer = useCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()

  const prefill = (location.state ?? {}) as ComposePrefill
  const catParam = params.get('cat')

  const [category, setCategory] = useState<ForumCategory | ''>(
    prefill.category ?? (isForumCategory(catParam) && catParam !== 'spot-suggestions' ? catParam : ''),
  )
  const [title, setTitle] = useState(prefill.title ?? '')
  const [body, setBody] = useState(prefill.body ?? '')
  const [errors, setErrors] = useState<ForumPostErrors>({})

  function publish() {
    const result = publishForumPost(viewer.id, { category, title, body })

    if (!result.ok) {
      setErrors(result.errors)
      return
    }

    navigate(`/forum/${result.post.id}`, { replace: true })
  }

  return (
    <div className="space-y-4">
      <Link to="/forum" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-800">
        <span aria-hidden="true">‹</span> Back to the forum
      </Link>

      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-bark-900 md:text-2xl">New post</h1>
        <p className="mt-0.5 text-sm text-bark-500">
          Posts and comments are screened by the banned-word filter before they are published.
        </p>
      </div>

      {prefill.source ? (
        <p className="rounded-2xl border border-brand-200 bg-brand-50/70 px-4 py-3 text-sm text-brand-900">
          Pre-filled from {prefill.source}. Edit anything you like before publishing.
        </p>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-bark-200 bg-white p-4 shadow-card sm:p-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-bark-500">Category</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {POSTABLE_CATEGORIES.map((entry) => (
              <Chip
                key={entry.id}
                label={entry.label}
                active={category === entry.id}
                onClick={() => {
                  setCategory(entry.id)
                  setErrors((previous) => ({ ...previous, category: undefined }))
                }}
              />
            ))}
          </div>
          {errors.category ? (
            <p className="mt-1.5 text-xs font-semibold text-red-700">{errors.category}</p>
          ) : null}
          <p className="mt-1.5 text-xs text-bark-500">
            Spot suggestions are created by the “Suggest a spot” form so the place itself can be
            reviewed.
          </p>
        </div>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-bark-500">Title</span>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setErrors((previous) => ({ ...previous, title: undefined }))
            }}
            maxLength={FORUM_LIMITS.title}
            placeholder="Give your post a title"
            className={cn(
              'mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2',
              errors.title
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                : 'border-bark-200 focus:border-brand-500 focus:ring-brand-200',
            )}
          />
          <span className="mt-1 block text-[11px] text-bark-500">
            {title.trim().length}/{FORUM_LIMITS.title}
          </span>
          {errors.title ? (
            <p className="mt-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {errors.title}
            </p>
          ) : null}
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-bark-500">Post</span>
          <textarea
            value={body}
            onChange={(event) => {
              setBody(event.target.value)
              setErrors((previous) => ({ ...previous, body: undefined }))
            }}
            maxLength={FORUM_LIMITS.body}
            rows={7}
            placeholder="Share the story, the route or the question."
            className={cn(
              'mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2',
              errors.body
                ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                : 'border-bark-200 focus:border-brand-500 focus:ring-brand-200',
            )}
          />
          <span className="mt-1 block text-[11px] text-bark-500">
            {body.trim().length}/{FORUM_LIMITS.body}
          </span>
          {errors.body ? (
            <p className="mt-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {errors.body}
            </p>
          ) : null}
        </label>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-bark-100 pt-4">
          <Link
            to="/forum"
            className="rounded-full px-4 py-2 text-sm font-semibold text-bark-600 transition hover:bg-bark-100"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={publish}
            className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            Publish post
          </button>
        </div>
      </section>
    </div>
  )
}
