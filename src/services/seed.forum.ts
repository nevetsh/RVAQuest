import type { ForumPost, ForumReport } from './places.types'

/**
 * Phase 3 forum content on top of the place-pipeline posts in seed.places.ts:
 * a couple of shared achievements (FR04), two ordinary threads, and the
 * moderation examples a demo needs — an open report queue, a reported comment
 * and one post that a moderator already took down.
 *
 * Dates are relative to "now" so the list always looks freshly posted.
 */

function daysAgo(days: number, hours = 0): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000 - hours * 60 * 60 * 1000).toISOString()
}

function hoursAfter(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 60 * 60 * 1000).toISOString()
}

const spamPostedAt = daysAgo(0, 6)
const parkingPostedAt = daysAgo(4)
const closedPostedAt = daysAgo(8)
const closedReviewedAt = hoursAfter(closedPostedAt, 5)

export function createSeedForumExtras(): { posts: ForumPost[]; reports: ForumReport[] } {
  const posts: ForumPost[] = [
    {
      id: 'post-badge-seven-day-streak',
      category: 'achievements',
      title: '🔥 Badge unlocked: Seven-Day Streak',
      body: [
        '🗓️ Seven-Day Streak — Keep a check-in streak alive for a full week.',
        'Dana unlocked this badge in RVA Quest.',
        'Anyone else chasing the same one? Drop your route below.',
      ].join('\n\n'),
      authorId: 'dana',
      createdAt: daysAgo(1),
      likedBy: ['jordan', 'casey'],
      replies: [
        {
          id: 'reply-badge-seven-day-1',
          authorId: 'jordan',
          body: 'Seven days of river walks — impressive. Which spot was the hardest to reach?',
          createdAt: hoursAfter(daysAgo(1), 2),
          likedBy: ['dana'],
        },
      ],
    },
    {
      id: 'post-badge-century-club',
      category: 'achievements',
      title: '💯 Badge unlocked: Century Club',
      body: [
        '💯 Century Club — Reach 100 points.',
        'Casey unlocked this badge in RVA Quest.',
        'Capitol Square and the mural walk got me there in one weekend.',
      ].join('\n\n'),
      authorId: 'casey',
      createdAt: daysAgo(3),
      likedBy: ['dana'],
      replies: [
        {
          id: 'reply-badge-century-1',
          authorId: 'dana',
          body: 'Nice. The History quests are the quickest points if you start early.',
          createdAt: hoursAfter(daysAgo(3), 4),
        },
      ],
    },
    {
      id: 'post-badge-first-steps',
      category: 'achievements',
      title: '🥾 Badge unlocked: First Steps',
      body: [
        '🥾 First Steps — Earn your first 10 points exploring Richmond.',
        'Jordan unlocked this badge in RVA Quest.',
        'Taking the Belle Isle loop at sunrise is the best way to start.',
      ].join('\n\n'),
      authorId: 'jordan',
      createdAt: daysAgo(2),
      likedBy: ['casey'],
      replies: [],
    },
    {
      id: 'post-general-parking-carytown',
      category: 'general',
      title: 'Where do you park for the Carytown mural walk?',
      body: 'Street parking on West Cary fills up fast on Saturdays. I usually leave the car near the VMFA and walk down — takes about fifteen minutes.',
      authorId: 'dana',
      createdAt: parkingPostedAt,
      likedBy: ['jordan', 'casey'],
      replies: [
        {
          id: 'reply-parking-carytown-1',
          authorId: 'jordan',
          body: 'The lot behind the Kroger is free for two hours if you buy anything. Way easier than circling Cary Street.',
          createdAt: hoursAfter(parkingPostedAt, 3),
          likedBy: ['dana'],
        },
        {
          id: 'reply-parking-carytown-2',
          authorId: 'casey',
          body: 'Buy a bike instead. Parking solved forever.',
          createdAt: hoursAfter(parkingPostedAt, 9),
          likedBy: [],
        },
      ],
    },
    {
      id: 'post-general-scooter-codes',
      category: 'general',
      title: 'CHEAP RENTAL SCOOTERS — DM ME FOR CODES',
      body: 'Ride around Richmond for almost nothing this weekend. Limited codes, first come first served, message me and I will send the link.',
      authorId: 'casey',
      createdAt: spamPostedAt,
      likedBy: [],
      replies: [],
    },
    {
      // Already handled by a moderator: hidden from users, visible to moderators.
      id: 'post-general-belle-isle-closed',
      category: 'general',
      title: 'Belle Isle bridge is closed all summer — skip it',
      body: 'Heard from a friend that the pedestrian bridge is shut until September, so the island loop is off the table.',
      authorId: 'casey',
      createdAt: closedPostedAt,
      likedBy: [],
      replies: [],
      removed: true,
      removedBy: 'dana',
      removedAt: closedReviewedAt,
      removedReason: 'Out of date and unverified — the bridge is open.',
    },
  ]

  const reports: ForumReport[] = [
    {
      id: 'report-scooter-1',
      target: 'post',
      postId: 'post-general-scooter-codes',
      reporterId: 'jordan',
      reason: 'Spam or advertising',
      details: 'Rental scooter codes, same account posted one last week.',
      createdAt: hoursAfter(spamPostedAt, 1),
      status: 'open',
    },
    {
      id: 'report-scooter-2',
      target: 'post',
      postId: 'post-general-scooter-codes',
      reporterId: 'dana',
      reason: 'Something else',
      details: 'Not Richmond related at all.',
      createdAt: hoursAfter(spamPostedAt, 3),
      status: 'open',
    },
    {
      id: 'report-parking-comment-1',
      target: 'reply',
      postId: 'post-general-parking-carytown',
      replyId: 'reply-parking-carytown-1',
      reporterId: 'casey',
      reason: 'Off topic for this category',
      details: 'Reads like an advert for the grocery store.',
      createdAt: hoursAfter(parkingPostedAt, 5),
      status: 'open',
    },
    {
      id: 'report-belle-isle-1',
      target: 'post',
      postId: 'post-general-belle-isle-closed',
      reporterId: 'jordan',
      reason: 'Something else',
      details: 'Walked across the bridge yesterday, this is not true.',
      createdAt: hoursAfter(closedPostedAt, 2),
      status: 'resolved',
      resolvedBy: 'dana',
      resolvedAt: closedReviewedAt,
      resolution: 'removed',
    },
  ]

  return { posts, reports }
}
