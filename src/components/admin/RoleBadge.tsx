import type { Role, UserStatus } from '../../services/types'
import { ROLE_LABELS } from '../../rules/permissions'
import { Badge, type BadgeTone } from '../ui/Badge'

const TONES: Record<Role, BadgeTone> = {
  user: 'neutral',
  moderator: 'success',
  manager: 'brand',
  admin: 'warning',
}

/** One place that knows how a role looks, used by the profile, forum and console. */
export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <Badge tone={TONES[role]} className={className}>
      {ROLE_LABELS[role]}
    </Badge>
  )
}

export function StatusBadge({ status }: { status?: UserStatus }) {
  if (status !== 'suspended') return <Badge tone="muted">Active</Badge>
  return <Badge tone="warning">Suspended</Badge>
}
