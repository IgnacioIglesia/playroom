import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const JUEGOS = [
  { id: 'truco', nombre: 'Truco Uruguayo', icono: '🃏', coleccion: 'ranking_truco' },
  { id: 'poker', nombre: 'Poker', icono: '♠️', coleccion: 'ranking_poker', proximamente: true },
]

export default function Ranking() {
  const [juegoActivo, setJuegoActivo] = useState('truco')
  const [ranking, setRanking] = useState([])
  const [cargando, setCargando] = useState(true)

  const juego = JUEGOS.find(j => j.id === juegoActivo)

  useEffect(() => {
    if (juego?.proximamente) { setRanking([]); setCargando(false); return }
    const cargar = async () => {
      setCargando(true)
      const snap = await getDocs(collection(db, juego.coleccion))
      const porUsuario = {}
      snap.forEach(doc => {
        const d = doc.data()
        if (!porUsuario[d.uid]) {
          porUsuario[d.uid] = { nombre: d.nombre, victorias: 0, derrotas: 0 }
        }
        if (d.resultado === 'victoria') porUsuario[d.uid].victorias++
        else porUsuario[d.uid].derrotas++
      })
      const lista = Object.values(porUsuario)
        .map(u => ({
          ...u,
          partidas: u.victorias + u.derrotas,
          winrate: u.victorias + u.derrotas > 0
            ? Math.round((u.victorias / (u.victorias + u.derrotas)) * 100)
            : 0
        }))
        .sort((a, b) => b.victorias - a.victorias || b.winrate - a.winrate)
      setRanking(lista)
      setCargando(false)
    }
    cargar()
  }, [juegoActivo])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold">🏆 Ranking</h1>
          <p className="text-gray-400 mt-2">Los mejores jugadores de PlayRoom</p>
        </div>

        {/* Tabs de juegos */}
        <div className="flex gap-2 mb-8 bg-gray-900 border border-gray-800 rounded-2xl p-2">
          {JUEGOS.map(j => (
            <button
              key={j.id}
              onClick={() => !j.proximamente && setJuegoActivo(j.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition relative ${
                juegoActivo === j.id
                  ? 'bg-purple-600 text-white'
                  : j.proximamente
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>{j.icono}</span>
              <span>{j.nombre}</span>
              {j.proximamente && (
                <span className="absolute -top-2 -right-2 bg-gray-700 text-gray-400 text-xs px-1.5 py-0.5 rounded-full">
                  Pronto
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contenido */}
        {juego?.proximamente ? (
          <div className="text-center py-20 flex flex-col items-center gap-4">
            <span className="text-6xl">{juego.icono}</span>
            <h2 className="text-2xl font-bold">{juego.nombre}</h2>
            <p className="text-gray-500">Este juego estará disponible próximamente.</p>
          </div>
        ) : cargando ? (
          <p className="text-center text-gray-500">Cargando...</p>
        ) : ranking.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center gap-4">
            <span className="text-5xl">📭</span>
            <p className="text-gray-500">No hay partidas registradas todavía.</p>
            <p className="text-gray-600 text-sm">¡Jugá online para aparecer en el ranking!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {ranking.map((jugador, i) => (
              <div key={i} className={`flex items-center gap-4 bg-gray-900 border rounded-2xl px-6 py-4 ${
                i === 0 ? 'border-yellow-600' : i === 1 ? 'border-gray-500' : i === 2 ? 'border-orange-700' : 'border-gray-800'
              }`}>
                <span className="text-2xl font-extrabold w-8 text-center">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <div className="w-10 h-10 rounded-full bg-purple-900 border-2 border-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-extrabold text-sm">
                    {jugador.nombre.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{jugador.nombre}</p>
                  <p className="text-gray-500 text-xs">{jugador.partidas} partidas jugadas</p>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <p className="text-green-400 font-extrabold text-lg">{jugador.victorias}</p>
                    <p className="text-gray-600 text-xs">Victorias</p>
                  </div>
                  <div>
                    <p className="text-red-400 font-extrabold text-lg">{jugador.derrotas}</p>
                    <p className="text-gray-600 text-xs">Derrotas</p>
                  </div>
                  <div>
                    <p className="text-purple-400 font-extrabold text-lg">{jugador.winrate}%</p>
                    <p className="text-gray-600 text-xs">Winrate</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}