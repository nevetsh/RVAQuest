import type { ForumCategory, ForumPost, Place } from '../services/places.types'

/**
 * Pure forum helpers (FR01, FR10). The forum is moderated: Spot Suggestions
 * posts are created by the place pipeline and carry the linked place's review
 * status; the other categories hold ordinary discussions.
 */

/** Newest first. The original index breaks ties for posts made in the same ms. */
export function selectForumPosts(posts: ForumPost[], category?: ForumCategory | 'all'): ForumPost[] {
  return posts
    .map((post, index) => ({ post, index }))
    .filter(({ post }) => !category || category === 'all' || post.category === category)
    .sort((a, b) => b.post.createdAt.localeCompare(a.post.createdAt) || b.index - a.index)
    .map(({ post }) => post)
}

export function findForumPost(posts: ForumPost[], postId: string): ForumPost | undefined {
  return posts.find((post) => post.id === postId)
}

/** The place a Spot Suggestions post is linked to, if any. */
export function linkedPlace(
  post: ForumPost | undefined,
  places: Place[],
): Place | undefined {
  if (!post?.placeId) return undefined
  return places.find((place) => place.id === post.placeId)
}

export function countReplies(post: ForumPost): number {
  return post.replies.length
}
