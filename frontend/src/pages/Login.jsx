import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { auth, googleProvider } from '../firebase'
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const desde = location.state?.desde
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [cargando, setCargando] = useState(false)

  const handleEmail = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate(desde || '/')
    } catch {
      setError('Email o contraseña incorrectos.')
    }
    setCargando(false)
  }

  const handleGoogle = async () => {
    setError('')
    setCargando(true)
    try {
      await signInWithPopup(auth, googleProvider)
      navigate(desde || '/')
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') setError('No se pudo iniciar sesión con Google.')
    }
    setCargando(false)
  }

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex">

      {/* ── Panel izquierdo ── */}
      <div className="hidden lg:flex w-[480px] flex-shrink-0 flex-col items-center justify-center p-14 relative overflow-hidden"
        style={{ background: 'linear-gradient(155deg, #0d0620 0%, #080413 100%)' }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_40%_50%,rgba(109,40,217,0.22),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.07) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="absolute right-0 inset-y-0 w-px bg-gradient-to-b from-transparent via-purple-500/20 to-transparent" />

        <div className="relative z-10 flex flex-col items-start gap-10 w-full max-w-xs">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
            <div className="w-11 h-11 bg-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-xl group-hover:bg-purple-500 transition shadow-[0_0_28px_rgba(139,92,246,0.5)]">P</div>
            <span className="text-2xl font-black">Play<span className="text-purple-400">Room</span></span>
          </button>

          <div>
            <h2 className="text-2xl font-extrabold text-white leading-snug">Bienvenido de vuelta.</h2>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">Tus amigos te están esperando para la próxima partida.</p>
          </div>

          <div className="flex flex-col gap-2.5 w-full">
            {[
              { icon: '🎮', texto: 'Acceso a todos los juegos' },
              { icon: '👥', texto: 'Jugá con amigos online' },
              { icon: '🏆', texto: 'Ranking y estadísticas' },
              { icon: '🆓', texto: 'Completamente gratis' },
            ].map(item => (
              <div key={item.texto} className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.07] rounded-2xl px-4 py-3 hover:bg-white/[0.06] transition-colors">
                <span className="text-base">{item.icon}</span>
                <span className="text-gray-300 text-sm">{item.texto}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panel derecho — formulario ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_35%_at_50%_0%,rgba(109,40,217,0.07),transparent)]" />

        <div className="relative z-10 w-full max-w-sm flex flex-col gap-5">

          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-300 transition text-sm self-start mb-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
            Volver al inicio
          </button>

          {/* Logo solo en mobile */}
          <div className="lg:hidden flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black shadow-[0_0_16px_rgba(139,92,246,0.4)]">P</div>
            <span className="text-xl font-black">Play<span className="text-purple-400">Room</span></span>
          </div>

          <div>
            <h1 className="text-2xl font-extrabold">Iniciar sesión</h1>
            <p className="text-gray-500 text-sm mt-1">Bienvenido de vuelta a PlayRoom</p>
          </div>

          {desde && (
            <div className="bg-purple-950/50 border border-purple-600/30 text-purple-300 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
              </svg>
              Iniciá sesión para acceder
            </div>
          )}

          {error && (
            <div className="bg-red-950/50 border border-red-700/40 text-red-400 text-sm px-4 py-3 rounded-2xl">
              {error}
            </div>
          )}

          <button onClick={handleGoogle} disabled={cargando}
            className="w-full flex items-center justify-center gap-3 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.15] text-white py-3.5 rounded-2xl font-semibold transition-all text-sm disabled:opacity-40">
            <GoogleIcon />
            Continuar con Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-gray-700 text-[11px] uppercase tracking-wider">o con email</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <form onSubmit={handleEmail} className="flex flex-col gap-4">
            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" required
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-purple-500/60 focus:bg-white/[0.06] outline-none text-white px-4 py-3 rounded-xl text-sm transition placeholder-gray-700" />
            </Field>
            <Field label="Contraseña">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-purple-500/60 focus:bg-white/[0.06] outline-none text-white px-4 py-3 rounded-xl text-sm transition placeholder-gray-700" />
            </Field>
            <button type="submit" disabled={cargando}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-bold transition-all text-sm hover:shadow-[0_0_28px_rgba(139,92,246,0.35)] mt-1">
              {cargando ? 'Ingresando...' : 'Ingresar →'}
            </button>
          </form>

          <p className="text-center text-gray-600 text-sm">
            ¿No tenés cuenta?{' '}
            <button onClick={() => navigate('/registro')} className="text-purple-400 hover:text-purple-300 font-semibold transition">
              Registrate gratis
            </button>
          </p>

        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  )
}
