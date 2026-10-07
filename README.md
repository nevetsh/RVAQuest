# RVA Quest

**Find outdoor quests around Richmond, check in, earn points and badges, and suggest new
spots for other people to discover.**

RVA Quest is a web app prototype built for CMSC 355. You sign in, browse a map of local
quests — Belle Isle Loop, Hollywood Cemetery, the murals on West Cary — check in at the
daily spot, and collect points, streaks and badges. There is a moderated forum where you
can share an achievement, and if you know a spot that is missing, you suggest it and a
moderator reviews it before it appears for everyone.

Everything runs in your browser: no account signup, no server, no tracking.

Already know how to run a JavaScript project? [Start it in two minutes](#start-it-in-two-minutes).
Just want the tour? [See what you can do](#what-you-can-do).

**Contents** ·
[Start it](#start-it-in-two-minutes) ·
[Sign in](#signing-in) ·
[The tour](#what-you-can-do) ·
[Dev tools](#dev-tools-the-demo-remote-control) ·
[Demo script](#presenters-five-minute-script) ·
[Developers](#for-developers) ·
[Security](#security-notes)

---

## Start it in two minutes

You need **Node.js 20 or newer** and **npm 10 or newer**.

```bash
cd rva-quest
npm install
npm run dev
```

Vite prints a local address (usually <http://localhost:5173>). Open it in a browser and
you land on the sign-in screen.

Anything you do — favourites, check-ins, places you suggest, password changes — is saved
in that one browser. Nothing leaves your machine, and a different browser or a cleared
cache starts fresh from the demo data.

## Signing in

There is no signup: every screen is behind the sign-in gate. The gate lists the demo
accounts (names, usernames and roles) and fills the form in when you click one — the
passwords themselves are only here in the README, never on the sign-in screen.

| Who | Username | Password | They can |
| --- | --- | --- | --- |
| Steven Huynh | `nevetsh` | `Hollyduck123!` | everything — admin console included |
| Eilish Dangal | `dangle` | `123` | everything — admin console included |
| Alex Chen | `alex` | `rvaquest` | everything — admin console included |
| Dana Whitfield | `dana` | `rvaquest` | review suggested places and moderate the forum |
| Morgan Ellis | `morgan` | `rvaquest` | review places, quests and content |
| Jordan Reyes | `jordan` | `rvaquest` | browse, check in, post, suggest places |
| Casey Nguyen | `casey` | `rvaquest` | browse, check in, post, suggest places |

Pick **Steven Huynh** if you just want to see everything. Sign out any time with the icon
next to your name in the header. To look at the app as a regular explorer, use Jordan.

> These passwords are demo data, kept in this file rather than on the sign-in screen. They
> are not stored as plain text (they are salted and stretched — see
> [docs/security-review.md](docs/security-review.md)), but this is a prototype: a real
> deployment would check credentials on a server. Note the honest limit — the one-click
> demo sign-in needs those passwords in the bundle, so a reader of the built JavaScript
> can still find them (VULN-006 in that report).
>
> You can change your own password under **Profile → Password**. There is no
> "forgot my password" flow — in a prototype with no email, an administrator resets the
> demo data instead.

## What you can do

**Explore quests** — `/quests` lists them, `/map` shows them as pins. Tap **Enable
Location** and they sort by how close you are; we only use your location while you are
browsing, never save it, and never send it anywhere.

**Check in at the daily spot** — open the quest marked *Today's daily spot* and check in
while you are within 100 m of it. Your day streak grows on your profile.

**Earn points, streaks and badges** — every quest pays points when you complete it, and
badges unlock as you go. On your profile you can share an earned badge to the forum in one
click.

**Save quests for later** — the heart on a quest page fills your **Saved quests** list.

**Suggest a new place** — two ways in, one process: the **Add a Place** button on the map,
or **Forum → Spot Suggestions → New Spot Suggestion**. Drop a pin (or use your current
location), describe the spot, and submit. It goes to the moderator queue, not straight
onto the map. You can **edit** or **withdraw** your suggestion any time before a moderator
decides — neither costs you another of your 12 daily submissions.

**Talk to people** — the forum has categories, search, likes, comments and reports. Posts
are screened before they are published, and moderators can pin threads, remove content and
work the report queue.

**Review suggestions (moderators)** — `/moderator` shows what is waiting. Approve a place
and it appears on the map, with points paid to the submitter exactly once. Reject it with
a reason and the submitter sees why on their profile and on the forum post.

**Manage the whole thing (administrators)** — `/admin` covers accounts, quests, content,
settings and an activity log of what managers and admins did.

### What the demo data contains

Four suggested places show the whole lifecycle: **Great Shiplock Park** and **Scuffletown
Park** are approved and already on the map, **Fonticello Park** is waiting for review, and
**Jefferson Park** was rejected. Twelve quests, a seeded forum with three open reports,
and one pending quest approval are there so every screen has something real on it.

## Dev tools (the demo remote control)

The **Dev tools** button in the bottom-right is a prototype extra, not part of the product
UI. It exists so you can see the rules work without walking around Richmond:

- **Location** — pretend to stand downtown, on Belle Isle, at Maymont, in Carytown, or far
  away in Petersburg; use real GPS; clear it; or simulate "location denied" to see that
  path.
- **Day & limits** — jump to tomorrow (so a streak or the daily limit rolls over), reset
  today's submission ledger, or fill the whole 12-a-day quota in one click.
- **User & role** — switch to any account without typing a password, or sign out.
- **Data** — reset everything back to the demo data.

Two more demo helpers live there: **Start demo scenario** sets everything up for the
five-minute script below, and the checklist it shows ticks itself off as you go.

## Presenter's five-minute script

Start from a clean copy: **Dev tools → Reset all data**. Requirement codes (FR/NFR/BR/E)
come from the course SRS and are mapped to code in
[docs/traceability.md](docs/traceability.md).

**0:00 — 0:30 · Sign in, then explain the app and data (FR02, FR08, NFR02)**
Open the app: the sign-in gate appears. Sign in as **Steven Huynh** (`nevetsh` /
`Hollyduck123!`, Administrator) from the demo account list — say the line: *every screen,
Dev tools included, needs an account.* Then open `/map`. Quests appear as green pins;
approved user places appear as amber diamonds. Click **Enable Location** — real GPS is
used if the browser grants it ("we only use it while you browse", NFR01). Widen/narrow the
window to show the layout adapts (list ⇄ map, bottom nav under 768 px).

**0:30 — 1:15 · Both entry points into the SAME pipeline (FR10, FR09)**
1. On `/map`, click **Add a Place** (top-right of the map).
2. Note the URL `/places/new?from=map` and the counter
   **"Submissions left today: 12 of 12"**.
3. Go back, open **Forum › Spot Suggestions**. The pinned **Suggestion box** has a
   **New Spot Suggestion** button → same form at `/places/new?from=forum`.
   Say the line: *one pipeline, two entry points, identical rules.*

**1:15 — 2:00 · Guard rails, all four error paths (E01–E04)**
1. **E01 invalid input** — submit the empty form. The alert appears and focus moves to it;
   each bad field is outlined and has an inline message. Fill the name only and submit
   again to show mandatory-field handling.
2. **E03 duplicate** — name it **Scuffletown Park** and put the pin downtown (Dev tools ›
   Downtown/Capitol, or type the coords in the pin picker). Submitting shows *"…is already
   suggested within 50 m of this location."*
3. **E02 daily limit** — Dev tools › **Fill today's quota**. The counter now reads **0 of
   12** and the page shows the limit banner; submitting shows the daily-limit message.
   (Dev tools › **Reset daily limits** to undo.)
4. **E04 location unavailable** — Dev tools › **Deny location**, then press **Use My
   Current Location**. The form reports that location access is blocked and points at
   **Choose on Map** instead.

**2:00 — 2:45 · Happy path + confirmation (FR05, BR04)**
Fill a valid new place — name, category, optional address/description — then **Choose on
Map** to drop the pin (or **Use My Current Location**). Submit. The confirmation screen
shows the place is **Pending review**, hidden from the map until approved, will pay **25
pts once**, and links to its forum post. Open the post: it already shows the **Pending
review** badge.

**2:45 — 3:15 · Change your mind before review (owner controls)**
Back on `/profile`, the pending row has **Edit** and **Withdraw**. Open **Edit** — the same
form, pre-filled, with no new submission used. Change the name and **Save changes**: the
confirmation says the suggestion was updated, and the forum post's title and text follow
it. **Withdraw** asks once inline; confirming takes the suggestion out of the moderator
queue (its post stays up, marked **Withdrawn**). Both actions stop the moment a moderator
decides.

**3:15 — 3:45 · Moderator queue (FR09, BR05)**
Dev tools › switch to **Dana Whitfield (Moderator)**. The **Manage → Moderation queue**
screen (or `/moderator`) lists the pending suggestion, flagged **Edited *n* time(s) since
it was filed** when the submitter changed it. Approve it — the banner confirms points were
paid, and the place now shows on `/map` as an amber diamond. Dev tools › switch to the
submitter: their profile **My submissions** shows **Approved · +25 pts** and their total
went up once. Approve again (from Recently reviewed) to prove points are awarded **once**.

**3:45 — 4:20 · Rejection path (BR05)**
As the submitter, suggest another place, then switch back to Dana and **Reject** it with a
reason. The submitter's points are unchanged; their **My submissions** shows **Rejected**
and the reason; the forum post shows **Rejected** and **Moderator note: …**.

**4:20 — 5:00 · Profile, accessibility, responsiveness (FR03, FR06, FR07, NFR02)**
Open `/profile`: points total, day streak, badges (earned vs in progress, each earned badge
has **Share to forum**), saved quests (FR06), and **My submissions** with every status
(including any you withdrew). Press **Tab** from the top of the page to show the **Skip to
main content** link, and **Escape** to close the pin picker / Dev tools dialog. Resize to
**375 px** and **1280 px** to show both layouts, then wrap up with `npm test`
(235 passing).

---

## For developers

```bash
npm run dev         # dev server with hot reload
npm test            # the full Vitest suite, once
npm run test:watch  # re-runs on change
npm run typecheck   # TypeScript, no emit
npm run build       # production build into dist/
npm run preview     # serve the production build (HTTP over TCP)
npm run serve:h3    # serve dist/ over HTTP/3 (QUIC on UDP) with Caddy
```

**Stack:** React 19 + TypeScript 5.6, Vite 7, Tailwind CSS 3, React Router 7, Leaflet /
react-leaflet for the map, Vitest 3 for tests. No bespoke frameworks.

### Tests

The suite covers the pure rule modules, the place services, and the gates and screens a
user actually touches: **235 tests in 14 files**, all passing.

| Test file | Area | Tests |
| --- | --- | --- |
| `src/rules/geo.test.ts` | distance / radius helpers | 12 |
| `src/rules/permissions.test.ts` | role permissions | 15 |
| `src/rules/quests.test.ts` | quest visibility & check-in rules | 22 |
| `src/rules/places.test.ts` | UC03 rules: validation, 50 m duplicates, 12/day limit, points-once, edit/withdraw, live duplicate hint | 38 |
| `src/rules/achievements.test.ts` | badge awarding (FR03/FR04) | 5 |
| `src/rules/forum.moderation.test.ts` | banned words (incl. separator bypasses), likes, reports, moderation | 43 |
| `src/rules/auth.test.ts` | sign-in rules: salted digests, account lookup, seeded accounts, password change | 30 |
| `src/services/auth.test.ts` | the session: sign in/out, demo switch, reset, password change, digest upgrade | 18 |
| `src/services/places.service.test.ts` | submission pipeline end to end (FR05/FR09/FR10) | 21 |
| `src/pages/AddPlacePage.dom.test.tsx` | the submission form in jsdom: error paths, 12/day, duplicates | 10 |
| `src/pages/ModeratorQueuePage.dom.test.tsx` | approve / reject / owner withdraws mid-review | 8 |
| `src/pages/LoginPage.dom.test.tsx` | the sign-in gate in jsdom: bad credentials, admin sign-in, demo autofill | 6 |
| `src/App.dom.test.tsx` | the gate at the routing level: deep links blocked, sign-out, no Dev tools | 3 |
| `src/pages/ProfilePage.dom.test.tsx` | the profile password form in jsdom: wrong current, mismatch, reuse | 4 |
| **Total** | | **235** |

Rules and services run in plain Node; component tests opt into jsdom with a
`// @vitest-environment jsdom` header so they stay off the fast path.

### Where things live

```
src/
  rules/         pure business rules (no UI, no storage) — unit-tested
    places.ts      UC03: validate place, 50 m duplicate, 12/day, approve/reject
    geo.ts         haversine distance + radius checks
    quests.ts      quest visibility, daily check-in
    achievements.ts badges
    forum.moderation.ts  banned words, likes, reports
    auth.ts        sign-in: credential digest + account lookup (Phase 7)
    time.ts        Richmond day keys (day rollover)
  services/      state + persistence
    types.ts       AppState shape
    places.types.ts Place / ForumPost / SubmissionLogEntry
    places.service.ts  the single place pipeline
    auth.ts        the sign-in session (Phase 7)
    storage.ts     localStorage load/save + schema versioning
    seed*.ts       demo data (including the demo accounts)
    store.ts       tiny observable store (useSyncExternalStore)
  components/    presentational components (ui/, map/, places/, forum/, profile/, layout/)
  pages/         one file per route (LoginPage is the sign-in gate)
  devtools/      prototype-only drawer (fakes GPS, day offset, limits, roles)
docs/
  traceability.md    FR01–FR10 / NFR01–NFR06 mapping + interpretations
  security-review.md security findings, proofs of concept, fixes, residual risk
```

### Accessibility & responsiveness

- Every input has a real `<label htmlFor>`; required fields are marked visually and with
  `aria-required`. Invalid fields get `aria-invalid` + `aria-describedby` and a text
  message — never colour alone.
- Errors are announced with `role="alert"`; async states (locating, submitting,
  confirmation) use `role="status"`.
- A "Skip to main content" link is the first focusable element; `<main>` is the
  `tabIndex={-1}` target.
- Dialogs (pin picker, Dev tools) trap focus, close on **Escape**, and restore focus.
- Checked at **375 px** and **1280 px**: no horizontal scroll on any route.

### Security notes

This is a **client-only prototype**, so the account model, the roles and every
authorization check live in `localStorage`. Anyone with the browser can forge a session or
promote themselves to admin; that is a property of having no server, not a bug that can be
patched here, and it is written down rather than hidden.

A security review found and fixed three things, each with a reproducible proof of concept
in [docs/security-review.md](docs/security-review.md): unsalted credential digests (now
salted, stretched, and upgraded automatically on the next sign-in), a moderation-filter
bypass using zero-width characters, and a missing content security policy (injected at
build time, and set as real headers in the [`Caddyfile`](Caddyfile)). The same report lists
the risks that are accepted and the controls that need a server.

### Hosting

The build in `dist/` is a plain static single-page app: `dist/index.html` plus the hashed
assets under `dist/assets/`. Anything that can serve files will do — `npm run preview`, a
static host, or a CDN. There is no server code.

**Over UDP (HTTP/3).** A browser cannot fetch a page over raw UDP: it speaks HTTP over TCP
(HTTP/1.1, HTTP/2) or **QUIC on UDP — HTTP/3**. So hosting this app "over UDP" means
serving the same `dist/` with HTTP/3 enabled, which the browser then prefers automatically:

- **Caddy** — the [`Caddyfile`](Caddyfile) in this repo serves `dist/`, falls back to
  `index.html` for client-side routes, and sets `protocols h3 h2`. After `npm run build`,
  run `npm run serve:h3` and open <https://localhost:8443>. HTTP/3 requires TLS, so Caddy
  signs with its own local CA and the browser asks you to trust it once. Check the UDP path
  with an HTTP/3-capable curl: `curl --http3-only -k https://localhost:8443/`.
- **A CDN or edge host** — Cloudflare, Fastly and friends terminate HTTP/3 (UDP) for you
  with no change to this repo; you only upload `dist/`.

If instead you want a service that listens on UDP directly, that is a different program,
not this web app: browsers can only reach it through HTTP/3 or a WebTransport client, so it
would need its own client rather than a URL.

---

See [docs/traceability.md](docs/traceability.md) for the requirement-to-code mapping and
the list of interpretations and deliberate changes.
