import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { crearMazoConSeed, calcularEnvido, detectarFlor, ganadorMano, ganadorRonda, calcularValorFlor } from './logica'
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
  const [soyA, setSoyA]               = useState(false)
  const [conectado, setConectado]     = useState(false)
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false)
  const [modalidad, setModalidad]     = useState('1vs1')

  const [muestra, setMuestra]           = useState(null)
  const [manoJ, setManoJ]               = useState([])
  const [manoM, setManoM]               = useState([])
  const [cjJ, setCjJ]                   = useState([])
  const [cjM, setCjM]                   = useState([])
  const [resultados, setResultados]     = useState([])
  const [manoActual, setManoActual]     = useState(0)
  const [esMano, setEsMano]             = useState(false)
  const [turno, setTurno]               = useState('rival')
  const [cartaSel, setCartaSel]         = useState(null)
  const [log, setLog]                   = useState([])
  const [ptsJ, setPtsJ]                 = useState(0)
  const [ptsM, setPtsM]                 = useState(0)
  const [ganador, setGanador]           = useState(null)
  const [mostrandoMano, setMostrandoMano] = useState(false)
  const [primeraJugada, setPrimeraJugada] = useState(false)

  const [florJ, setFlorJ]               = useState(false)
  const [florM, setFlorM]               = useState(false)
  const [florResuelta, setFlorResuelta] = useState(true)
  const [envidoResuelto, setEnvidoResuelto] = useState(false)

  const [trucoCantado, setTrucoCantado]     = useState(null)
  const [ultimoEnCantar, setUltimoEnCantar] = useState(null)
  const [cantanteOriginalTruco, setCantanteOriginalTruco] = useState(null)
  const [trucoResuelto, setTrucoResuelto]   = useState(false)

  const [esperandoRespuesta, setEsperandoRespuesta] = useState(false)
  const [trucoPendiente, setTrucoPendiente]         = useState(false)
  const [envidoPendiente, setEnvidoPendiente]       = useState(false)
  const [nivelEnvido, setNivelEnvido]               = useState(null)
  const [envidoAcumulado, setEnvidoAcumulado]       = useState(0)

  const { usuario } = useAuth()
  const miNombre = usuario?.displayName || usuario?.email?.split('@')[0] || 'Jugador'

  const [nombreRival, setNombreRival]     = useState('Rival')
  const [inicialesRival, setInicialesRival] = useState('RV')
  const nombreRivalRef                    = useRef('Rival')

  const [florPendiente, setFlorPendiente] = useState(false)
  const [florCantada, setFlorCantada]     = useState(null)
  const [mostrarCartasRival, setMostrarCartasRival] = useState(false)
  const [rivalTieneFlor, setRivalTieneFlor] = useState(false)

  const [florActiva, setFlorActiva]       = useState(false)
  const [florEnJuego, setFlorEnJuego]     = useState(false)
  const [florCantadaPor, setFlorCantadaPor] = useState(null)
  const [nivelFlor, setNivelFlor]         = useState(null)

  const [copied, setCopied]   = useState(false)
  const [timeoutId, setTimeoutId] = useState(null)

  const g        = useRef({})
  const navigate = useNavigate()

  const puedeSubirEnvido      = envidoPendiente && nivelEnvido !== 'real' && nivelEnvido !== 'falta'
  const puedeSubirRealEnvido  = envidoPendiente && nivelEnvido !== 'falta'
  const puedeSubirFaltaEnvido = envidoPendiente

  useEffect(() => {
    if (!usuario) navigate('/login', { state: { desde: '/juegos/truco-online' } })
  }, [usuario])

  useEffect(() => {
    g.current = {
      cjJ, cjM, manoActual, resultados, muestra, manoJ, manoM,
      ptsJ, ptsM, esMano, trucoCantado, trucoResuelto,
      florJ, florM, envidoResuelto, florResuelta, limite, soyA, nivelEnvido,
      envidoAcumulado, mostrarCartasRival, rivalTieneFlor,
    }
  })

  const addLog = msg => setLog(p => [msg, ...p].slice(0, 50))

  const iniciarTimeout = (segundos = 30) => {
    if (timeoutId) clearTimeout(timeoutId)
    const id = setTimeout(() => {
      if (esperandoRespuesta) {
        addLog(`⏱ Tiempo agotado — +2 para vos`)
        setPtsJ(p => p + 2)
        setEsperandoRespuesta(false)
        setTrucoResuelto(true)
      }
    }, segundos * 1000)
    setTimeoutId(id)
  }

  const cancelarTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId)
    setTimeoutId(null)
  }

  const mostrarCartasRivalTemporalmente = () => {
    setMostrarCartasRival(true)
    addLog(`🔍 Mostrando cartas de ${nombreRival}`)
    setTimeout(() => {
      setMostrarCartasRival(false)
      addLog(`👁️ Cartas ocultas nuevamente`)
    }, 2000)
  }

  const revisarGanador = (pj, pm) => {
    if (pj >= limite) { setPtsJ(pj); setPtsM(pm); setGanador('yo');    setPantalla('resultado'); return true }
    if (pm >= limite) { setPtsJ(pj); setPtsM(pm); setGanador('rival'); setPantalla('resultado'); return true }
    return false
  }

  const resetRonda = () => {
    setCjJ([]); setCjM([]); setResultados([])
    setManoActual(0); setCartaSel(null)
    setTrucoCantado(null); setTrucoResuelto(false); setUltimoEnCantar(null); setCantanteOriginalTruco(null)
    setEnvidoResuelto(false); setMostrandoMano(false); setPrimeraJugada(false)
    setTrucoPendiente(false); setEnvidoPendiente(false)
    setEsperandoRespuesta(false); setNivelEnvido(null); setEnvidoAcumulado(0)
    setMostrarCartasRival(false)
  }

  const repartir = (seed, esEsMano, jugadorA, pjActual = 0, pmActual = 0) => {
    const mazo = crearMazoConSeed(seed)
    const m    = mazo[0]
    const mj   = jugadorA ? mazo.slice(1, 4) : mazo.slice(4, 7)
    const mm   = jugadorA ? mazo.slice(4, 7) : mazo.slice(1, 4)
    const fj   = detectarFlor(mj, m)
    const fm   = detectarFlor(mm, m)

    setMuestra(m); setManoJ(mj); setManoM(mm)
    setFlorJ(fj); setFlorM(fm)

    if (fj && fm) {
      setFlorActiva(true); setFlorResuelta(false); setFlorEnJuego(false)
      setFlorCantadaPor(null); setNivelFlor(null); setFlorPendiente(false)
      addLog('⚘ ¡Ambos tienen Flor!')
    } else {
      setFlorActiva(false); setFlorResuelta(!fj && !fm); setFlorEnJuego(false)
    }

    setEsMano(esEsMano); setTurno(esEsMano ? 'yo' : 'rival')
    resetRonda()
    setMostrarCartasRival(false); setRivalTieneFlor(fm)

    addLog('─── Nueva ronda ───')
    addLog(`📋 Muestra: ${m.numero} de ${m.palo}`)
    if (fj && !fm) addLog('🌸 Tenés Flor (automática +3)')
    if (!fj && fm) addLog(`🌸 ${nombreRival} tiene Flor`)
    if (fj && fm)  addLog('⚘ Ambos tienen Flor')

    if (fj && !fm) {
      setTimeout(() => {
        const nuevo = pjActual + 3
        setPtsJ(nuevo)
        addLog('🌸 Flor automática — +3')
        setFlorResuelta(true); setFlorActiva(false)
        sockRef.current?.emit('accion', { tipo: 'flor_auto', datos: {} })
        revisarGanador(nuevo, pmActual)
      }, 800)
    }
  }

  const guardarPartida = async (ganadorFinal, pjFinal, pmFinal) => {
    if (!usuario) return
    try {
      await addDoc(collection(db, 'ranking_truco'), {
        uid: usuario.uid,
        nombre: usuario.displayName || usuario.email?.split('@')[0] || 'Jugador',
        resultado: ganadorFinal === 'jugador' ? 'victoria' : 'derrota',
        puntosVos: pjFinal, puntosRival: pmFinal,
        fecha: serverTimestamp()
      })
    } catch (e) { console.error('Error guardando partida:', e) }
  }

  const terminarRonda = (gan, pjAct, pmAct, eManoAct) => {
    const gc = g.current
    let pj = pjAct, pm = pmAct
    if (!gc.trucoResuelto) {
      const val = { truco: 2, retruco: 3, vale4: 4 }[gc.trucoCantado] || 1
      if (gan === 'jugador') { pj += val; addLog(`✅ Ganaste la ronda +${val}`) }
      else if (gan === 'maquina') { pm += val; addLog(`❌ ${nombreRival} ganó la ronda +${val}`) }
    }
    setPtsJ(pj); setPtsM(pm)
    if (pj >= gc.limite || pm >= gc.limite) guardarPartida(pj >= gc.limite ? 'jugador' : 'maquina', pj, pm)
    if (revisarGanador(pj, pm)) return
    if (gc.rivalTieneFlor) mostrarCartasRivalTemporalmente()
    setTimeout(() => {
      const nuevaEsMano = !eManoAct
      const sa = g.current.soyA
      if (sa) {
        const newSeed = Math.floor(Math.random() * 2147483647)
        sockRef.current?.emit('accion', { tipo: 'nueva_ronda', datos: { seed: newSeed, manoA: nuevaEsMano } })
        repartir(newSeed, nuevaEsMano, sa, pj, pm)
      }
    }, 1500)
  }

  const resolverMano = (cJ, cM, cjJAct, cjMAct, resAct, idx, muestraAct, mJAct, mMAct, pjAct, pmAct, eManoAct) => {
    const res = ganadorMano(cJ, cM, muestraAct)
    const nuevosRes = [...resAct, res]
    setResultados(nuevosRes); setMostrandoMano(true)
    if (res === 'jugador')      addLog('✅ Ganaste la mano')
    else if (res === 'maquina') addLog('❌ Rival ganó la mano')
    else                        addLog('🤝 Empate en la mano')
    setTimeout(() => {
      setMostrandoMano(false)
      const gan = ganadorRonda(nuevosRes, eManoAct ? 'jugador' : 'maquina')
      if (gan || nuevosRes.length === 3) {
        if (g.current.rivalTieneFlor) mostrarCartasRivalTemporalmente()
        terminarRonda(gan || 'empate', pjAct, pmAct, eManoAct)
        return
      }
      const sig = idx + 1
      setManoActual(sig)
      const quien = res === 'empate' ? (eManoAct ? 'yo' : 'rival') : (res === 'jugador' ? 'yo' : 'rival')
      setTurno(quien)
    }, DELAY_MANO)
  }

  const jugarCarta = carta => {
    const gc = g.current
    const nuevoCjJ = [...gc.cjJ, carta]
    setCjJ(nuevoCjJ); setCartaSel(null)
    if (!primeraJugada) setPrimeraJugada(true)
    addLog(`🃏 Jugaste ${carta.numero} de ${carta.palo}`)
    sockRef.current?.emit('accion', { tipo: 'carta', datos: { carta } })
    if (gc.cjM.length > gc.manoActual) {
      resolverMano(carta, gc.cjM[gc.manoActual], nuevoCjJ, gc.cjM, gc.resultados,
        gc.manoActual, gc.muestra, gc.manoJ, gc.manoM, gc.ptsJ, gc.ptsM, gc.esMano)
    } else { setTurno('rival') }
  }

  const cantarTruco = nivel => {
    if (trucoPendiente && (nivel === 'retruco' || nivel === 'vale4')) setTrucoPendiente(false)
    if (nivel === 'truco') setCantanteOriginalTruco('yo')
    setTrucoCantado(nivel); setUltimoEnCantar('yo'); setEsperandoRespuesta(true)
    addLog(`🗣 Cantaste ${nivel === 'truco' ? 'Truco' : nivel === 'retruco' ? 'Retruco' : 'Vale Cuatro'}`)
    sockRef.current?.emit('accion', { tipo: 'truco', datos: { nivel } })
    iniciarTimeout(30)
  }

  const responderTrucoQuiero = () => {
    setTrucoPendiente(false); setEsperandoRespuesta(false)
    addLog(`✅ Aceptaste el ${trucoCantado}`)
    sockRef.current?.emit('accion', { tipo: 'resp_truco', datos: { acepto: true } })
  }

  const responderTrucoNoQuiero = () => {
    const gc = g.current
    const pts = { truco: 1, retruco: 2, vale4: 3 }[gc.trucoCantado] || 1
    setTrucoPendiente(false); setTrucoResuelto(true)
    addLog(`❌ Rechazaste el ${gc.trucoCantado} — +${pts} para rival`)
    setPtsM(p => p + pts)
    if (gc.rivalTieneFlor) mostrarCartasRivalTemporalmente()
    sockRef.current?.emit('accion', { tipo: 'resp_truco', datos: { acepto: false } })
    setTimeout(() => terminarRonda('maquina', gc.ptsJ, gc.ptsM + pts, gc.esMano), 800)
  }

  const subirTruco = nivel => {
    setTrucoPendiente(false); setTrucoCantado(nivel); setUltimoEnCantar('yo'); setEsperandoRespuesta(true)
    addLog(`🗣 Subís a ${nivel}`)
    sockRef.current?.emit('accion', { tipo: 'truco', datos: { nivel } })
    iniciarTimeout(30)
  }

  const cantarEnvido = (nivel) => {
    if (esperandoRespuesta) return
    const pts = nivel === 'falta' ? limite - Math.min(ptsJ, ptsM) : nivel === 'real' ? envidoAcumulado + 3 : envidoAcumulado + 2
    setEnvidoAcumulado(pts); setNivelEnvido(nivel); setEsperandoRespuesta(true)
    addLog(`Cantaste: ${nivel === 'real' ? 'Real Envido' : nivel === 'falta' ? 'Falta Envido' : 'Envido'} (vale ${pts})`)
    sockRef.current?.emit('accion', { tipo: 'envido', datos: { nivel, pts } })
    iniciarTimeout(30)
  }

  const responderEnvidoQuiero = () => {
    const gc = g.current
    const pts = gc.nivelEnvido === 'falta' ? gc.limite - Math.min(gc.ptsJ, gc.ptsM) : gc.envidoAcumulado
    const ej = calcularEnvido(gc.manoJ, gc.muestra)
    const em = calcularEnvido(gc.manoM, gc.muestra)
    addLog(`✅ Aceptaste — Tanto: vos ${ej} vs rival ${em}`)
    if (ej >= em) {
      setPtsJ(gc.ptsJ + pts); addLog(`✅ +${pts} para vos`)
      sockRef.current?.emit('accion', { tipo: 'resultado_envido', datos: { ptsJ: gc.ptsJ + pts, ptsM: gc.ptsM, tantoJ: ej, tantoM: em, ganador: 'yo' } })
    } else {
      setPtsM(gc.ptsM + pts); addLog(`❌ +${pts} para rival`)
      sockRef.current?.emit('accion', { tipo: 'resultado_envido', datos: { ptsJ: gc.ptsJ, ptsM: gc.ptsM + pts, tantoJ: ej, tantoM: em, ganador: 'rival' } })
    }
    setEnvidoResuelto(true); setEnvidoPendiente(false)
  }

  const responderEnvidoNoQuiero = () => {
    const gc = g.current
    addLog(`❌ Rechazaste el envido — +1 para rival`)
    setPtsM(p => p + 1); setEnvidoResuelto(true); setEnvidoPendiente(false)
    if (gc.rivalTieneFlor) mostrarCartasRivalTemporalmente()
    sockRef.current?.emit('accion', { tipo: 'resp_envido', datos: { acepto: false } })
  }

  const cantarFlor = (nivel) => {
    if (esperandoRespuesta || florEnJuego) return
    setNivelFlor(nivel); setFlorEnJuego(true); setFlorCantadaPor('yo'); setEsperandoRespuesta(true)
    const pts = nivel === 'flor' ? 3 : nivel === 'conFlor' ? 6 : limite - Math.min(ptsJ, ptsM)
    const nombreNivel = nivel === 'flor' ? 'La mía es Flor' : nivel === 'conFlor' ? 'Con Flor Envido' : 'Contra Flor al Resto'
    addLog(`🌸 Cantaste: ${nombreNivel} (vale ${pts})`)
    sockRef.current?.emit('accion', { tipo: 'flor_apuesta', datos: { nivel, pts } })
    iniciarTimeout(30)
  }

  const responderFlorQuiero = () => {
    const gc = g.current
    const pts = nivelFlor === 'flor' ? 3 : nivelFlor === 'conFlor' ? 6 : limite - Math.min(gc.ptsJ, gc.ptsM)
    const valorJ = calcularValorFlor(gc.manoJ, gc.muestra)
    const valorM = calcularValorFlor(gc.manoM, gc.muestra)
    addLog(`⚘ Flor: vos ${valorJ} — rival ${valorM}`)
    if (valorJ >= valorM) { setPtsJ(gc.ptsJ + pts); addLog(`✅ +${pts} para vos`) }
    else { setPtsM(gc.ptsM + pts); addLog(`❌ +${pts} para rival`) }
    setFlorResuelta(true); setFlorActiva(false); setFlorEnJuego(false)
    setFlorPendiente(false); setFlorCantadaPor(null); setNivelFlor(null)
    setEnvidoResuelto(true); setEsperandoRespuesta(false)
    sockRef.current?.emit('accion', { tipo: 'resultado_flor', datos: {
      ptsJ: gc.ptsJ + (valorJ >= valorM ? pts : 0),
      ptsM: gc.ptsM + (valorM > valorJ ? pts : 0),
      ganador: valorJ >= valorM ? 'yo' : 'rival', pts
    }})
  }

  const responderFlorNoQuiero = () => {
    const pts = florCantada === 'flor' ? 1 : florCantada === 'conFlor' ? 3 : 5
    addLog(`❌ No querés — +${pts} para rival`)
    setPtsM(ptsM + pts)
    setFlorResuelta(true); setFlorPendiente(false); setEnvidoResuelto(true); setEsperandoRespuesta(false)
    sockRef.current?.emit('accion', { tipo: 'resultado_flor', datos: { ptsJ, ptsM: ptsM + pts, valorJ: 0, valorM: 0, ganador: 'rival', pts }})
  }

  const handleAccionRival = ({ tipo, datos }) => {
    const gc = g.current

    if (tipo === 'carta') {
      cancelarTimeout()
      const nuevoCjM = [...gc.cjM, datos.carta]
      setCjM(nuevoCjM)
      addLog(`🃏 ${nombreRivalRef.current} jugó ${datos.carta.numero} de ${datos.carta.palo}`)
      if (gc.cjJ.length > gc.manoActual) {
        resolverMano(gc.cjJ[gc.manoActual], datos.carta, gc.cjJ, nuevoCjM, gc.resultados,
          gc.manoActual, gc.muestra, gc.manoJ, gc.manoM, gc.ptsJ, gc.ptsM, gc.esMano)
      } else { setTurno('yo') }
    }
    else if (tipo === 'flor_auto') {
      cancelarTimeout()
      addLog(`🌸 ${nombreRivalRef.current} tiene Flor — +3`)
      setPtsM(p => p + 3); setFlorResuelta(true); setEnvidoResuelto(true)
      revisarGanador(gc.ptsJ, gc.ptsM + 3)
    }
    else if (tipo === 'flor_apuesta') {
      cancelarTimeout()
      const { nivel, pts } = datos
      setNivelFlor(nivel); setFlorEnJuego(true); setFlorCantadaPor('rival'); setFlorPendiente(true); setEsperandoRespuesta(false)
      const n = nivel === 'flor' ? 'La mía es Flor' : nivel === 'conFlor' ? 'Con Flor Envido' : 'Contra Flor al Resto'
      addLog(`🌸 ${nombreRivalRef.current} cantó: ${n} (vale ${pts})`)
    }
    else if (tipo === 'resultado_flor') {
      cancelarTimeout()
      const { ptsJ: nJ, ptsM: nM, valorJ, valorM, ganador, pts } = datos
      setPtsJ(nJ); setPtsM(nM)
      setFlorResuelta(true); setFlorPendiente(false); setEnvidoResuelto(true); setEsperandoRespuesta(false)
      addLog(`⚘ Flor: vos ${valorJ} — rival ${valorM}`)
      if (ganador === 'yo') addLog(`✅ +${pts} para vos`)
      else addLog(`❌ +${pts} para rival`)
      revisarGanador(nJ, nM)
    }
    else if (tipo === 'resp_flor') {
      cancelarTimeout(); setEsperandoRespuesta(false)
      if (datos.acepto) {
        const valorJ = calcularValorFlor(gc.manoJ, gc.muestra)
        const valorM = calcularValorFlor(gc.manoM, gc.muestra)
        const pts = florCantada === 'flor' ? 3 : florCantada === 'conFlor' ? 6 : gc.limite - Math.min(gc.ptsJ, gc.ptsM)
        addLog(`⚘ Flor: vos ${valorJ} — rival ${valorM}`)
        if (valorJ >= valorM) { setPtsJ(p => p + pts); addLog(`✅ +${pts}`) }
        else { setPtsM(p => p + pts); addLog(`❌ +${pts}`) }
      } else {
        const pts = florCantada === 'flor' ? 3 : florCantada === 'conFlor' ? 3 : 5
        addLog(`+${pts} para vos (rival no quiso)`); setPtsJ(p => p + pts)
      }
      setFlorResuelta(true); setFlorPendiente(false); setEnvidoResuelto(true)
    }
    else if (tipo === 'truco') {
      cancelarTimeout()
      const { nivel } = datos
      if (gc.trucoPendiente) setTrucoPendiente(false)
      if (nivel === 'truco') setCantanteOriginalTruco('rival')
      setTrucoCantado(nivel); setUltimoEnCantar('rival'); setEsperandoRespuesta(false); setTrucoPendiente(true)
      addLog(`🗣 ${nombreRivalRef.current} cantó ${nivel === 'truco' ? 'Truco' : nivel === 'retruco' ? 'Retruco' : 'Vale Cuatro'}`)
    }
    else if (tipo === 'resp_truco') {
      cancelarTimeout(); setEsperandoRespuesta(false)
      if (datos.acepto) { addLog(`✅ ${nombreRivalRef.current} quiere ${gc.trucoCantado}`); setUltimoEnCantar('rival') }
      else {
        const pts = { truco: 1, retruco: 2, vale4: 3 }[gc.trucoCantado] || 1
        addLog(`❌ ${nombreRivalRef.current} no quiere — +${pts} para vos`)
        setPtsJ(p => p + pts); setTrucoResuelto(true)
        if (rivalTieneFlor) setMostrarCartasRival(true)
        setTimeout(() => terminarRonda('jugador', gc.ptsJ + pts, gc.ptsM, gc.esMano), 800)
      }
    }
    else if (tipo === 'envido') {
      cancelarTimeout()
      const { nivel, pts } = datos
      setNivelEnvido(nivel); setEnvidoAcumulado(pts); setEnvidoPendiente(true); setEsperandoRespuesta(false)
      addLog(`🎴 ${nombreRivalRef.current} cantó ${nivel === 'real' ? 'Real Envido' : nivel === 'falta' ? 'Falta Envido' : 'Envido'} (vale ${pts})`)
    }
    else if (tipo === 'resultado_envido') {
      cancelarTimeout()
      const { ptsJ: nJ, ptsM: nM, tantoJ, tantoM, ganador } = datos
      setPtsJ(nJ); setPtsM(nM); setEnvidoResuelto(true); setEnvidoPendiente(false); setEsperandoRespuesta(false)
      addLog(`Tanto: vos ${tantoJ} — rival ${tantoM}`)
      if (ganador === 'yo') addLog(`✅ +${nJ - gc.ptsJ} para vos`)
      else addLog(`❌ +${nM - gc.ptsM} para rival`)
      revisarGanador(nJ, nM)
    }
    else if (tipo === 'resp_envido') {
      cancelarTimeout(); setEsperandoRespuesta(false); setEnvidoResuelto(true)
      if (datos.acepto) {
        const ej = calcularEnvido(gc.manoJ, gc.muestra)
        const em = calcularEnvido(gc.manoM, gc.muestra)
        const pts = gc.nivelEnvido === 'falta' ? gc.limite - Math.min(gc.ptsJ, gc.ptsM) : gc.nivelEnvido === 'real' ? 3 : 2
        addLog(`Tanto: vos ${ej} — rival ${em}`)
        if (ej >= em) { setPtsJ(gc.ptsJ + pts); addLog(`✅ +${pts}`) }
        else { setPtsM(gc.ptsM + pts); addLog(`❌ +${pts}`) }
      } else { addLog(`+1 para vos`); setPtsJ(gc.ptsJ + 1) }
    }
    else if (tipo === 'flor') {
      cancelarTimeout()
      addLog(`🌸 ${nombreRivalRef.current} declara Flor`)
      if (!gc.florJ) { setPtsM(p => p + 3); addLog(`+3 para rival`) }
      else {
        const valorJ = calcularValorFlor(gc.manoJ, gc.muestra)
        const valorM = calcularValorFlor(gc.manoM, gc.muestra)
        addLog(`⚘ Flor: vos ${valorJ} — rival ${valorM}`)
        if (valorJ >= valorM) { setPtsJ(p => p + 3); addLog(`✅ +3`) }
        else { setPtsM(p => p + 3); addLog(`❌ +3`) }
      }
      setFlorResuelta(true); setEnvidoResuelto(true)
    }
    else if (tipo === 'nueva_ronda') {
      cancelarTimeout()
      const { seed, manoA } = datos
      const sa = gc.soyA
      repartir(seed, sa ? manoA : !manoA, sa, gc.ptsJ, gc.ptsM)
    }
  }

  useEffect(() => {
    const socket = io(SOCKET_URL, { forceNew: true })
    sockRef.current = socket

    socket.on('connect',    () => setConectado(true))
    socket.on('disconnect', () => setConectado(false))

    socket.on('sala_creada', ({ salaId, modalidad: mod }) => {
      setCodigoSala(salaId)
      setPantalla('esperando')
    })

    socket.on('error_sala', msg => setError(msg))

    socket.on('juego_iniciado', ({ seed, jugadorA, limite: limiteRecibido, jugadorAInfo, jugadorBInfo }) => {
      const esA = socket.id === jugadorA
      setSoyA(esA)
      if (limiteRecibido) setLimite(limiteRecibido)
      const infoRival = esA ? jugadorBInfo : jugadorAInfo
      if (infoRival) {
        setNombreRival(infoRival.nombre || 'Rival')
        setInicialesRival((infoRival.nombre || 'Rival').slice(0, 2).toUpperCase())
        nombreRivalRef.current = infoRival.nombre || 'Rival'
      }
      setPtsJ(0); setPtsM(0); setGanador(null); setLog([])
      repartir(seed, esA, esA, 0, 0)
      setPantalla('juego')
      addLog('🎮 ¡Partida iniciada!')
    })

    socket.on('accion_rival', handleAccionRival)

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

  const resultadoUltimaMano = resultados[resultados.length - 1]
  const bloqueado           = mostrandoMano || esperandoRespuesta || trucoPendiente || envidoPendiente
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
        onSubirEnvidoConNivel={(nivel) => { setEnvidoPendiente(false); cantarEnvido(nivel) }}
      />
      <Footer />
    </div>
  )
}