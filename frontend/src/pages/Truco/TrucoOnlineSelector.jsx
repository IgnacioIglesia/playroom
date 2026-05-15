import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import { usePageTitle } from '../../hooks/usePageTitle'
import Footer from '../../components/Footer'

export default function TrucoOnlineSelector() {
  usePageTitle('Truco Online')
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />

      <div className="relative flex-1 flex items-center justify-center px-4 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(109,40,217,0.18),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="relative z-10 w-full max-w-2xl flex flex-col gap-10">

          <div className="text-center">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 items-center justify-center mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-purple-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3h10.5a.75.75 0 01.75.75v16.5a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V3.75A.75.75 0 016.75 3zM8.25 8.25h7.5M8.25 12h7.5m-7.5 3.75h4.5"/>
              </svg>
            </div>
            <h1 className="text-4xl font-extrabold">Truco Online</h1>
            <p className="text-gray-500 mt-2 text-sm">Elegí la modalidad de juego</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* 1vs1 */}
            <button
              onClick={() => navigate('/juegos/truco-online/1vs1')}
              className="group bg-white/[0.03] border border-white/[0.06] hover:border-purple-500/40 hover:bg-white/[0.05] rounded-3xl p-8 flex flex-col items-center gap-5 transition-all text-center"
            >
              <div className="w-16 h-16 bg-purple-600/20 border border-purple-500/30 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-purple-600/30 transition">
                ⚔️
              </div>
              <div>
                <p className="text-2xl font-extrabold">1 vs 1</p>
                <p className="text-gray-500 text-sm mt-1.5">Duelo mano a mano contra un rival</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <span className="bg-white/[0.05] border border-white/[0.08] text-gray-400 text-xs px-3 py-1 rounded-full">2 jugadores</span>
                <span className="bg-green-950/60 border border-green-700/30 text-green-400 text-xs px-3 py-1 rounded-full">Disponible</span>
              </div>
            </button>

            {/* 2vs2 */}
            <button
              onClick={() => navigate('/juegos/truco-online/2vs2')}
              className="group bg-white/[0.03] border border-white/[0.06] hover:border-purple-500/40 hover:bg-white/[0.05] rounded-3xl p-8 flex flex-col items-center gap-5 transition-all text-center"
            >
              <div className="w-16 h-16 bg-purple-600/20 border border-purple-500/30 rounded-2xl flex items-center justify-center group-hover:bg-purple-600/30 transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-purple-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
                </svg>
              </div>
              <div>
                <p className="text-2xl font-extrabold">2 vs 2</p>
                <p className="text-gray-500 text-sm mt-1.5">Jugá en equipo con un compañero</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <span className="bg-white/[0.05] border border-white/[0.08] text-gray-400 text-xs px-3 py-1 rounded-full">4 jugadores</span>
                <span className="bg-yellow-950/60 border border-yellow-700/30 text-yellow-400 text-xs px-3 py-1 rounded-full">Beta</span>
              </div>
            </button>

          </div>

          <button
            onClick={() => navigate('/juegos')}
            className="text-gray-600 text-sm hover:text-gray-400 transition text-center"
          >
            ← Volver a los juegos
          </button>

        </div>
      </div>

      <Footer />
    </div>
  )
}
