# RVA Quest — security review and hardening (Phase 8)

A security review of this app, its findings with reproducible proofs of concept, and the
fixes applied. Written with two installed agent skills as the method:
`getsentry/skills@security-review` (confidence-gated OWASP review) and
`addyosmani/agent-skills@security-and-hardening` (trust boundaries, STRIDE, the
always/ask/never tiers). The third installed skill,
`usestrix/strix@web-app-penetration-testing`, describes black-box testing with the Strix
CLI; Strix needs Docker and an LLM key, so its **method** was followed by hand — confirm
authorization and scope, attack the running app with real payloads, keep only
findings that have a working proof, then re-test after the fix.

**Scope.** This app, at its own dev server (`http://localhost:5199`) and its production
build served from `dist/`. It is the author's own application and no third-party system
was touched. The seeded demo accounts were used as the test credentials, and the browser
session was reset to the seed afterwards, so nothing tampered with survives.

**Method.** Source-assisted black-box: every finding below has a proof of concept that
was actually run, and every fix was re-tested through the same interface.

| ID | Finding | Severity | Status |
| --- | --- | --- | --- |
| VULN-001 | Credential digests unsalted, unstretched, 32-bit | High | **Fixed and verified** |
| VULN-002 | Banned-word filter bypassed with separators / zero-width characters | Medium | **Fixed and verified** |
| VULN-003 | No content security policy or security headers | Medium | **Fixed (build verified)** |
| VULN-004 | Authorization is client-side: session forgery and privilege escalation | Critical | **Accepted — inherent to a client-only app**, documented |
| VULN-005 | The audit log is client-writable, so it is not evidence | Medium | Accepted, documented |
| VULN-006 | Demo credentials ship in the bundle | Low | Accepted by design |
| VULN-007 | Stakeholder passwords were committed to a public repository | High | **Fixed in the tree** — history still holds them, passwords must not be reused |

---

## VULN-001 — Credential digests were unsalted, unstretched and 32-bit (High)

**Location** `src/rules/auth.ts` (`hashPassword`), used by `SEED_ACCOUNTS` and
`verifyCredentials`.

**Issue.** Passwords were stored as `FNV-1a("rva-quest:" + password)` in 8 hex digits.
Three flaws compound: no salt (so the digest is computable in advance and identical
passwords share a digest), no stretching (one pass per candidate), and only 32 bits of
output.

**Impact.** Anyone with the `localStorage` payload — a local user, a browser extension,
a synced profile, an exported JSON — recovers the passwords offline.

**Proof of concept.** Read the digest out of the stored state, then brute-force it
(the exact algorithm is in the shipped bundle):

```bash
node /tmp/crack.mjs a0878aa1      # -> {"target":"a0878aa1","found":"123","ms":62}
```

The weakest seeded password — a 3-character numeric default on a stakeholder account that
has since been deleted (VULN-007) — was recovered in **62 ms**. The five accounts seeded
with `rvaquest` also shared the single digest `9a0ba900`, so one crack would have opened
all of them.

**Fix.** `createPasswordHash` now writes `v2$<16-byte salt>$<64-bit digest>` with 10,000
stretching rounds over two mixed lanes, and `verifyPasswordHash` verifies both formats, so
an account seeded by an older build still signs in and is **upgraded on that sign-in**
(`signIn` re-hashes with the plaintext it has in hand only at that moment). New password
changes also write the salted format.

**Evidence.**
- Measured with a verbatim copy of the shipped function, which reproduces a real stored
  digest bit-for-bit (`copyReproducesStoredDigest: true` for
  `v2$885e34d0…$eea77765dbcc39e4` = `123`): **1.1–3.2 M candidates/s → 53–160
  candidates/s** (≈ 20,000×). The same 4-character exhaustive space went from **0.5 s** to
  **~8.8 h per account**, and per account is the point — the salt is unique.
- Live check after a reset: six accounts, **six distinct salts and six distinct
  digests**, including the five that share `rvaquest` (they were one digest before).
- Migration check: Jordan's stored digest was replaced with the legacy `9a0ba900`, then
  the account signed in through the UI; the stored value became
  `v2$b457f88f3caf0e32c3d5ed718b9ba900$fe6c0f7a7840c330`.
- `src/rules/auth.test.ts` — salted shape, salt uniqueness across 50 hashes, legacy
  verification and rehash flagging; `src/services/auth.test.ts` — the upgrade on sign-in.

**Residual risk.** This is not a key-derivation function. It removes the two flaws that
made v1 immediately reversible, but a real deployment must hash server-side with
bcrypt/argon2 and keep the digest out of the client entirely.

---

## VULN-002 — The banned-word filter was bypassed by separators (Medium)

**Location** `src/rules/forum.moderation.ts` (`matchesWord`, `findBannedWords`).

**Issue.** The matcher compared whole words against normalized copies of the text, so
anything placed *between* the letters walked past it. A single zero-width space
(`U+200B`) was enough.

**Impact.** The moderation control that FR01 depends on — posts are checked before they
are published — is not what the UI claims.

**Proof of concept.** In the compose form (`/forum/new`), publishing
`"Bypass probe: da<U+200B>mn steep"` / `"That h<U+200B>ell of a climb…"` **succeeded**
and created a post, while the plain spelling was correctly refused
(`blocked by the banned-word filter (damn)`).

**Fix.** The letters of a banned word must now appear in order with only
non-alphanumeric characters between them, which is still how a reader recognises the
word, while word boundaries are kept so `hell` does not fire inside `shell` or `hello`.
Because the leet folding and repeat collapsing run first, `D@mn`, `h3ll` and `daaaamn`
keep working.

**Evidence.** Re-testing the same payloads through the same form after the fix:
`/forum/new` stayed put with **"blocked by the banned-word filter (damn, hell)"**, and
the new tests reproduce it — `da<U+200B>mn`, `d.a.m.n`, `h<U+200B>ell`, `shut-up` and
`nobody<U+200B> cares` are all caught, while `a new shell for the hermit crab`,
`say hello to the ferry` and `the scrap paper bin` stay clean.

---

## VULN-003 — No content security policy or security headers (Medium)

**Location** `index.html` / the static build; `Caddyfile`.

**Issue.** The app shipped with no CSP and no headers, so an injected script or a
`javascript:` URL had nothing to stop it. It is also worth naming the counter-hypothesis:
React escapes by default and a repo-wide search found **no** `dangerouslySetInnerHTML`,
`innerHTML`, `eval` or `new Function`, so there is no known injection *sink* in the app
today. The policy is defence in depth for the day one is added, not a patch for a live
sink.

**Fix (verified).** A build-only Vite plugin injects
`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'
data: https://*.tile.openstreetmap.org; connect-src 'self'; font-src 'self'; object-src
'none'; base-uri 'none'; form-action 'none'` into the production HTML. It is injected at
build time on purpose: the dev server needs inline scripts for HMR, and a policy that has
to be disabled to develop is a policy nobody keeps. The real headers a meta tag cannot
express (HSTS, `frame-ancestors`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`) are in
`Caddyfile` for deployments behind Caddy.

**Evidence.** `npm run build` plus `vite preview` on the built output: the meta tag is
present, the app signs in, `/map` renders **4 of 4** OpenStreetMap tiles (the `img-src`
allowance is correct and not a wildcard), and the console is empty — no CSP violations,
no errors.

**Limitation.** On a static host where response headers cannot be set, only the meta
policy applies; HSTS and `frame-ancestors` need the server. The Caddyfile is written but
**not executed here** (Caddy is not installed in this environment and this curl has no
HTTP/3 build) — it is configuration, not a verified control.

---

## VULN-004 — Authorization is client-side: session forgery and privilege escalation (Critical, accepted)

**Location** the whole account model: `src/services/storage.ts` (state in
`localStorage`), `src/services/auth.ts`, `src/rules/permissions.ts`,
`src/pages/AdminPage.tsx`.

**Issue.** Every authorization decision reads the same client-writable store. The app is
a browser-only prototype with no server, so it cannot distinguish a state it wrote from a
state an attacker wrote.

**Impact.** A user can grant themselves any role with no credential at all.

**Proofs of concept** (all run in the browser as an ordinary explorer, Jordan Reyes):

1. **Privilege escalation.** Editing one JSON field —
   `users[jordan].role = 'admin'` — and reloading opened the full Admin & Manager console
   that `/admin` had just refused ("You do not have access to the console"), including
   the account-management desk.
2. **Session forgery.** Setting `signedInUserId: 'admin'` signs the browser in as an
   administrator with no password — the gate only decides what the *UI* shows.
3. **Live state handle.** A dev build exposes `window.__rvaQuest.setState` (Vite's
   `import.meta.env.DEV`, so it is tree-shaken out of production), which writes any state
   directly.

Related and unchanged: suspending an account blocks its next sign-in
(`verifyCredentials`) but does not end a session it already has open.

**Why it is accepted rather than fixed.** There is no client-only fix: any check the app
performs, an attacker with the same store can satisfy. Centralising the checks in
`src/rules/permissions.ts` (which the app already does — hiding a tab is never the only
control) does not change that. A deployed version must move authentication and
authorization behind a server: the client sends a password, the server verifies it,
issues an `httpOnly` cookie, and re-checks the role on every request. The prototype's job
is to demonstrate the requirement, and `docs/traceability.md` (interpretations 14 and 16)
says so in the same words as this report.

---

## VULN-005 — The audit log is not evidence (Medium, accepted)

The Activity log lives in the same writable payload, so an actor can delete their entry,
rewrite its summary, or forge one for somebody else. It is a demo artefact that shows what
*an* admin console does, not an audit trail. A real one is append-only and server-side,
and the client never writes to it directly (the services do, with the actor taken from the
session).

---

## VULN-006 — Demo credentials ship in the bundle (Low, accepted)

`SEED_ACCOUNTS` includes plaintext prototype passwords, and they are in `dist/` because
the seed is. The gate's demo list names each account and fills the form without printing
the password, and the only credential written down in `README.md` is the throwaway test
account (`admin` / `admin`, added for exactly this purpose) — a value nobody is protecting.
That is presentation, not a fix: the one-click sign-in needs the plaintext in the bundle,
so a reader of the built JavaScript can still recover the demo passwords, and one of them
is now shared by five accounts. It must not survive contact with a real deployment: secrets
belong in server-side configuration, never in the bundle, and a shipped build should not
seed accounts at all.

---

## VULN-007 — Stakeholder passwords were committed to the repository (High, fixed in the tree)

**Location** `SEED_ACCOUNTS` in `src/services/seed.ts`, and the account table in
`README.md`.

**Issue.** Two stakeholder accounts were seeded for the walkthrough with their plaintext
passwords in the seed, and both were repeated in the README. This repository is public, so
those credentials were published: one real person's account password, and one 3-character
numeric default that was seeded on purpose at the stakeholder's request.

**Impact.** Anyone who read the repository had working credentials for an administrator
account — and seeded as administrator, that account can manage users, quests, content and
settings. The exposure is not confined to this app: a password reused on any other service
is compromised too, and that part cannot be repaired from inside this repository.

**Fix.** Both accounts were deleted from the seed and the passwords are written down
nowhere in the tree. They are replaced by a single deliberate test account (`admin`, whose
password is its own username) that exists only to drive the prototype, and
`STORAGE_SCHEMA_VERSION` was bumped to 6 so a browser still holding a v5 payload re-seeds
instead of keeping the deleted accounts as working sign-ins — a deleted seed entry is not
enough on its own. A test in `src/rules/auth.test.ts` pins the seeded roster, so an account
added back fails the suite.

**Residual risk — the part that matters.** Deleting the lines does **not** un-publish them.
They live on in this repository's git history, and in every clone, fork and cached page
that already has them: the fix removes the credentials from the current tree, not from the
world. Two consequences, neither of which can be handled from here. First, **both
passwords must be treated as compromised and must never be reused for a real account** —
rotating them is the only true remediation. Second, if the history itself must be cleaned,
that means rewriting history (`git filter-repo`) *and* rotating the credentials; rewriting
alone is not enough, because copies may already exist elsewhere.

**Evidence.** `git log -S` finds the removed account in earlier commits and in none of the
current files; the working tree contains neither its username nor its password (checked
with a repository-wide search), the sign-in screen has never printed a password, and the
seed roster test passes.

---

## How the skill checklists map onto this app

| Control the skills require | Status here |
| --- | --- |
| Validate input at the boundary | Done — `src/rules/places.ts`, `src/rules/forum.moderation.ts`, field lengths from the UC data descriptions |
| Encode output / no raw HTML | Done — React auto-escaping; no `dangerouslySetInnerHTML` anywhere |
| Hash passwords with bcrypt/scrypt/argon2 | **Impossible client-side** — salted + stretched digest instead (VULN-001), server-side KDF required for real |
| Session in an `httpOnly`, `secure`, `sameSite` cookie | **Impossible client-side** — no cookies, no server (VULN-004) |
| Authorization on every protected action | Present in the rules layer, **unenforceable** without a server (VULN-004) |
| Security headers / CSP | Added — build-time meta plus Caddyfile headers (VULN-003) |
| Rate limiting on auth endpoints (~10/15 min) | **Deliberately absent** — an in-memory client limiter is bypassed by clearing storage, so it would be security theatre; a server must own this |
| No secrets in the bundle | Violated by design (VULN-006) |
| No credentials in version control | **Was violated** — two stakeholder passwords were committed and are still in the git history (VULN-007). Removed from the tree; those accounts no longer exist, and both passwords must be considered burned |
| Dependency audit against the lockfile | Not run in this environment (no network install step performed); the tree is React + Vite + Leaflet with a committed lockfile |
| Generic error copy (no account enumeration) | Done — unknown username and wrong password share one message, and suspension is checked only after the password matches |
| Audit logging of security events | Demo-only and client-writable (VULN-005) |

---

## Needs verification

- **Stretched letters are still missed.** `heeeeell` collapses to `hel` before matching, so
  it never trips `hell`. This is pre-existing behaviour that the separator fix does not
  change; catching it needs a bounded-repeat pattern (`l{2,}` aware matching) and a
  false-positive pass, which is a bigger change than this review should smuggle in.
- **`randomSalt` fallback.** If `crypto.getRandomValues` were missing, the salt falls back
  to `Math.random`. It is unreachable on supported platforms (browsers, Node 20+), but it
  is a weakened path rather than a hard failure.
- **`frame-ancestors` in a meta tag is ignored.** Clickjacking protection therefore relies
  on the Caddyfile header, which is unverified here.
- **CSP `style-src 'unsafe-inline'`** is required by Leaflet's inline positioning styles.
  Removing it means measuring which styles Leaflet needs; not attempted.

---

## Re-running the proofs

```bash
# 1. the offline recovery (VULN-001): put the algorithm in /tmp/crack.mjs as in the proof,
#    read a digest from the store, and time it
node /tmp/crack.mjs <digest>

# 2. the filter (VULN-002): /forum/new, General, publish a title/body containing
#    "da<U+200B>mn" — refused after the fix, published before it

# 3. the CSP (VULN-003): npm run build && npx vite preview --port 5200
#    then check the meta tag, sign in, open /map, and read the console

# 4. the escalation (VULN-004), any browser, signed in as an explorer:
#    localStorage['rva-quest:state'] -> users[<self>].role = 'admin' -> reload -> /admin

# and the regression suite for the two patches
npm test        # src/rules/auth.test.ts, src/services/auth.test.ts, src/rules/forum.moderation.test.ts
```
