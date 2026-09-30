# RVA Quest

A front-end prototype of **RVA Quest**, a Richmond (VA) outdoor-quest web app built for
CMSC 355. Explorers browse and save local outdoor quests on a map, check in at the daily
spot, earn points, streaks and badges, and share achievements in a moderated forum.
Anyone can **suggest a new place**, and a **moderator** reviews it before it appears on
the map.

There is **no backend**. All data lives in the browser's `localStorage` behind a small
observable store, so the whole app runs from a single `npm run dev`.

---

## Prerequisites

- Node.js 20 or newer (developed and tested on Node 26)
- npm 10 or newer (tested on npm 11)

## Install

```bash
cd rva-quest
npm install
```

## Run

```bash
npm run dev
```

Vite prints a local URL (default <http://localhost:5173>). Open it in a desktop browser.
The app is a single-page app; every screen is client-side routed.

## Test

```bash
npm test          # vitest run — the full suite, once
npm run test:watch  # re-runs on change while developing
```

The suite covers the pure rule modules, the place services, and the two heaviest
screens. Current status:

| Test file | Area | Tests |
| --- | --- | --- |
| `src/rules/geo.test.ts` | distance / radius helpers | 12 |
| `src/rules/permissions.test.ts` | role permissions | 15 |
| `src/rules/quests.test.ts` | quest visibility & check-in rules | 22 |
| `src/rules/places.test.ts` | **UC03 rules: validation, 50 m duplicates, 12/day limit, points-once, edit/withdraw, live duplicate hint** | 38 |
| `src/rules/achievements.test.ts` | badge awarding (FR03/FR04) | 5 |
| `src/rules/forum.moderation.test.ts` | banned words, likes, reports, moderation | 41 |
| `src/services/places.service.test.ts` | **submission pipeline end-to-end (FR05/FR09/FR10)** | 21 |
| `src/pages/AddPlacePage.dom.test.tsx` | the submission form in jsdom: error paths, 12/day, duplicates | 10 |
| `src/pages/ModeratorQueuePage.dom.test.tsx` | approve / reject / owner-withdrawals mid-review | 8 |
| **Total** | | **172** |

Rules and services run in plain Node; component tests opt into jsdom with a
`// @vitest-environment jsdom` header so they stay off the fast path.

## Other commands

```bash
npm run typecheck   # TypeScript, no emit
npm run build       # production build into dist/
npm run preview     # serve the production build
```

---

## Project layout

```
src/
  rules/         pure business rules (no UI, no storage) — unit-tested
    places.ts      UC03: validate place, 50 m duplicate, 12/day, approve/reject
    geo.ts         haversine distance + radius checks
    quests.ts      quest visibility, daily check-in
    achievements.ts badges
    forum.moderation.ts  banned words, likes, reports
    time.ts        Richmond day keys (day rollover)
  services/      state + persistence
    types.ts       AppState shape
    places.types.ts Place / ForumPost / SubmissionLogEntry
    places.service.ts  the single place pipeline
    storage.ts     localStorage load/save + schema versioning
    seed*.ts       demo data
    store.ts       tiny observable store (useSyncExternalStore)
  components/    presentational components (ui/, map/, places/, forum/, profile/, layout/)
  pages/         one file per route
  devtools/      prototype-only drawer (fakes GPS, day offset, limits, roles)
docs/
  traceability.md  FR01–FR10 / NFR01–NFR06 mapping + interpretations
```

---

## Demo data & accounts

Seed users (switch any time from **Dev tools › User & role**):

| User | Role | Points | Streak |
| --- | --- | --- | --- |
| Alex Chen | Administrator | 600 | 4 |
| Dana Whitfield | **Moderator** | 480 | 7 |
| Morgan Ellis | Manager | 320 | 2 |
| Jordan Reyes | Explorer | 240 | 3 |
| Casey Nguyen | Explorer | 120 | 1 |

Seed places: **Great Shiplock Park** and **Scuffletown Park** (approved, on the map),
**Fonticello Park** (pending review), **Jefferson Park** (rejected).

**Dev tools** is the floating button at the bottom-right (labelled "Dev tools"). It is
prototype-only and is not part of the product UI. It gives you:

- **Location** — preset GPS fixes (Downtown/Capitol, Belle Isle, Maymont, Carytown,
  Far away/Petersburg), `Use real GPS`, `Clear simulated`, and `Deny location`.
- **Day & limits** — `Jump to tomorrow`, `Reset daily limits`, `Fill today's quota`
  (logs 12 submissions so the daily-limit error is reachable in one click).
- **User & role** — switch between the five seed users.
- **Data** — `Reset all data` (wipes local changes and reloads the seed).

---

## 5-minute demo script

Everything below happens in the running app. Start from the seed state
(**Dev tools › Reset all data** first if you have been exploring).

**0:00 — 0:30 · Explainer app and data (FR02, FR08, NFR02)**
Open `/map`. Quests appear as green pins; approved user places appear as amber
diamonds. Click **Enable Location** — real GPS is used if the browser grants it
("we only use it while you browse", NFR01). Widen/narrow the window to show the
layout adapts (list ⇄ map, bottom nav under 768 px).

**0:30 — 1:15 · Both entry points into the SAME pipeline (FR10, FR09)**
1. On `/map`, click **Add a Place** (top-right of the map).
2. Note the URL `/places/new?from=map` and the counter
   **"Submissions left today: 12 of 12"**.
3. Go back, open **Forum › Spot Suggestions**. The pinned **Suggestion box** has a
   **New Spot Suggestion** button → same form at `/places/new?from=forum`.
   Say the line: *one pipeline, two entry points, identical rules.*

**1:15 — 2:00 · Guard rails, all four error paths (E01–E04)**
1. **E01 invalid input** — submit the empty form. The alert appears and focus moves
   to it; each bad field is outlined and has an inline message. Fill the name only
   and submit again to show mandatory-field handling.
2. **E03 duplicate** — name it **Scuffletown Park** and put the pin downtown
   (Dev tools › Downtown/Capitol, or type the coords in the pin picker). Submitting
   shows *"…is already suggested within 50 m of this location."*
3. **E02 daily limit** — Dev tools › **Fill today's quota**. The counter now reads
   **0 of 12** and the submit button's page shows the limit banner; submitting shows
   the daily-limit message. (Dev tools › **Reset daily limits** to undo.)
4. **E04 location unavailable** — Dev tools › **Deny location**, then press
   **Use My Current Location**. The form reports that location access is blocked and
   points at **Choose on Map** instead.

**2:00 — 2:45 · Happy path + confirmation (FR05, BR04)**
Fill a valid new place — name, category, optional address/description, then
**Choose on Map** to drop the pin (or **Use My Current Location**). Submit.
The confirmation screen shows the place is **Pending review**, hidden from the map
until approved, will pay **25 pts once**, and links to its forum post. Open the post:
it already shows the **Pending review** badge.

**2:45 — 3:15 · Change your mind before review (owner controls)**
Back on `/profile`, the pending row has **Edit** and **Withdraw**. Open **Edit** — the
same form, pre-filled, with no new submission used. Change the name and **Save
changes**: the confirmation says the suggestion was updated, and the forum post's
title and text follow it. **Withdraw** asks once inline; confirming takes the
suggestion out of the moderator queue (its post stays up, marked **Withdrawn**).
Both actions stop the moment a moderator decides.

**3:15 — 3:45 · Moderator queue (FR09, BR05)**
Dev tools › switch to **Dana Whitfield (Moderator)**. The **Manage → Moderation queue**
screen (or `/moderator`) lists the pending suggestion, flagged **Edited *n* time(s)
since it was filed** when the submitter changed it. Approve it — the banner
confirms points were paid, and the place now shows on `/map` as an amber diamond.
Dev tools › switch to the submitter: their profile **My submissions** shows
**Approved · +25 pts** and their total went up once. Approve again (from Recently
reviewed) to prove points are awarded **once**.

**3:45 — 4:20 · Rejection path (BR05)**
As the submitter, suggest another place, then switch back to Dana and **Reject** it
with a reason. The submitter's points are unchanged; their **My submissions** shows
**Rejected** and the reason; the forum post shows **Rejected** and
**Moderator note: …**.

**4:20 — 5:00 · Profile, accessibility, responsiveness (FR03, FR06, FR07, NFR02)**
Open `/profile`: points total, day streak, badges (earned vs in progress, each earned
badge has **Share to forum**), saved quests (FR06), and **My submissions**with every status (including any you withdrew). Press **Tab** from the top of the page
to show the **Skip to main content** link, and **Escape** to close the pin picker / Dev
tools dialog. Resize to **375 px** and **1280 px** to show both layouts, then wrap up
with `npm test` (172 passing).

---

## Accessibility & responsiveness (NFR02)

- Every input has a real `<label htmlFor>`; required fields are marked visually and
  with `aria-required`. Invalid fields get `aria-invalid` + `aria-describedby` and a
  text message (never colour alone).
- Errors are announced via `role="alert"`; async states (locating, submitting,
  confirmation) use `role="status"`.
- A "Skip to main content" link is the first focusable element; `<main>` is
  `tabIndex={-1}` target.
- Dialogs (pin picker, Dev tools) trap focus, close on **Escape**, and restore focus.
- Checked at **375 px** and **1280 px**; no horizontal scroll on any route.

See [docs/traceability.md](docs/traceability.md) for the requirement-to-code mapping
and the list of interpretations and deliberate changes.
