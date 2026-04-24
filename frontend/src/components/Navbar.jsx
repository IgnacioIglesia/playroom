import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { usuario } = useAuth()

  const activo = (ruta) =>
    location.pathname === ruta || location.pathname.startsWith(ruta + '/')
      ? 'text-white font-semibold'
      : 'text-gray-400 hover:text-white'

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-50 flex justify-between items-center px-10 py-4 border-b border-gray-800 bg-gray-950 bg-opacity-90 backdrop-blur">

      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 cursor-pointer group bg-transparent border-none"
      >
        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold group-hover:bg-purple-500 transition">
          P
        </div>
        <span className="text-xl font-bold text-white pointer-events-none">
          Play<span className="text-purple-400">Room</span>
        </span>
      </button>

      <div className="flex gap-8 items-center ml-auto mr-8">
        <button onClick={() => navigate('/')} className={`text-sm transition ${activo('/')}`}>
          Inicio
        </button>
        <button onClick={() => navigate('/juegos')} className={`text-sm transition ${activo('/juegos')}`}>
          Juegos
        </button>
      </div>

      <div className="flex items-center gap-3">
        {usuario ? (
          <>
            <span className="text-gray-400 text-sm">
              👋 {usuario.displayName || usuario.email}
            </span>
            <button
              onClick={handleLogout}
              className="border border-gray-700 hover:border-red-500 text-gray-400 hover:text-red-400 px-4 py-2 rounded-xl text-sm transition"
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate('/login')}
              className="text-gray-400 hover:text-white text-sm transition px-4 py-2"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => navigate('/registro')}
              className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl text-sm font-semibold transition hover:scale-105"
            >
              Registrarse
            </button>
          </>
        )}
      </div>

    </nav>
  )
}

export default Navbar