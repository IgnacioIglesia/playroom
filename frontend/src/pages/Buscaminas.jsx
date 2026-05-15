import { useState, useEffect, useCallback, useRef } from 'react'
import Navbar from '../components/Navbar'
import { usePageTitle } from '../hooks/usePageTitle'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { useNavigationGuard } from '../context/NavigationGuardContext'
import EmptyState from '../components/EmptyState'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore'

// ── Configuración de dificultades ──────────────────────────────────────────
const DIFICULTADES = {
  facil:   { label: 'Fácil',   rows: 9,  cols: 9,  mines: 10, cellSize: 46, color: 'text-green-400',  border: 'hover:border-green-500/40'  },
  medio:   { label: 'Medio',   rows: 16, cols: 16, mines: 40, cellSize: 36, color: 'text-blue-400',   border: 'hover:border-blue-500/40'   },
  experto: { label: 'Experto', rows: 16, cols: 30, mines: 99, cellSize: 30, color: 'text-red-400',    border: 'hover:border-red-500/40'    },
}

const NUM_COLORS = {
  1: 'text-blue-400', 2: 'text-green-400', 3: 'text-red-400',    4: 'text-indigo-400',
  5: 'text-red-600',  6: 'text-cyan-400',  7: 'text-purple-400', 8: 'text-gray-400',
}

const PUNTUACION_BASE = { facil: 500, medio: 2000, experto: 6000 }
const TIEMPO_MAX      = { facil: 300, medio: 600,  experto: 999  }

function calcularPuntuacion(dificultad, segundos) {
  const base  = PUNTUACION_BASE[dificultad] || 1000
  const tmax  = TIEMPO_MAX[dificultad]      || 600
  const bonus = Math.max(0, Math.round(base * 0.7 * (1 - segundos / tmax)))
  return base + bonus
}

function crearCelda() {
  return { isMine: false, isRevealed: false, isFlagged: false, neighbors: 0, isExploded: false }
}

function generarTablero(rows, cols, mines, safeR, safeC) {
  const board = Array(rows).fill(null).map(() => Array(cols).fill(null).map(crearCelda))

  const safeZone = new Set()
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const nr = safeR + dr, nc = safeC + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols)
        safeZone.add(nr * cols + nc)
    }

  const positions = []
  for (let i = 0; i < rows * cols; i++)
    if (!safeZone.has(i)) positions.push(i)

  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[positions[i], positions[j]] = [positions[j], positions[i]]
  }

  for (let i = 0; i < mines && i < positions.length; i++) {
    const r = Math.floor(positions[i] / cols), c = positions[i] % cols
    board[r][c].isMine = true
  }

  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (board[r][c].isMine) continue
      let count = 0
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) count++
        }
      board[r][c].neighbors = count
    }

  return board
}

function floodReveal(board, startR, startC, rows, cols) {
  const next = board.map(row => row.map(cell => ({ ...cell })))
  const stack = [[startR, startC]]
  const visited = new Set()

  while (stack.length > 0) {
    const [r, c] = stack.pop()
    const key = r * cols + c
    if (visited.has(key)) continue
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue
    if (next[r][c].isRevealed || next[r][c].isFlagged || next[r][c].isMine) continue
    visited.add(key)
    next[r][c].isRevealed = true
    if (next[r][c].neighbors === 0)
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if (dr !== 0 || dc !== 0) stack.push([r + dr, c + dc])
  }
  return next
}

const FlagIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4 21V4.5L5.5 3l8 4 4-2v10l-4 2-8-4V21H4z"/>
  </svg>
)

const MineIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="12" r="5"/>
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M16.9 16.9l1.4 1.4M5.6 18.4l1.4-1.4M16.9 7.1l1.4-1.4"/>
  </svg>
)

// ── Componente principal ────────────────────────────────────────────────────
export default function Buscaminas() {
  usePageTitle('Buscaminas')
  const { usuario } = useAuth()
  const { setGuard, clearGuard } = useNavigationGuard()

  const [pantalla, setPantalla]     = useState('menu')
  const [dificultad, setDificultad] = useState(null)
  const [board, setBoard]           = useState(null)
  const [gameState, setGameState]   = useState('idle') // idle | playing | won | lost
  const [tiempo, setTiempo]         = useState(0)
  const [flagsUsed, setFlagsUsed]   = useState(0)
  const [firstClick, setFirstClick] = useState(true)
  const [puntuacion, setPuntuacion] = useState(0)
  const [guardado, setGuardado]     = useState(false)
  const [modoFlag, setModoFlag]     = useState(false)
  const [ranking, setRanking]       = useState([])
  const [partidaGuardada, setPartidaGuardada] = useState(() => {
    try {
      const s = localStorage.getItem('playroom_buscaminas_save')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })

  const diff         = dificultad ? DIFICULTADES[dificultad] : null
  const minesTotal   = diff?.mines || 0
  const flagsLeft    = minesTotal - flagsUsed
  const fmt          = s => `${Math.floor(s / 60).toString().padStart(2,'0')}:${(s % 60).toString().padStart(2,'0')}`

  useEffect(() => {
    if (pantalla === 'juego') setGuard('Si salís ahora perdés tu partida de Buscaminas.')
    else clearGuard()
    return () => clearGuard()
  }, [pantalla])

  useEffect(() => {
    if (gameState !== 'playing') return
    const t = setInterval(() => setTiempo(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [gameState])

  useEffect(() => {
    if (pantalla === 'menu') cargarRanking()
  }, [pantalla])

  useEffect(() => {
    if (!board || firstClick || gameState !== 'playing') return
    try {
      localStorage.setItem('playroom_buscaminas_save', JSON.stringify({ board, tiempo, flagsUsed, dificultad }))
    } catch {}
  }, [board, tiempo])

  const cargarRanking = async () => {
    try {
      const q = query(collection(db, 'ranking_buscaminas'), orderBy('puntuacion', 'desc'), limit(10))
      const snap = await getDocs(q)
      setRanking(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch {}
  }

  const continuarPartida = () => {
    const s = partidaGuardada
    if (!s) return
    setDificultad(s.dificultad)
    setBoard(s.board)
    setGameState('playing')
    setTiempo(s.tiempo || 0)
    setFlagsUsed(s.flagsUsed || 0)
    setFirstClick(false)
    setPuntuacion(0)
    setGuardado(false)
    setModoFlag(false)
    setPantalla('juego')
  }

  const iniciarJuego = (diff) => {
    localStorage.removeItem('playroom_buscaminas_save')
    setPartidaGuardada(null)
    const { rows, cols } = DIFICULTADES[diff]
    setDificultad(diff)
    setBoard(Array(rows).fill(null).map(() => Array(cols).fill(null).map(crearCelda)))
    setGameState('idle')
    setTiempo(0)
    setFlagsUsed(0)
    setFirstClick(true)
    setPuntuacion(0)
    setGuardado(false)
    setModoFlag(false)
    setPantalla('juego')
  }

  const handleCellClick = useCallback(async (r, c) => {
    if (gameState === 'won' || gameState === 'lost') return
    const cell = board[r][c]
    if (cell.isRevealed) return

    // Flag mode (mobile)
    if (modoFlag) {
      handleFlag(r, c)
      return
    }

    if (cell.isFlagged) return

    const { rows, cols, mines } = DIFICULTADES[dificultad]
    let currentBoard = board

    if (firstClick) {
      currentBoard = generarTablero(rows, cols, mines, r, c)
      setFirstClick(false)
      setGameState('playing')
    }

    // Hit mine
    if (currentBoard[r][c].isMine) {
      const exploded = currentBoard.map(row => row.map(cell => ({
        ...cell,
        isRevealed: cell.isMine ? true : cell.isRevealed,
      })))
      exploded[r][c].isExploded = true
      setBoard(exploded)
      setGameState('lost')
      localStorage.removeItem('playroom_buscaminas_save')
      setPartidaGuardada(null)
      setTimeout(() => setPantalla('resultado'), 900)
      return
    }

    // Reveal
    const next = floodReveal(currentBoard, r, c, rows, cols)
    const safeRevealed = next.flat().filter(cl => cl.isRevealed && !cl.isMine).length
    const totalSafe    = rows * cols - mines

    if (safeRevealed === totalSafe) {
      const pts = calcularPuntuacion(dificultad, tiempo)
      setPuntuacion(pts)
      setGameState('won')
      localStorage.removeItem('playroom_buscaminas_save')
      setPartidaGuardada(null)
      if (usuario) {
        try {
          await addDoc(collection(db, 'ranking_buscaminas'), {
            uid: usuario.uid,
            nombre: usuario.displayName || usuario.email?.split('@')[0] || 'Jugador',
            dificultad,
            tiempo,
            puntuacion: pts,
            fecha: serverTimestamp(),
          })
          setGuardado(true)
        } catch {}
      }
      setTimeout(() => setPantalla('resultado'), 600)
    } else {
      setBoard(next)
    }
  }, [board, gameState, firstClick, dificultad, modoFlag, tiempo, usuario])

  const handleFlag = useCallback((r, c) => {
    if (gameState === 'won' || gameState === 'lost') return
    if (board[r][c].isRevealed) return
    const cell = board[r][c]
    if (!cell.isFlagged && flagsLeft <= 0) return
    const next = board.map(row => row.map(cl => ({ ...cl })))
    next[r][c].isFlagged = !next[r][c].isFlagged
    setFlagsUsed(f => next[r][c].isFlagged ? f + 1 : f - 1)
    setBoard(next)
  }, [board, gameState, flagsLeft])

  const handleRightClick = useCallback((e, r, c) => {
    e.preventDefault()
    handleFlag(r, c)
  }, [handleFlag])

  const resetGame = () => iniciarJuego(dificultad)

  const getCellContent = (cell) => {
    if (cell.isFlagged && !cell.isRevealed)
      return <FlagIcon className="w-4 h-4 text-purple-400" />
    if (cell.isRevealed && cell.isMine)
      return <MineIcon className={`w-4 h-4 ${cell.isExploded ? 'text-white' : 'text-red-400'}`} />
    if (cell.isRevealed && cell.neighbors > 0)
      return <span className={`font-bold text-sm leading-none ${NUM_COLORS[cell.neighbors]}`}>{cell.neighbors}</span>
    return null
  }

  const getCellClass = (cell) => {
    if (cell.isRevealed) {
      if (cell.isMine)
        return cell.isExploded
          ? 'bg-red-600/70 border-red-400/60'
          : 'bg-red-950/70 border-red-700/40'
      return 'bg-[#080812] border-white/[0.04]'
    }
    if (cell.isFlagged)
      return 'bg-purple-950/50 border-purple-500/40 cursor-pointer'
    return 'bg-white/[0.07] border-white/[0.10] hover:bg-white/[0.14] hover:border-purple-500/30 cursor-pointer active:scale-95 transition-all'
  }

  // ── MENÚ ──────────────────────────────────────────────────────────────────
  if (pantalla === 'menu') return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(109,40,217,0.18),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="relative z-10 w-full max-w-xl flex flex-col gap-8">
          <div className="text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-900/40 border border-purple-700/25 flex items-center justify-center">
              <MineIcon className="w-7 h-7 text-purple-400" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold">Buscaminas</h1>
              <p className="text-gray-500 mt-1 text-sm">Encontrá todas las minas sin detonar ninguna</p>
            </div>
          </div>

          {partidaGuardada && (
            <div className="bg-white/[0.03] border border-purple-700/25 rounded-3xl p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-semibold text-sm">Partida guardada</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {DIFICULTADES[partidaGuardada.dificultad]?.label} · {fmt(partidaGuardada.tiempo)}
                </p>
              </div>
              <button onClick={continuarPartida}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition flex-shrink-0">
                Continuar →
              </button>
            </div>
          )}

          <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6 flex flex-col gap-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Seleccioná la dificultad</p>
            {Object.entries(DIFICULTADES).map(([key, { label, desc, rows, cols, mines, color, border }]) => (
              <button key={key} onClick={() => iniciarJuego(key)}
                className={`w-full py-4 px-5 rounded-2xl border border-white/[0.07] bg-white/[0.03] ${border} hover:bg-white/[0.06] text-left transition-all group`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`font-bold text-sm ${color}`}>{label}</span>
                  <span className="text-gray-600 text-xs">{cols}×{rows} · {mines} minas</span>
                </div>
                <p className="text-xs text-gray-500">{key === 'facil' ? 'Ideal para aprender' : key === 'medio' ? 'El clásico estándar' : 'Solo para expertos'}</p>
              </button>
            ))}
          </div>

          <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Top 10 Global</p>
              {!usuario && <span className="text-[10px] text-purple-400 border border-purple-700/30 bg-purple-950/40 px-2 py-0.5 rounded-full">Iniciá sesión para aparecer</span>}
            </div>
            {ranking.length === 0
              ? <EmptyState icon="gamepad" title="Sin puntuaciones todavía" description="Ganá una partida para aparecer aquí." size="sm" />
              : <div className="flex flex-col gap-1.5">
                  {ranking.map((e, i) => (
                    <div key={e.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${usuario?.uid === e.uid ? 'bg-purple-950/40 border border-purple-700/25' : 'bg-white/[0.02]'}`}>
                      <span className={`text-sm font-extrabold w-5 text-center tabular-nums ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>{i + 1}</span>
                      <span className="text-white text-sm font-semibold flex-1 truncate">{e.nombre}</span>
                      <span className={`text-xs font-semibold ${DIFICULTADES[e.dificultad]?.color || 'text-gray-400'}`}>{DIFICULTADES[e.dificultad]?.label || e.dificultad}</span>
                      <span className="text-purple-400 font-bold text-sm tabular-nums">{Number(e.puntuacion).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )

  // ── RESULTADO ─────────────────────────────────────────────────────────────
  if (pantalla === 'resultado') {
    const gano = gameState === 'won'
    return (
      <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
        <Navbar />
        <div className="relative flex-1 flex items-center justify-center px-4 overflow-hidden">
          <div className={`absolute inset-0 ${gano ? 'bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(109,40,217,0.25),transparent)]' : 'bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(220,38,38,0.15),transparent)]'}`} />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.04) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

          <div className="relative z-10 bg-white/[0.03] border border-white/[0.07] rounded-3xl p-10 max-w-sm w-full flex flex-col gap-6 backdrop-blur-sm">
            <div className="flex justify-center">
              {gano ? (
                <div className="w-20 h-20 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-yellow-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"/>
                  </svg>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <MineIcon className="w-10 h-10 text-red-400" />
                </div>
              )}
            </div>

            <div className="text-center">
              <h2 className={`text-4xl font-extrabold ${gano ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500' : 'text-white'}`}>
                {gano ? '¡Ganaste!' : '¡Boom!'}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {gano ? `${diff?.label} · ${fmt(tiempo)} · ${minesTotal} minas` : `Pisaste una mina en ${diff?.label}`}
              </p>
            </div>

            {gano && (
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Puntuación</p>
                <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">
                  {puntuacion.toLocaleString()}
                </p>
                <div className="flex justify-center gap-6 mt-3 text-xs text-gray-500">
                  <span>⏱ {fmt(tiempo)}</span>
                  <span className={DIFICULTADES[dificultad]?.color}>{diff?.label}</span>
                </div>
              </div>
            )}

            {gano && (
              <div className={`rounded-2xl px-4 py-3 text-center text-sm border ${guardado ? 'bg-green-900/30 border-green-700/30 text-green-400' : usuario ? 'bg-white/[0.03] border-white/[0.06] text-gray-500' : 'bg-purple-950/40 border-purple-700/30 text-purple-300'}`}>
                {guardado ? '✓ Guardado en el ranking' : usuario ? 'Guardando...' : '🔒 Iniciá sesión para guardar en el ranking'}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setPantalla('menu')}
                className="flex-1 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07] text-white text-sm font-semibold transition">
                ← Menú
              </button>
              <button onClick={resetGame}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition hover:shadow-[0_0_24px_rgba(139,92,246,0.35)]">
                Jugar de nuevo →
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── JUEGO ─────────────────────────────────────────────────────────────────
  const cs = diff?.cellSize || 34

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-6">

        {/* Stats bar */}
        <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.07] rounded-2xl px-5 py-3">
          <div className="flex items-center gap-2 text-purple-300 font-bold text-sm min-w-[60px]">
            <FlagIcon className="w-4 h-4" />
            <span className="tabular-nums">{Math.max(0, flagsLeft).toString().padStart(3, '0')}</span>
          </div>

          <button onClick={resetGame}
            className="w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] flex items-center justify-center transition"
            title="Nueva partida">
            {gameState === 'won'
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-green-400"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"/></svg>
              : gameState === 'lost'
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-red-400"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"/></svg>
            }
          </button>

          <div className="flex items-center gap-2 text-purple-300 font-mono text-sm min-w-[60px] justify-end">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="tabular-nums">{Math.min(tiempo, 999).toString().padStart(3, '0')}</span>
          </div>
        </div>

        {/* Board */}
        <div className="overflow-x-auto max-w-full">
          <div
            className="bg-white/[0.02] border border-purple-500/25 rounded-2xl p-2 shadow-2xl shadow-purple-500/10 select-none"
            style={{ width: 'fit-content' }}
          >
            <div
              className="grid border-2 border-purple-500/40 rounded-xl overflow-hidden"
              style={{ gridTemplateColumns: `repeat(${diff?.cols}, ${cs}px)`, gridTemplateRows: `repeat(${diff?.rows}, ${cs}px)` }}
            >
              {board?.map((row, r) =>
                row.map((cell, c) => (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    onContextMenu={e => handleRightClick(e, r, c)}
                    className={`border-[0.5px] flex items-center justify-center transition-colors border-white/[0.06] ${getCellClass(cell)}`}
                    style={{ width: cs, height: cs }}
                  >
                    {getCellContent(cell)}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Controles móvil + info */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setModoFlag(m => !m)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition ${
              modoFlag
                ? 'bg-purple-600/60 border-purple-500/60 text-purple-200'
                : 'bg-white/[0.04] border-white/[0.08] text-gray-400 hover:text-white hover:border-purple-500/30'
            }`}
          >
            <FlagIcon className="w-4 h-4" />
            {modoFlag ? 'Modo bandera ON' : 'Modo bandera'}
          </button>

          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-white/[0.03] border-white/[0.07] text-xs ${DIFICULTADES[dificultad]?.color}`}>
            <span className="font-bold">{diff?.label}</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500">{diff?.mines} minas</span>
          </div>
        </div>

        <p className="text-gray-700 text-[10px]">Click para revelar · Click derecho (o modo bandera) para marcar</p>
      </div>

      <Footer />
    </div>
  )
}
