import { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user)
      setCargando(false)
    })
    return unsub
  }, [])

  const refrescarUsuario = async () => {
    await auth.currentUser?.reload()
    setUsuario(auth.currentUser ? { ...auth.currentUser } : null)
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, refrescarUsuario }}>
      {!cargando && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
