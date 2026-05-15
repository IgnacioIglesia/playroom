import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import Navbar from '../components/Navbar'
import { usePageTitle } from '../hooks/usePageTitle'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { SOCKET_URL } from '../config/socket'

const COLORS = ['#111827', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6']

function initials(name = 'Jugador') {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'J'
}

function PlayerRow({ player, score = 0, isHost, isDrawer, guessed }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${isDrawer ? 'border-purple-500/50 bg-purple-950/30' : 'border-white/[0.07] bg-white/[0.03]'}`}>
      <div className="w-9 h-9 rounded-full bg-purple-900/70 border border-purple-500/30 flex items-center justify-center text-xs font-black text-white">
        {initials(player.nombre)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{player.nombre}</p>
        <p className="text-[10px] uppercase tracking-widest text-gray-600">{isDrawer ? 'Dibuja' : isHost ? 'Lider' : guessed ? 'Adivino' : 'Jugador'}</p>
      </div>
      <span className="text-sm font-black tabular-nums text-purple-300">{score}</span>
    </div>
  )
}

function Lobby({ connected, error, code, onCreate, onJoin, onBack }) {
  const [input, setInput] = useState(code || '')
  const normalized = input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
  const validCode = /^[A-Z]{2}[0-9]{2}$/.test(normalized)
  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />
      <main className="relative flex-1 flex items-center justify-center px-4 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(109,40,217,0.18),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="relative z-10 w-full max-w-3xl flex flex-col gap-8">
          <div className="text-center">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 items-center justify-center mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8 text-purple-200">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487 19.5 7.125 8.25 18.375 4.5 19.5l1.125-3.75L16.862 4.487z" />
              </svg>
            </div>
            <h1 className="text-4xl font-extrabold">Pictionary</h1>
            <p className="text-gray-500 mt-2 text-sm">Dibujá la palabra y hacé que la sala adivine.</p>
            <p className={`mt-4 text-xs font-semibold ${connected ? 'text-green-400' : 'text-yellow-400'}`}>{connected ? 'Conectado' : 'Conectando'}</p>
          </div>

          {error && <div className="rounded-2xl border border-red-500/25 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-300">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={onCreate} disabled={!connected} className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-8 text-left transition hover:border-purple-500/40 hover:bg-white/[0.05] disabled:opacity-40">
              <p className="text-2xl font-extrabold">Crear sala</p>
              <p className="mt-2 text-sm text-gray-500">Invitá amigos con un código. Mínimo 3 personas.</p>
            </button>
            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-8">
              <p className="text-2xl font-extrabold">Unirse</p>
              <p className="mt-2 text-sm text-gray-500">Ingresá el código de sala.</p>
              <input value={normalized} onChange={e => setInput(e.target.value)} maxLength={4} className="mt-5 w-full rounded-2xl border border-white/[0.08] bg-black/20 px-5 py-4 text-center font-mono text-3xl font-black tracking-[0.35em] outline-none focus:border-purple-500/60" placeholder="AB12" />
              <button onClick={() => onJoin(normalized)} disabled={!connected || !validCode} className="mt-3 w-full rounded-2xl bg-purple-600 py-3.5 text-sm font-bold transition hover:bg-purple-500 disabled:opacity-30">Entrar</button>
            </div>
          </div>
          <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-400">Volver a los juegos</button>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function Pictionary() {
  usePageTitle('Pictionary')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { usuario } = useAuth()
  const roomCode = searchParams.get('sala')?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || ''
  const sockRef = useRef(null)
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastRef = useRef(null)
  const lastEmitRef = useRef(0)
  const joinedRef = useRef(false)

  const [connected, setConnected] = useState(false)
  const [socketId, setSocketId] = useState('')
  const [screen, setScreen] = useState('lobby')
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [size, setSize] = useState(5)
  const [guess, setGuess] = useState('')
  const [copied, setCopied] = useState(false)
  const miNombre = usuario?.displayName || usuario?.email?.split('@')[0] || 'Jugador'

  const drawLine = (stroke) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width, h = canvas.height
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.size
    ctx.beginPath()
    ctx.moveTo(stroke.from.x * w, stroke.from.y * h)
    ctx.lineTo(stroke.to.x * w, stroke.to.y * h)
    ctx.stroke()
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  useEffect(() => {
    const socket = io(SOCKET_URL, { forceNew: true })
    sockRef.current = socket
    socket.on('connect', () => { setConnected(true); setSocketId(socket.id) })
    socket.on('disconnect', () => setConnected(false))
    socket.on('pictionary_sala_creada', ({ salaId }) => { joinedRef.current = true; navigate(`/juegos/pictionary?sala=${salaId}`, { replace: true }) })
    socket.on('pictionary_estado', data => { setState(data); setScreen(data.estado === 'jugando' ? 'game' : 'prelobby') })
    socket.on('pictionary_error', msg => setError(msg))
    socket.on('pictionary_dibujo', drawLine)
    socket.on('pictionary_limpiar', clearCanvas)
    socket.on('conexion_duplicada', msg => { setError(msg); socket.disconnect() })
    return () => socket.disconnect()
  }, [navigate])

  useEffect(() => {
    if (!connected || !sockRef.current) return
    const userId = usuario?.uid || usuario?.email || miNombre
    sockRef.current.emit('set_nombre', { nombre: miNombre, userId, photoURL: usuario?.photoURL || '' })
  }, [connected, miNombre, usuario])

  useEffect(() => {
    if (!roomCode || !connected || joinedRef.current) return
    joinedRef.current = true
    sockRef.current?.emit('pictionary_unirse_sala', { salaId: roomCode })
  }, [roomCode, connected])

  useEffect(() => { clearCanvas() }, [screen])

  const isHost = state?.host === socketId
  const isDrawer = state?.drawerId === socketId
  const players = state?.jugadores || []

  const createRoom = () => { setError(''); sockRef.current?.emit('pictionary_crear_sala', { maxJugadores: 8 }) }
  const joinRoom = (code) => { setError(''); joinedRef.current = true; navigate(`/juegos/pictionary?sala=${code}`); sockRef.current?.emit('pictionary_unirse_sala', { salaId: code }) }
  const leave = () => { sockRef.current?.emit('pictionary_salir_sala'); joinedRef.current = false; setState(null); setScreen('lobby'); navigate('/juegos/pictionary') }
  const copyCode = async () => {
    if (!state?.id) return
    await navigator.clipboard.writeText(state.id).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const point = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const touch = e.touches?.[0]
    const x = ((touch?.clientX ?? e.clientX) - rect.left) / rect.width
    const y = ((touch?.clientY ?? e.clientY) - rect.top) / rect.height
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }
  }

  const startDraw = (e) => {
    if (!isDrawer) return
    drawingRef.current = true
    lastRef.current = point(e)
  }
  const moveDraw = (e) => {
    if (!drawingRef.current || !isDrawer) return
    e.preventDefault()
    const next = point(e)
    const stroke = { from: lastRef.current, to: next, color, size }
    drawLine(stroke)
    const now = Date.now()
    if (now - lastEmitRef.current >= 50) {
      sockRef.current?.emit('pictionary_dibujo', stroke)
      lastEmitRef.current = now
    }
    lastRef.current = next
  }
  const stopDraw = () => { drawingRef.current = false; lastRef.current = null }

  const sendGuess = () => {
    const text = guess.trim()
    if (!text) return
    sockRef.current?.emit('pictionary_mensaje', { texto: text })
    setGuess('')
  }

  if (screen === 'lobby') {
    return <Lobby connected={connected} error={error} code={roomCode} onCreate={createRoom} onJoin={joinRoom} onBack={() => navigate('/juegos')} />
  }

  if (screen === 'prelobby') {
    return (
      <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
        <Navbar />
        <main className="relative flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-2xl rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-600 font-semibold">Codigo de sala</p>
                <p className="font-mono text-4xl font-black tracking-[0.25em]">{state?.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={copyCode} className="rounded-2xl border border-purple-500/30 bg-purple-600/15 px-4 py-2 text-sm font-bold text-purple-200 hover:bg-purple-600/25">{copied ? 'Copiado' : 'Copiar'}</button>
                <button onClick={leave} className="rounded-2xl border border-white/[0.08] px-4 py-2 text-sm font-bold text-gray-300">Salir</button>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {players.map(p => <PlayerRow key={p.id} player={p} score={state?.puntajes?.[p.id]} isHost={p.id === state?.host} />)}
            </div>
            {error && <p className="mt-4 text-sm font-semibold text-red-300">{error}</p>}
            {isHost ? (
              <button onClick={() => sockRef.current?.emit('pictionary_iniciar')} disabled={players.length < 3} className="mt-6 w-full rounded-2xl bg-purple-600 py-4 font-bold transition hover:bg-purple-500 disabled:opacity-30">Iniciar partida</button>
            ) : (
              <p className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.025] py-4 text-center text-sm text-gray-500">Esperando que el lider inicie.</p>
            )}
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-5 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_300px] gap-4">
        <aside className="flex flex-col gap-2">
          {players.map(p => <PlayerRow key={p.id} player={p} score={state?.puntajes?.[p.id]} isHost={p.id === state?.host} isDrawer={p.id === state?.drawerId} guessed={state?.acertaron?.includes(p.id)} />)}
          {isHost && <button onClick={() => sockRef.current?.emit('pictionary_siguiente_ronda')} className="mt-2 rounded-2xl bg-purple-600 py-3 text-sm font-bold">Siguiente ronda</button>}
        </aside>

        <section className="min-w-0 flex flex-col gap-3">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-600 font-semibold">Ronda {state?.ronda}</p>
              <p className="text-lg font-black">{isDrawer ? `Dibujá: ${state?.palabra}` : `Adiviná: ${state?.pista}`}</p>
            </div>
            <p className="text-sm text-gray-500">{players.find(p => p.id === state?.drawerId)?.nombre} dibuja</p>
          </div>
          {isDrawer && (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3 flex items-center gap-3">
              {COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`} style={{ background:c }} />)}
              <input type="range" min="2" max="18" value={size} onChange={e => setSize(+e.target.value)} className="flex-1 accent-purple-500" />
              <button onClick={() => sockRef.current?.emit('pictionary_limpiar')} className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm font-bold">Limpiar</button>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={1200}
            height={720}
            onMouseDown={startDraw}
            onMouseMove={moveDraw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={moveDraw}
            onTouchEnd={stopDraw}
            className={`w-full aspect-[5/3] rounded-2xl bg-white shadow-2xl shadow-black/50 ${isDrawer ? 'cursor-crosshair touch-none' : 'cursor-default'}`}
          />
        </section>

        <aside className="rounded-2xl border border-white/[0.07] bg-white/[0.03] flex flex-col min-h-[420px]">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <p className="font-black">Respuestas</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {(state?.chat || []).map((m, i) => (
              <div key={i} className={`rounded-xl px-3 py-2 text-sm ${m.tipo === 'acierto' ? 'bg-green-600/20 text-green-300' : m.tipo === 'sistema' ? 'bg-purple-600/15 text-purple-300' : 'bg-white/[0.04] text-gray-300'}`}>
                {m.nombre && <span className="font-bold">{m.nombre}: </span>}{m.texto}
              </div>
            ))}
          </div>
          {!isDrawer && (
            <div className="border-t border-white/[0.06] p-3 flex gap-2">
              <input value={guess} onChange={e => setGuess(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendGuess() }} className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm outline-none focus:border-purple-500/60" placeholder="Escribí tu respuesta" />
              <button onClick={sendGuess} className="rounded-xl bg-purple-600 px-4 text-sm font-bold">Enviar</button>
            </div>
          )}
        </aside>
      </main>
      <Footer />
    </div>
  )
}
