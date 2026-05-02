import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNavigationGuard } from '../context/NavigationGuardContext'
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'
import Avatar from './Avatar'

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
)

const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
)

function Navbar() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { usuario } = useAuth()
  const [menuAbierto, setMenuAbierto]   = useState(false)
  const [pendingRoute, setPendingRoute] = useState(null)
  const menuRef = useRef(null)
  const { guard, clearGuard } = useNavigationGuard()

  const isActive = (ruta) =>
    location.pathname === ruta || location.pathname.startsWith(ruta + '/')

  const handleNavigate = (ruta) => {
    setMenuAbierto(false)
    if (guard) {
      setPendingRoute(ruta)
    } else {
      navigate(ruta)
    }
  }

  const confirmNavigation = () => {
    clearGuard()
    navigate(pendingRoute)
    setPendingRoute(null)
  }

  const cancelNavigation = () => setPendingRoute(null)

  const handleLogout = async () => {
    setMenuAbierto(false)
    clearGuard()
    await signOut(auth)
    navigate('/')
  }

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const links = [
    { label: 'Inicio',  ruta: '/'        },
    { label: 'Juegos',  ruta: '/juegos'  },
    { label: 'Ranking', ruta: '/ranking' },
  ]

  return (
    <>
    <nav className="sticky top-0 z-50 h-14 flex items-center px-4 md:px-8 border-b border-white/[0.06] bg-[#07070f]/90 backdrop-blur-md">

      {/* Logo */}
      <button
        onClick={() => handleNavigate('/')}
        className="flex items-center gap-2 bg-transparent border-none flex-shrink-0 group"
      >
        <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold group-hover:bg-purple-500 transition">P</div>
        <span className="text-base font-bold text-white">Play<span className="text-purple-400">Room</span></span>
      </button>

      {/* Nav links — desktop */}
      <div className="hidden md:flex items-center gap-1 ml-8">
        {links.map(({ label, ruta }) => (
          <button
            key={ruta}
            onClick={() => handleNavigate(ruta)}
            className={`relative text-sm px-3 py-1.5 rounded-lg transition-colors ${
              isActive(ruta)
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-200'
            }`}
          >
            {label}
            {isActive(ruta) && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-400" />
            )}
          </button>
        ))}
      </div>

      {/* Right side */}
      <div className="ml-auto">
        {usuario ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuAbierto(v => !v)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl hover:bg-white/[0.06] transition border border-transparent hover:border-white/[0.08]"
            >
              <Avatar usuario={usuario} size="sm" />
              <span className="hidden md:block text-sm text-gray-300 max-w-[120px] truncate">
                {usuario.displayName || usuario.email?.split('@')[0]}
              </span>
              <svg
                className={`w-3 h-3 text-gray-600 transition-transform duration-200 ${menuAbierto ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuAbierto && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/[0.08] bg-[#0f0f1a]/95 backdrop-blur-md shadow-2xl shadow-black/60 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
                  <Avatar usuario={usuario} size="md" />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">
                      {usuario.displayName || 'Usuario'}
                    </p>
                    <p className="text-gray-500 text-xs truncate">{usuario.email}</p>
                  </div>
                </div>

                <div className="p-1">
                  <button
                    onClick={() => handleNavigate('/perfil')}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/[0.05] rounded-xl transition"
                  >
                    <IconUser />
                    Mi perfil
                  </button>
                </div>

                <div className="h-px bg-white/[0.06] mx-2" />

                <div className="p-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/[0.08] rounded-xl transition"
                  >
                    <IconLogout />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNavigate('/login')}
              className="text-gray-400 hover:text-white text-sm transition px-3 py-1.5 rounded-lg hover:bg-white/[0.05]"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => handleNavigate('/registro')}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-xl text-sm font-semibold transition hover:shadow-[0_0_20px_rgba(139,92,246,0.35)]"
            >
              Registrarse
            </button>
          </div>
        )}
      </div>
    </nav>

    {/* Modal confirmación salir de partida */}
    {pendingRoute && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={cancelNavigation} />
        <div className="relative z-10 bg-[#0f0f1a] border border-white/[0.09] rounded-3xl p-8 max-w-sm w-full flex flex-col gap-5 shadow-2xl shadow-black/60">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-red-900/40 border border-red-700/30 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-red-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-white font-bold text-base">¿Salir de la partida?</h3>
              <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                {guard?.message || 'Si salís ahora perdés tu lugar en la sala y la partida terminará para todos.'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={cancelNavigation}
              className="flex-1 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07] text-white text-sm font-semibold transition"
            >
              Quedarme
            </button>
            <button
              onClick={confirmNavigation}
              className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition"
            >
              Salir igual
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

export default Navbar
