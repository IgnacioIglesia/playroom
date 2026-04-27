import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

export default function TrucoOnlineSelector() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl flex flex-col gap-8">

          <div className="text-center">
            <span className="text-6xl">🃏</span>
            <h1 className="text-4xl font-extrabold mt-4">Truco Online</h1>
            <p className="text-gray-400 mt-2">Elegí la modalidad de juego</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* 1vs1 */}
            <button
              onClick={() => navigate('/juegos/truco-online/1vs1')}
              className="bg-gray-900 border-2 border-gray-700 hover:border-purple-500 rounded-3xl p-8 flex flex-col items-center gap-4 transition group text-left"
            >
              <div className="w-16 h-16 bg-purple-900 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-purple-700 transition">
                ⚔️
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold">1 vs 1</p>
                <p className="text-gray-400 text-sm mt-1">Duelo mano a mano contra un rival</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">2 jugadores</span>
                <span className="bg-green-900/50 text-green-400 text-xs px-3 py-1 rounded-full">✅ Disponible</span>
              </div>
            </button>

            {/* 2vs2 */}
            <button
              onClick={() => navigate('/juegos/truco-online/2vs2')}
              className="bg-gray-900 border-2 border-gray-700 hover:border-purple-500 rounded-3xl p-8 flex flex-col items-center gap-4 transition group text-left"
            >
              <div className="w-16 h-16 bg-purple-900 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-purple-700 transition">
                👥
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold">2 vs 2</p>
                <p className="text-gray-400 text-sm mt-1">Jugá en equipo con un compañero</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">4 jugadores</span>
                <span className="bg-yellow-900/50 text-yellow-400 text-xs px-3 py-1 rounded-full">🚧 Beta</span>
              </div>
            </button>

                        {/* 2vs2 */}
                        <button
              onClick={() => navigate('/juegos/truco-online/3vs3')}
              className="bg-gray-900 border-2 border-gray-700 hover:border-purple-500 rounded-3xl p-8 flex flex-col items-center gap-4 transition group text-left"
            >
              <div className="w-16 h-16 bg-purple-900 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-purple-700 transition">
                👥
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold">3 vs 3</p>
                <p className="text-gray-400 text-sm mt-1">Jugá en equipo de 3 contra otros 3</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">6 jugadores</span>
                <span className="bg-yellow-900/50 text-yellow-400 text-xs px-3 py-1 rounded-full">🚧 Beta</span>
              </div>
            </button>

          </div>

          <button onClick={() => navigate('/juegos')} className="text-gray-600 text-sm hover:text-gray-400 transition text-center">
            ← Volver a los juegos
          </button>

        </div>
      </div>
      <Footer />
    </div>
  )
}