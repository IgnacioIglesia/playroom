import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const AuthContext = createContext()

async function sincronizarPerfil(user) {
  if (!user?.uid) return
  try {
    await setDoc(doc(db, 'users', user.uid), {
      displayName: user.displayName || '',
      photoURL:    user.photoURL    || '',
      email:       user.email       || '',
      updatedAt:   serverTimestamp(),
    }, { merge: true })
  } catch { /* sin permisos o sin conexión — no bloquear */ }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user)
      setCargando(false)
      if (user) sincronizarPerfil(user)
    })
    return unsub
  }, [])

  const refrescarUsuario = async () => {
    await auth.currentUser?.reload()
    const user = auth.currentUser ? { ...auth.currentUser } : null
    setUsuario(user)
    if (user) sincronizarPerfil(user)
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
