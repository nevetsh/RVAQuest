/** FR01 — the moderator-only actions on a post or a comment. */
export function ModerationControls({
  canRemove,
  canPin = false,
  pinned = false,
  targetLabel,
  onRemove,
  onTogglePin,
}: {
  canRemove: boolean
  canPin?: boolean
  pinned?: boolean
  targetLabel: 'post' | 'comment'
  onRemove: () => void
  onTogglePin?: () => void
}) {
  if (!canRemove && !canPin) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-full bg-bark-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bark-500">
        Moderator
      </span>

      {canPin && onTogglePin ? (
        <button
          type="button"
          onClick={onTogglePin}
          className="rounded-full border border-bark-200 px-2.5 py-1 text-xs font-semibold text-bark-700 transition hover:border-brand-400 hover:text-brand-800"
        >
          {pinned ? 'Unpin' : 'Pin to top'}
        </button>
      ) : null}

      {canRemove ? (
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                `Remove this ${targetLabel}? Explorers will no longer see it, and any open reports are closed.`,
              )
            ) {
              onRemove()
            }
          }}
          className="rounded-full border border-red-300 px-2.5 py-1 text-xs font-bold text-red-700 transition hover:bg-red-50"
        >
          Remove {targetLabel}
        </button>
      ) : null}
    </div>
  )
}
