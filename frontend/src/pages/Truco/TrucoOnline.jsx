import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { DELAY_MANO } from './constantes'
import { useAuth } from '../../context/AuthContext'
import MesaTruco from './MesaTruco'
import { useNavigate } from 'react-router-dom'
import { db } from '../../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

export default function TrucoOnline() {
  const sockRef = useRef(null)

  const [pantalla, setPantalla]       = useState('lobby')
  const [codigoSala, setCodigoSala]   = useState('')
  const [inputCodigo, setInputCodigo] = useState('')
  const [error, setError]             = useState('')
  const [limite, setLimite]           = useState(30)
  const [conectado, setConectado]     = useState(false)
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false)

  // Game state — all set by truco_estado from server
  const [muestra, setMuestra]             = useState(null)
  const [manoJ, setManoJ]                 = useState([])
  const [manoM, setManoM]                 = useState([])
  const [cjJ, setCjJ]                     = useState([])
  const [cjM, setCjM]                     = useState([])
  const [resultados, setResultados]       = useState([])
  const [manoActual, setManoActual]       = useState(0)
  const [esMano, setEsMano]               = useState(false)
  const [turno, setTurno]                 = useState('rival')
  const [cartaSel, setCartaSel]           = useState(null)
  const [log, setLog]                     = useState([])
  const [ptsJ, setPtsJ]                   = useState(0)
  const [ptsM, setPtsM]                   = useState(0)
  const [ganador, setGanador]             = useState(null)
  const [mostrandoMano, setMostrandoMano] = useState(false)
  const [primeraJugada, setPrimeraJugada] = useState(false)

  const [florJ, setFlorJ]                 = useState(false)
  const [florM, setFlorM]                 = useState(false)
  const [florResuelta, setFlorResuelta]   = useState(true)
  const [envidoResuelto, setEnvidoResuelto] = useState(false)

  const [trucoCantado, setTrucoCantado]           = useState(null)
  const [ultimoEnCantar, setUltimoEnCantar]       = useState(null)
  const [cantanteOriginalTruco, setCantanteOriginalTruco] = useState(null)
  const [trucoResuelto, setTrucoResuelto]         = useState(false)

  const [esperandoRespuesta, setEsperandoRespuesta] = useState(false)
  const [trucoPendiente, setTrucoPendiente]         = useState(false)
  const [envidoPendiente, setEnvidoPendiente]       = useState(false)
  const [nivelEnvido, setNivelEnvido]               = useState(null)
  const [envidoAcumulado, setEnvidoAcumulado]       = useState(0)

  const { usuario } = useAuth()
  const miNombre = usuario?.displayName || usuario?.email?.split('@')[0] || 'Jugador'

  const [nombreRival, setNombreRival]     = useState('Rival')
  const [inicialesRival, setInicialesRival] = useState('RV')

  const [florPendiente, setFlorPendiente]   = useState(false)
  const [florCantada, setFlorCantada]       = useState(null)
  const [mostrarCartasRival, setMostrarCartasRival] = useState(false)
  const [rivalTieneFlor, setRivalTieneFlor] = useState(false)

  const [florActiva, setFlorActiva]         = useState(false)
  const [florEnJuego, setFlorEnJuego]       = useState(false)
  const [florCantadaPor, setFlorCantadaPor] = useState(null)
  const [nivelFlor, setNivelFlor]           = useState(null)

  const [copied, setCopied]           = useState(false)
  const [rondaTerminada, setRondaTerminada] = useState(false)
  const [timerSeg, setTimerSeg]       = useState(30)
  const [globoYo, setGloboYo]         = useState(null)
  const [globoRival, setGloboRival]   = useState(null)

  const prevResultadosLen = useRef(0)
  const timerRef          = useRef(null)
  const manoJRef          = useRef([])
  const navigate          = useNavigate()

  manoJRef.current = manoJ

  const puedeSubirEnvido      = envidoPendiente && nivelEnvido !== 'falta'
  const puedeSubirRealEnvido  = envidoPendiente && nivelEnvido !== 'falta'
  const puedeSubirFaltaEnvido = envidoPendiente

  useEffect(() => {
    if (!usuario) navigate('/login', { state: { desde: '/juegos/truco-online' } })
  }, [usuario])

  // Detect new mano result → brief mostrandoMano UI state
  // Reset counter when new round starts (resultados resets to [])
  useEffect(() => {
    if (resultados.length === 0) {
      prevResultadosLen.current = 0
      setMostrandoMano(false)
      return
    }
    if (resultados.length > prevResultadosLen.current) {
      prevResultadosLen.current = resultados.length
      setMostrandoMano(true)
      const t = setTimeout(() => setMostrandoMano(false), DELAY_MANO)
      return () => clearTimeout(t)
    }
  }, [resultados.length])

  const addLog = msgs => {
    if (!msgs?.length) return
    setLog(p => [...[...msgs].reverse(), ...p].slice(0, 50))
  }

  const guardarPartida = async (ganadorFinal, pjFinal, pmFinal) => {
    if (!usuario) return
    try {
      await addDoc(collection(db, 'ranking_truco'), {
        uid: usuario.uid,
        nombre: usuario.displayName || usuario.email?.split('@')[0] || 'Jugador',
        resultado: ganadorFinal === 'yo' ? 'victoria' : 'derrota',
        puntosVos: pjFinal, puntosRival: pmFinal,
        fecha: serverTimestamp()
      })
    } catch (e) { console.error('Error guardando partida:', e) }
  }

  const aplicarEstado = (estado) => {
    setManoJ(estado.miMano)
    // Show remaining rival cards face-down, or revealed cards face-up
    setManoM(estado.manoRivalRevelada
      ? estado.manoRivalRevelada
      : Array(estado.manoRivalRestante).fill(null).map((_, i) => ({ id: `rival-facedown-${i}`, numero: null, palo: null }))
    )
    setCjJ(estado.cartasJugadasMias)
    setCjM(estado.cartasJugadasRival)
    setMuestra(estado.muestra)
    setResultados(estado.resultados)
    setManoActual(estado.manoActual)
    setTurno(estado.turno)
    setEsMano(estado.esMano)
    setPtsJ(estado.ptsYo)
    setPtsM(estado.ptsRival)
    setLimite(estado.limite)
    setFlorJ(estado.tengoFlor)
    setFlorM(estado.rivalTieneFlor)
    setRivalTieneFlor(estado.rivalTieneFlor)
    setTrucoCantado(estado.trucoCantado)
    setUltimoEnCantar(estado.ultimoEnCantar)
    setCantanteOriginalTruco(estado.cantanteOriginalTruco)
    setTrucoResuelto(estado.trucoResuelto)
    setTrucoPendiente(estado.trucoPendiente)
    setEsperandoRespuesta(estado.esperandoRespuesta)
    setEnvidoResuelto(estado.envidoResuelto)
    setEnvidoPendiente(estado.envidoPendiente)
    setNivelEnvido(estado.nivelEnvido)
    setEnvidoAcumulado(estado.envidoAcumulado)
    setFlorResuelta(estado.florResuelta)
    setFlorActiva(estado.florActiva)
    setFlorEnJuego(estado.florEnJuego)
    setFlorPendiente(estado.florPendiente)
    setFlorCantada(estado.florCantadaPor)
    setFlorCantadaPor(estado.florCantadaPor)
    setNivelFlor(estado.nivelFlor)
    setMostrarCartasRival(estado.mostrarCartasRival)
    setPrimeraJugada(estado.primeraJugada)
    setRondaTerminada(estado.rondaTerminada || false)

    if (estado.logMsgs?.length) addLog(estado.logMsgs)

    if (estado.ganador) {
      guardarPartida(estado.ganador, estado.ptsYo, estado.ptsRival)
      setGanador(estado.ganador)
      setPantalla('resultado')
    }
  }

  const emit = (tipo, datos = {}) => sockRef.current?.emit('truco_accion', { tipo, datos })

  useEffect(() => {
    const socket = io(SOCKET_URL, { forceNew: true })
    sockRef.current = socket

    socket.on('connect',    () => setConectado(true))
    socket.on('disconnect', () => setConectado(false))

    socket.on('sala_creada', ({ salaId }) => {
      setCodigoSala(salaId)
      setPantalla('esperando')
    })

    socket.on('error_sala', msg => setError(msg))

    socket.on('juego_iniciado', ({ jugadorA, limite: limiteRecibido, jugadorAInfo, jugadorBInfo }) => {
      const esA = socket.id === jugadorA
      if (limiteRecibido) setLimite(limiteRecibido)
      const infoRival = esA ? jugadorBInfo : jugadorAInfo
      if (infoRival) {
        setNombreRival(infoRival.nombre || 'Rival')
        setInicialesRival((infoRival.nombre || 'Rival').slice(0, 2).toUpperCase())
      }
      setPtsJ(0); setPtsM(0); setGanador(null); setLog([])
      prevResultadosLen.current = 0
      setPantalla('juego')
      addLog(['🎮 ¡Partida iniciada!'])
    })

    socket.on('truco_estado', aplicarEstado)

    socket.on('truco_error', msg => console.warn('truco_error:', msg))

    socket.on('chat_recibido', ({ nombre, texto }) => {
      addLog([`💬 ${nombre}: ${texto}`])
      setGloboRival(texto)
      setTimeout(() => setGloboRival(null), 5000)
    })

    socket.on('rival_desconectado', () => {
      setError('El rival se desconectó')
      setPantalla('lobby')
    })

    socket.on('conexion_duplicada', (mensaje) => {
      alert(mensaje); setError(mensaje); setPantalla('lobby'); socket.disconnect()
    })

    return () => socket.disconnect()
  }, [])

  useEffect(() => {
    if (conectado && miNombre && sockRef.current) {
      const userId = usuario?.uid || usuario?.email || miNombre
      sockRef.current.emit('set_nombre', { nombre: miNombre, userId })
    }
  }, [conectado, miNombre, usuario])

  // ── Turn timer: 30s countdown when it's your turn to play ──
  useEffect(() => {
    clearInterval(timerRef.current)
    const puedeJugarAhora = turno === 'yo' && florResuelta && !rondaTerminada &&
      !mostrandoMano && !esperandoRespuesta && !trucoPendiente && !envidoPendiente && !florPendiente
    if (!puedeJugarAhora) { setTimerSeg(30); return }

    setTimerSeg(30)
    timerRef.current = setInterval(() => {
      setTimerSeg(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          const carta = manoJRef.current.find(c => !c.id?.startsWith('rival'))
          if (carta) emit('carta', { carta })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [turno, florResuelta, rondaTerminada, mostrandoMano, esperandoRespuesta, trucoPendiente, envidoPendiente, florPendiente])

  // ── Action handlers — just forward to server ──
  const jugarCarta        = carta => { clearInterval(timerRef.current); setTimerSeg(30); setCartaSel(null); emit('carta', { carta }) }
  const cantarTruco       = nivel => emit(nivel)
  const subirTruco        = nivel => emit(nivel)
  const responderTrucoQuiero   = () => emit('quiero_truco')
  const responderTrucoNoQuiero = () => emit('no_quiero_truco')
  const cantarEnvido      = nivel => emit(nivel)
  const responderEnvidoQuiero   = () => emit('quiero_envido')
  const responderEnvidoNoQuiero = () => emit('no_quiero_envido')
  const cantarFlor        = nivel => emit(nivel)
  const responderFlorQuiero   = () => emit('quiero_flor')
  const responderFlorNoQuiero = () => emit('no_quiero_flor')
  const enviarMensaje = texto => {
    addLog([`💬 Vos: ${texto}`])
    setGloboYo(texto)
    setTimeout(() => setGloboYo(null), 5000)
    sockRef.current?.emit('chat_mensaje', { texto })
  }

  const resultadoUltimaMano = resultados[resultados.length - 1]
  const bloqueado           = rondaTerminada || mostrandoMano || esperandoRespuesta || trucoPendiente || envidoPendiente
  const puedeJugar          = turno === 'yo' && !bloqueado && florResuelta
  const puedeEnvido         = !envidoResuelto && !florJ && !florM && florResuelta && manoActual === 0 && !primeraJugada && !bloqueado
  const puedeTruco          = !trucoResuelto && florResuelta && !mostrandoMano && !esperandoRespuesta
  const puedeIniciarTruco   = puedeTruco && !trucoCantado && !trucoPendiente
  const puedeRetruco        = puedeTruco && trucoCantado === 'truco'   && cantanteOriginalTruco === 'rival'
  const puedeVale4          = puedeTruco && trucoCantado === 'retruco' && cantanteOriginalTruco === 'yo'
  const puedeIniciarRetruco = puedeTruco && !trucoPendiente && trucoCantado === 'truco'   && cantanteOriginalTruco === 'rival'
  const puedeIniciarVale4   = puedeTruco && !trucoPendiente && trucoCantado === 'retruco' && cantanteOriginalTruco === 'yo'

  // ── ESPERANDO ──
  if (pantalla === 'esperando') return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 max-w-sm w-full text-center flex flex-col gap-6">
          <div className="flex justify-center">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-purple-900" />
              <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">🃏</div>
            </div>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Código de sala</p>
            <p className="text-5xl font-mono font-extrabold text-purple-400 tracking-widest mt-1">{codigoSala}</p>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4 flex flex-col gap-2">
            <p className="text-gray-300 text-sm font-semibold">Compartí este código con tu rival</p>
            <button onClick={() => { navigator.clipboard.writeText(codigoSala); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
              className="bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-xl text-sm font-bold transition">
              {copied ? '✅ Copiado!' : '📋 Copiar código'}
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            Esperando rival...
          </div>
          <button onClick={() => setPantalla('lobby')} className="text-gray-600 text-sm hover:text-gray-400 transition">← Cancelar</button>
        </div>
      </div>
      <Footer />
    </div>
  )

  // ── RESULTADO ──
  if (pantalla === 'resultado') {
    const gano = ganador === 'yo'
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 max-w-md w-full text-center flex flex-col gap-6">
            <span className="text-7xl">{gano ? '🏆' : '😔'}</span>
            <div>
              <h2 className="text-4xl font-extrabold">{gano ? '¡Ganaste!' : 'Perdiste'}</h2>
              <p className="text-gray-400 mt-2">{gano ? '¡Sos un capo!' : 'El rival te ganó esta vez'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-2xl p-4"><p className="text-gray-400 text-xs">Vos</p><p className="text-3xl font-extrabold text-purple-400">{ptsJ}</p></div>
              <div className="bg-gray-800 rounded-2xl p-4"><p className="text-gray-400 text-xs">Rival</p><p className="text-3xl font-extrabold text-red-400">{ptsM}</p></div>
            </div>
            <button onClick={() => setPantalla('lobby')} className="border-2 border-gray-700 hover:border-purple-500 text-gray-300 py-3 rounded-2xl font-semibold transition">← Volver al lobby</button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── LOBBY ──
  if (pantalla === 'lobby') return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        {modalCrearAbierto ? (
          <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-900/50 to-gray-900 px-8 py-8 border-b border-gray-800 text-center">
              <span className="text-5xl">🎮</span>
              <h2 className="text-2xl font-extrabold mt-3">Crear Sala</h2>
              <p className="text-gray-400 text-sm mt-1">Configurá tu partida</p>
            </div>
            <div className="p-8 flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">¿Hasta cuántos puntos?</p>
                <div className="grid grid-cols-4 gap-3">
                  {[10, 20, 30, 40].map(l => (
                    <button key={l} onClick={() => setLimite(l)}
                      className={`py-4 rounded-xl border-2 font-bold text-lg transition ${limite === l ? 'border-purple-500 bg-purple-950 text-white' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-900 rounded-lg flex items-center justify-center text-sm">👤</div>
                  <div><p className="text-white text-sm font-semibold">{miNombre}</p><p className="text-gray-500 text-xs">Anfitrión</p></div>
                </div>
                <div className="text-right"><p className="text-purple-400 font-bold">1vs1</p><p className="text-gray-500 text-xs">hasta {limite} pts</p></div>
              </div>
              <button onClick={() => { setError(''); setModalCrearAbierto(false); sockRef.current?.emit('crear_sala', { limite, modalidad: '1vs1' }) }}
                disabled={!conectado}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white py-4 rounded-2xl text-lg font-bold transition hover:scale-105">
                Crear partida →
              </button>
              <button onClick={() => setModalCrearAbierto(false)}
                className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white py-3 rounded-2xl font-semibold transition text-sm">
                ← Volver
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-900/50 to-gray-900 px-8 py-8 border-b border-gray-800 text-center">
              <span className="text-5xl">🃏</span>
              <h1 className="text-3xl font-extrabold mt-3">Truco Online</h1>
              <p className="text-gray-400 text-sm mt-1">Jugá en tiempo real contra tus amigos</p>
              <div className={`flex items-center justify-center gap-2 text-xs font-semibold mt-3 ${conectado ? 'text-green-400' : 'text-red-400'}`}>
                <span className={`w-2 h-2 rounded-full ${conectado ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
                {conectado ? 'Servidor conectado' : 'Conectando...'}
              </div>
            </div>
            <div className="p-8 flex flex-col gap-6">
              {error && <p className="text-red-400 text-sm text-center bg-red-950 border border-red-800 rounded-xl px-4 py-3">{error}</p>}
              <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-xl">🎮</div>
                  <div><p className="font-bold text-white">Crear una sala</p><p className="text-gray-400 text-xs">Invitá a un amigo con el código</p></div>
                </div>
                <button onClick={() => setModalCrearAbierto(true)} disabled={!conectado}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white py-3.5 rounded-2xl text-base font-bold transition hover:scale-105">
                  Crear sala →
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-700" />
                <span className="text-gray-500 text-xs uppercase tracking-wider">o unite a una sala</span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center text-xl">🔑</div>
                  <div><p className="font-bold text-white">Unirse a una sala</p><p className="text-gray-400 text-xs">Ingresá el código que te pasaron</p></div>
                </div>
                <input value={inputCodigo} onChange={e => setInputCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej: AB3X" maxLength={4}
                  className="bg-gray-900 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-widest focus:outline-none transition placeholder-gray-600" />
                <button onClick={() => { setError(''); sockRef.current?.emit('unirse_sala', { salaId: inputCodigo }) }}
                  disabled={inputCodigo.length < 4 || !conectado}
                  className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white py-3.5 rounded-2xl text-base font-bold transition">
                  Unirse →
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[{ icon: '⚡', texto: 'Tiempo real' }, { icon: '🆓', texto: 'Gratis' }, { icon: '🏆', texto: 'Con ranking' }].map(item => (
                  <div key={item.texto} className="bg-gray-800/30 border border-gray-800 rounded-xl py-3 px-2">
                    <span className="text-xl">{item.icon}</span>
                    <p className="text-gray-400 text-xs mt-1">{item.texto}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )

  // ── JUEGO ──
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />
      <MesaTruco
        manoJ={manoJ} manoM={manoM} cjJ={cjJ} cjM={cjM}
        muestra={muestra} resultados={resultados} manoActual={manoActual}
        ptsJ={ptsJ} ptsM={ptsM} limite={limite} turno={turno}
        cartaSel={cartaSel} setCartaSel={setCartaSel} log={log}
        mostrandoMano={mostrandoMano} trucoCantado={trucoCantado}
        ultimoEnCantar={ultimoEnCantar} trucoPendiente={trucoPendiente}
        envidoPendiente={envidoPendiente} trucoResuelto={trucoResuelto}
        nivelEnvido={nivelEnvido} envidoResuelto={envidoResuelto}
        florJ={florJ} florM={florM} florActiva={florActiva}
        florEnJuego={florEnJuego} florPendiente={florPendiente}
        florResuelta={florResuelta} florCantada={florCantada}
        nivelFlor={nivelFlor} florCantadaPor={florCantadaPor}
        mostrarCartasRival={mostrarCartasRival} bloqueado={bloqueado}
        jugarCarta={jugarCarta} cantarTruco={cantarTruco}
        responderTrucoQuiero={responderTrucoQuiero} responderTrucoNoQuiero={responderTrucoNoQuiero}
        subirTruco={subirTruco} cantarEnvido={cantarEnvido}
        responderEnvidoQuiero={responderEnvidoQuiero} responderEnvidoNoQuiero={responderEnvidoNoQuiero}
        cantarFlor={cantarFlor} responderFlorQuiero={responderFlorQuiero}
        responderFlorNoQuiero={responderFlorNoQuiero}
        puedeJugar={puedeJugar} puedeEnvido={puedeEnvido}
        puedeIniciarTruco={puedeIniciarTruco} puedeRetruco={puedeRetruco}
        puedeVale4={puedeVale4} puedeIniciarRetruco={puedeIniciarRetruco}
        puedeIniciarVale4={puedeIniciarVale4} puedeSubirEnvido={puedeSubirEnvido}
        puedeSubirRealEnvido={puedeSubirRealEnvido} puedeSubirFaltaEnvido={puedeSubirFaltaEnvido}
        nombreRival={nombreRival} inicialesRival={inicialesRival}
        miNombre={miNombre} miPhotoURL={usuario?.photoURL || ''}
        resultadoUltimaMano={resultadoUltimaMano}
        rondaTerminada={rondaTerminada} timerSeg={timerSeg}
        globoYo={globoYo} globoRival={globoRival}
        onEnviarMensaje={enviarMensaje}
        onSubirEnvidoConNivel={(nivel) => { setEnvidoPendiente(false); cantarEnvido(nivel) }}
      />
      <Footer />
    </div>
  )
}
