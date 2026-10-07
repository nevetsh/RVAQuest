import { useState, type FormEvent } from 'react'
import { RoleBadge } from '../components/admin/RoleBadge'
import { Button } from '../components/ui/Button'
import { loginErrorMessage } from '../rules/auth'
import { signIn } from '../services/auth'
import { SEED_ACCOUNTS } from '../services/seed'
import { cn } from '../lib/cn'

/**
 * Phase 7 — the sign-in gate. `App` renders this instead of the routes while
 * `signedInUserId` is null, so no screen (Dev tools included) is reachable
 * without an account.
 *
 * The demo list names the seed accounts and fills the form when one is chosen,
 * but it does not print their passwords: those are demo data for whoever is
 * running the prototype (README), not something to hand to every visitor. The
 * values still ship inside the bundle — see VULN-006 in docs/security-review.md.
 */

const FIELD_CLASSES =
  'w-full rounded-xl border border-bark-200 bg-white px-3 py-2 text-sm text-bark-900 outline-none transition placeholder:text-bark-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (!username.trim() || !password) {
      setError('Enter your username and password.')
      return
    }

    const result = signIn(username, password)
    if (!result.ok) {
      setError(loginErrorMessage(result.error))
      return
    }

    // Signed in: the gate swaps this screen for the app on the next store
    // notification, so there is nothing to do here.
    setError(null)
  }

  return (
    <main className="flex min-h-full flex-col items-center justify-center bg-bark-50 px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
              <path d="M19 4c0 8-4.6 12-10.5 12H8C8 9.5 12.5 4 19 4Z" />
            </svg>
          </span>
          <span className="text-xl font-extrabold tracking-tight text-bark-900">
            RVA <span className="text-brand-700">Quest</span>
          </span>
        </div>

        <section className="rounded-2xl border border-bark-200 bg-white p-6 shadow-card">
          <h1 className="text-lg font-extrabold tracking-tight text-bark-900">Sign in</h1>
          <p className="mt-1 text-sm text-bark-500">
            Every screen — quests, the forum, suggestions and the Dev tools — needs an account.
          </p>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
            {error ? (
              <p
                id="signin-error"
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800"
              >
                {error}
              </p>
            ) : null}

            <div>
              <label
                htmlFor="signin-username"
                className="mb-1 block text-xs font-bold uppercase tracking-wide text-bark-500"
              >
                Username
              </label>
              <input
                id="signin-username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'signin-error' : undefined}
                className={cn(FIELD_CLASSES, error && 'border-red-300')}
              />
            </div>

            <div>
              <label
                htmlFor="signin-password"
                className="mb-1 block text-xs font-bold uppercase tracking-wide text-bark-500"
              >
                Password
              </label>
              <input
                id="signin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'signin-error' : undefined}
                className={cn(FIELD_CLASSES, error && 'border-red-300')}
              />
            </div>

            <Button type="submit" size="md" className="w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-4 text-[11px] text-bark-500">
            Forgot your password? In this prototype an administrator resets the data instead —
            accounts live only in this browser (NFR01).
          </p>
        </section>

        <section
          aria-labelledby="demo-accounts-heading"
          className="rounded-2xl border border-dashed border-bark-300 bg-white/70 p-4"
        >
          <h2 id="demo-accounts-heading" className="text-xs font-extrabold uppercase tracking-wide text-bark-500">
            Demo accounts (prototype only)
          </h2>
          <p className="mt-1 text-[11px] text-bark-500">
            A deployed build would check credentials on a server; here they are demo data. Pick an
            account and the form is filled in for you — the passwords themselves are in the
            project README, not on this screen.
          </p>

          <ul className="mt-3 grid gap-1.5">
            {SEED_ACCOUNTS.map((account) => (
              <li key={account.id}>
                <button
                  type="button"
                  onClick={() => {
                    setUsername(account.username)
                    setPassword(account.password)
                    setError(null)
                  }}
                  className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-bark-200 bg-white px-3 py-2 text-left transition hover:border-brand-400"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-bark-900">
                      {account.name}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-bark-500">
                      {account.username}
                    </span>
                  </span>
                  <RoleBadge role={account.role} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
