import { useEffect } from 'react'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — PlayRoom` : 'PlayRoom'
    return () => { document.title = 'PlayRoom' }
  }, [title])
}
