import type { Coordinates } from './types'
import type { ForumPost, Place, SubmissionLogEntry } from './places.types'
import { PLACE_APPROVAL_POINTS } from '../lib/constants'
import { richmondDayKey } from '../rules/time'

/**
 * Demo content for the place-suggestion pipeline (FR05, FR09, FR10):
 * two approved places already on the map, one pending place in the moderator
 * queue, and one rejected place — each with the forum post the pipeline
 * created. Dates are relative to "now" so a demo always looks fresh.
 */

function daysAgo(days: number, hours = 0): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000 - hours * 60 * 60 * 1000)
}

/** An instant a few hours after another one (used for review timestamps). */
function hoursAfter(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

interface PlaceSeed {
  id: string
  name: string
  category: Place['category']
  address: string
  location: Coordinates
  description: string
  submittedBy: string
  submittedAt: string
  reviewStatus: Place['reviewStatus']
  pointsAwarded: boolean
  reviewNote?: string
  reviewedBy?: string
  reviewedAt?: string
  reply?: { authorId: string; body: string }
}

const PLACE_SEEDS: PlaceSeed[] = [
  {
    id: 'shiplock-park',
    name: 'Great Shiplock Park',
    category: 'Landmarks',
    address: '2803 Dock St',
    location: { lat: 37.5259, lng: -77.4269 },
    description:
      'The old canal lock and turning basin at the foot of Chapel Island — a quiet corner of the riverfront with a lot of shipping history.',
    submittedBy: 'jordan',
    submittedAt: daysAgo(6).toISOString(),
    reviewStatus: 'approved',
    pointsAwarded: true,
    reviewedBy: 'dana',
    reviewedAt: daysAgo(5).toISOString(),
    reply: { authorId: 'casey', body: 'Walked past this on the riverfront loop — the lock gates are worth a look.' },
  },
  {
    id: 'scuffletown-park',
    name: 'Scuffletown Park',
    category: 'Parks',
    address: '418 Strawberry St',
    location: { lat: 37.5467, lng: -77.4577 },
    description:
      'A pocket park behind the Strawberry Street shops with benches, shade and a small stage for summer shows.',
    submittedBy: 'casey',
    submittedAt: daysAgo(12).toISOString(),
    reviewStatus: 'approved',
    pointsAwarded: true,
    reviewedBy: 'dana',
    reviewedAt: daysAgo(11).toISOString(),
  },
  {
    id: 'fonticello-park',
    name: 'Fonticello Park',
    category: 'Parks',
    address: '2815 Bainbridge St',
    location: { lat: 37.5153, lng: -77.4524 },
    description:
      'Southside green space with a shaded loop path, a playground and one of the oldest trees in the city.',
    submittedBy: 'casey',
    submittedAt: daysAgo(1, 3).toISOString(),
    reviewStatus: 'pending',
    pointsAwarded: false,
  },
  {
    id: 'jefferson-park',
    name: 'Jefferson Park',
    category: 'Landmarks',
    address: '1921 Princess Anne Ave',
    location: { lat: 37.5395, lng: -77.4121 },
    description: 'The hilltop park beside the Jefferson statue with the skyline view over downtown.',
    submittedBy: 'jordan',
    submittedAt: daysAgo(3).toISOString(),
    reviewStatus: 'rejected',
    pointsAwarded: false,
    reviewNote: 'This spot is already covered by the Libby Hill quest pin.',
    reviewedBy: 'dana',
    reviewedAt: hoursAfter(daysAgo(3), 2).toISOString(),
  },
]

export function createSeedPlaces(): Place[] {
  return PLACE_SEEDS.map((seed) => ({
    id: seed.id,
    name: seed.name,
    category: seed.category,
    address: seed.address,
    location: seed.location,
    description: seed.description,
    submittedBy: seed.submittedBy,
    submittedAt: seed.submittedAt,
    submittedOn: richmondDayKey(new Date(seed.submittedAt)),
    reviewStatus: seed.reviewStatus,
    pointsAwarded: seed.pointsAwarded,
    points: PLACE_APPROVAL_POINTS,
    reviewNote: seed.reviewNote,
    reviewedBy: seed.reviewedBy,
    reviewedAt: seed.reviewedAt,
    forumPostId: `post-${seed.id}`,
  }))
}

function placePostBody(seed: PlaceSeed): string {
  const parts = [seed.description]
  if (seed.address) parts.push(`Address: ${seed.address}`)
  parts.push(
    'Suggested through the RVA Quest place pipeline. Only approved places appear on the map.',
  )
  return parts.join('\n\n')
}

export function createSeedForumPosts(): ForumPost[] {
  const spotPosts: ForumPost[] = PLACE_SEEDS.map((seed) => ({
    id: `post-${seed.id}`,
    category: 'spot-suggestions',
    title: `New spot: ${seed.name}`,
    body: placePostBody(seed),
    authorId: seed.submittedBy,
    createdAt: seed.submittedAt,
    placeId: seed.id,
    replies: seed.reply
      ? [
          {
            id: `reply-${seed.id}-1`,
            authorId: seed.reply.authorId,
            body: seed.reply.body,
            createdAt: hoursAfter(new Date(seed.submittedAt), 3).toISOString(),
          },
        ]
      : [],
  }))

  const discussion: ForumPost[] = [
    {
      id: 'post-belle-isle-timing',
      category: 'general',
      title: 'Best time to walk Belle Isle without the crowds?',
      body: 'Weekends after 10 get busy on the suspension bridge. Early mornings on the island loop are almost empty — anyone else found a quiet window?',
      authorId: 'casey',
      createdAt: daysAgo(2).toISOString(),
      replies: [
        {
          id: 'reply-belle-isle-1',
          authorId: 'jordan',
          body: 'Before 8am on Saturday is the sweet spot. The light on the rapids is better too.',
          createdAt: hoursAfter(daysAgo(2), 1).toISOString(),
        },
      ],
    },
    {
      id: 'post-streak-help',
      category: 'general',
      title: 'Does a missed day reset the whole streak?',
      body: 'I checked in four days straight and then missed Tuesday. Is the streak back to zero or does it pause?',
      authorId: 'jordan',
      createdAt: daysAgo(1).toISOString(),
      replies: [],
    },
  ]

  return [...spotPosts, ...discussion]
}

export function createSeedSubmissionLog(places: Place[]): SubmissionLogEntry[] {
  return places.map((place) => ({
    id: `log-${place.id}`,
    userId: place.submittedBy,
    placeId: place.id,
    dayKey: place.submittedOn,
    createdAt: place.submittedAt,
  }))
}
