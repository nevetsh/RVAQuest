import { useEffect } from 'react'

/** Accessibility: every screen announces itself in the browser tab. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} · RVA Quest` : 'RVA Quest'
    return () => {
      document.title = previous
    }
  }, [title])
}
