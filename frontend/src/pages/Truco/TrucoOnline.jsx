import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { DELAY_MANO } from './constantes'
import { useAuth } from '../../context/AuthContext'
import { useNavigationGuard } from '../../context/NavigationGuardContext'
import MesaTruco from './MesaTruco'
import MesaTruco2v2 from './MesaTruco2v2'
import { useNavigate } from 'react-router-dom'
import { db } from '../../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { SOCKET_URL } from '../../config/socket'

export default function TrucoOnline({ modalidadFijada = null, codigoAuto = null }) {
  const sockRef        = useRef(null)
  const autoJoinedRef  = useRef(false)

  const [pantalla, setPantalla]       = useState('lobby')
  const [codigoSala, setCodigoSala]   = useState('')
  const [inputCodigo, setInputCodigo] = useState('')
  const [error, setError]             = useState('')
  const [errorConexion, setErrorConexion] = useState('')
  const [limite, setLimite]           = useState(30)
  const [conectado, setConectado]     = useState(false)
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false)
  const [modalidad, setModalidad]     = useState(modalidadFijada || '1vs1')
  const [modalidadCrear, setModalidadCrear] = useState(modalidadFijada || '1vs1')

  // Prelobby 2v2
  const [prelobbyData, setPrelobbyData] = useState(null)

  // 2v2 game state
  const [partner2v2, setPartner2v2]   = useState(null)
  const [rivals2v2, setRivals2v2]     = useState([])
  const [jugadasMano2v2, setJugadasMano2v2] = useState([])
  const [tengoFlor2v2, setTengoFlor2v2]           = useState(false)
  const [equipoTieneFlor2v2, setEquipoTieneFlor2v2] = useState(false)
  const [rivalEquipoTieneFlor2v2, setRivalEquipoTieneFlor2v2] = useState(false)

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

  const [nombreRival, setNombreRival]       = useState('Rival')
  const [inicialesRival, setInicialesRival] = useState('RV')
  const [rivalPhotoURL, setRivalPhotoURL]   = useState('')
  const [rivalUserId, setRivalUserId]       = useState(null)

  const [florPendiente, setFlorPendiente]   = useState(false)
  const [florCantada, setFlorCantada]       = useState(null)
  const [mostrarCartasRival, setMostrarCartasRival] = useState(false)
  const [rivalTieneFlor, setRivalTieneFlor] = useState(false)

  const [florActiva, setFlorActiva]         = useState(false)
  const [florEnJuego, setFlorEnJuego]       = useState(false)
  const [florCantadaPor, setFlorCantadaPor] = useState(null)
  const [nivelFlor, setNivelFlor]           = useState(null)

  const [copied, setCopied]           = useState(false)
  const [copiedLink, setCopiedLink]   = useState(false)
  const [rondaTerminada, setRondaTerminada] = useState(false)
  const [timerSeg, setTimerSeg]       = useState(30)
  const [globoYo, setGloboYo]               = useState(null)
  const [globoRival, setGloboRival]         = useState(null)
  const [globoPartner2v2, setGloboPartner2v2] = useState(null)
  const [globoRival1_2v2, setGloboRival1_2v2] = useState(null)
  const [globoRival2_2v2, setGloboRival2_2v2] = useState(null)

  const prevResultadosLen  = useRef(0)
  const timerRef           = useRef(null)
  const manoJRef           = useRef([])
  const partner2v2Ref      = useRef(null)
  const rivals2v2Ref       = useRef([])
  const navigate           = useNavigate()
  const { setGuard, clearGuard } = useNavigationGuard()

  manoJRef.current      = manoJ
  partner2v2Ref.current = partner2v2
  rivals2v2Ref.current  = rivals2v2

  const puedeSubirEnvido      = envidoPendiente && nivelEnvido !== 'falta'
  const puedeSubirRealEnvido  = envidoPendiente && nivelEnvido !== 'falta'
  const puedeSubirFaltaEnvido = envidoPendiente

  useEffect(() => {
    if (!usuario) navigate('/login', { state: { desde: '/juegos/truco-online' } })
  }, [usuario])

  useEffect(() => {
    if (!codigoAuto || !conectado || !miNombre || autoJoinedRef.current) return
    autoJoinedRef.current = true
    setInputCodigo(codigoAuto.toUpperCase())
    setError('')
    sockRef.current?.emit('unirse_sala', { salaId: codigoAuto.toUpperCase() })
  }, [conectado, codigoAuto, miNombre])

  useEffect(() => {
    if (pantalla === 'juego' || pantalla === 'esperando' || pantalla === 'prelobby') {
      setGuard('Si salís ahora perdés tu lugar en la sala y la partida terminará.')
    } else {
      clearGuard()
    }
    return () => clearGuard()
  }, [pantalla])

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

  const aplicarEstado2v2 = (estado) => {
    setManoJ(estado.miMano)
    setCjJ(estado.miCartasJugadas || [])
    setMuestra(estado.muestra)
    setResultados(estado.resultados)
    setManoActual(estado.manoActual)
    setTurno(estado.turno)
    setEsMano(estado.esMano)
    setPtsJ(estado.ptsYo)
    setPtsM(estado.ptsRival)
    setLimite(estado.limite)
    setTrucoCantado(estado.trucoCantado)
    setCantanteOriginalTruco(estado.cantanteOriginalTruco)
    setTrucoResuelto(estado.trucoResuelto)
    setTrucoPendiente(estado.trucoPendiente)
    setEsperandoRespuesta(estado.esperandoRespuesta)
    setEnvidoResuelto(estado.envidoResuelto)
    setEnvidoPendiente(estado.envidoPendiente)
    setNivelEnvido(estado.nivelEnvido)
    setEnvidoAcumulado(estado.envidoAcumulado)
    setFlorResuelta(estado.florResuelta ?? true)
    setFlorActiva(estado.florActiva)
    setFlorEnJuego(estado.florEnJuego)
    setFlorPendiente(estado.florPendiente)
    setFlorCantada(estado.florCantadaPor)
    setFlorCantadaPor(estado.florCantadaPor)
    setNivelFlor(estado.nivelFlor)
    setRondaTerminada(estado.rondaTerminada || false)
    setPrimeraJugada(estado.primeraJugada)
    setPartner2v2(estado.partner || null)
    setRivals2v2(estado.rivals || [])
    setJugadasMano2v2(estado.jugadasMano || [])
    setTengoFlor2v2(estado.tengoFlor || false)
    setEquipoTieneFlor2v2(estado.equipoTieneFlor || false)
    setRivalEquipoTieneFlor2v2(estado.rivalEquipoTieneFlor || false)

    if (estado.logMsgs?.length) addLog(estado.logMsgs)

    if (estado.ganador) {
      setGanador(estado.ganador)
      setPantalla('resultado')
    }
  }

  const emit = (tipo, datos = {}) => sockRef.current?.emit('truco_accion', { tipo, datos })

  useEffect(() => {
    const socket = io(SOCKET_URL, { forceNew: true })
    sockRef.current = socket

    socket.on('connect', () => {
      setConectado(true)
      setErrorConexion('')
    })
    socket.on('disconnect', () => setConectado(false))
    socket.on('connect_error', () => {
      setConectado(false)
      setErrorConexion('No se pudo conectar al servidor online. Revisá que el backend de Render esté activo.')
    })

    socket.on('sala_creada', ({ salaId }) => {
      setCodigoSala(salaId)
      setPantalla('esperando')
    })

    socket.on('error_sala', msg => setError(msg))

    socket.on('juego_iniciado', ({ jugadorA, limite: limiteRecibido, jugadorAInfo, jugadorBInfo, modalidad: modSala }) => {
      if (modalidadFijada && modSala && modSala !== modalidadFijada) {
        setError(`Esta sala es ${modSala}. Buscá un código de modalidad ${modalidadFijada}.`)
        sockRef.current?.emit('salir_sala')
        setPantalla('lobby')
        return
      }
      const esA = socket.id === jugadorA
      if (limiteRecibido) setLimite(limiteRecibido)
      setModalidad('1vs1')
      const infoRival = esA ? jugadorBInfo : jugadorAInfo
      if (infoRival) {
        setNombreRival(infoRival.nombre || 'Rival')
        setInicialesRival((infoRival.nombre || 'Rival').slice(0, 2).toUpperCase())
        setRivalPhotoURL(infoRival.photoURL || '')
        setRivalUserId(infoRival.userId || null)
      }
      setPtsJ(0); setPtsM(0); setGanador(null); setLog([])
      prevResultadosLen.current = 0
      setPantalla('juego')
      addLog(['🎮 ¡Partida iniciada!'])
    })

    socket.on('truco_estado', estado => {
      if (estado.modalidad === '2v2') aplicarEstado2v2(estado)
      else aplicarEstado(estado)
    })

    socket.on('truco_error', msg => console.warn('truco_error:', msg))

    socket.on('prelobby', (data) => {
      const modSala = data?.modalidad
      if (modalidadFijada && modSala && modSala !== modalidadFijada) {
        setError(`Esta sala es ${modSala}. Buscá un código de modalidad ${modalidadFijada}.`)
        sockRef.current?.emit('salir_sala')
        setPantalla('lobby')
        return
      }
      setPrelobbyData(data)
      if (data.limite) setLimite(data.limite)
      setCodigoSala(data.salaId || '')
      setPantalla('prelobby')
    })

    socket.on('estado_sala', (data) => {
      setPrelobbyData(prev => prev ? { ...prev, ...data } : data)
    })

    socket.on('juego_iniciado_2v2', ({ limite: limiteRecibido }) => {
      if (limiteRecibido) setLimite(limiteRecibido)
      setModalidad('2v2')
      setPtsJ(0); setPtsM(0); setGanador(null); setLog([])
      prevResultadosLen.current = 0
      setPantalla('juego')
      addLog(['🎮 ¡Partida 2vs2 iniciada!'])
    })

    socket.on('chat_recibido', ({ nombre, texto }) => {
      addLog([`💬 ${nombre}: ${texto}`])
      const partner = partner2v2Ref.current
      const rivals  = rivals2v2Ref.current
      if (partner?.nombre === nombre) {
        setGloboPartner2v2(texto); setTimeout(() => setGloboPartner2v2(null), 5000)
      } else if (rivals?.[0]?.nombre === nombre) {
        setGloboRival1_2v2(texto); setTimeout(() => setGloboRival1_2v2(null), 5000)
      } else if (rivals?.[1]?.nombre === nombre) {
        setGloboRival2_2v2(texto); setTimeout(() => setGloboRival2_2v2(null), 5000)
      } else {
        setGloboRival(texto); setTimeout(() => setGloboRival(null), 5000)
      }
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
      sockRef.current.emit('set_nombre', { nombre: miNombre, userId, photoURL: usuario?.photoURL || '' })
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
  const puedeIniciarTruco   = puedeTruco && !trucoCantado && !trucoPendiente && turno === 'yo'
  const cantanteEsRival     = cantanteOriginalTruco === 'rival' || cantanteOriginalTruco === 'rival_equipo'
  const cantanteEsYo        = cantanteOriginalTruco === 'yo'    || cantanteOriginalTruco === 'yo_equipo'
  const puedeRetruco        = puedeTruco && trucoCantado === 'truco'   && cantanteEsRival
  const puedeVale4          = puedeTruco && trucoCantado === 'retruco' && cantanteEsYo
  const puedeIniciarRetruco = puedeTruco && !trucoPendiente && trucoCantado === 'truco'   && cantanteEsRival
  const puedeIniciarVale4   = puedeTruco && !trucoPendiente && trucoCantado === 'retruco' && cantanteEsYo

  // ── ESPERANDO (1vs1) ──
  if (pantalla === 'esperando') return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />
      <div className="relative flex-1 flex items-center justify-center px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(109,40,217,0.2),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="relative z-10 bg-white/[0.03] border border-white/[0.07] rounded-3xl p-10 max-w-md w-full text-center flex flex-col gap-7 backdrop-blur-sm">

          <div className="flex flex-col items-center gap-2">
            <span className="inline-flex items-center gap-2 bg-purple-950/50 border border-purple-600/30 text-purple-300 text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-widest">
              Modalidad {modalidadFijada || '1vs1'}
            </span>
            <h2 className="text-2xl font-extrabold mt-1">Sala creada</h2>
            <p className="text-gray-500 text-sm">Compartí el código con tu rival para empezar</p>
          </div>

          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Código de sala</p>
            <p className="text-6xl font-mono font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300 tracking-widest">{codigoSala}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(codigoSala); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
              className="flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-purple-500/30 transition-all text-sm font-semibold"
            >
              {copied ? (
                <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-green-400"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg><span className="text-green-400">¡Copiado!</span></>
              ) : (
                <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"/></svg>Copiar código</>
              )}
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/unirse/${codigoSala}`); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000) }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-purple-500/20 transition-all text-sm text-gray-400 hover:text-white"
            >
              {copiedLink ? (
                <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-green-400"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg><span className="text-green-400">¡Link copiado!</span></>
              ) : (
                <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"/></svg>Copiar link de invitación</>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-2">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inset-0 rounded-full bg-purple-500 opacity-60" />
              <span className="relative rounded-full w-2 h-2 bg-purple-400" />
            </span>
            Esperando rival...
          </div>

          <button
            onClick={() => { sockRef.current?.emit('salir_sala'); setPantalla('lobby') }}
            className="text-gray-500 text-sm hover:text-gray-300 transition"
          >
            ← Cancelar
          </button>
        </div>
      </div>
      <Footer />
    </div>
  )

  // ── RESULTADO ──
  if (pantalla === 'resultado') {
    const gano = ganador === 'yo'
    return (
      <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
        <Navbar />
        <div className="relative flex-1 flex items-center justify-center px-4 overflow-hidden">
          <div className={`absolute inset-0 ${gano ? 'bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(109,40,217,0.25),transparent)]' : 'bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(220,38,38,0.15),transparent)]'}`} />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.04) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

          <div className="relative z-10 bg-white/[0.03] border border-white/[0.07] rounded-3xl p-10 max-w-sm w-full text-center flex flex-col gap-6 backdrop-blur-sm">
            <div className="flex justify-center">
              {gano ? (
                <div className="w-20 h-20 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-yellow-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"/>
                  </svg>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-red-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"/>
                  </svg>
                </div>
              )}
            </div>

            <div>
              <h2 className={`text-4xl font-extrabold ${gano ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500' : 'text-white'}`}>
                {gano ? '¡Ganaste!' : 'Perdiste'}
              </h2>
              <p className="text-gray-500 text-sm mt-1">{gano ? '¡Bien jugado!' : 'Mejor suerte la próxima'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Vos</p>
                <p className="text-3xl font-extrabold text-purple-400">{ptsJ}</p>
              </div>
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Rival</p>
                <p className="text-3xl font-extrabold text-red-400">{ptsM}</p>
              </div>
            </div>

            <button
              onClick={() => setPantalla('lobby')}
              className="bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] hover:border-purple-500/30 text-white py-3 rounded-2xl font-semibold transition text-sm"
            >
              ← Volver al lobby
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── PRELOBBY 2v2 ──
  if (pantalla === 'prelobby') {
    const equipoA = prelobbyData?.equipoA || []
    const equipoB = prelobbyData?.equipoB || []
    const salaId  = prelobbyData?.salaId || codigoSala
    const total   = equipoA.length + equipoB.length
    const ambosCompletos = equipoA.length >= 2 && equipoB.length >= 2

    const PlayerRow = ({ jugador, color, empty }) => (
      <div className="h-12 flex items-center gap-3 px-3 rounded-xl flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 transition-all ${
          empty
            ? 'border border-dashed border-gray-700 text-gray-700'
            : color === 'A'
              ? 'bg-purple-900/60 border border-purple-600/40 text-purple-200'
              : 'bg-red-900/60 border border-red-600/40 text-red-200'
        }`}>
          {empty ? '?' : (jugador?.nombre || '?').slice(0, 2).toUpperCase()}
        </div>
        <span className={`text-sm font-semibold truncate flex-1 transition-all ${empty ? 'text-gray-700 italic' : 'text-white'}`}>
          {empty ? 'Esperando...' : jugador?.nombre}
        </span>
        {!empty && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${color === 'A' ? 'bg-purple-900/50 text-purple-300' : 'bg-red-900/50 text-red-300'}`}>
            Listo
          </span>
        )}
      </div>
    )

    const TeamCard = ({ jugadores, label, color, equipo }) => {
      const lleno = jugadores.length >= 2
      return (
        <div className={`flex-1 flex flex-col gap-3 bg-white/[0.03] border rounded-2xl p-4 transition-all ${lleno ? (color === 'A' ? 'border-purple-500/30' : 'border-red-500/30') : 'border-white/[0.07]'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-widest ${color === 'A' ? 'text-purple-400' : 'text-red-400'}`}>{label}</span>
            <span className={`text-[10px] font-bold tabular-nums ${lleno ? (color === 'A' ? 'text-purple-400' : 'text-red-400') : 'text-gray-600'}`}>{jugadores.length}/2</span>
          </div>
          {/* Slots de altura fija — siempre 2 filas, sin crecer */}
          <div className="flex flex-col gap-1" style={{ height: '104px' }}>
            {[0, 1].map(i => (
              <PlayerRow key={i} jugador={jugadores[i]} color={color} empty={!jugadores[i]} />
            ))}
          </div>
          <button
            onClick={() => sockRef.current?.emit('elegir_equipo', { salaId, equipo })}
            disabled={lleno || ambosCompletos}
            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${color === 'A' ? 'bg-purple-600 hover:bg-purple-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'bg-red-700 hover:bg-red-600 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]'} text-white`}
          >
            {ambosCompletos ? '¡Iniciando!' : lleno ? 'Equipo lleno' : `Unirse a ${label}`}
          </button>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
        <Navbar />
        <div className="relative flex-1 flex items-center justify-center px-4 py-12 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(109,40,217,0.18),transparent)]" />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

          <div className="relative z-10 w-full max-w-lg flex flex-col gap-6">

            {/* Header */}
            <div className="text-center flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 bg-purple-950/50 border border-purple-600/30 text-purple-300 text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-widest self-center">
                Truco · 2 vs 2
              </span>
              <h1 className="text-3xl font-extrabold">Sala de espera</h1>
              <div className="flex items-center justify-center gap-3 mt-1">
                <p className="text-gray-400 text-sm font-mono tracking-widest">
                  Código: <span className="text-purple-400 font-bold">{salaId}</span>
                </p>
                <button
                  onClick={() => { navigator.clipboard.writeText(salaId); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition"
                >
                  {copied ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-green-400"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z"/></svg>
                  )}
                  Copiar código
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/unirse/${salaId}`); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000) }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-400 transition"
                >
                  {copiedLink ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-green-400"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"/></svg>
                  )}
                  {copiedLink ? '¡Copiado!' : 'Copiar link'}
                </button>
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-3">
              <div className="flex-1 bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${(total / 4) * 100}%` }} />
              </div>
              <span className="text-sm font-bold text-white tabular-nums">{total}<span className="text-gray-500">/4</span></span>
              {ambosCompletos ? (
                <span className="text-xs text-green-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Iniciando
                </span>
              ) : (
                <span className="text-xs text-gray-500">jugadores</span>
              )}
            </div>

            {/* Teams */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
              <TeamCard jugadores={equipoA} label="Equipo A" color="A" equipo="A" />
              <div className="flex items-center justify-center pt-16">
                <span className="text-gray-600 font-bold text-sm">VS</span>
              </div>
              <TeamCard jugadores={equipoB} label="Equipo B" color="B" equipo="B" />
            </div>

            <button
              onClick={() => { sockRef.current?.emit('salir_sala'); setPantalla('lobby') }}
              className="text-gray-500 text-sm hover:text-gray-300 transition text-center"
            >
              ← Cancelar
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── LOBBY ──
  if (pantalla === 'lobby') {
    const modoLabel = modalidadFijada === '2vs2' ? '2 vs 2' : '1 vs 1'
    const modoDesc  = modalidadFijada === '2vs2' ? 'En equipo de dos — 4 jugadores' : 'Duelo mano a mano'
    return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />
      <div className="relative flex-1 flex items-center justify-center px-4 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-5%,rgba(109,40,217,0.2),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="relative z-10 w-full max-w-md flex flex-col gap-4">

          {/* Header */}
          <div className="text-center mb-2">
            <span className="inline-flex items-center gap-2 bg-purple-950/50 border border-purple-600/30 text-purple-300 text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              {modoLabel} · {modoDesc}
            </span>
            <h1 className="text-3xl font-extrabold mt-3">Truco Online</h1>
            <div className={`flex items-center justify-center gap-1.5 text-xs font-semibold mt-2 ${conectado ? 'text-green-400' : 'text-gray-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${conectado ? 'bg-green-400' : 'bg-gray-600 animate-pulse'}`} />
              {conectado ? 'Servidor conectado' : 'Conectando...'}
            </div>
          </div>

          {error && (
            <div className="bg-red-950/60 border border-red-700/40 text-red-400 text-sm px-4 py-3 rounded-2xl text-center">
              {error}
            </div>
          )}
          {errorConexion && (
            <div className="bg-amber-950/60 border border-amber-700/40 text-amber-200 text-sm px-4 py-3 rounded-2xl text-center">
              {errorConexion}
            </div>
          )}

          {modalCrearAbierto ? (
            /* ── Modal crear sala ── */
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl overflow-hidden">
              <div className="px-7 pt-7 pb-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-700/25 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-purple-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-white">Crear sala — {modoLabel}</p>
                    <p className="text-gray-500 text-xs">{modoDesc}</p>
                  </div>
                </div>
              </div>

              <div className="p-7 flex flex-col gap-5">
                <div className="flex flex-col gap-2.5">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">¿Hasta cuántos puntos?</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 20, 30, 40].map(l => (
                      <button key={l} onClick={() => setLimite(l)}
                        className={`py-3 rounded-xl border font-bold text-base transition-all ${limite === l ? 'border-purple-500 bg-purple-950/60 text-white shadow-[0_0_16px_rgba(139,92,246,0.2)]' : 'border-white/[0.07] bg-white/[0.03] text-gray-400 hover:border-purple-500/30 hover:text-white'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-900/50 border border-purple-700/30 flex items-center justify-center text-xs font-bold text-purple-200">
                      {miNombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{miNombre}</p>
                      <p className="text-gray-500 text-xs">Anfitrión</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-purple-400 text-sm font-bold">{modoLabel}</p>
                    <p className="text-gray-500 text-xs">hasta {limite} pts</p>
                  </div>
                </div>

                <button
                  onClick={() => { setError(''); setModalCrearAbierto(false); sockRef.current?.emit('crear_sala', { limite, modalidad: modalidadFijada || modalidadCrear }) }}
                  disabled={!conectado}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-bold transition-all hover:shadow-[0_0_32px_rgba(139,92,246,0.35)]"
                >
                  Crear partida →
                </button>
                <button onClick={() => setModalCrearAbierto(false)}
                  className="text-gray-500 hover:text-gray-300 text-sm transition text-center">
                  ← Volver
                </button>
              </div>
            </div>
          ) : (
            /* ── Vista principal lobby ── */
            <div className="flex flex-col gap-3">
              {/* Crear sala */}
              <div className="bg-white/[0.03] border border-white/[0.07] hover:border-purple-500/25 rounded-2xl p-5 flex flex-col gap-4 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-700/25 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-purple-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">Crear una sala</p>
                    <p className="text-gray-500 text-xs">Invitá a {modalidadFijada === '2vs2' ? 'tus amigos' : 'un amigo'} con el código</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalCrearAbierto(true)}
                  disabled={!conectado}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all hover:shadow-[0_0_24px_rgba(139,92,246,0.3)] text-sm"
                >
                  Crear sala →
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/[0.05]" />
                <span className="text-gray-600 text-[10px] uppercase tracking-wider">o unite a una sala</span>
                <div className="flex-1 h-px bg-white/[0.05]" />
              </div>

              {/* Unirse */}
              <div className="bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] rounded-2xl p-5 flex flex-col gap-4 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">Unirse a una sala</p>
                    <p className="text-gray-500 text-xs">Ingresá el código que te pasaron</p>
                  </div>
                </div>
                <input
                  value={inputCodigo}
                  onChange={e => setInputCodigo(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && inputCodigo.length === 4 && conectado && sockRef.current?.emit('unirse_sala', { salaId: inputCodigo })}
                  placeholder="AB3X"
                  maxLength={4}
                  className="bg-white/[0.04] border border-white/[0.08] focus:border-purple-500/50 rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.3em] focus:outline-none transition placeholder-gray-700"
                />
                <button
                  onClick={() => { setError(''); sockRef.current?.emit('unirse_sala', { salaId: inputCodigo }) }}
                  disabled={inputCodigo.length < 4 || !conectado}
                  className="bg-white/[0.06] hover:bg-white/[0.10] disabled:opacity-30 disabled:cursor-not-allowed border border-white/[0.08] hover:border-purple-500/30 text-white py-3 rounded-xl font-bold transition text-sm"
                >
                  Unirse →
                </button>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[
                  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>, texto: 'Tiempo real' },
                  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>, texto: 'Gratis' },
                  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"/></svg>, texto: 'Con ranking' },
                ].map(item => (
                  <div key={item.texto} className="bg-white/[0.02] border border-white/[0.05] rounded-xl py-3 flex flex-col items-center gap-1.5">
                    <span className="text-gray-500">{item.icon}</span>
                    <p className="text-gray-500 text-[10px] font-medium">{item.texto}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )}

  // ── JUEGO ──
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />
      {modalidad === '2v2' ? (
        <MesaTruco2v2
          miMano={manoJ} miCartasJugadas={cjJ} muestra={muestra}
          partner={partner2v2} rivals={rivals2v2} jugadasMano={jugadasMano2v2}
          resultados={resultados} manoActual={manoActual} turno={turno}
          turnoNombre={null} esMano={esMano} ptsYo={ptsJ} ptsRival={ptsM} limite={limite}
          trucoCantado={trucoCantado} trucoPendiente={trucoPendiente}
          trucoResuelto={trucoResuelto} esperandoRespuesta={esperandoRespuesta}
          cantanteOriginalTruco={cantanteOriginalTruco}
          puedeIniciarTruco={puedeIniciarTruco} puedeRetruco={puedeRetruco}
          puedeVale4={puedeVale4} puedeIniciarRetruco={puedeIniciarRetruco}
          puedeIniciarVale4={puedeIniciarVale4}
          puedeEnvido={puedeEnvido} envidoPendiente={envidoPendiente}
          nivelEnvido={nivelEnvido} envidoAcumulado={envidoAcumulado}
          puedeSubirEnvido={puedeSubirEnvido} puedeSubirRealEnvido={puedeSubirRealEnvido}
          puedeSubirFaltaEnvido={puedeSubirFaltaEnvido}
          tengoFlor={tengoFlor2v2} equipoTieneFlor={equipoTieneFlor2v2}
          rivalEquipoTieneFlor={rivalEquipoTieneFlor2v2}
          florPendiente={florPendiente} florResuelta={florResuelta}
          florActiva={florActiva} florCantada={florCantada} nivelFlor={nivelFlor}
          florCantadaPor={florCantadaPor}
          jugarCarta={jugarCarta} cantarTruco={cantarTruco}
          responderTrucoQuiero={responderTrucoQuiero} responderTrucoNoQuiero={responderTrucoNoQuiero}
          cantarEnvido={cantarEnvido}
          responderEnvidoQuiero={responderEnvidoQuiero} responderEnvidoNoQuiero={responderEnvidoNoQuiero}
          cantarFlor={cantarFlor} responderFlorQuiero={responderFlorQuiero}
          responderFlorNoQuiero={responderFlorNoQuiero}
          onSubirEnvidoConNivel={(nivel) => { setEnvidoPendiente(false); cantarEnvido(nivel) }}
          cartaSel={cartaSel} setCartaSel={setCartaSel}
          puedeJugar={puedeJugar} bloqueado={bloqueado}
          miNombre={miNombre} miPhotoURL={usuario?.photoURL || ''}
          log={log} onEnviarMensaje={enviarMensaje}
          rondaTerminada={rondaTerminada} mostrandoMano={mostrandoMano}
          globoYo={globoYo}
          globoPartner={globoPartner2v2}
          globoRival1={globoRival1_2v2}
          globoRival2={globoRival2_2v2}
          timerSeg={timerSeg}
        />
      ) : (
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
          nombreRival={nombreRival} inicialesRival={inicialesRival} rivalUserId={rivalUserId}
          miNombre={miNombre} miPhotoURL={usuario?.photoURL || ''}
          rivalPhotoURL={rivalPhotoURL}
          resultadoUltimaMano={resultadoUltimaMano}
          rondaTerminada={rondaTerminada} timerSeg={timerSeg}
          globoYo={globoYo} globoRival={globoRival}
          onEnviarMensaje={enviarMensaje}
          onSubirEnvidoConNivel={(nivel) => { setEnvidoPendiente(false); cantarEnvido(nivel) }}
        />
      )}
      <Footer />
    </div>
  )
}
