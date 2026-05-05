import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateProfile } from 'firebase/auth'
import { doc, setDoc, getDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import EmptyState from '../components/EmptyState'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Avatar from '../components/Avatar'

const AVATARES_PRESET = [
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Felix',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Mia',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Jasper',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Luna',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Nova',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Ranger',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Ghost',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Storm',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Blaze',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Neon',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Shadow',
]

const DIFF_LABEL = {
  facil: 'Fácil', medio: 'Medio', dificil: 'Difícil',
  experto: 'Experto', maestro: 'Maestro', extremo: 'Extremo',
}
const DIFF_COLOR = {
  facil: 'text-green-400', medio: 'text-blue-400', dificil: 'text-yellow-400',
  experto: 'text-orange-400', maestro: 'text-red-400', extremo: 'text-purple-400',
}

const JUEGOS_CATALOG = [
  { id: 'truco',        nombre: 'Truco vs Máquina', icono: '🃏', ruta: '/juegos/truco'        },
  { id: 'truco-online', nombre: 'Truco Online',     icono: '🌐', ruta: '/juegos/truco-online'  },
  { id: 'sudoku',       nombre: 'Sudoku',           icono: '🔢', ruta: '/juegos/sudoku'        },
  { id: 'buscaminas',   nombre: 'Buscaminas',       icono: '💣', ruta: '/juegos/buscaminas'    },
  { id: 'banderas',     nombre: 'Banderas',         icono: '🏳️', ruta: '/juegos/banderas'      },
  { id: 'capitales',    nombre: 'Capitales',        icono: '🌍', ruta: '/juegos/capitales'     },
]

function fmt(s) {
  const m = Math.floor(s / 60), sec = s % 60
  return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`
}

function timeAgo(date) {
  if (!date) return ''
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60)       return 'Hace un momento'
  if (diff < 3600)     return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400)    return `Hace ${Math.floor(diff / 3600)}h`
  if (diff < 604800)   return `Hace ${Math.floor(diff / 86400)}d`
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export default function Perfil() {
  const { usuario, refrescarUsuario } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab]             = useState('resumen')
  const [cargando, setCargando]   = useState(true)
  const [stats, setStats]         = useState(null)
  const [historial, setHistorial] = useState([])
  const [favoritos, setFavoritos] = useState([])

  // Edit form
  const [nombre, setNombre]       = useState('')
  const [avatarSel, setAvatarSel] = useState('')
  const [urlCustom, setUrlCustom] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]         = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (!usuario) { navigate('/login'); return }
    setNombre(usuario.displayName || '')
    setAvatarSel(usuario.photoURL || '')
    cargarDatos()
  }, [usuario?.uid])

  const cargarDatos = async () => {
    if (!usuario) return
    setCargando(true)
    try {
      // Load favorites from Firestore
      const userDoc = await getDoc(doc(db, 'users', usuario.uid)).catch(() => null)
      if (userDoc?.exists()) setFavoritos(userDoc.data().favoritos || [])

      // Load game stats concurrently
      const [trucoSnap, sudokuSnap, buscaminasSnap] = await Promise.all([
        getDocs(query(collection(db, 'ranking_truco'),      where('uid', '==', usuario.uid))).catch(() => null),
        getDocs(query(collection(db, 'ranking_sudoku'),     where('uid', '==', usuario.uid))).catch(() => null),
        getDocs(query(collection(db, 'ranking_buscaminas'), where('uid', '==', usuario.uid))).catch(() => null),
      ])

      // Process truco
      let truco = { partidas: 0, victorias: 0, derrotas: 0 }
      trucoSnap?.forEach(d => {
        const data = d.data(); truco.partidas++
        if (data.resultado === 'victoria') truco.victorias++; else truco.derrotas++
      })

      // Process sudoku
      let sudoku = { partidas: 0, mejorPuntuacion: 0, mejorDificultad: null, menorErrores: null }
      sudokuSnap?.forEach(d => {
        const data = d.data(); sudoku.partidas++
        if ((data.puntuacion || 0) > sudoku.mejorPuntuacion) {
          sudoku.mejorPuntuacion = data.puntuacion || 0
          sudoku.mejorDificultad = data.dificultad
          sudoku.menorErrores = data.errores
        }
      })

      // Process buscaminas
      let buscaminas = { partidas: 0, mejorPuntuacion: 0, mejorDificultad: null }
      buscaminasSnap?.forEach(d => {
        const data = d.data(); buscaminas.partidas++
        if ((data.puntuacion || 0) > buscaminas.mejorPuntuacion) {
          buscaminas.mejorPuntuacion = data.puntuacion || 0
          buscaminas.mejorDificultad = data.dificultad
        }
      })

      setStats({ truco, sudoku, buscaminas })

      // Build merged history
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
      setHistorial(entries.slice(0, 20))
    } catch { /* silent */ }
    setCargando(false)
  }

  const handleGuardar = async () => {
    if (!auth.currentUser) return
    setGuardando(true); setError('')
    try {
      const newPhoto = urlCustom.trim() || avatarSel || usuario?.photoURL || ''
      const newName  = nombre.trim() || usuario?.displayName || ''

      // Update Firebase Auth
      await updateProfile(auth.currentUser, { displayName: newName, photoURL: newPhoto })

      // Write to Firestore so other users can read it
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: newName,
        photoURL: newPhoto,
        updatedAt: serverTimestamp(),
      }, { merge: true })

      await refrescarUsuario()
      setExito(true); setUrlCustom('')
      setTimeout(() => setExito(false), 3000)
    } catch { setError('No se pudo guardar. Intentá de nuevo.') }
    finally { setGuardando(false) }
  }

  const toggleFavorito = async (id) => {
    if (!usuario) return
    const nuevo = favoritos.includes(id) ? favoritos.filter(f => f !== id) : [...favoritos, id]
    setFavoritos(nuevo)
    setDoc(doc(db, 'users', usuario.uid), { favoritos: nuevo, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {})
  }

  const avatarPreview  = urlCustom.trim() || avatarSel || null
  const usuarioPreview = { ...usuario, displayName: nombre || usuario?.displayName, photoURL: avatarPreview }

  const totalPartidas = stats ? stats.truco.partidas + stats.sudoku.partidas + stats.buscaminas.partidas : 0
  const masjugado = stats
    ? Object.entries({ 'Truco': stats.truco.partidas, 'Sudoku': stats.sudoku.partidas, 'Buscaminas': stats.buscaminas.partidas })
        .sort((a, b) => b[1] - a[1])[0]
    : null

  if (!usuario) return null

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />

      <div className="relative flex-1">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(109,40,217,0.15),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.04) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="relative z-10 max-w-2xl mx-auto w-full px-4 py-10 flex flex-col gap-6">

          {/* ── Header de perfil ── */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6 flex items-center gap-5">
            <Avatar usuario={usuario} size="xl" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold text-white truncate">{usuario.displayName || 'Sin nombre'}</h1>
              <p className="text-gray-500 text-sm truncate">{usuario.email}</p>
              {totalPartidas > 0 && (
                <div className="flex gap-3 mt-2">
                  <span className="text-[10px] font-semibold bg-purple-950/60 border border-purple-700/30 text-purple-300 px-2.5 py-1 rounded-full">
                    {totalPartidas} partidas jugadas
                  </span>
                  {masjugado?.[1] > 0 && (
                    <span className="text-[10px] font-semibold bg-white/[0.04] border border-white/[0.08] text-gray-400 px-2.5 py-1 rounded-full">
                      Más jugado: {masjugado[0]}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1.5">
            {[
              { id: 'resumen',  label: 'Resumen'  },
              { id: 'historial',label: 'Historial' },
              { id: 'editar',   label: 'Editar perfil' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                  tab === t.id
                    ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.25)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── RESUMEN ── */}
          {tab === 'resumen' && (
            <div className="flex flex-col gap-4">
              {cargando ? (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Estadísticas */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-1">Estadísticas</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                      {/* Truco */}
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🃏</span>
                          <p className="text-sm font-bold text-white">Truco</p>
                        </div>
                        {stats?.truco.partidas > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Partidas</span>
                              <span className="text-white font-semibold tabular-nums">{stats.truco.partidas}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Victorias</span>
                              <span className="text-green-400 font-semibold tabular-nums">{stats.truco.victorias}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Winrate</span>
                              <span className="text-purple-400 font-semibold tabular-nums">
                                {stats.truco.partidas > 0 ? Math.round(stats.truco.victorias / stats.truco.partidas * 100) : 0}%
                              </span>
                            </div>
                            <div className="w-full bg-white/[0.06] rounded-full h-1 mt-1 overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${stats.truco.partidas > 0 ? Math.round(stats.truco.victorias / stats.truco.partidas * 100) : 0}%` }} />
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-600 text-xs italic">Sin partidas aún</p>
                        )}
                      </div>

                      {/* Sudoku */}
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🔢</span>
                          <p className="text-sm font-bold text-white">Sudoku</p>
                        </div>
                        {stats?.sudoku.partidas > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Partidas</span>
                              <span className="text-white font-semibold tabular-nums">{stats.sudoku.partidas}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Mejor score</span>
                              <span className="text-purple-400 font-semibold tabular-nums">{(stats.sudoku.mejorPuntuacion || 0).toLocaleString()}</span>
                            </div>
                            {stats.sudoku.mejorDificultad && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Dificultad</span>
                                <span className={`font-semibold ${DIFF_COLOR[stats.sudoku.mejorDificultad] || 'text-gray-400'}`}>
                                  {DIFF_LABEL[stats.sudoku.mejorDificultad] || stats.sudoku.mejorDificultad}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-600 text-xs italic">Sin partidas aún</p>
                        )}
                      </div>

                      {/* Buscaminas */}
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">💣</span>
                          <p className="text-sm font-bold text-white">Buscaminas</p>
                        </div>
                        {stats?.buscaminas.partidas > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Partidas</span>
                              <span className="text-white font-semibold tabular-nums">{stats.buscaminas.partidas}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Mejor score</span>
                              <span className="text-purple-400 font-semibold tabular-nums">{(stats.buscaminas.mejorPuntuacion || 0).toLocaleString()}</span>
                            </div>
                            {stats.buscaminas.mejorDificultad && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Dificultad</span>
                                <span className={`font-semibold ${DIFF_COLOR[stats.buscaminas.mejorDificultad] || 'text-gray-400'}`}>
                                  {DIFF_LABEL[stats.buscaminas.mejorDificultad] || stats.buscaminas.mejorDificultad}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-600 text-xs italic">Sin partidas aún</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Favoritos */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-1">Juegos favoritos</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {JUEGOS_CATALOG.map(juego => {
                        const esFav = favoritos.includes(juego.id)
                        return (
                          <button key={juego.id} onClick={() => toggleFavorito(juego.id)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all text-left ${
                              esFav
                                ? 'bg-purple-950/50 border-purple-600/40 text-white'
                                : 'bg-white/[0.02] border-white/[0.06] text-gray-500 hover:text-gray-300 hover:border-white/[0.12]'
                            }`}>
                            <span className="text-base">{juego.icono}</span>
                            <span className="flex-1 truncate text-xs">{juego.nombre}</span>
                            <svg viewBox="0 0 24 24" fill={esFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"
                              className={`w-3.5 h-3.5 flex-shrink-0 ${esFav ? 'text-yellow-400' : 'text-gray-700'}`}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
                            </svg>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Historial reciente (preview) */}
                  {historial.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Actividad reciente</p>
                        <button onClick={() => setTab('historial')} className="text-[10px] text-purple-400 hover:text-purple-300 transition">Ver todo →</button>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {historial.slice(0, 4).map((e, i) => <HistorialRow key={i} entry={e} />)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── HISTORIAL ── */}
          {tab === 'historial' && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-1">Últimas {historial.length} partidas</p>
              {cargando ? (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              ) : historial.length === 0 ? (
                <EmptyState icon="history" title="Sin actividad todavía" description="Jugá una partida para ver tu historial acá." action={{ label: 'Ir a jugar', to: '/juegos' }} />
              ) : (
                <div className="flex flex-col gap-1.5">
                  {historial.map((e, i) => <HistorialRow key={i} entry={e} />)}
                </div>
              )}
            </div>
          )}

          {/* ── EDITAR PERFIL ── */}
          {tab === 'editar' && (
            <div className="flex flex-col gap-4">

              {/* Preview */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 flex items-center gap-4">
                <Avatar usuario={usuarioPreview} size="xl" />
                <div className="min-w-0">
                  <p className="text-white font-bold text-base truncate">{nombre || usuario?.displayName || 'Sin nombre'}</p>
                  <p className="text-gray-500 text-sm truncate">{usuario?.email}</p>
                </div>
              </div>

              {/* Nombre */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-3">
                <p className="text-sm font-semibold text-gray-300">Nombre de usuario</p>
                <input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  maxLength={30}
                  className="bg-white/[0.04] border border-white/[0.08] focus:border-purple-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition placeholder-gray-600"
                />
              </div>

              {/* Avatar preset */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4">
                <p className="text-sm font-semibold text-gray-300">Elegí un avatar</p>
                <div className="grid grid-cols-6 gap-2.5">
                  {AVATARES_PRESET.map(url => {
                    const sel = avatarSel === url && !urlCustom.trim()
                    return (
                      <button key={url} onClick={() => { setAvatarSel(url); setUrlCustom('') }}
                        className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${sel ? 'border-purple-500 scale-105 shadow-lg shadow-purple-900/50' : 'border-white/[0.08] hover:border-white/[0.20]'}`}>
                        <img src={url} alt="" className="w-full h-full object-cover bg-[#07070f]" />
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
                  <p className="text-xs text-gray-500">O pegá la URL de tu foto</p>
                  <input
                    value={urlCustom}
                    onChange={e => setUrlCustom(e.target.value)}
                    placeholder="https://..."
                    className="bg-white/[0.04] border border-white/[0.08] focus:border-purple-500/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition placeholder-gray-600"
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-sm bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-2.5">{error}</p>}
              {exito && <p className="text-green-400 text-sm bg-green-950/40 border border-green-800/40 rounded-xl px-4 py-2.5">✓ Perfil actualizado correctamente</p>}

              <button onClick={handleGuardar} disabled={guardando}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-bold text-sm transition-all hover:shadow-[0_0_24px_rgba(139,92,246,0.3)]">
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </div>
  )
}

function HistorialRow({ entry }) {
  const ICONS = { truco: '🃏', sudoku: '🔢', buscaminas: '💣' }
  const NOMBRES = { truco: 'Truco', sudoku: 'Sudoku', buscaminas: 'Buscaminas' }

  return (
    <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-2.5">
      <span className="text-base w-6 text-center flex-shrink-0">{ICONS[entry.tipo] || '🎮'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-xs font-semibold">{NOMBRES[entry.tipo] || entry.tipo}</span>
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
