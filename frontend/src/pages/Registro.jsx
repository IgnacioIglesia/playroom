import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, googleProvider } from '../firebase'
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth'
import { usePageTitle } from '../hooks/usePageTitle'

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export default function Registro() {
  const navigate  = useNavigate()
  const [nombre,   setNombre]   = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirmar,setConfirmar]= useState('')
  const [error,    setError]    = useState('')
  const [cargando, setCargando] = useState(false)

  const handleRegistro = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmar) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 6)   { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setCargando(true)
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(result.user, { displayName: nombre.trim() })
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
    } catch {
      setError('No se pudo registrar con Google.')
    }
    setCargando(false)
  }

  const noCoinciden = confirmar.length > 0 && password !== confirmar
  const coinciden   = confirmar.length > 0 && password === confirmar

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
            <h2 className="text-2xl font-extrabold text-white leading-snug">Empezá a jugar hoy.</h2>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">Creá tu cuenta gratis y uníte a miles de jugadores.</p>
          </div>

          <div className="flex flex-col gap-2.5 w-full">
            {([
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-purple-400 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3"/></svg>, texto: 'Acceso a todos los juegos' },
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-purple-400 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>, texto: 'Jugá con amigos online' },
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-purple-400 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"/></svg>, texto: 'Guardá tu historial y ranking' },
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-purple-400 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>, texto: 'Completamente gratis' },
            ]).map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.07] rounded-2xl px-4 py-3 hover:bg-white/[0.06] transition-colors">
                {item.icon}
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
            <h1 className="text-2xl font-extrabold">Crear cuenta</h1>
            <p className="text-gray-500 text-sm mt-1">Uníte gratis y empezá a jugar</p>
          </div>

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

          <form onSubmit={handleRegistro} className="flex flex-col gap-4">
            <Field label="Nombre">
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Tu nombre" required maxLength={30}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-purple-500/60 focus:bg-white/[0.06] outline-none text-white px-4 py-3 rounded-xl text-sm transition placeholder-gray-700" />
            </Field>

            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" required
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-purple-500/60 focus:bg-white/[0.06] outline-none text-white px-4 py-3 rounded-xl text-sm transition placeholder-gray-700" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Contraseña">
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mín. 6 caracteres" required
                  className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-purple-500/60 focus:bg-white/[0.06] outline-none text-white px-4 py-3 rounded-xl text-sm transition placeholder-gray-700" />
              </Field>
              <Field label="Confirmar">
                <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
                  placeholder="Repetí" required
                  className={`w-full bg-white/[0.04] outline-none text-white px-4 py-3 rounded-xl text-sm transition placeholder-gray-700 border ${
                    noCoinciden ? 'border-red-500/70 focus:border-red-500'
                    : coinciden  ? 'border-green-500/60 focus:border-green-500'
                    : 'border-white/[0.08] focus:border-purple-500/60 focus:bg-white/[0.06]'
                  }`} />
              </Field>
            </div>

            {noCoinciden && <p className="text-red-400 text-xs -mt-2 flex items-center gap-1"><span>✗</span> Las contraseñas no coinciden</p>}
            {coinciden   && <p className="text-green-400 text-xs -mt-2 flex items-center gap-1"><span>✓</span> Las contraseñas coinciden</p>}

            <button type="submit" disabled={cargando || noCoinciden}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-bold transition-all text-sm hover:shadow-[0_0_28px_rgba(139,92,246,0.35)] mt-1">
              {cargando ? 'Creando cuenta...' : 'Crear cuenta →'}
            </button>
          </form>

          <p className="text-center text-gray-600 text-sm">
            ¿Ya tenés cuenta?{' '}
            <button onClick={() => navigate('/login')} className="text-purple-400 hover:text-purple-300 font-semibold transition">
              Iniciá sesión
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
