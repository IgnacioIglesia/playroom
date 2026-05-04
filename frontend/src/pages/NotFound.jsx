import { useNavigate, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function NotFound() {
  const navigate  = useNavigate()
  const location  = useLocation()

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />

      <div className="relative flex-1 flex items-center justify-center px-4 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(109,40,217,0.12),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-md">

          {/* Número 404 */}
          <div className="relative select-none">
            <p className="text-[160px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-white/[0.08] to-white/[0.02] tracking-tighter">
              404
            </p>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-9 h-9 text-purple-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Texto */}
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-extrabold">Página no encontrada</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              La URL{' '}
              <span className="text-purple-400 font-mono text-xs bg-purple-950/40 border border-purple-700/30 px-2 py-0.5 rounded-lg">
                {location.pathname}
              </span>
              {' '}no existe.
            </p>
          </div>

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14] text-white py-3 rounded-2xl font-semibold text-sm transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
              </svg>
              Volver
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-2xl font-bold text-sm transition-all hover:shadow-[0_0_24px_rgba(139,92,246,0.35)]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
              </svg>
              Ir al inicio
            </button>
          </div>

          {/* Links rápidos */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: 'Juegos',   to: '/juegos'   },
              { label: 'Ranking',  to: '/ranking'  },
              { label: 'Mi perfil',to: '/perfil'   },
            ].map(link => (
              <button
                key={link.to}
                onClick={() => navigate(link.to)}
                className="text-xs text-gray-500 hover:text-purple-400 transition px-3 py-1.5 rounded-lg hover:bg-purple-950/30 border border-transparent hover:border-purple-700/20"
              >
                {link.label} →
              </button>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
