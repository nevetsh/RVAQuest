import { useState } from 'react'
import { REPORT_REASONS } from '../../services/places.types'
import { FORUM_LIMITS } from '../../lib/constants'
import { cn } from '../../lib/cn'

export interface ReportDraft {
  reason: string
  details: string
}

/**
 * FR01 — any explorer can report a post or a comment. The dialog posts the
 * draft to the service, which re-checks "can this user report this item?" and
 * runs the reason/limit validation.
 */
export function ReportButton({
  canReport,
  disabledReason,
  targetLabel,
  onSubmit,
}: {
  canReport: boolean
  disabledReason?: string
  targetLabel: 'post' | 'comment'
  onSubmit: (draft: ReportDraft) => { ok: boolean; message?: string }
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [reported, setReported] = useState(false)

  function submit() {
    const result = onSubmit({ reason, details })
    if (!result.ok) {
      setError(result.message ?? 'Pick a reason before sending the report.')
      return
    }

    setReported(true)
    setOpen(false)
    setReason('')
    setDetails('')
    setError(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!canReport}
        title={canReport ? `Report this ${targetLabel}` : disabledReason}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition',
          'border-bark-200 text-bark-600 hover:border-amber-400 hover:text-amber-700',
          !canReport && 'cursor-not-allowed opacity-40 hover:border-bark-200 hover:text-bark-600',
        )}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M5 21V4m0 1h11l-1.6 3.5L16 12H5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {reported ? 'Reported' : 'Report'}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Report this ${targetLabel}`}>
          <button
            type="button"
            aria-label="Close report dialog"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-bark-900/40"
          />

          <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
            <h2 className="text-base font-bold text-bark-900">Report this {targetLabel}</h2>
            <p className="mt-1 text-xs text-bark-500">
              Moderators see the report in their queue. Your name is attached to it.
            </p>

            <fieldset className="mt-4 space-y-1.5">
              <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-bark-500">
                Reason
              </legend>
              {REPORT_REASONS.map((option) => (
                <label
                  key={option}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm',
                    reason === option ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-bark-200 text-bark-700',
                  )}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={option}
                    checked={reason === option}
                    onChange={() => {
                      setReason(option)
                      setError(null)
                    }}
                    className="accent-brand-700"
                  />
                  {option}
                </label>
              ))}
            </fieldset>

            <label className="mt-3 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-bark-500">
                Details (optional)
              </span>
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={3}
                maxLength={FORUM_LIMITS.reportReason}
                placeholder="Anything a moderator should know."
                className="mt-1 w-full rounded-xl border border-bark-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </label>

            {error ? (
              <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-bark-600 hover:bg-bark-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Send report
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
