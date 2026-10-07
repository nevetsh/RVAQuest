import type {
  AppState,
  AuditEntry,
  Coordinates,
  Quest,
  QuestCategory,
  Role,
  User,
} from './types'
import { DEFAULT_SETTINGS } from './types'
import { createSeedForumPosts, createSeedPlaces, createSeedSubmissionLog } from './seed.places'
import { createSeedForumExtras } from './seed.forum'
import { createPasswordHash } from '../rules/auth'

/**
 * Demo content for the prototype. Coordinates are real Richmond, VA spots
 * (good enough for a walking-distance prototype, not survey grade).
 */

const RICHMOND: Record<string, Coordinates> = {
  belleIsle: { lat: 37.5295, lng: -77.45 },
  maymont: { lat: 37.534, lng: -77.478 },
  carytown: { lat: 37.5523, lng: -77.481 },
  capitol: { lat: 37.5386, lng: -77.4337 },
  hollywood: { lat: 37.5453, lng: -77.4497 },
  brownsIsland: { lat: 37.5332, lng: -77.4425 },
  vmfa: { lat: 37.5563, lng: -77.4747 },
  libbyHill: { lat: 37.5341, lng: -77.4155 },
  shockoeSlip: { lat: 37.5325, lng: -77.431 },
  ponyPasture: { lat: 37.5527, lng: -77.5209 },
  pipelineOverlook: { lat: 37.5341, lng: -77.4358 },
  manchesterFloodwall: { lat: 37.5231, lng: -77.4408 },
} as const

interface QuestSeed {
  id: string
  name: string
  category: QuestCategory
  area: string
  spot: keyof typeof RICHMOND
  points: number
  description: string
  requirements: string[]
  requirementsNote?: string
  status?: Quest['status']
  reviewStatus?: Quest['reviewStatus']
  isDailySpot?: boolean
  createdBy?: string
}

const QUEST_SEEDS: QuestSeed[] = [
  {
    id: 'belle-isle-loop',
    name: 'Belle Isle Loop',
    category: 'Outdoors',
    area: 'Belle Isle, James River Park',
    spot: 'belleIsle',
    points: 50,
    description:
      'Cross the pedestrian suspension bridge, circle the island loop trail and take in the rapids from the granite overlook.',
    requirements: [
      'Walk the full island loop trail',
      'Check in within 100 m of the island trailhead',
      'Stay on marked trails — the river rocks are slippery',
    ],
    requirementsNote: 'Roughly 2.5 km of walking on gravel and rock.',
    isDailySpot: true,
  },
  {
    id: 'maymont-gardens',
    name: 'Maymont Gardens & Mansion',
    category: 'Parks',
    area: 'Maymont, 1700 Hampton St',
    spot: 'maymont',
    points: 60,
    description:
      'Wander the Italian and Japanese gardens, then climb to the mansion terrace for the view over the James River valley.',
    requirements: [
      'Visit both the Japanese and Italian gardens',
      'Check in near the mansion entrance',
      'Grounds are free, the mansion tour is ticketed',
    ],
    requirementsNote: 'Open 10:00–17:00, closed Mondays.',
  },
  {
    id: 'carytown-mural-walk',
    name: 'Carytown Mural Walk',
    category: 'Art',
    area: 'Carytown, W Cary St',
    spot: 'carytown',
    points: 40,
    description:
      'Hunt down five painted murals tucked between the storefronts along West Cary Street and note the artist on each.',
    requirements: [
      'Find at least five murals',
      'Check in anywhere along the Carytown strip',
      'Do not block shop entrances while photographing',
    ],
  },
  {
    id: 'capitol-square',
    name: 'Capitol Square History Walk',
    category: 'History',
    area: 'Capitol Square, 1000 Bank St',
    spot: 'capitol',
    points: 55,
    description:
      'Follow the walking tour around the Virginia State Capitol, the Bell Tower and the Executive Mansion grounds.',
    requirements: [
      'Walk the full square perimeter',
      'Find the Bell Tower and the George Washington statue',
      'Check in at the Capitol visitor entrance',
    ],
    requirementsNote: 'Security screening at the visitor entrance.',
  },
  {
    id: 'hollywood-cemetery',
    name: 'Hollywood Cemetery Historic Walk',
    category: 'History',
    area: 'Hollywood Cemetery, 412 S Cherry St',
    spot: 'hollywood',
    points: 45,
    description:
      'A quiet loop past river-view graves, the presidents’ circles and the pyramid on the cemetery’s highest ridge.',
    requirements: [
      'Visit the Presidents’ Circle and the pyramid',
      'Check in at the Cherry Street gate',
      'Joggers and pets are not permitted',
    ],
    requirementsNote: 'Gates close at 18:00 in summer, 17:00 in winter.',
  },
  {
    id: 'browns-island',
    name: 'Brown’s Island Riverfront Stroll',
    category: 'Outdoors',
    area: "Brown's Island, Downtown riverfront",
    spot: 'brownsIsland',
    points: 35,
    description:
      'Walk the riverfront path from the T. Tyler Potterfield bridge to the base of the island and watch the rafters run the falls.',
    requirements: [
      'Walk the riverfront path end to end',
      'Check in on the island walkway',
    ],
  },
  {
    id: 'vmfa-gallery',
    name: 'VMFA Gallery Highlights',
    category: 'Art',
    area: 'Virginia Museum of Fine Arts, 200 N Arthur Ashe Blvd',
    spot: 'vmfa',
    points: 50,
    description:
      'Pick three galleries, find the Fabergé eggs and the Tiffany window, then relax in the sculpture garden.',
    requirements: [
      'Visit at least three galleries',
      'Find the Fabergé collection',
      'Check in inside the atrium',
    ],
    requirementsNote: 'General admission is free; some exhibitions are ticketed.',
  },
  {
    id: 'libby-hill-overlook',
    name: 'Libby Hill & Church Hill Overlook',
    category: 'Landmarks',
    area: 'Libby Hill Park, 2801 E Franklin St',
    spot: 'libbyHill',
    points: 60,
    description:
      'Stand at the view that gave Richmond its name, then walk the Church Hill blocks to St. John’s Church.',
    requirements: [
      'Reach the Libby Hill overlook',
      'Walk to St. John’s Church',
      'Check in at the overlook railing',
    ],
    requirementsNote: 'Best light is an hour before sunset.',
  },
  {
    id: 'shockoe-slip-taste',
    name: 'Shockoe Slip Taste Trail',
    category: 'Food & Drink',
    area: 'Shockoe Slip, E Cary St',
    spot: 'shockoeSlip',
    points: 30,
    description:
      'Cobblestones, converted tobacco warehouses and a short list of local counters — pick two stops and compare notes.',
    requirements: [
      'Visit two local food or drink spots',
      'Check in on the Slip cobblestones',
      'Keep one receipt for the forum post',
    ],
  },
  {
    id: 'pony-pasture',
    name: 'Pony Pasture Rapids Walk',
    category: 'Outdoors',
    area: 'Pony Pasture Rapids Park, Riverside Dr',
    spot: 'ponyPasture',
    points: 40,
    description:
      'Follow the riverside trail over rock slabs to the rapids, the calmest swimming hole in the city on a hot day.',
    requirements: [
      'Walk to the rapids overlook',
      'Check in at the trail entrance',
      'Never swim alone or above the rapids',
    ],
    status: 'locked',
    requirementsNote: 'Locked until you have a 3-day streak.',
  },
  {
    // Submitted by a demo user, still waiting on a moderator (hidden from users).
    id: 'pipeline-overlook',
    name: 'Pipeline Overlook Walk',
    category: 'Outdoors',
    area: 'Pipeline Rapids, S 12th St',
    spot: 'pipelineOverlook',
    points: 35,
    description:
      'A narrow catwalk above the old city pipeline with the best close-up of the main rapids.',
    requirements: ['Walk the catwalk to the overlook', 'Check in at the catwalk entrance'],
    reviewStatus: 'pending',
    createdBy: 'casey',
  },
  {
    // Rejected by a moderator — proves rejected content stays hidden.
    id: 'floodwall-steps',
    name: 'Manchester Floodwall Steps',
    category: 'Landmarks',
    area: 'Manchester Floodwall, 500 Brander St',
    spot: 'manchesterFloodwall',
    points: 25,
    description: 'The stone steps above the floodwall with a skyline view across the river.',
    requirements: ['Reach the top of the steps', 'Check in at the wall path'],
    reviewStatus: 'rejected',
    createdBy: 'casey',
  },
]

const QUEST_CREATED_AT = '2026-09-01T12:00:00.000Z'

export function createSeedQuests(): Quest[] {
  return QUEST_SEEDS.map((seed) => ({
    id: seed.id,
    name: seed.name,
    description: seed.description,
    category: seed.category,
    location: RICHMOND[seed.spot],
    area: seed.area,
    points: seed.points,
    requirements: seed.requirements,
    requirementsNote: seed.requirementsNote,
    status: seed.status ?? 'unlocked',
    reviewStatus: seed.reviewStatus ?? 'approved',
    isDailySpot: seed.isDailySpot,
    createdBy: seed.createdBy,
    createdAt: QUEST_CREATED_AT,
  }))
}

/**
 * The seeded accounts, including their prototype-only passwords.
 *
 * This is the single source of truth for both the store (`createSeedUsers`
 * hashes each password) and the sign-in screen's demo list, which names each
 * account and fills the form but never prints the password. A deployed build
 * would never ship credentials; these only guard demo data in one browser's
 * localStorage. See docs/traceability.md, interpretation #14.
 */
export interface SeedAccount {
  id: string
  username: string
  /** Plain demo password. Hashed on the way into the store. */
  password: string
  name: string
  role: Role
  points: number
  streak: number
  favoriteQuestIds: string[]
}

export const SEED_ACCOUNTS: SeedAccount[] = [
  {
    // Phase 8: the one test account. The two stakeholder accounts seeded here
    // before were deleted after their passwords were exposed in this
    // repository's history, and replaced by this deliberately plain
    // test credential so the prototype can still be driven end to end.
    // See docs/traceability.md, interpretation #14.
    id: 'admin',
    username: 'admin',
    password: 'admin',
    name: 'Admin',
    role: 'admin',
    points: 0,
    streak: 0,
    favoriteQuestIds: [],
  },
  {
    id: 'jordan',
    username: 'jordan',
    password: 'rvaquest',
    name: 'Jordan Reyes',
    role: 'user',
    points: 240,
    streak: 3,
    favoriteQuestIds: ['maymont-gardens', 'libby-hill-overlook'],
  },
  {
    id: 'casey',
    username: 'casey',
    password: 'rvaquest',
    name: 'Casey Nguyen',
    role: 'user',
    points: 120,
    streak: 1,
    favoriteQuestIds: [],
  },
  {
    id: 'dana',
    username: 'dana',
    password: 'rvaquest',
    name: 'Dana Whitfield',
    role: 'moderator',
    points: 480,
    streak: 7,
    favoriteQuestIds: ['belle-isle-loop'],
  },
  {
    // Phase 6: managers look after the quest catalogue and the queues.
    id: 'morgan',
    username: 'morgan',
    password: 'rvaquest',
    name: 'Morgan Ellis',
    role: 'manager',
    points: 320,
    streak: 2,
    favoriteQuestIds: ['capitol-square'],
  },
  {
    // Phase 6: an administrator can manage the whole app, users included.
    id: 'alex',
    username: 'alex',
    password: 'rvaquest',
    name: 'Alex Chen',
    role: 'admin',
    points: 600,
    streak: 4,
    favoriteQuestIds: ['maymont-gardens'],
  },
]

export function createSeedUsers(): User[] {
  // Salted and stretched (VULN-001 in docs/security-review.md), so two seed
  // accounts that share a demo password no longer share a digest.
  return SEED_ACCOUNTS.map(({ password, ...account }) => ({
    ...account,
    passwordHash: createPasswordHash(password),
  }))
}

/** A little history so the Activity tab is not empty on a fresh demo. */
function createSeedAuditLog(): AuditEntry[] {
  const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  return [
    {
      id: 'log-seed-1',
      at: hoursAgo(30),
      actorId: 'alex',
      action: 'role-changed',
      summary: 'Dana Whitfield moved from Explorer to Moderator.',
    },
    {
      id: 'log-seed-2',
      at: hoursAgo(6),
      actorId: 'morgan',
      action: 'daily-spot-changed',
      summary: 'Daily check-in spot set to “Belle Isle Loop”.',
    },
  ]
}

export function createSeedState(schemaVersion: number): AppState {
  const places = createSeedPlaces()
  // Phase 3 forum content: shared achievements, two threads and the
  // moderation examples (an open report queue + one removed post).
  const forum = createSeedForumExtras()

  return {
    schemaVersion,
    users: createSeedUsers(),
    currentUserId: 'jordan',
    // A fresh seed is signed out: the sign-in gate is the first screen.
    signedInUserId: null,
    quests: createSeedQuests(),
    places,
    forumPosts: [...createSeedForumPosts(), ...forum.posts],
    forumReports: forum.reports,
    submissions: createSeedSubmissionLog(places),
    settings: { ...DEFAULT_SETTINGS },
    auditLog: createSeedAuditLog(),
    dayOffset: 0,
    simulatedLocation: null,
    locationDenied: false,
  }
}
