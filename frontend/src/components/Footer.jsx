import { useNavigate } from 'react-router-dom'

const VERSION = 'v0.5'

export default function Footer() {
  const navigate = useNavigate()

  return (
    <footer className="border-t border-white/[0.05] bg-[#07070f]">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-8 md:gap-0 justify-between items-start">

        {/* Marca */}
        <div className="flex flex-col gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black text-sm group-hover:bg-purple-500 transition">P</div>
            <span className="text-base font-black text-white">Play<span className="text-purple-400">Room</span></span>
          </button>
          <p className="text-gray-600 text-xs max-w-[200px] leading-relaxed">
            Juegos clásicos en un solo lugar. Gratis, sin publicidad.
          </p>
          <span className="text-gray-700 text-[10px] font-mono">{VERSION}</span>
        </div>

        {/* Links */}
        <div className="flex gap-12 md:gap-16">
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Juegos</p>
            {[
              { label: 'Truco Online', to: '/juegos/truco-online' },
              { label: 'Sudoku',       to: '/juegos/sudoku'       },
              { label: 'Buscaminas',   to: '/juegos/buscaminas'   },
              { label: 'Banderas',     to: '/juegos/banderas'     },
            ].map(l => (
              <button key={l.to} onClick={() => navigate(l.to)}
                className="text-gray-500 hover:text-gray-300 text-xs transition text-left">
                {l.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Cuenta</p>
            {[
              { label: 'Mi perfil', to: '/perfil'   },
              { label: 'Ranking',   to: '/ranking'  },
              { label: 'Juegos',    to: '/juegos'   },
            ].map(l => (
              <button key={l.to} onClick={() => navigate(l.to)}
                className="text-gray-500 hover:text-gray-300 text-xs transition text-left">
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-white/[0.04] px-6 py-4 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-gray-700 text-xs">PlayRoom © 2026. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
