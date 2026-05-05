import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { SOCKET_URL } from '../config/socket'

const COLOR_CLASS = {
  red: 'bg-[#d7262f] border-[#ff7b82]',
  yellow: 'bg-[#f5d547] border-[#fff2a3] text-slate-950',
  green: 'bg-[#25a65a] border-[#8ee6ad]',
  blue: 'bg-[#1f6feb] border-[#8ab4ff]',
  wild: 'bg-[#111827] border-slate-500',
}
const COLOR_LABEL = { red: 'Rojo', yellow: 'Amarillo', green: 'Verde', blue: 'Azul' }
const VALUE_LABEL = { skip: 'SALTA', reverse: 'REV', draw2: '+2', wild: 'COMODIN', wild4: '+4' }
const COLOR_DOT = { red: 'bg-[#d7262f]', yellow: 'bg-[#f5d547]', green: 'bg-[#25a65a]', blue: 'bg-[#1f6feb]' }

function initials(name = 'Jugador') {
  return name.trim().slice(0, 2).toUpperCase()
}

function UnoCard({ card, onClick, small = false, disabled = false }) {
  const label = VALUE_LABEL[card?.value] || card?.value || ''
  const wild = card?.color === 'wild'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${small ? 'w-14 h-22' : 'w-20 h-32 sm:w-24 sm:h-36'} ${COLOR_CLASS[card?.color] || COLOR_CLASS.wild} group relative rounded-[18px] border-2 shadow-[0_12px_30px_rgba(0,0,0,0.35)] flex flex-col items-center justify-between p-2 font-black transition duration-150 hover:-translate-y-2 hover:rotate-[-1deg] disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:rotate-0 overflow-hidden`}
    >
      {wild && <div className="absolute inset-0 grid grid-cols-2 opacity-90"><span className="bg-red-600" /><span className="bg-yellow-400" /><span className="bg-blue-600" /><span className="bg-green-600" /></div>}
      <div className="absolute inset-1.5 rounded-[14px] border border-white/45" />
      <span className="relative self-start text-[10px] leading-none drop-shadow">{label}</span>
      <div className="relative w-[72%] aspect-[0.75] rounded-[50%] bg-white flex items-center justify-center -rotate-12 shadow-inner">
        <span className={`${small ? 'text-lg' : 'text-2xl'} ${card?.color === 'yellow' ? 'text-slate-950' : wild ? 'text-slate-950' : 'text-slate-900'} rotate-12 tracking-tight`}>
          {label}
        </span>
      </div>
      <span className="relative self-end rotate-180 text-[10px] leading-none drop-shadow">{label}</span>
    </button>
  )
}

function UnoBack({ small = false }) {
  return (
    <div className={`${small ? 'w-14 h-22' : 'w-20 h-32 sm:w-24 sm:h-36'} rounded-[18px] border-2 border-white/20 bg-[#15151d] shadow-[0_12px_30px_rgba(0,0,0,0.35)] p-2 relative overflow-hidden`}>
      <div className="absolute inset-0 grid grid-cols-2 opacity-80"><span className="bg-red-600" /><span className="bg-yellow-400" /><span className="bg-blue-600" /><span className="bg-green-600" /></div>
      <div className="absolute inset-2 rounded-[14px] bg-[#111827] border border-white/20 flex items-center justify-center">
        <span className="text-white text-xl font-black -rotate-12">UNO</span>
      </div>
    </div>
  )
}

function PlayerPill({ player, active, me }) {
  return (
    <div className={`rounded-2xl border px-3 py-2 flex items-center gap-3 min-w-[150px] ${active ? 'border-yellow-400/70 bg-yellow-400/10 shadow-[0_0_24px_rgba(250,204,21,0.16)]' : 'border-white/[0.07] bg-white/[0.035]'}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black ${active ? 'bg-yellow-400 text-slate-950' : 'bg-purple-900/70 text-white'}`}>{initials(player.nombre)}</div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm truncate">{me ? 'Vos' : player.nombre}</p>
        <p className="text-xs text-gray-500">{player.hand?.length ?? player.handCount} cartas {player.saidUno ? '· UNO' : ''}</p>
      </div>
    </div>
  )
}

function Lobby({ connected, error, code, onCreate, onJoin, onBack }) {
  const [input, setInput] = useState(code || '')
  const normalized = input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
  const valid = /^[A-Z][0-9][A-Z][0-9]$/.test(normalized)
  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />
      <main className="relative flex-1 flex items-center justify-center px-4 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(109,40,217,0.18),transparent)]" />
        <div className="relative z-10 w-full max-w-4xl flex flex-col gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center rounded-[28px] bg-white/[0.04] border border-white/[0.08] px-5 py-4 mb-5 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
              <div className="flex -space-x-6">
                {['red','yellow','green','blue'].map((c, i) => <div key={c} className="origin-bottom" style={{ transform:`rotate(${[-14,-5,6,15][i]}deg)` }}><UnoCard card={{ color:c, value:String(i + 1) }} small disabled /></div>)}
              </div>
            </div>
            <h1 className="text-4xl font-extrabold">UNO</h1>
            <p className="text-gray-500 mt-2 text-sm">Jugá tu última carta antes que todos.</p>
            <p className={`mt-4 text-xs font-semibold ${connected ? 'text-green-400' : 'text-yellow-400'}`}>{connected ? 'Conectado' : 'Conectando'}</p>
          </div>
          {error && <div className="rounded-2xl border border-red-500/25 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-300">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={onCreate} disabled={!connected} className="group rounded-3xl border border-white/[0.06] bg-white/[0.035] p-8 text-left hover:border-purple-500/40 hover:bg-white/[0.055] disabled:opacity-40 transition">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mb-5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-purple-200"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
              </div>
              <p className="text-2xl font-extrabold">Crear sala</p>
              <p className="mt-2 text-sm text-gray-500">2 a 6 jugadores. El lider inicia.</p>
            </button>
            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.035] p-8">
              <p className="text-2xl font-extrabold">Unirse</p>
              <input value={normalized} onChange={e => setInput(e.target.value)} placeholder="A1B2" maxLength={4} className="mt-5 w-full rounded-2xl border border-white/[0.08] bg-black/20 px-5 py-4 text-center font-mono text-3xl font-black tracking-[0.35em] outline-none" />
              <button onClick={() => onJoin(normalized)} disabled={!connected || !valid} className="mt-3 w-full rounded-2xl bg-purple-600 py-3.5 text-sm font-bold disabled:opacity-30 hover:bg-purple-500 transition">Entrar</button>
            </div>
          </div>
          <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-400">Volver a los juegos</button>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function Uno() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { usuario } = useAuth()
  const code = searchParams.get('sala')?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || ''
  const sockRef = useRef(null)
  const joinedRef = useRef(false)
  const [connected, setConnected] = useState(false)
  const [socketId, setSocketId] = useState('')
  const [screen, setScreen] = useState('lobby')
  const [prelobby, setPrelobby] = useState(null)
  const [game, setGame] = useState(null)
  const [error, setError] = useState('')
  const [pendingWild, setPendingWild] = useState(null)
  const [copied, setCopied] = useState(false)
  const miNombre = usuario?.displayName || usuario?.email?.split('@')[0] || 'Jugador'

  useEffect(() => {
    const socket = io(SOCKET_URL, { forceNew: true })
    sockRef.current = socket
    socket.on('connect', () => { setConnected(true); setSocketId(socket.id) })
    socket.on('disconnect', () => setConnected(false))
    socket.on('uno_sala_creada', ({ salaId }) => { joinedRef.current = true; navigate(`/juegos/uno?sala=${salaId}`, { replace: true }) })
    socket.on('uno_prelobby', sala => { setPrelobby(sala); setScreen('prelobby') })
    socket.on('uno_iniciado', () => setScreen('game'))
    socket.on('uno_estado', estado => { setGame(estado); setScreen('game') })
    socket.on('uno_error', msg => setError(msg))
    return () => socket.disconnect()
  }, [navigate])

  useEffect(() => {
    if (!connected || !sockRef.current) return
    const userId = usuario?.uid || usuario?.email || miNombre
    sockRef.current.emit('set_nombre', { nombre: miNombre, userId, photoURL: usuario?.photoURL || '' })
  }, [connected, miNombre, usuario])

  useEffect(() => {
    if (!code || !connected || joinedRef.current) return
    joinedRef.current = true
    sockRef.current?.emit('uno_unirse_sala', { salaId: code })
  }, [code, connected])

  const createRoom = () => { setError(''); sockRef.current?.emit('uno_crear_sala', { maxJugadores: 6 }) }
  const joinRoom = (salaId) => { setError(''); joinedRef.current = true; navigate(`/juegos/uno?sala=${salaId}`); sockRef.current?.emit('uno_unirse_sala', { salaId }) }
  const leave = () => { sockRef.current?.emit('uno_salir_sala'); joinedRef.current = false; setScreen('lobby'); setPrelobby(null); setGame(null); navigate('/juegos/uno') }
  const play = (card, color) => sockRef.current?.emit('uno_jugar', { cardId: card.id, color })
  const copyCode = async () => {
    if (!prelobby?.id) return
    await navigator.clipboard.writeText(prelobby.id).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  if (screen === 'lobby') return <Lobby connected={connected} error={error} code={code} onCreate={createRoom} onJoin={joinRoom} onBack={() => navigate('/juegos')} />

  if (screen === 'prelobby') {
    const isHost = prelobby?.host === socketId
    return (
      <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
        <Navbar />
        <main className="relative flex-1 flex items-center justify-center px-4 py-12 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(109,40,217,0.16),transparent)]" />
          <div className="relative z-10 w-full max-w-3xl rounded-3xl border border-white/[0.07] bg-[#0d0d1a]/90 p-6 shadow-2xl shadow-black/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold">Codigo de sala</p>
                <p className="font-mono text-4xl font-black tracking-[0.25em]">{prelobby?.id}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-green-700/30 bg-green-950/40 px-3 py-1 text-xs font-bold text-green-400">{(prelobby?.jugadores || []).length}/{prelobby?.maxJugadores || 6}</span>
                <button onClick={copyCode} className="rounded-2xl border border-purple-500/30 bg-purple-600/15 px-4 py-2 text-sm font-bold text-purple-200 hover:bg-purple-600/25">{copied ? 'Copiado' : 'Copiar'}</button>
                <button onClick={leave} className="rounded-2xl border border-white/[0.08] px-4 py-2 text-sm font-bold text-gray-300 hover:bg-white/[0.05]">Salir</button>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(prelobby?.jugadores || []).map(j => (
                <div key={j.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-900/70 border border-purple-500/30 flex items-center justify-center text-xs font-black">{initials(j.nombre)}</div>
                  <div><p className="font-bold text-sm">{j.nombre}</p><p className="text-[10px] text-gray-600 uppercase tracking-widest">{j.id === prelobby.host ? 'Lider' : 'Jugador'}</p></div>
                </div>
              ))}
            </div>
            {isHost ? <button onClick={() => sockRef.current?.emit('uno_iniciar')} disabled={(prelobby?.jugadores || []).length < 2} className="mt-6 w-full rounded-2xl bg-purple-600 py-4 font-bold disabled:opacity-30 hover:bg-purple-500 transition">Iniciar partida</button> : <p className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.025] py-4 text-center text-sm text-gray-500">Esperando al lider.</p>}
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const me = game?.players?.find(p => p.id === socketId)
  const current = game?.players?.[game?.currentIdx]
  const myTurn = current?.id === socketId && game?.phase === 'playing'
  const winner = game?.players?.find(p => p.id === game?.winnerId)

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />
      <main className="relative flex-1 max-w-7xl mx-auto w-full px-4 py-5 flex flex-col gap-4 overflow-hidden">
        <div className="absolute inset-0 -z-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_35%,rgba(34,197,94,0.10),transparent)]" />

        <div className="relative z-10 flex flex-wrap justify-center gap-3">
          {(game?.players || []).map(p => (
            <PlayerPill key={p.id} player={p} active={p.id === current?.id} me={p.id === socketId} />
          ))}
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-4">
          <section className="relative min-h-[430px] rounded-[40px] border border-emerald-400/15 bg-[radial-gradient(ellipse_at_center,#166534_0%,#064e3b_42%,#022c22_100%)] p-5 sm:p-8 flex flex-col items-center justify-center gap-6 shadow-[inset_0_0_0_10px_rgba(6,78,59,0.65),inset_0_0_60px_rgba(0,0,0,0.32),0_28px_80px_rgba(0,0,0,0.55)] overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage:'radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)', backgroundSize:'18px 18px' }} />
            <div className="absolute inset-x-10 top-6 h-px bg-gradient-to-r from-transparent via-emerald-200/20 to-transparent" />
            <div className="relative z-10 flex items-center gap-10 sm:gap-16">
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-0 translate-x-2 translate-y-2 opacity-30"><UnoBack /></div>
                  <UnoBack />
                </div>
                <span className="text-[10px] uppercase tracking-widest text-emerald-100/55 font-bold">Mazo</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                {game?.topCard && <UnoCard card={game.topCard} disabled />}
                <span className="text-[10px] uppercase tracking-widest text-emerald-100/55 font-bold">Descarte</span>
              </div>
            </div>

            <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur">
              <span className="text-xs uppercase tracking-widest text-emerald-100/55 font-bold">Color</span>
              <span className={`w-7 h-7 rounded-full border-2 border-white/60 ${COLOR_DOT[game?.currentColor] || ''}`} />
              <span className="font-black">{COLOR_LABEL[game?.currentColor]}</span>
              <span className="hidden sm:block w-px h-6 bg-white/10" />
              <span className={`text-sm font-bold ${myTurn ? 'text-yellow-300' : 'text-emerald-100/75'}`}>{myTurn ? 'Tu turno' : `Turno de ${current?.nombre || ''}`}</span>
            </div>

            {winner && <p className="relative z-10 text-2xl font-black text-green-300">{winner.nombre} ganó la partida</p>}
            <div className="relative z-10 flex gap-3">
              <button onClick={() => sockRef.current?.emit('uno_robar')} disabled={!myTurn} className="rounded-2xl bg-white text-slate-950 px-5 py-3 text-sm font-black disabled:opacity-30 hover:bg-yellow-300 transition shadow-lg">Robar carta</button>
              <button onClick={() => sockRef.current?.emit('uno_cantar')} disabled={(me?.hand?.length || 0) !== 1} className="rounded-2xl border border-yellow-300/70 bg-yellow-400 px-6 py-3 text-sm font-black text-slate-950 disabled:opacity-30 hover:bg-yellow-300 transition shadow-lg">UNO</button>
            </div>
          </section>

          <aside className="rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4 flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-600 font-semibold">Partida</p>
              <p className="mt-1 text-sm text-gray-400">{game?.phase === 'finished' ? 'Finalizada' : 'En juego'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-600 font-semibold mb-2">Historial</p>
              <div className="flex flex-col gap-2">
                {(game?.log || []).slice(0, 7).map((m, i) => (
                  <p key={i} className={`rounded-xl px-3 py-2 text-sm ${i === 0 ? 'bg-white/[0.07] text-white' : 'bg-white/[0.03] text-gray-500'}`}>{m}</p>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <section className="relative z-10 rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Tu mano</p>
            <span className="text-xs font-bold text-gray-500">{me?.hand?.length || 0} cartas</span>
          </div>
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 px-1">
            {(me?.hand || []).map(card => (
              <UnoCard key={card.id} card={card} disabled={!myTurn} onClick={() => card.color === 'wild' ? setPendingWild(card) : play(card)} />
            ))}
          </div>
        </section>

      </main>

      {pendingWild && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
          <div className="rounded-3xl border border-white/[0.08] bg-[#0d0d1a] p-6 w-full max-w-sm shadow-2xl shadow-black">
            <p className="font-black text-xl">Elegí color</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {Object.entries(COLOR_LABEL).map(([c, label]) => (
                <button key={c} onClick={() => { play(pendingWild, c); setPendingWild(null) }} className={`rounded-2xl border-2 py-5 font-black ${COLOR_CLASS[c]}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  )
}
