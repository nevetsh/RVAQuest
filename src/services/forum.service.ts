import { getState, setState } from './store'
import type { ForumCategory, ForumPost } from './places.types'
import { selectForumPosts } from '../rules/forum'

/**
 * FR01 / FR10 — the forum. Spot Suggestions posts are created by the place
 * pipeline (see places.service.ts); explorers can also start discussions and
 * reply to each other in the other categories.
 */

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function listForumPosts(category?: ForumCategory): ForumPost[] {
  return selectForumPosts(getState().forumPosts, category)
}

export function getForumPostById(id: string): ForumPost | undefined {
  return getState().forumPosts.find((post) => post.id === id)
}

export function getForumPostByPlaceId(placeId: string): ForumPost | undefined {
  return getState().forumPosts.find((post) => post.placeId === placeId)
}

export type CreateForumPostResult =
  | { ok: true; post: ForumPost }
  | { ok: false; error: 'invalid' }

export function createForumPost(
  userId: string,
  input: { title: string; body: string; category: ForumCategory },
): CreateForumPostResult {
  const title = input.title.trim()
  const body = input.body.trim()

  if (!title || !body || input.category === 'spot-suggestions') {
    return { ok: false, error: 'invalid' }
  }

  const post: ForumPost = {
    id: makeId('post'),
    category: input.category,
    title,
    body,
    authorId: userId,
    createdAt: new Date().toISOString(),
    replies: [],
  }

  setState((previous) => ({ ...previous, forumPosts: [post, ...previous.forumPosts] }))
  return { ok: true, post }
}

export function replyToForumPost(
  postId: string,
  userId: string,
  body: string,
): ForumPost | undefined {
  const text = body.trim()
  if (!text) return undefined

  const existing = getForumPostById(postId)
  if (!existing) return undefined

  const updated: ForumPost = {
    ...existing,
    replies: [
      ...existing.replies,
      {
        id: makeId('reply'),
        authorId: userId,
        body: text,
        createdAt: new Date().toISOString(),
      },
    ],
  }

  setState((previous) => ({
    ...previous,
    forumPosts: previous.forumPosts.map((post) => (post.id === postId ? updated : post)),
  }))

  return updated
}

