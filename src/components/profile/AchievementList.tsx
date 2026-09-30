import { Link } from 'react-router-dom'
import type { ForumPost } from '../../services/places.types'
import type { User } from '../../services/types'
import {
  achievementShareDraft,
  achievementStatsFor,
  achievementsFor,
  progressLabel,
} from '../../rules/achievements'
import { cn } from '../../lib/cn'

/**
 * FR03 / FR04 — the badge list on the Profile screen. Every earned badge has
 * a "Share to forum" button that opens the composer with an Achievements post
 * already written.
 */
export function AchievementList({ user, posts }: { user: User; posts: ForumPost[] }) {
  const achievements = achievementsFor(achievementStatsFor(user, posts))
  const earned = achievements.filter((achievement) => achievement.earned).length

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-bark-900">Badges</h2>
        <span className="text-xs font-semibold text-bark-500">
          {earned} of {achievements.length} earned · FR03
        </span>
      </header>

      <ul className="grid gap-2 sm:grid-cols-2">
        {achievements.map((achievement) => {
          const draft = achievementShareDraft(achievement, user)

          return (
            <li
              key={achievement.id}
              className={cn(
                'flex flex-col justify-between gap-3 rounded-2xl border bg-white p-3 shadow-card',
                achievement.earned ? 'border-brand-200' : 'border-bark-200',
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg',
                    achievement.earned ? 'bg-brand-100' : 'bg-bark-100 grayscale',
                  )}
                  aria-hidden="true"
                >
                  {achievement.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-bark-900">{achievement.name}</span>
                  <span className="mt-0.5 block text-xs text-bark-500">
                    {achievement.description}
                  </span>
                  <span
                    className={cn(
                      'mt-1 inline-block text-[11px] font-bold uppercase tracking-wide',
                      achievement.earned ? 'text-brand-700' : 'text-bark-500',
                    )}
                  >
                    {progressLabel(achievement)}
                  </span>
                </span>
              </div>

              {achievement.earned ? (
                <Link
                  to="/forum/new"
                  state={{ ...draft, source: `your “${achievement.name}” badge` }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-brand-700 px-3 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-brand-50"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" strokeLinecap="round" />
                    <path d="M12 16V3m0 0L8 7m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Share to forum
                </Link>
              ) : (
                <span className="text-[11px] text-bark-500">Earn it to share it in Achievements.</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
