import { useMemo } from 'react'
import { useAppState } from './useAppState'
import { selectForumPosts } from '../rules/forum'
import type { ForumCategory, ForumPost, Place } from '../services/places.types'

/** FR05/FR09/FR10 — reactive reads of the place and forum collections. */

export function usePlaces(): Place[] {
  return useAppState().places
}

export function useForumPosts(category?: ForumCategory | 'all'): ForumPost[] {
  const posts = useAppState().forumPosts
  return useMemo(() => selectForumPosts(posts, category), [posts, category])
}

export function usePlace(placeId: string | undefined): Place | undefined {
  const places = usePlaces()
  if (!placeId) return undefined
  return places.find((place) => place.id === placeId)
}
