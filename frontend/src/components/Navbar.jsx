import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'
import Avatar from './Avatar'

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { usuario } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const menuRef = useRef(null)

  const activo = (ruta) =>
    location.pathname === ruta || location.pathname.startsWith(ruta + '/')
      ? 'text-white font-semibold'
      : 'text-gray-400 hover:text-white'

  const handleLogout = async () => {
    setMenuAbierto(false)
    await signOut(auth)
    navigate('/')
  }

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <nav className="sticky top-0 z-50 flex items-center h-14 px-4 md:px-8 border-b border-white/5 bg-gray-950/90 backdrop-blur">

      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 bg-transparent border-none group flex-shrink-0"
      >
        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold group-hover:bg-purple-500 transition">
          P
        </div>
        <span className="text-lg font-bold text-white">
          Play<span className="text-purple-400">Room</span>
        </span>
      </button>

      {/* Nav links — desktop */}
      <div className="hidden md:flex gap-1 items-center ml-8">
        <button
          onClick={() => navigate('/')}
          className={`text-sm px-3 py-1.5 rounded-lg transition ${activo('/') ? 'text-white font-semibold bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
          Inicio
        </button>
        <button
          onClick={() => navigate('/juegos')}
          className={`text-sm px-3 py-1.5 rounded-lg transition ${activo('/juegos') ? 'text-white font-semibold bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
          Juegos
        </button>
      </div>

      {/* Derecha */}
      <div className="ml-auto">
        {usuario ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuAbierto(v => !v)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-white/5 transition"
            >
              <Avatar usuario={usuario} size="sm" />
              <span className="hidden md:block text-sm text-gray-300 max-w-[130px] truncate">
                {usuario.displayName || usuario.email?.split('@')[0]}
              </span>
              <svg
                className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${menuAbierto ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {menuAbierto && (
              <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
                {/* Info usuario */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
                  <Avatar usuario={usuario} size="md" />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">
                      {usuario.displayName || 'Usuario'}
                    </p>
                    <p className="text-gray-500 text-xs truncate">{usuario.email}</p>
                  </div>
                </div>

                {/* Opciones */}
                <div className="py-1">
                  <button
                    onClick={() => { setMenuAbierto(false); navigate('/perfil') }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition"
                  >
                    <span className="w-4 text-center">👤</span>
                    Mi perfil
                  </button>
                </div>

                <div className="h-px bg-gray-800" />

                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/40 hover:text-red-300 transition"
                  >
                    <span className="w-4 text-center">🚪</span>
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="text-gray-400 hover:text-white text-sm transition px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => navigate('/registro')}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-xl text-sm font-semibold transition"
            >
              Registrarse
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
