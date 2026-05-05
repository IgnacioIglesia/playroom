import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import EmptyState from '../components/EmptyState'

const DIFF_COLOR = {
  facil: 'text-green-400', medio: 'text-blue-400', dificil: 'text-yellow-400',
  experto: 'text-orange-400', maestro: 'text-red-400', extremo: 'text-purple-400',
}
const DIFF_LABEL = {
  facil: 'Fácil', medio: 'Medio', dificil: 'Difícil',
  experto: 'Experto', maestro: 'Maestro', extremo: 'Extremo',
}

const JUEGOS = [
  { id: 'truco',      nombre: 'Truco',      icono: '🃏', coleccion: 'ranking_truco',      tipo: 'victorias'  },
  { id: 'sudoku',     nombre: 'Sudoku',     icono: '🔢', coleccion: 'ranking_sudoku',     tipo: 'puntuacion' },
  { id: 'buscaminas', nombre: 'Buscaminas', icono: '💣', coleccion: 'ranking_buscaminas', tipo: 'puntuacion' },
  { id: 'palabras',   nombre: 'Palabras',   icono: '▦',  coleccion: 'ranking_palabras',   tipo: 'racha' },
]

function formatTiempo(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

const MEDALLA = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null

export default function Ranking() {
  const [juegoActivo, setJuegoActivo] = useState('truco')
  const [ranking, setRanking]         = useState([])
  const [cargando, setCargando]       = useState(true)

  const juego = JUEGOS.find(j => j.id === juegoActivo)

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      try {
        const snap = await getDocs(collection(db, juego.coleccion))

        if (juego.tipo === 'victorias') {
          const porUsuario = {}
          snap.forEach(doc => {
            const d = doc.data()
            if (!porUsuario[d.uid]) porUsuario[d.uid] = { nombre: d.nombre, victorias: 0, derrotas: 0 }
            if (d.resultado === 'victoria') porUsuario[d.uid].victorias++
            else porUsuario[d.uid].derrotas++
          })
          const lista = Object.values(porUsuario)
            .map(u => ({ ...u, partidas: u.victorias + u.derrotas, winrate: u.victorias + u.derrotas > 0 ? Math.round((u.victorias / (u.victorias + u.derrotas)) * 100) : 0 }))
            .sort((a, b) => b.victorias - a.victorias || b.winrate - a.winrate)
            .slice(0, 10)
          setRanking(lista)
        } else if (juego.tipo === 'racha') {
          const lista = []
          snap.forEach(doc => {
            const d = doc.data()
            lista.push({
              nombre: d.nombre || 'Jugador',
              racha: d.racha || 0,
              mejorRacha: d.mejorRacha || d.racha || 0,
              totalAciertos: d.totalAciertos || 0,
              lastSolvedDate: d.lastSolvedDate,
            })
          })
          lista.sort((a, b) => b.racha - a.racha || b.mejorRacha - a.mejorRacha || b.totalAciertos - a.totalAciertos)
          setRanking(lista.slice(0, 10))
        } else {
          const porUsuario = {}
          snap.forEach(doc => {
            const d = doc.data()
            if (!porUsuario[d.uid] || (d.puntuacion || 0) > (porUsuario[d.uid].puntuacion || 0)) {
              porUsuario[d.uid] = { nombre: d.nombre, puntuacion: d.puntuacion || 0, dificultad: d.dificultad, tiempo: d.tiempo, errores: d.errores }
            }
          })
          const lista = Object.values(porUsuario)
            .sort((a, b) => b.puntuacion - a.puntuacion)
            .slice(0, 10)
          setRanking(lista)
        }
      } catch { setRanking([]) }
      setCargando(false)
    }
    cargar()
  }, [juegoActivo])

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />

      <div className="relative flex-1">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(109,40,217,0.15),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.04) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="relative z-10 max-w-3xl mx-auto w-full px-4 py-12">

          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-purple-950/50 border border-purple-600/30 text-purple-300 text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-widest mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Tabla global
            </div>
            <h1 className="text-4xl font-extrabold">Ranking</h1>
            <p className="text-gray-500 mt-2 text-sm">Los mejores jugadores de PlayRoom</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1.5">
            {JUEGOS.map(j => (
              <button
                key={j.id}
                onClick={() => setJuegoActivo(j.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  juegoActivo === j.id
                    ? 'bg-purple-600 text-white shadow-[0_0_16px_rgba(139,92,246,0.25)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <span>{j.icono}</span>
                <span>{j.nombre}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          {cargando ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : ranking.length === 0 ? (
            <EmptyState
              icon={juego.tipo === 'victorias' ? 'cards' : juego.id === 'sudoku' || juego.id === 'palabras' ? 'chart' : 'gamepad'}
              title="Nadie en el ranking todavía"
              description={`Sé el primero en aparecer. Jugá ${juego.nombre} para sumar puntos.`}
              action={{ label: `Jugar ${juego.nombre}`, to: juego.id === 'truco' ? '/juegos/truco-online' : `/juegos/${juego.id}` }}
            />
          ) : juego.tipo === 'victorias' ? (

            /* ── Truco ── */
            <div className="flex flex-col gap-3">
              {ranking.map((jugador, i) => {
                const medalla = MEDALLA(i)
                return (
                  <div key={i} className={`flex items-center gap-4 bg-white/[0.03] border rounded-2xl px-5 py-4 transition-all ${
                    i === 0 ? 'border-yellow-500/30 bg-yellow-500/[0.02]'
                    : i === 1 ? 'border-gray-400/20'
                    : i === 2 ? 'border-orange-500/20'
                    : 'border-white/[0.06]'
                  }`}>
                    <div className="w-7 text-center flex-shrink-0">
                      {medalla
                        ? <span className="text-xl">{medalla}</span>
                        : <span className="text-gray-600 text-sm font-bold tabular-nums">{i + 1}</span>
                      }
                    </div>
                    <div className="w-9 h-9 rounded-full bg-purple-900/60 border border-purple-600/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-extrabold text-xs">{jugador.nombre.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm truncate">{jugador.nombre}</p>
                      <p className="text-gray-600 text-xs">{jugador.partidas} partidas</p>
                    </div>
                    <div className="flex gap-5 text-center flex-shrink-0">
                      <div>
                        <p className="text-green-400 font-extrabold text-lg leading-none tabular-nums">{jugador.victorias}</p>
                        <p className="text-gray-600 text-[10px] mt-0.5">victorias</p>
                      </div>
                      <div>
                        <p className="text-red-400 font-extrabold text-lg leading-none tabular-nums">{jugador.derrotas}</p>
                        <p className="text-gray-600 text-[10px] mt-0.5">derrotas</p>
                      </div>
                      <div>
                        <p className="text-purple-400 font-extrabold text-lg leading-none tabular-nums">{jugador.winrate}%</p>
                        <p className="text-gray-600 text-[10px] mt-0.5">winrate</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

          ) : juego.tipo === 'racha' ? (

            /* ── Adivina la Palabra ── */
            <div className="flex flex-col gap-3">
              {ranking.map((jugador, i) => {
                const medalla = MEDALLA(i)
                return (
                  <div key={i} className={`flex items-center gap-4 bg-white/[0.03] border rounded-2xl px-5 py-4 transition-all ${
                    i === 0 ? 'border-yellow-500/30 bg-yellow-500/[0.02]'
                    : i === 1 ? 'border-gray-400/20'
                    : i === 2 ? 'border-orange-500/20'
                    : 'border-white/[0.06]'
                  }`}>
                    <div className="w-7 text-center flex-shrink-0">
                      {medalla
                        ? <span className="text-xl">{medalla}</span>
                        : <span className="text-gray-600 text-sm font-bold tabular-nums">{i + 1}</span>
                      }
                    </div>
                    <div className="w-9 h-9 rounded-full bg-purple-900/60 border border-purple-600/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-extrabold text-xs">{jugador.nombre.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm truncate">{jugador.nombre}</p>
                      <p className="text-gray-600 text-xs">Adivina la Palabra</p>
                    </div>
                    <div className="flex gap-5 text-center flex-shrink-0">
                      <div>
                        <p className="text-green-400 font-extrabold text-lg leading-none tabular-nums">{jugador.racha}</p>
                        <p className="text-gray-600 text-[10px] mt-0.5">racha</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

          ) : (

            /* ── Sudoku / Buscaminas ── */
            <div className="flex flex-col gap-3">
              {ranking.map((jugador, i) => {
                const medalla = MEDALLA(i)
                return (
                  <div key={i} className={`flex items-center gap-4 bg-white/[0.03] border rounded-2xl px-5 py-4 transition-all ${
                    i === 0 ? 'border-yellow-500/30 bg-yellow-500/[0.02]'
                    : i === 1 ? 'border-gray-400/20'
                    : i === 2 ? 'border-orange-500/20'
                    : 'border-white/[0.06]'
                  }`}>
                    <div className="w-7 text-center flex-shrink-0">
                      {medalla
                        ? <span className="text-xl">{medalla}</span>
                        : <span className="text-gray-600 text-sm font-bold tabular-nums">{i + 1}</span>
                      }
                    </div>
                    <div className="w-9 h-9 rounded-full bg-purple-900/60 border border-purple-600/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-extrabold text-xs">{jugador.nombre.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm truncate">{jugador.nombre}</p>
                      <span className={`text-xs font-semibold ${DIFF_COLOR[jugador.dificultad] || 'text-gray-400'}`}>
                        {DIFF_LABEL[jugador.dificultad] || jugador.dificultad}
                      </span>
                    </div>
                    <div className="flex gap-5 text-center flex-shrink-0">
                      <div>
                        <p className="text-purple-400 font-extrabold text-lg leading-none tabular-nums">
                          {(jugador.puntuacion || 0).toLocaleString()}
                        </p>
                        <p className="text-gray-600 text-[10px] mt-0.5">puntos</p>
                      </div>
                      {jugador.tiempo != null && (
                        <div>
                          <p className="text-gray-300 font-bold text-base leading-none tabular-nums">{formatTiempo(jugador.tiempo)}</p>
                          <p className="text-gray-600 text-[10px] mt-0.5">tiempo</p>
                        </div>
                      )}
                      {jugador.errores != null && (
                        <div>
                          <p className={`font-bold text-base leading-none tabular-nums ${jugador.errores > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {jugador.errores}
                          </p>
                          <p className="text-gray-600 text-[10px] mt-0.5">errores</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
