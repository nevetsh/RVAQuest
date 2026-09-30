import { describe, expect, it } from 'vitest'
import type { ForumPost, ForumReport, ForumReply } from '../services/places.types'
import type { Role } from '../services/types'
import {
  canComment,
  canPinPost,
  canRemovePost,
  canRemoveReply,
  canReport,
  canResolveReport,
  commentCount,
  type ForumViewer,
  countOpenReports,
  filterByForumCategory,
  findBannedWords,
  hasBannedWords,
  hasForumPostErrors,
  isForumCategory,
  isLikedBy,
  isModerator,
  isSuggestionPost,
  likeCount,
  normalizeForFilter,
  openReports,
  searchForumPosts,
  selectForumFeed,
  sortReports,
  suggestionPosts,
  toggleLike,
  validateForumComment,
  validateForumPost,
  validateForumReport,
  visiblePosts,
  visibleReplies,
} from './forum.moderation'

/**
 * Phase 3 acceptance tests: the banned-word filter that runs before anything
 * is published, and the moderation permissions (who may remove, pin and
 * resolve).
 */

const MOD: { role: Role } = { role: 'moderator' }
const USER: { role: Role } = { role: 'user' }

function makeReply(overrides: Partial<ForumReply> = {}): ForumReply {
  return {
    id: 'reply-1',
    authorId: 'casey',
    body: 'A perfectly ordinary comment.',
    createdAt: '2026-09-20T10:00:00.000Z',
    ...overrides,
  }
}

function makePost(overrides: Partial<ForumPost> = {}): ForumPost {
  return {
    id: 'post-1',
    category: 'general',
    title: 'Where do you park for the Carytown walk?',
    body: 'I usually leave the car near the VMFA and walk down.',
    authorId: 'jordan',
    createdAt: '2026-09-20T09:00:00.000Z',
    replies: [],
    ...overrides,
  }
}

function makeReport(overrides: Partial<ForumReport> = {}): ForumReport {
  return {
    id: 'report-1',
    target: 'post',
    postId: 'post-1',
    reporterId: 'casey',
    reason: 'Spam or advertising',
    createdAt: '2026-09-21T09:00:00.000Z',
    status: 'open',
    ...overrides,
  }
}

describe('banned-word filter', () => {
  it('passes ordinary forum text', () => {
    expect(findBannedWords('The sunrise loop is worth the early start.')).toEqual([])
    expect(hasBannedWords('Great murals along West Cary Street.')).toBe(false)
  })

  it('returns nothing for empty or whitespace-only text', () => {
    expect(findBannedWords('')).toEqual([])
    expect(findBannedWords('   \n ')).toEqual([])
  })

  it('finds a banned word, ignoring case', () => {
    expect(findBannedWords('That damn hill again')).toEqual(['damn'])
    expect(findBannedWords('DAMN this rain')).toEqual(['damn'])
  })

  it('only matches whole words, so "hello" and "scrap" are fine', () => {
    expect(findBannedWords('Say hello to the shell by the river')).toEqual([])
    expect(findBannedWords('Just a scrap of paper')).toEqual([])
    // …but the words on their own are still caught.
    expect(findBannedWords('It was hell out there')).toEqual(['hell'])
  })

  it('catches multi-word phrases', () => {
    expect(findBannedWords('Please shut up about the parking')).toEqual(['shut up'])
    expect(findBannedWords('nobody cares about that opinion')).toEqual(['nobody cares'])
  })

  it('sees through punctuation, look-alike characters and letter padding', () => {
    expect(findBannedWords('Damn!')).toEqual(['damn'])
    expect(findBannedWords('shut up!!!')).toEqual(['shut up'])
    expect(findBannedWords('D@mn, the bridge is closed')).toEqual(['damn'])
    expect(findBannedWords('h3ll of a view')).toEqual(['hell'])
    expect(findBannedWords('daaaamn that is steep')).toEqual(['damn'])
  })

  it('returns every banned word it finds', () => {
    expect(findBannedWords('What a stupid damn idea')).toEqual(['damn', 'stupid'])
  })

  it('normalizes text without changing what the user sees', () => {
    expect(normalizeForFilter('D@MN')).toBe('damn')
    expect(normalizeForFilter('shiiiit')).toBe('shit')
  })
})

describe('post and comment validation', () => {
  it('requires a category, a title and a body', () => {
    const errors = validateForumPost({ category: '', title: '  ', body: '' })
    expect(errors.category).toBeDefined()
    expect(errors.title).toBeDefined()
    expect(errors.body).toBeDefined()
    expect(hasForumPostErrors(errors)).toBe(true)
  })

  it('accepts a clean draft', () => {
    const errors = validateForumPost({
      category: 'achievements',
      title: 'Badge unlocked: First Steps',
      body: 'Sunrise on the Belle Isle loop was worth it.',
    })
    expect(errors).toEqual({})
    expect(hasForumPostErrors(errors)).toBe(false)
  })

  it('blocks a banned word in the title or body and names it', () => {
    const titleErrors = validateForumPost({ category: 'general', title: 'This is crap', body: 'Body text.' })
    expect(titleErrors.title).toContain('crap')
    expect(titleErrors.title).toContain('banned-word filter')

    const bodyErrors = validateForumPost({
      category: 'general',
      title: 'Fine title',
      body: 'You are an idiot for parking there.',
    })
    expect(bodyErrors.body).toContain('idiot')
  })

  it('enforces the length limits', () => {
    const errors = validateForumPost({ category: 'general', title: 'x'.repeat(200), body: 'ok' })
    expect(errors.title).toContain('limited to')
  })

  it('validates comments the same way', () => {
    expect(validateForumComment('   ').body).toBeDefined()
    expect(validateForumComment('You are an idiot').body).toContain('idiot')
    expect(validateForumComment('Take the Belle Isle entrance instead.').body).toBeUndefined()
  })

  it('requires a report reason and caps the details', () => {
    expect(validateForumReport({ reason: '' }).reason).toBeDefined()
    expect(
      validateForumReport({ reason: 'Spam or advertising', details: 'x'.repeat(400) }).details,
    ).toBeDefined()
    expect(validateForumReport({ reason: 'Spam or advertising', details: 'Looks like an ad.' })).toEqual(
      {},
    )
  })
})

describe('moderation permissions', () => {
  it('recognises a moderator viewer', () => {
    expect(isModerator(MOD)).toBe(true)
    expect(isModerator(USER)).toBe(false)
    expect(isModerator(null)).toBe(false)
  })

  it('only lets moderators remove a live post', () => {
    const post = makePost()
    expect(canRemovePost(post, MOD)).toBe(true)
    expect(canRemovePost(post, USER)).toBe(false)
    // Already removed: nothing left to do, even for a moderator.
    expect(canRemovePost(makePost({ removed: true }), MOD)).toBe(false)
  })

  it('only lets moderators remove a live comment', () => {
    expect(canRemoveReply(makeReply(), MOD)).toBe(true)
    expect(canRemoveReply(makeReply(), USER)).toBe(false)
    expect(canRemoveReply(makeReply({ removed: true }), MOD)).toBe(false)
  })

  it('only lets moderators pin a live post', () => {
    expect(canPinPost(makePost(), MOD)).toBe(true)
    expect(canPinPost(makePost(), USER)).toBe(false)
    expect(canPinPost(makePost({ removed: true }), MOD)).toBe(false)
  })

  it('only lets moderators resolve a report that is still open', () => {
    expect(canResolveReport(makeReport(), MOD)).toBe(true)
    expect(canResolveReport(makeReport(), USER)).toBe(false)
    expect(canResolveReport(makeReport({ status: 'resolved' }), MOD)).toBe(false)
  })

  it('closes comments on a removed post', () => {
    expect(canComment(makePost(), USER)).toBe(true)
    expect(canComment(makePost({ removed: true }), USER)).toBe(false)
    expect(canComment(makePost(), null)).toBe(false)
  })

  it('lets any explorer report someone else’s content once', () => {
    const post = makePost({ id: 'post-9', authorId: 'dana' })
    const target = { target: 'post' as const, postId: 'post-9' }

    expect(canReport(post, 'jordan', [], target)).toBe(true)

    const alreadyReported = [makeReport({ reporterId: 'jordan', postId: 'post-9' })]
    expect(canReport(post, 'jordan', alreadyReported, target)).toBe(false)
    // A report from somebody else does not stop this user.
    expect(canReport(post, 'casey', alreadyReported, target)).toBe(true)
  })

  it('refuses self-reports, removed content and resolved history', () => {
    const own = makePost({ id: 'post-9', authorId: 'jordan' })
    expect(canReport(own, 'jordan', [], { target: 'post', postId: 'post-9' })).toBe(false)

    const removed = makePost({ id: 'post-9', authorId: 'dana', removed: true })
    expect(canReport(removed, 'jordan', [], { target: 'post', postId: 'post-9' })).toBe(false)

    const resolved = [
      makeReport({ reporterId: 'jordan', postId: 'post-9', status: 'resolved', resolution: 'dismissed' }),
    ]
    const live = makePost({ id: 'post-9', authorId: 'dana' })
    expect(canReport(live, 'jordan', resolved, { target: 'post', postId: 'post-9' })).toBe(true)
  })

  it('keeps reports for a comment separate from reports for its post', () => {
    const comment = makeReply({ id: 'reply-9', authorId: 'casey' })
    const postReport = [makeReport({ reporterId: 'jordan', postId: 'post-9' })]

    expect(canReport(comment, 'jordan', postReport, {
      target: 'reply',
      postId: 'post-9',
      replyId: 'reply-9',
    })).toBe(true)
  })
})

describe('visibility', () => {
  const live = makePost({ id: 'post-live' })
  const removed = makePost({ id: 'post-removed', removed: true })

  it('hides removed posts from explorers but not from moderators', () => {
    expect(visiblePosts([live, removed], USER).map((post) => post.id)).toEqual(['post-live'])
    expect(visiblePosts([live, removed], MOD).map((post) => post.id)).toEqual([
      'post-live',
      'post-removed',
    ])
  })

  it('hides removed comments the same way, and counts only what is visible', () => {
    const post = makePost({
      replies: [makeReply({ id: 'reply-live' }), makeReply({ id: 'reply-removed', removed: true })],
    })

    expect(visibleReplies(post, USER).map((reply) => reply.id)).toEqual(['reply-live'])
    expect(visibleReplies(post, MOD)).toHaveLength(2)
    expect(commentCount(post, USER)).toBe(1)
    expect(commentCount(post, MOD)).toBe(2)
  })
})

describe('search, filter and ordering', () => {
  const pinned = makePost({
    id: 'post-pinned',
    title: 'Pinned announcement',
    createdAt: '2026-09-01T09:00:00.000Z',
    pinned: true,
  })
  const newest = makePost({
    id: 'post-newest',
    category: 'achievements',
    title: 'Badge unlocked: First Steps',
    body: 'Sunrise on Belle Isle.',
    createdAt: '2026-09-25T09:00:00.000Z',
  })
  const older = makePost({ id: 'post-older', title: 'Parking tips', createdAt: '2026-09-10T09:00:00.000Z' })
  const suggestion = makePost({
    id: 'post-suggestion',
    category: 'spot-suggestions',
    title: 'New spot: Great Shiplock Park',
    placeId: 'shiplock-park',
    createdAt: '2026-09-26T09:00:00.000Z',
  })

  const all = [older, newest, pinned, suggestion]

  it('searches the title and the body', () => {
    expect(searchForumPosts(all, 'parking').map((post) => post.id)).toEqual(['post-older'])
    expect(searchForumPosts(all, 'sunrise').map((post) => post.id)).toEqual(['post-newest'])
    expect(searchForumPosts(all, '')).toHaveLength(4)
  })

  it('filters by category', () => {
    expect(filterByForumCategory(all, 'achievements').map((post) => post.id)).toEqual([
      'post-newest',
    ])
    expect(filterByForumCategory(all, 'all')).toHaveLength(4)
  })

  it('puts pinned posts first, then newest first', () => {
    expect(selectForumFeed(all, { viewer: USER }).map((post) => post.id)).toEqual([
      'post-pinned',
      'post-suggestion',
      'post-newest',
      'post-older',
    ])
  })

  it('can leave the suggestion posts to the pinned Suggestion box', () => {
    expect(
      selectForumFeed(all, { viewer: USER, includeSuggestions: false }).map((post) => post.id),
    ).not.toContain('post-suggestion')
  })

  it('never feeds a removed post to an explorer', () => {
    const withRemoved = [...all, makePost({ id: 'post-gone', removed: true })]
    expect(selectForumFeed(withRemoved, { viewer: USER }).map((post) => post.id)).not.toContain(
      'post-gone',
    )
    expect(selectForumFeed(withRemoved, { viewer: MOD }).map((post) => post.id)).toContain(
      'post-gone',
    )
  })

  it('treats pipeline posts as suggestions', () => {
    expect(isSuggestionPost(suggestion)).toBe(true)
    expect(isSuggestionPost(newest)).toBe(false)
    expect(suggestionPosts(all, USER).map((post) => post.id)).toEqual(['post-suggestion'])
  })

  it('only accepts the three real categories from a URL', () => {
    expect(isForumCategory('achievements')).toBe(true)
    expect(isForumCategory('spot-suggestions')).toBe(true)
    expect(isForumCategory('general')).toBe(true)
    expect(isForumCategory('help')).toBe(false)
    expect(isForumCategory(null)).toBe(false)
  })
})

describe('likes', () => {
  it('counts and reports likes, missing likedBy included', () => {
    expect(likeCount(makePost())).toBe(0)
    expect(likeCount(makePost({ likedBy: ['casey', 'dana'] }))).toBe(2)
    expect(isLikedBy(makePost({ likedBy: ['casey'] }), 'casey')).toBe(true)
    expect(isLikedBy(makePost({ likedBy: ['casey'] }), 'jordan')).toBe(false)
  })

  it('toggles a like on and off without mutating the original', () => {
    const post = makePost({ likedBy: ['casey'] })

    const liked = toggleLike(post, 'jordan')
    expect(liked.likedBy).toEqual(['casey', 'jordan'])
    expect(post.likedBy).toEqual(['casey'])

    const unliked = toggleLike(liked, 'casey')
    expect(unliked.likedBy).toEqual(['jordan'])
  })

  it('never stores the same user twice', () => {
    const twice = toggleLike(toggleLike(makePost(), 'jordan'), 'jordan')
    expect(twice.likedBy).toEqual([])
  })
})

describe('role inheritance and suspended accounts (Phase 6)', () => {
  it('lets managers and administrators moderate too', () => {
    expect(isModerator({ role: 'manager' })).toBe(true)
    expect(isModerator({ role: 'admin' })).toBe(true)
    expect(canRemovePost(makePost(), { role: 'manager' })).toBe(true)
    expect(canRemovePost(makePost(), { role: 'admin' })).toBe(true)
    expect(canPinPost(makePost(), { role: 'admin' })).toBe(true)
  })

  it('takes every privilege away from a suspended account', () => {
    const suspendedAdmin: ForumViewer = { role: 'admin', status: 'suspended' }

    expect(isModerator(suspendedAdmin)).toBe(false)
    expect(canRemovePost(makePost(), suspendedAdmin)).toBe(false)
    expect(canResolveReport(makeReport(), suspendedAdmin)).toBe(false)
    expect(canComment(makePost(), suspendedAdmin)).toBe(false)
  })

  it('shows removed content to managers and hides it from explorers', () => {
    const removed = makePost({ removed: true })
    expect(visiblePosts([removed], { role: 'manager' })).toHaveLength(1)
    expect(visiblePosts([removed], { role: 'user' })).toHaveLength(0)
  })

  it('can switch the banned-word filter off without losing the other checks', () => {
    const draft = { category: 'general' as const, title: 'This is crap', body: 'Body text.' }
    expect(validateForumPost(draft).title).toContain('banned-word filter')
    expect(validateForumPost(draft, { bannedWords: false }).title).toBeUndefined()

    // Length and required-field rules still apply with the filter off.
    const tooLong = { category: 'general' as const, title: 'x'.repeat(200), body: '' }
    expect(validateForumPost(tooLong, { bannedWords: false }).title).toContain('limited to')
    expect(validateForumPost(tooLong, { bannedWords: false }).body).toBeDefined()

    expect(validateForumComment('You are an idiot', { bannedWords: false }).body).toBeUndefined()
  })
})

describe('report queue helpers', () => {
  const open = makeReport({ id: 'report-open', createdAt: '2026-09-21T09:00:00.000Z' })
  const newer = makeReport({ id: 'report-newer', createdAt: '2026-09-22T09:00:00.000Z' })
  const resolved = makeReport({ id: 'report-resolved', status: 'resolved' })

  it('keeps only the open reports', () => {
    expect(openReports([open, resolved]).map((report) => report.id)).toEqual(['report-open'])
    expect(countOpenReports([open, newer, resolved])).toBe(2)
  })

  it('sorts the queue newest first', () => {
    expect(sortReports([open, newer]).map((report) => report.id)).toEqual([
      'report-newer',
      'report-open',
    ])
  })
})
