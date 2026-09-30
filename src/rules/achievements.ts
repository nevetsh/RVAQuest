import type { ForumPost } from '../services/places.types'
import type { User } from '../services/types'
import { FORUM_CATEGORIES } from '../services/places.types'
import { likeCount } from './forum.moderation'

/**
 * FR03 / FR04 — the badge list behind the Profile screen and the "Share to
 * forum" button. Pure functions over data the app already stores, so the
 * sharing prefill can be unit-tested and the Profile screen stays dumb.
 */

export interface AchievementStats {
  points: number
  streak: number
  favoriteCount: number
  postCount: number
  commentCount: number
  likesReceived: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  emoji: string
  current: number
  target: number
  earned: boolean
}

/** Everything the badge list needs, derived from the store. */
export function achievementStatsFor(user: User, posts: ForumPost[]): AchievementStats {
  let postCount = 0
  let commentCount = 0
  let likesReceived = 0

  for (const post of posts) {
    if (post.authorId === user.id && !post.removed) postCount += 1
    if (!post.removed) likesReceived += post.authorId === user.id ? likeCount(post) : 0

    for (const reply of post.replies) {
      if (reply.removed) continue
      if (reply.authorId === user.id) commentCount += 1
      if (reply.authorId === user.id) likesReceived += likeCount(reply)
    }
  }

  return {
    points: user.points,
    streak: user.streak,
    favoriteCount: user.favoriteQuestIds.length,
    postCount,
    commentCount,
    likesReceived,
  }
}

const BADGES: Array<Omit<Achievement, 'current' | 'earned'> & { metric: keyof AchievementStats }> = [
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Earn your first 10 points exploring Richmond.',
    emoji: '🥾',
    target: 10,
    metric: 'points',
  },
  {
    id: 'century-club',
    name: 'Century Club',
    description: 'Reach 100 points.',
    emoji: '💯',
    target: 100,
    metric: 'points',
  },
  {
    id: 'trailblazer',
    name: 'Trailblazer',
    description: 'Check in three days in a row.',
    emoji: '🔥',
    target: 3,
    metric: 'streak',
  },
  {
    id: 'week-streak',
    name: 'Seven-Day Streak',
    description: 'Keep a check-in streak alive for a full week.',
    emoji: '🗓️',
    target: 7,
    metric: 'streak',
  },
  {
    id: 'route-collector',
    name: 'Route Collector',
    description: 'Save three quests to your favourites.',
    emoji: '⭐',
    target: 3,
    metric: 'favoriteCount',
  },
  {
    id: 'storyteller',
    name: 'Storyteller',
    description: 'Publish three forum posts.',
    emoji: '✍️',
    target: 3,
    metric: 'postCount',
  },
  {
    id: 'conversationalist',
    name: 'Conversationalist',
    description: 'Leave five comments on other explorers’ posts.',
    emoji: '💬',
    target: 5,
    metric: 'commentCount',
  },
  {
    id: 'crowd-favourite',
    name: 'Crowd Favourite',
    description: 'Collect five likes across your posts and comments.',
    emoji: '❤️',
    target: 5,
    metric: 'likesReceived',
  },
]

export function achievementsFor(stats: AchievementStats): Achievement[] {
  return BADGES.map(({ metric, ...badge }) => {
    const current = stats[metric]
    return {
      ...badge,
      current,
      earned: current >= badge.target,
    }
  })
}

export function earnedAchievements(stats: AchievementStats): Achievement[] {
  return achievementsFor(stats).filter((achievement) => achievement.earned)
}

export function progressLabel(achievement: Achievement): string {
  if (achievement.earned) return 'Earned'
  return `${Math.min(achievement.current, achievement.target)} of ${achievement.target}`
}

/**
 * FR04 — the pre-filled Achievements post behind "Share to forum". The title
 * and body land in the compose screen; nothing is published until the user
 * taps Publish.
 */
export function achievementShareDraft(
  achievement: Achievement,
  user: User,
): { category: 'achievements'; title: string; body: string } {
  const body = [
    `${achievement.emoji} ${achievement.name} — ${achievement.description}`,
    `${user.name.split(' ')[0]} unlocked this badge in RVA Quest.`,
    'Anyone else chasing the same one? Drop your route below.',
  ].join('\n\n')

  return {
    category: 'achievements',
    title: `${achievement.emoji} Badge unlocked: ${achievement.name}`,
    body,
  }
}

/** Kept exported so the Profile screen can name the category in its copy. */
export const ACHIEVEMENTS_CATEGORY_LABEL =
  FORUM_CATEGORIES.find((entry) => entry.id === 'achievements')?.label ?? 'Achievements'
