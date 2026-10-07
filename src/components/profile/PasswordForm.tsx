import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { passwordChangeErrorMessage } from '../../rules/auth'
import { changePassword } from '../../services/auth'
import { useCurrentUser } from '../../hooks/useAppState'
import { cn } from '../../lib/cn'

/**
 * Phase 7 — a signed-in user rotates their own password.
 *
 * Every check and every message comes from `src/rules/auth.ts`, so a wrong
 * current password reads exactly like a failed sign-in and the form cannot
 * drift from the gate's copy. Only the signed-in account's own record is
 * written; the session stays open.
 */

const FIELD_CLASSES =
  'w-full rounded-xl border border-bark-200 bg-white px-3 py-2 text-sm text-bark-900 outline-none transition placeholder:text-bark-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200'

export function PasswordForm() {
  const user = useCurrentUser()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    const result = changePassword(currentPassword, newPassword, confirmation)
    if (!result.ok) {
      setError(passwordChangeErrorMessage(result.error))
      setSaved(false)
      return
    }

    setError(null)
    setSaved(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmation('')
  }

  /** Editing any field retires the last answer, like the sign-in screen. */
  function edit(setter: (value: string) => void) {
    return (value: string) => {
      setter(value)
      setError(null)
      setSaved(false)
    }
  }

  const field = (
    id: string,
    label: string,
    value: string,
    setValue: (value: string) => void,
    autoComplete: string,
  ) => (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-bold uppercase tracking-wide text-bark-500"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => edit(setValue)(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'password-change-error' : undefined}
        className={cn(FIELD_CLASSES, error && 'border-red-300')}
      />
    </div>
  )

  return (
    <section className="rounded-2xl border border-bark-200 bg-white p-5 shadow-card">
      <h2 className="text-sm font-bold text-bark-900">Password</h2>
      <p className="mt-1 text-xs text-bark-500">
        You are signed in as <span className="font-semibold text-bark-700">{user.username}</span>. A
        change takes effect the next time this account signs in.
      </p>

      <form className="mt-4 grid gap-3 sm:max-w-sm" onSubmit={handleSubmit} noValidate>
        {error ? (
          <p
            id="password-change-error"
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800"
          >
            {error}
          </p>
        ) : null}

        {saved ? (
          <p
            role="status"
            className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-900"
          >
            Password updated. Use it the next time you sign in.
          </p>
        ) : null}

        {field('password-current', 'Current password', currentPassword, setCurrentPassword, 'current-password')}
        {field('password-new', 'New password', newPassword, setNewPassword, 'new-password')}
        {field(
          'password-confirm',
          'Confirm new password',
          confirmation,
          setConfirmation,
          'new-password',
        )}

        <Button type="submit" size="md">
          Update password
        </Button>
      </form>
    </section>
  )
}
