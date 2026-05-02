import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const NavigationGuardContext = createContext(null)

export function NavigationGuardProvider({ children }) {
  const [guard, setGuardState] = useState(null) // null | { message: string, onConfirm?: fn }

  const setGuard  = useCallback((message) => setGuardState({ message }), [])
  const clearGuard = useCallback(() => setGuardState(null), [])

  useEffect(() => {
    if (!guard) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [guard])

  return (
    <NavigationGuardContext.Provider value={{ guard, setGuard, clearGuard }}>
      {children}
    </NavigationGuardContext.Provider>
  )
}

export const useNavigationGuard = () => useContext(NavigationGuardContext)
