# RVA Quest — requirements traceability

This document maps every functional requirement (**FR01–FR10**) and non-functional
requirement (**NFR01–NFR06**) from the Activity 2 SRS to the screens and source files
that implement it, and lists every interpretation or deliberate change made while
building the prototype.

**Reference:** Group Project – Activity 2, SRS Template (RVA Quest). Requirement
numbers and wording are taken from that document.

**How to read the tables**
- *Screen* — the route a marker would open to see the requirement working.
- *Code* — the file(s) and symbol(s) that carry the logic (paths are relative to
  `rva-quest/`).
- *Evidence* — the test file or manual check that proves it.

---

## Functional requirements

### FR01 — The forum must be moderated
> Posts and comments are checked against community guidelines before they are
> published; moderators can remove content, pin threads and work a report queue.

| | |
| --- | --- |
| **Screens** | `/forum` (categories, search, likes, comments), `/forum/new` (compose), `/forum/:postId` (thread + moderation controls), `/admin` (Content tab) |
| **Code** | `src/rules/forum.moderation.ts` — `validateForumPost`, `validateForumComment`, `validateForumReport`, `findBannedWords`, `isModerator`, `canRemovePost`, `canPinPost`, `canResolveReport`, `toggleLike`, `visiblePosts`, `openReports`, `sortReports`; `src/services/forum.moderation.ts`; `BANNED_WORDS` + `FORUM_LIMITS` in `src/lib/constants.ts`; `src/services/seed.forum.ts`; `src/components/forum/{PostCard,CommentList,LikeButton,ReportButton,ModerationControls,ModerationQueue}.tsx` |
| **Evidence** | `src/rules/forum.moderation.test.ts` (41 tests: banned words, permissions, likes, reports, queue) |

### FR02 — Users can view all available outdoor quests
> A browsable list and map of every quest currently available to the user.

| | |
| --- | --- |
| **Screens** | `/quests` (list) and `/map` (map) — same page, `mode` prop |
| **Code** | `src/rules/quests.ts` — `visibleQuests` (only approved quests are public); `src/services/index.ts` — `listVisibleQuests`; `src/pages/QuestExplorerPage.tsx`; `src/components/quests/{QuestCard,QuestFilters}.tsx`; `src/components/map/{QuestMap,LazyQuestMap,types}.tsx` |
| **Evidence** | `src/rules/quests.test.ts` (visibility cases) |

### FR03 — Users earn badges / achievements
> Badges are awarded for milestones and shown on the profile.

| | |
| --- | --- |
| **Screens** | `/profile` → **Badges** ("*n* of 8 earned") |
| **Code** | `src/rules/achievements.ts` — badge definitions + `achievementStatsFor`, `achievementsFor`, `earnedAchievements`, `progressLabel`; `src/components/profile/AchievementList.tsx`; seed points/streaks in `src/services/seed.ts` |
| **Evidence** | `src/rules/achievements.test.ts` (5 tests) |

### FR04 — Users can share their profile and achievements
> An earned badge can be shared to the forum as a post.

| | |
| --- | --- |
| **Screens** | `/profile` → each earned badge has **Share to forum**; lands on `/forum/new` pre-filled |
| **Code** | `src/rules/achievements.ts` — `achievementShareDraft` (pre-filled title/body/category); `src/components/profile/AchievementList.tsx`; `src/pages/ForumComposePage.tsx` (pre-fill via router state); `src/services/seed.forum.ts` (a seeded shared achievement) |
| **Evidence** | `src/rules/achievements.test.ts` (share post shape); manual check from `/profile` |

### FR05 — Users earn points for adding a place
> An approved place pays the submitter points, exactly once.

| | |
| --- | --- |
| **Screens** | `/places/new` (form + confirmation), `/moderator` (approve), `/profile` → **My submissions** (points earned) |
| **Code** | `PLACE_APPROVAL_POINTS` in `src/lib/constants.ts`; `src/rules/places.ts` — `approvePlace` returns `awardPoints`; `src/services/places.service.ts` — `reviewPlace` credits `user.points` only on the pending→approved transition; `src/components/profile/MySubmissions.tsx` |
| **Evidence** | `src/rules/places.test.ts` ("points are awarded once"), `src/services/places.service.test.ts` (re-approve is a no-op); manual check (Jordan 240 → 265, second approve → no change) |

### FR06 — Users can save favourite quests
> Save/unsave a quest and see the saved list on the profile.

| | |
| --- | --- |
| **Screens** | `/quests/:questId` (favourite toggle), `/profile` → **Saved quests** (labelled FR06) |
| **Code** | `src/services/index.ts` — `toggleFavorite`, `isFavorite`; `user.favoriteQuestIds` in `src/services/types.ts`; `src/pages/QuestDetailPage.tsx`; `src/pages/ProfilePage.tsx` |
| **Evidence** | Toggle reflected in `localStorage` + profile list; manual check |

### FR07 — Daily check-in
> Check in at the daily spot to keep a streak; the streak shows on the profile.

| | |
| --- | --- |
| **Screens** | `/quests/:questId` (check-in), `/profile` (day streak) |
| **Code** | `src/rules/quests.ts` (check-in + streak rules); `RULES.checkInRadiusMeters = 100` in `src/lib/constants.ts`; `src/rules/time.ts` — `richmondDayKey` for day rollover |
| **Evidence** | `src/rules/quests.test.ts` (streak/day-boundary cases) |

### FR08 — Location-based quest discovery
> Use the device location to sort quests by walking distance; ask, grant, or
> "location off" states.

| | |
| --- | --- |
| **Screens** | `/quests`, `/map` (`Enable Location` / `Browse All Quests`), `/places/new` (`Use My Current Location`) |
| **Code** | `src/app/LocationProvider.tsx` (status machine: `idle → requesting → granted / denied / unavailable`); `src/components/quests/LocationPrompt.tsx`; `src/rules/geo.ts` — `haversineMeters`, `isWithinMeters`; `src/components/places/LocationPicker.tsx` + `PinPickerMap.tsx` |
| **Evidence** | `src/rules/geo.test.ts` (12 tests); Dev tools presets + `Deny location` path |

### FR09 — Moderator authorization of new spots
> New places are not public until a moderator approves them.

| | |
| --- | --- |
| **Screens** | `/moderator` — Moderation queue (approve / reject with optional reason) |
| **Code** | `src/rules/permissions.ts` — `canReviewPlaces`, capability `reviewPlaces`; `src/services/places.service.ts` — `reviewPlace`, `listPendingPlaces`, `listApprovedPlaces` (BR04); `src/pages/ModeratorQueuePage.tsx`; `src/rules/places.ts` — `approvePlace` / `rejectPlace` / `reviewStatusLabel` |
| **Evidence** | `src/rules/permissions.test.ts`; `src/services/places.service.test.ts`; manual check (pending place hidden from map, appears after approval) |

### FR10 — Spot suggestion section
> A dedicated forum category where users suggest new spots, with a pinned
> Suggestion box as the second entry point into the place pipeline.

| | |
| --- | --- |
| **Screens** | `/forum?cat=spot-suggestions` (Suggestion box + suggestion threads), `/places/new?from=forum` |
| **Code** | `src/services/places.types.ts` — `FORUM_CATEGORIES` (`spot-suggestions`, `general`, `help`), `ForumPost.placeId`, `pinned`; `src/rules/forum.ts` — `selectForumPosts`, `findForumPost`, `linkedPlace`; `src/services/forum.service.ts`; `src/components/forum/SuggestionBox.tsx` (labelled FR10) |
| **Evidence** | `src/rules/places.test.ts` + `src/services/places.service.test.ts` (submission creates the linked post); manual check (status shows on the post) |

---

## Non-functional requirements

### NFR01 — Privacy
> Location is used only while browsing and is never shared; personal data stays local.

| | |
| --- | --- |
| **How** | Device location is read only on demand, held in memory in `LocationProvider` (never persisted), and discarded on reload. All profile/favorite/submission data lives in `localStorage` only — there is no server or third-party call. |
| **Code** | `src/app/LocationProvider.tsx`; `src/services/storage.ts` (local only); the profile footer states this in the UI (`src/pages/ProfilePage.tsx`); `index.html` has no analytics/trackers |
| **Evidence** | Manual: DevTools → Network shows no external requests; profile footer note |

### NFR02 — Works on all devices
> Desktop and mobile layouts.

| | |
| --- | --- |
| **How** | Tailwind responsive utilities; the quest explorer toggles list ⇄ map; a bottom nav appears under `md`; forms are single-column with full-width controls. |
| **Code** | `src/components/layout/{AppShell,nav}.tsx`; responsive classes throughout `src/pages/*` and `src/components/*` |
| **Evidence** | Checked at **375 px** (iPhone SE) and **1280 px** (laptop): no horizontal scroll on `/map`, `/quests`, `/forum`, `/moderator`, `/profile`, `/places/new` (`scrollWidth === clientWidth`) |

### NFR03 — Kept up to date every 6 months
> The team reviews and refreshes the app twice a year.

| | |
| --- | --- |
| **How** | This is a process requirement, not code. The prototype supports it with a **versioned storage schema** (`STORAGE_SCHEMA_VERSION` + load-time validation in `src/services/storage.ts`) and an upgrade path that re-seeds on schema mismatch, so content can be refreshed without stale local data breaking the app. |
| **Code** | `src/services/storage.ts` — `STORAGE_SCHEMA_VERSION` (currently 3); `src/services/seed*.ts` |
| **Evidence** | Schema version shown in Dev tools › Data ("schema v*n*"); old payloads are validated and re-seeded |

### NFR04 — Maximum 12 place submissions per user per day
> A per-user daily cap on new place suggestions.

| | |
| --- | --- |
| **How** | Every accepted submission writes one row to a day ledger keyed by the Richmond day; the cap is checked before the duplicate check. |
| **Code** | `RULES.maxPlaceSubmissionsPerDay = 12` in `src/lib/constants.ts`; `src/rules/places.ts` — `countSubmissionsOn`, `submissionsRemaining`, `hasReachedDailyLimit`; `src/rules/time.ts` — `currentDayKey` (day rolls over at midnight Richmond time); `SubmissionLogEntry` in `src/services/places.types.ts` |
| **Evidence** | `src/rules/places.test.ts` — "daily submission limit (UC03 BR02 / NFR04 — 12 per day)" (13th is refused; allowance resets on the next day key); `src/services/places.service.test.ts`; Dev tools `Fill today's quota` |

### NFR05 — Web app using popular frameworks
> Built with widely used, supported web technologies.

| | |
| --- | --- |
| **How** | React 19 + TypeScript 5.6 + Vite 7 + Tailwind CSS 3 + React Router 7 + Leaflet 1.9 / react-leaflet 5 + Vitest 3. No bespoke frameworks. |
| **Code** | `package.json`, `vite.config.ts`, `tailwind.config.js`, `tsconfig*.json` |
| **Evidence** | `npm run build` succeeds; `npm test` runs on Vitest |

### NFR06 — Page load under 2 seconds
> Screens should feel instant on a normal connection.

| | |
| --- | --- |
| **How** | Client-side routing needs no round trips; the map stack (Leaflet ≈ 149 kB JS / 43 kB gzip + 15 kB CSS) and the pin picker are **lazy-loaded** into separate chunks, so they never block first paint of the list/forum/profile. Rendering is cheap: a seeded local store and `useSyncExternalStore` selectors. |
| **Code** | `src/components/map/LazyQuestMap.tsx` and `src/components/places/LazyPinPicker.tsx` (`React.lazy` + `Suspense`); production output in `dist/` |
| **Evidence** | `npm run build` output: initial `index-*.js` ≈ 426 kB raw / **125 kB gzip**, map chunk loaded on demand; measured cold load of the built app is well under 2 s locally |

---

## Mandated unit tests (Phase 4)

The brief asked specifically for unit tests of duplicate detection, the daily limit
and points-once. All three live in `src/rules/places.test.ts`, with the pipeline
behaviour asserted in `src/services/places.service.test.ts`:

| Mandated area | Tests |
| --- | --- |
| **Duplicate detection** (BR03 — same name within 50 m of an approved *or pending* place) | case/whitespace-insensitive matching; 50 m boundary in/out; rejected places never block; approved and pending both block |
| **Daily limit** (BR02 / NFR04 — 12 per day) | 12 accepted, 13th refused; counter and "remaining" maths; resets when the day key changes; per-user isolation |
| **Points-once** (BR05) | first approval awards, second approval does not; rejection awards none; submitter points change by exactly the place's points |

Full suite: **123 tests / 7 files, all passing** (`npm test`).

---

## Interpretations and deliberate changes

The SRS leaves some details open. These are the decisions the prototype makes; each
is reversible and isolated to the file named.

1. **Approval points are a fixed 25.** BR05 says the amount is administrator-defined
   but does not name a number, so `PLACE_APPROVAL_POINTS = 25` in
   `src/lib/constants.ts` is used for every approved place. Change it in one place and
   tests/UI follow.
2. **Duplicate names compare case- and whitespace-insensitively.** BR03 says "same
   name"; the prototype normalises (`normalizePlaceName`: trim, collapse spaces,
   lowercase) so "shiplock park" and "Shiplock  Park" collide. `src/rules/places.ts`.
3. **Rejected places never block a new suggestion.** BR03 only lists *approved or
   pending* places as blockers, so a previously rejected name within 50 m can be
   re-submitted. `findDuplicatePlace` skips `reviewStatus === 'rejected'`.
4. **Place categories reuse the quest categories.** UC03 defines a category field but
   not its list, so the prototype reuses `QUEST_CATEGORIES` (Outdoors, Parks, Art,
   History, Food & Drink, Landmarks) instead of inventing a second taxonomy.
5. **Forum categories are `spot-suggestions`, `general`, `help`.** FR01 requires
   categories and FR10 a suggestion section; those three cover both without adding
   screens the SRS does not describe.
6. **"Tomorrow" is simulated with a `dayOffset` knob.** Daily rules are keyed to the
   Richmond calendar day. So the 12/day limit and streak rollover are demonstrable in
   a 5-minute demo, Dev tools can advance the app's notion of "today" (`dayOffset`)
   without touching the system clock. `src/rules/time.ts`, `src/devtools/devActions.ts`.
7. **"Location denied" is a distinct status from "unavailable".** FR08 lists an
   "ask / granted / off" prompt; the prototype splits the failure into `denied`
   (permission blocked → tell the user to enable it) and `unavailable` (no fix →
   suggest retrying or dropping a pin), so E04 has a demonstrable path.
   `src/app/LocationProvider.tsx`, `src/pages/AddPlacePage.tsx`.
8. **A missing location falls back to the pin picker.** If location cannot be
   obtained, "Choose on Map" is the documented alternative; both produce the same
   `Coordinates` and the same validation result.
9. **Field-length limits come from the UC03/UC04 data descriptions** (name 50,
   category 20, address 100, description 250) and are enforced in the rules layer,
   not just the input `maxlength`.
10. **Points are credited to the submitter's record on approval**, and "points once"
    is enforced by the `pointsAwarded` flag plus the pending-only guard in
    `reviewPlace`, so a second approve/reject of the same place is refused with
    `already-reviewed`.
11. **Prototype scope:** no accounts/auth, no server, no real moderation e-mail. The
    seed users stand in for sign-in, and everything persists in `localStorage`
    (`STORAGE_SCHEMA_VERSION` re-seeds on mismatch). The Dev tools drawer is
    explicitly prototype-only UI.
12. **Concurrent feature lines were merged, not replaced.** The forum moderation
    stack (FR01), the admin console and the achievements work were developed in
    parallel with the place pipeline; shared files (`types.ts`, `storage.ts`,
    `seed.ts`, `constants.ts`, `App.tsx`, `ProfilePage.tsx`, `SuggestionBox.tsx`)
    were extended additively so both feature lines keep working. The full suite
    (123 tests) passes after the merge.

---

## Known gaps / out of scope

- No automated UI (component/e2e) tests — the suite covers pure rules and services.
  Screens were verified manually (see the demo script in `README.md`), including at
  375 px and 1280 px.
- NFR03 (6-month refresh) is a team process and is not testable in code; the versioned
  schema is the only code-level support.
- NFR06's 2-second budget is verified locally against the production build, not on a
  throttled network profile.
