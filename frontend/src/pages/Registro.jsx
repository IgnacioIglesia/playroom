import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, googleProvider } from '../firebase'
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth'

export default function Registro() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleRegistro = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmar) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setCargando(true)
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(result.user, { displayName: nombre })
      navigate('/')
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('Este email ya está registrado.')
      else setError('Ocurrió un error. Intentá de nuevo.')
    }
    setCargando(false)
  }

  const handleGoogle = async () => {
    setCargando(true)
    setError('')
    try {
      await signInWithPopup(auth, googleProvider)
      navigate('/')
    } catch (err) {
      setError('No se pudo registrar con Google.')
    }
    setCargando(false)
  }

  const passwordsNoCoinciden = confirmar.length > 0 && password !== confirmar
  const passwordsCoinciden = confirmar.length > 0 && password === confirmar

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">

      {/* Panel izquierdo decorativo */}
      <div className="hidden md:flex flex-1 bg-gray-900 border-r border-gray-800 flex-col items-center justify-center p-12 gap-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-900 opacity-20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-900 opacity-20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="z-10 text-center flex flex-col gap-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 justify-center group bg-transparent border-none cursor-pointer">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg group-hover:bg-purple-500 transition">P</div>
            <span className="text-2xl font-extrabold text-white">Play<span className="text-purple-400">Room</span></span>
          </button>
          <p className="text-gray-400 text-lg max-w-xs leading-relaxed">
            Creá tu cuenta y empezá a jugar con tus amigos en segundos.
          </p>
          <div className="flex flex-col gap-4 mt-4">
            {[
              { icon: '🎮', texto: 'Acceso a todos los juegos' },
              { icon: '👥', texto: 'Jugá con amigos online' },
              { icon: '🏆', texto: 'Guardá tu historial y ranking' },
              { icon: '🆓', texto: 'Completamente gratis' },
            ].map((item) => (
              <div key={item.texto} className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 border border-gray-700">
                <span className="text-xl">{item.icon}</span>
                <span className="text-gray-300 text-sm font-medium">{item.texto}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md flex flex-col gap-6">

          <div className="md:hidden flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">P</div>
            <span className="text-xl font-bold">Play<span className="text-purple-400">Room</span></span>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold">Crear cuenta</h1>
            <p className="text-gray-400 mt-1 text-sm">Uníte gratis y empezá a jugar</p>
          </div>

          {error && (
            <div className="bg-red-950 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-xl">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleGoogle}
            disabled={cargando}
            className="w-full flex items-center justify-center gap-3 border-2 border-gray-700 hover:border-purple-500 bg-gray-900 hover:bg-gray-800 text-white py-3.5 rounded-2xl font-semibold transition text-sm"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" />
            Continuar con Google
          </button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-gray-600 text-xs">o registrate con email</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <form onSubmit={handleRegistro} className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                required
                className="bg-gray-900 border border-gray-700 focus:border-purple-500 outline-none text-white px-4 py-3 rounded-xl text-sm transition placeholder-gray-600"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="bg-gray-900 border border-gray-700 focus:border-purple-500 outline-none text-white px-4 py-3 rounded-xl text-sm transition placeholder-gray-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mín. 6 caracteres"
                  required
                  className="bg-gray-900 border border-gray-700 focus:border-purple-500 outline-none text-white px-4 py-3 rounded-xl text-sm transition placeholder-gray-600"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Confirmar</label>
                <input
                  type="password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  placeholder="Repetí"
                  required
                  className={`bg-gray-900 border-2 outline-none text-white px-4 py-3 rounded-xl text-sm transition placeholder-gray-600 ${
                    passwordsNoCoinciden ? 'border-red-500' :
                    passwordsCoinciden ? 'border-green-500' :
                    'border-gray-700 focus:border-purple-500'
                  }`}
                />
              </div>
            </div>

            {passwordsNoCoinciden && (
              <p className="text-red-400 text-xs -mt-2">⚠️ Las contraseñas no coinciden</p>
            )}
            {passwordsCoinciden && (
              <p className="text-green-400 text-xs -mt-2">✓ Las contraseñas coinciden</p>
            )}

            <button
              type="submit"
              disabled={cargando || passwordsNoCoinciden}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-bold transition mt-1 text-sm hover:scale-105"
            >
              {cargando ? 'Creando cuenta...' : 'Crear cuenta →'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm">
            ¿Ya tenés cuenta?{' '}
            <button onClick={() => navigate('/login')} className="text-purple-400 hover:text-purple-300 font-semibold">
              Iniciá sesión
            </button>
          </p>

        </div>
      </div>

    </div>
  )
}