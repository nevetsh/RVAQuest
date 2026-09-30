import { describe, expect, it } from 'vitest'
import type { ForumPost } from '../services/places.types'
import type { User } from '../services/types'
import {
  achievementShareDraft,
  achievementStatsFor,
  achievementsFor,
  earnedAchievements,
  progressLabel,
} from './achievements'

const USER: User = {
  id: 'jordan',
  name: 'Jordan Reyes',
  role: 'user',
  points: 240,
  streak: 3,
  favoriteQuestIds: ['maymont-gardens', 'libby-hill-overlook'],
}

function post(overrides: Partial<ForumPost> = {}): ForumPost {
  return {
    id: 'post-1',
    category: 'general',
    title: 'A post',
    body: 'Body',
    authorId: 'jordan',
    createdAt: '2026-09-20T09:00:00.000Z',
    replies: [],
    ...overrides,
  }
}

describe('achievementStatsFor', () => {
  it('derives every number from the user and the forum', () => {
    const stats = achievementStatsFor(USER, [
      post({ likedBy: ['casey', 'dana'], replies: [
        { id: 'reply-1', authorId: 'jordan', body: 'Mine', createdAt: '2026-09-20T10:00:00.000Z', likedBy: ['casey'] },
        { id: 'reply-2', authorId: 'casey', body: 'Theirs', createdAt: '2026-09-20T11:00:00.000Z' },
      ] }),
      post({ id: 'post-2', authorId: 'casey' }),
    ])

    expect(stats).toMatchObject({
      points: 240,
      streak: 3,
      favoriteCount: 2,
      postCount: 1,
      commentCount: 1,
      likesReceived: 3,
    })
  })

  it('ignores removed posts and comments', () => {
    const stats = achievementStatsFor(USER, [
      post({ removed: true, likedBy: ['casey'] }),
      post({
        id: 'post-2',
        authorId: 'casey',
        replies: [{ id: 'r', authorId: 'jordan', body: 'x', createdAt: 'x', removed: true }],
      }),
    ])

    expect(stats.postCount).toBe(0)
    expect(stats.commentCount).toBe(0)
    expect(stats.likesReceived).toBe(0)
  })
})

describe('achievementsFor', () => {
  it('marks a badge earned once the target is reached', () => {
    const badges = achievementsFor(achievementStatsFor(USER, []))
    const byId = Object.fromEntries(badges.map((badge) => [badge.id, badge]))

    expect(byId['first-steps'].earned).toBe(true)
    expect(byId['century-club'].earned).toBe(true)
    expect(byId.trailblazer.earned).toBe(true)
    expect(byId['week-streak'].earned).toBe(false)
    expect(byId['route-collector'].earned).toBe(false)
    expect(earnedAchievements(achievementStatsFor(USER, []))).toHaveLength(3)
  })

  it('summarises progress', () => {
    const badges = achievementsFor(achievementStatsFor(USER, []))
    expect(progressLabel(badges.find((badge) => badge.id === 'week-streak')!)).toBe('3 of 7')
    expect(progressLabel(badges.find((badge) => badge.id === 'trailblazer')!)).toBe('Earned')
  })
})

describe('achievementShareDraft', () => {
  it('pre-fills an Achievements post naming the badge and the explorer', () => {
    const badge = achievementsFor(achievementStatsFor(USER, [])).find(
      (entry) => entry.id === 'trailblazer',
    )!

    const draft = achievementShareDraft(badge, USER)

    expect(draft.category).toBe('achievements')
    expect(draft.title).toContain('Trailblazer')
    expect(draft.body).toContain('Trailblazer')
    expect(draft.body).toContain('Jordan')
  })
})
