import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import Navbar from '../components/Navbar'
import { usePageTitle } from '../hooks/usePageTitle'
import Footer from '../components/Footer'
import EmptyState from '../components/EmptyState'

const DIFF_LABEL = {
  facil: 'Fácil', medio: 'Medio', dificil: 'Difícil',
  experto: 'Experto', maestro: 'Maestro', extremo: 'Extremo',
}
const DIFF_COLOR = {
  facil: 'text-green-400', medio: 'text-blue-400', dificil: 'text-yellow-400',
  experto: 'text-orange-400', maestro: 'text-red-400', extremo: 'text-purple-400',
}
const JUEGOS_CATALOG = [
  { id: 'truco',        nombre: 'Truco vs Máquina', icono: 'TR' },
  { id: 'truco-online', nombre: 'Truco Online',     icono: 'TO' },
  { id: 'sudoku',       nombre: 'Sudoku',           icono: 'SU' },
  { id: 'buscaminas',   nombre: 'Buscaminas',       icono: 'BU' },
  { id: 'banderas',     nombre: 'Banderas',         icono: 'BA' },
  { id: 'capitales',    nombre: 'Capitales',        icono: 'CA' },
]

function fmt(s) {
  const m = Math.floor(s / 60), sec = s % 60
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}
function timeAgo(date) {
  if (!date) return ''
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60)     return 'Hace un momento'
  if (diff < 3600)   return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400)  return `Hace ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `Hace ${Math.floor(diff / 86400)}d`
  return date.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' })
}

export default function PerfilPublico() {
  usePageTitle('Perfil')
  const { uid } = useParams()

  const [perfil, setPerfil]       = useState(null)   // { displayName, photoURL, favoritos }
  const [stats, setStats]         = useState(null)
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando]   = useState(true)
  const [noExiste, setNoExiste]   = useState(false)

  useEffect(() => {
    if (!uid) return
    cargarPerfil()
  }, [uid])

  const cargarPerfil = async () => {
    setCargando(true)
    try {
      // Load profile doc and ranking data concurrently
      const [userDoc, trucoSnap, sudokuSnap, buscaminasSnap] = await Promise.all([
        getDoc(doc(db, 'users', uid)).catch(() => null),
        getDocs(query(collection(db, 'ranking_truco'),      where('uid', '==', uid))).catch(() => null),
        getDocs(query(collection(db, 'ranking_sudoku'),     where('uid', '==', uid))).catch(() => null),
        getDocs(query(collection(db, 'ranking_buscaminas'), where('uid', '==', uid))).catch(() => null),
      ])

      // Build profile — if no Firestore doc, fall back to nombre from any ranking entry
      if (userDoc?.exists()) {
        setPerfil(userDoc.data())
      } else {
        let nombre = null
        trucoSnap?.forEach(d => { if (!nombre) nombre = d.data().nombre })
        sudokuSnap?.forEach(d => { if (!nombre) nombre = d.data().nombre })
        buscaminasSnap?.forEach(d => { if (!nombre) nombre = d.data().nombre })
        setPerfil({ displayName: nombre || null, photoURL: '', favoritos: [] })
      }

      let truco = { partidas: 0, victorias: 0, derrotas: 0 }
      trucoSnap?.forEach(d => {
        const data = d.data(); truco.partidas++
        if (data.resultado === 'victoria') truco.victorias++; else truco.derrotas++
      })

      let sudoku = { partidas: 0, mejorPuntuacion: 0, mejorDificultad: null }
      sudokuSnap?.forEach(d => {
        const data = d.data(); sudoku.partidas++
        if ((data.puntuacion || 0) > sudoku.mejorPuntuacion) {
          sudoku.mejorPuntuacion = data.puntuacion || 0
          sudoku.mejorDificultad = data.dificultad
        }
      })

      let buscaminas = { partidas: 0, mejorPuntuacion: 0, mejorDificultad: null }
      buscaminasSnap?.forEach(d => {
        const data = d.data(); buscaminas.partidas++
        if ((data.puntuacion || 0) > buscaminas.mejorPuntuacion) {
          buscaminas.mejorPuntuacion = data.puntuacion || 0
          buscaminas.mejorDificultad = data.dificultad
        }
      })

      setStats({ truco, sudoku, buscaminas })

      // Merge history
      const entries = []
      trucoSnap?.forEach(d => {
        const data = d.data()
        entries.push({ tipo: 'truco', resultado: data.resultado, fecha: data.fecha?.toDate?.() || null })
      })
      sudokuSnap?.forEach(d => {
        const data = d.data()
        entries.push({ tipo: 'sudoku', puntuacion: data.puntuacion, dificultad: data.dificultad, tiempo: data.tiempo, errores: data.errores, fecha: data.fecha?.toDate?.() || null })
      })
      buscaminasSnap?.forEach(d => {
        const data = d.data()
        entries.push({ tipo: 'buscaminas', puntuacion: data.puntuacion, dificultad: data.dificultad, tiempo: data.tiempo, fecha: data.fecha?.toDate?.() || null })
      })
      entries.sort((a, b) => (b.fecha || 0) - (a.fecha || 0))
      setHistorial(entries.slice(0, 15))

    } catch { setNoExiste(true) }
    setCargando(false)
  }

  const totalPartidas = stats ? stats.truco.partidas + stats.sudoku.partidas + stats.buscaminas.partidas : 0
  const iniciales = (perfil?.displayName || 'J').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />

      <div className="relative flex-1">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(109,40,217,0.15),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.04) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="relative z-10 max-w-2xl mx-auto w-full px-4 py-10 flex flex-col gap-6">

          {cargando ? (
            <div className="flex justify-center py-24">
              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : noExiste ? (
            <EmptyState icon="user" title="Perfil no encontrado" description="Este jugador todavía no tiene un perfil público." action={{ label: 'Volver al inicio', to: '/' }} size="lg" />
          ) : (
            <>
              {/* Header */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6 flex items-center gap-5">
                {perfil?.photoURL ? (
                  <img src={perfil.photoURL} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-purple-500/40 flex-shrink-0"
                    onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }} />
                ) : null}
                <div className={`w-20 h-20 rounded-full bg-purple-800 border-2 border-purple-500/40 flex items-center justify-center text-2xl font-extrabold text-white flex-shrink-0 ${perfil?.photoURL ? 'hidden' : 'flex'}`}>
                  {iniciales}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-extrabold text-white truncate">{perfil?.displayName || 'Jugador'}</h1>
                  {totalPartidas > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[10px] font-semibold bg-purple-950/60 border border-purple-700/30 text-purple-300 px-2.5 py-1 rounded-full">
                        {totalPartidas} partidas jugadas
                      </span>
                      {stats?.truco.victorias > 0 && (
                        <span className="text-[10px] font-semibold bg-green-950/50 border border-green-700/25 text-green-400 px-2.5 py-1 rounded-full">
                          {stats.truco.victorias} victorias en Truco
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Estadísticas */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-1">Estadísticas</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  {/* Truco */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-200 text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">TR</span>
                      <p className="text-sm font-bold text-white">Truco</p>
                    </div>
                    {stats?.truco.partidas > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        <Row label="Partidas" value={stats.truco.partidas} />
                        <Row label="Victorias" value={stats.truco.victorias} color="text-green-400" />
                        <Row label="Winrate" value={`${Math.round(stats.truco.victorias / stats.truco.partidas * 100)}%`} color="text-purple-400" />
                        <div className="w-full bg-white/[0.06] rounded-full h-1 mt-1 overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.round(stats.truco.victorias / stats.truco.partidas * 100)}%` }} />
                        </div>
                      </div>
                    ) : <p className="text-gray-600 text-xs italic">Sin partidas aún</p>}
                  </div>

                  {/* Sudoku */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-200 text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">SU</span>
                      <p className="text-sm font-bold text-white">Sudoku</p>
                    </div>
                    {stats?.sudoku.partidas > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        <Row label="Partidas" value={stats.sudoku.partidas} />
                        <Row label="Mejor score" value={(stats.sudoku.mejorPuntuacion || 0).toLocaleString()} color="text-purple-400" />
                        {stats.sudoku.mejorDificultad && (
                          <Row label="Dificultad" value={DIFF_LABEL[stats.sudoku.mejorDificultad] || stats.sudoku.mejorDificultad} color={DIFF_COLOR[stats.sudoku.mejorDificultad]} />
                        )}
                      </div>
                    ) : <p className="text-gray-600 text-xs italic">Sin partidas aún</p>}
                  </div>

                  {/* Buscaminas */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-200 text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">BU</span>
                      <p className="text-sm font-bold text-white">Buscaminas</p>
                    </div>
                    {stats?.buscaminas.partidas > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        <Row label="Partidas" value={stats.buscaminas.partidas} />
                        <Row label="Mejor score" value={(stats.buscaminas.mejorPuntuacion || 0).toLocaleString()} color="text-purple-400" />
                        {stats.buscaminas.mejorDificultad && (
                          <Row label="Dificultad" value={DIFF_LABEL[stats.buscaminas.mejorDificultad] || stats.buscaminas.mejorDificultad} color={DIFF_COLOR[stats.buscaminas.mejorDificultad]} />
                        )}
                      </div>
                    ) : <p className="text-gray-600 text-xs italic">Sin partidas aún</p>}
                  </div>
                </div>
              </div>

              {/* Favoritos */}
              {perfil?.favoritos?.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-1">Juegos favoritos</p>
                  <div className="flex flex-wrap gap-2">
                    {perfil.favoritos.map(id => {
                      const j = JUEGOS_CATALOG.find(g => g.id === id)
                      if (!j) return null
                      return (
                        <span key={id} className="flex items-center gap-1.5 bg-purple-950/50 border border-purple-600/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl">
                          <span className="text-[9px] font-extrabold text-purple-300 opacity-70">{j.icono}</span>
                          {j.nombre}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Historial */}
              {historial.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-1">Actividad reciente</p>
                  <div className="flex flex-col gap-1.5">
                    {historial.map((e, i) => <HistorialRow key={i} entry={e} />)}
                  </div>
                </div>
              )}

              {totalPartidas === 0 && (
                <EmptyState icon="gamepad" title="Sin partidas registradas" description="Este jugador todavía no tiene partidas guardadas." />
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}

function Row({ label, value, color = 'text-white' }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  )
}

const HIST_ABBR_PUB  = { truco: 'TR', sudoku: 'SU', buscaminas: 'BU' }
const HIST_NOMBRES_PUB = { truco: 'Truco', sudoku: 'Sudoku', buscaminas: 'Buscaminas' }

function HistorialRow({ entry }) {
  return (
    <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-2.5">
      <span className="w-6 h-6 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-200 text-[9px] font-extrabold flex items-center justify-center flex-shrink-0">
        {HIST_ABBR_PUB[entry.tipo] || 'PL'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-xs font-semibold">{HIST_NOMBRES_PUB[entry.tipo] || entry.tipo}</span>
          {entry.dificultad && (
            <span className={`text-[10px] font-semibold ${DIFF_COLOR[entry.dificultad] || 'text-gray-400'}`}>
              {DIFF_LABEL[entry.dificultad] || entry.dificultad}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {entry.tipo === 'truco' ? (
            <span className={`text-[10px] font-semibold ${entry.resultado === 'victoria' ? 'text-green-400' : 'text-red-400'}`}>
              {entry.resultado === 'victoria' ? '✓ Victoria' : '✗ Derrota'}
            </span>
          ) : (
            <>
              <span className="text-purple-400 text-[10px] font-semibold tabular-nums">{(entry.puntuacion || 0).toLocaleString()} pts</span>
              {entry.tiempo != null && <span className="text-gray-600 text-[10px] tabular-nums">{fmt(entry.tiempo)}</span>}
              {entry.errores != null && entry.errores > 0 && (
                <span className="text-red-400/70 text-[10px]">{entry.errores} error{entry.errores !== 1 ? 'es' : ''}</span>
              )}
            </>
          )}
        </div>
      </div>
      {entry.fecha && <span className="text-gray-600 text-[10px] flex-shrink-0 tabular-nums">{timeAgo(entry.fecha)}</span>}
    </div>
  )
}
