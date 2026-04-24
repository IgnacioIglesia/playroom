import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { CartaComp, CartaMuestra, BtnCanto, TanteadorPalillos } from './componentes'
import { crearMazoConSeed, calcularEnvido, detectarFlor, ganadorMano, ganadorRonda, calcularValorFlor } from './logica'
import { DELAY_MANO } from './constantes'
import { useAuth } from '../../context/AuthContext'
import MesaTruco from './MesaTruco'

const SOCKET_URL = 'https://playroom-backend.onrender.com'

export default function TrucoOnline() {
  const sockRef = useRef(null)

  const [pantalla, setPantalla]       = useState('lobby')
  const [codigoSala, setCodigoSala]   = useState('')
  const [inputCodigo, setInputCodigo] = useState('')
  const [error, setError]             = useState('')
  const [limite, setLimite] = useState(30)
  const [soyA, setSoyA]               = useState(false)
  const [conectado, setConectado]     = useState(false)
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false)
  const [modalidad, setModalidad] = useState('1vs1')
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

  const [trucoCantado, setTrucoCantado]   = useState(null)
  const [ultimoEnCantar, setUltimoEnCantar] = useState(null)
  const [cantanteOriginalTruco, setCantanteOriginalTruco] = useState(null)
  const [trucoResuelto, setTrucoResuelto] = useState(false)

  const [esperandoRespuesta, setEsperandoRespuesta] = useState(false)
  const [trucoPendiente, setTrucoPendiente]         = useState(false)
  const [envidoPendiente, setEnvidoPendiente]       = useState(false)
  const [nivelEnvido, setNivelEnvido]               = useState(null)
  const [envidoAcumulado, setEnvidoAcumulado] = useState(0)

  const { usuario } = useAuth()
  const miNombre = usuario?.displayName || usuario?.email?.split('@')[0] || 'Jugador'


  const [nombreRival, setNombreRival] = useState('Rival')
  const [inicialesRival, setInicialesRival] = useState('RV')
  const nombreRivalRef = useRef('Rival') 

  const [florPendiente, setFlorPendiente] = useState(false)
  const [florCantada, setFlorCantada] = useState(null)
  
  const [mostrarCartasRival, setMostrarCartasRival] = useState(false)
  const [rivalTieneFlor, setRivalTieneFlor] = useState(false)

  const puedeSubirEnvido      = envidoPendiente && nivelEnvido !== 'real' && nivelEnvido !== 'falta'
  const puedeSubirRealEnvido  = envidoPendiente && nivelEnvido !== 'falta'
  const puedeSubirFaltaEnvido = envidoPendiente

  const [florActiva, setFlorActiva] = useState(false)
  const [florEnJuego, setFlorEnJuego] = useState(false) 
  const [florCantadaPor, setFlorCantadaPor] = useState(null) 
  const [nivelFlor, setNivelFlor] = useState(null) 

  const g = useRef({})
  useEffect(() => {
g.current = {
        cjJ, cjM, manoActual, resultados, muestra, manoJ, manoM,
        ptsJ, ptsM, esMano, trucoCantado, trucoResuelto,
        florJ, florM, envidoResuelto, florResuelta, limite, soyA, nivelEnvido,
        envidoAcumulado, mostrarCartasRival, rivalTieneFlor,
      }
  })

  const addLog = msg => setLog(p => [msg, ...p].slice(0, 50))

  const mostrarCartasRivalTemporalmente = () => {
    setMostrarCartasRival(true)
    addLog(`🔍 Mostrando cartas de ${nombreRival} para verificar su Flor`)
    
    setTimeout(() => {
      setMostrarCartasRival(false)
      addLog(`👁️ Cartas de ${nombreRival} ocultas nuevamente`)
    }, 2000)
  }

  const revisarGanador = (pj, pm) => {
    if (pj >= limite) {
      setPtsJ(pj)
      setPtsM(pm)
      setGanador('yo')
      setPantalla('resultado')
      return true
    }
    if (pm >= limite) {
      setPtsJ(pj)
      setPtsM(pm)
      setGanador('rival')
      setPantalla('resultado')
      return true
    }
    return false
  }

  const resetRonda = () => {
    setCjJ([]); setCjM([]); setResultados([])
    setManoActual(0); setCartaSel(null)
    setTrucoCantado(null); setTrucoResuelto(false); setUltimoEnCantar(null); setCantanteOriginalTruco(null)
    setEnvidoResuelto(false); setMostrandoMano(false); setPrimeraJugada(false)
    setTrucoPendiente(false); setEnvidoPendiente(false)
    setEsperandoRespuesta(false)
    setNivelEnvido(null)
    setEnvidoAcumulado(0)
    setMostrarCartasRival(false)
  }

  const repartir = (seed, esEsMano, jugadorA, pjActual = 0, pmActual = 0) => {
    const mazo = crearMazoConSeed(seed)
    const m    = mazo[0]
    const mj   = jugadorA ? mazo.slice(1, 4) : mazo.slice(4, 7)
    const mm   = jugadorA ? mazo.slice(4, 7) : mazo.slice(1, 4)
    const fj   = detectarFlor(mj, m)
    const fm   = detectarFlor(mm, m)
  
    setMuestra(m)
    setManoJ(mj)
    setManoM(mm)
    setFlorJ(fj)
    setFlorM(fm)
    
    // ✅ NUEVA LÓGICA: Solo si AMBOS tienen Flor, activar el juego de Flor
    if (fj && fm) {
      setFlorActiva(true)      // Ambos tienen Flor - disponibles los botones
      setFlorResuelta(false)    // Aún no se resuelve
      setFlorEnJuego(false)     // Nadie ha cantado todavía
      setFlorCantadaPor(null)
      setNivelFlor(null)
      setFlorPendiente(false)
      addLog('⚘ ¡Ambos tienen Flor! Elegí una opción para apostar')
    } else {
      setFlorActiva(false)
      setFlorResuelta(!fj && !fm)
      setFlorEnJuego(false)
    }
    
    setEsMano(esEsMano)
    setTurno(esEsMano ? 'yo' : 'rival')
    resetRonda()
    
    setMostrarCartasRival(false)
    setRivalTieneFlor(fm)
  
    addLog('─── Nueva ronda ───')
    addLog(`📋 Muestra: ${m.numero} de ${m.palo}`)
    
    if (fj && !fm) addLog('🌸 Tenés Flor (automática +3)')
    if (!fj && fm) addLog(`🌸 ${nombreRival} tiene Flor (automática +3 al final)`)
    if (fj && fm) addLog('⚘ Ambos tienen Flor - Podés apostar')
  
    // Flor automática si solo uno tiene
    if (fj && !fm) {
      setTimeout(() => {
        const nuevo = pjActual + 3
        setPtsJ(nuevo)
        addLog('🌸 Flor automática para vos — +3')
        setFlorResuelta(true)
        setFlorActiva(false)
        sockRef.current?.emit('accion', { tipo: 'flor_auto', datos: {} })
        revisarGanador(nuevo, pmActual)
      }, 800)
    }
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
    if (revisarGanador(pj, pm)) return
  
    if (gc.rivalTieneFlor) {
      mostrarCartasRivalTemporalmente()
    }
  
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
    setResultados(nuevosRes)
    setMostrandoMano(true)
  
    if (res === 'jugador')      addLog('✅ Ganaste la mano')
    else if (res === 'maquina') addLog('❌ Rival ganó la mano')
    else                        addLog('🤝 Empate en la mano')
  
    setTimeout(() => {
      setMostrandoMano(false)
      const gan = ganadorRonda(nuevosRes, eManoAct ? 'jugador' : 'maquina')
      if (gan || nuevosRes.length === 3) {
        // ✅ Mostrar cartas temporalmente si el rival tiene Flor
        const gc = g.current
        if (gc.rivalTieneFlor) {
          mostrarCartasRivalTemporalmente()
        }
        terminarRonda(gan || 'empate', pjAct, pmAct, eManoAct)
        return
      }
      const sig = idx + 1
      setManoActual(sig)
      const quien = res === 'empate'
        ? (eManoAct ? 'yo' : 'rival')
        : (res === 'jugador' ? 'yo' : 'rival')
      setTurno(quien)
    }, DELAY_MANO)
  }

  const jugarCarta = carta => {
    const gc = g.current
    const nuevoCjJ = [...gc.cjJ, carta]
    setCjJ(nuevoCjJ)
    setCartaSel(null)
    if (!primeraJugada) setPrimeraJugada(true)
    addLog(`🃏 Jugaste ${carta.numero} de ${carta.palo}`)
    sockRef.current?.emit('accion', { tipo: 'carta', datos: { carta } })

    if (gc.cjM.length > gc.manoActual) {
      resolverMano(carta, gc.cjM[gc.manoActual], nuevoCjJ, gc.cjM, gc.resultados,
        gc.manoActual, gc.muestra, gc.manoJ, gc.manoM, gc.ptsJ, gc.ptsM, gc.esMano)
    } else {
      setTurno('rival')
    }
  }

  const cantarTruco = nivel => {
    if (trucoPendiente && (nivel === 'retruco' || nivel === 'vale4')) {
      setTrucoPendiente(false)
    }
    if (nivel === 'truco') setCantanteOriginalTruco('yo')
    setTrucoCantado(nivel)
    setUltimoEnCantar('yo')
    setEsperandoRespuesta(true)
    addLog(`🗣 Cantaste ${nivel}`)
    sockRef.current?.emit('accion', { tipo: 'truco', datos: { nivel } })
  }

  const responderTrucoQuiero = () => {
    setTrucoPendiente(false)
    setEsperandoRespuesta(false)
    addLog(`✅ Querés ${trucoCantado}`)
    sockRef.current?.emit('accion', { tipo: 'resp_truco', datos: { acepto: true } })
  }

  const responderTrucoNoQuiero = () => {
    const gc = g.current
    const pts = { truco: 1, retruco: 2, vale4: 3 }[gc.trucoCantado] || 1
    setTrucoPendiente(false)
    setTrucoResuelto(true)
    addLog(`❌ No querés — +${pts} para rival`)
    setPtsM(p => p + pts)
    
    if (gc.rivalTieneFlor) {
      mostrarCartasRivalTemporalmente()
    }
    
    sockRef.current?.emit('accion', { tipo: 'resp_truco', datos: { acepto: false } })
    setTimeout(() => terminarRonda('maquina', gc.ptsJ, gc.ptsM + pts, gc.esMano), 800)
  }

  const subirTruco = nivel => {
    setTrucoPendiente(false)
    setTrucoCantado(nivel)
    setUltimoEnCantar('yo')
    setEsperandoRespuesta(true)
    addLog(`🗣 Subís a ${nivel}`)
    sockRef.current?.emit('accion', { tipo: 'truco', datos: { nivel } })
  }

  const cantarEnvido = (nivel) => {
    if (esperandoRespuesta) return
    const pts = nivel === 'falta'
      ? limite - Math.min(ptsJ, ptsM)
      : nivel === 'real'
        ? envidoAcumulado + 3
        : envidoAcumulado + 2 
  
    setEnvidoAcumulado(pts)
    setNivelEnvido(nivel)
    setEsperandoRespuesta(true)
    addLog(`Cantaste: ${nivel === 'real' ? 'Real Envido' : nivel === 'falta' ? 'Falta Envido' : 'Envido'} (vale ${pts})`)
    sockRef.current?.emit('accion', { tipo: 'envido', datos: { nivel, pts } })

  }

  const responderEnvidoQuiero = () => {
    const gc = g.current
    const pts = gc.nivelEnvido === 'falta'
      ? gc.limite - Math.min(gc.ptsJ, gc.ptsM)
      : gc.envidoAcumulado
    const ej = calcularEnvido(gc.manoJ, gc.muestra)
    const em = calcularEnvido(gc.manoM, gc.muestra)
    addLog(`Tanto: vos ${ej} — rival ${em}`)
    
    if (ej >= em) {
      const nuevosPtsJ = gc.ptsJ + pts
      setPtsJ(nuevosPtsJ)
      addLog(`✅ +${pts} para vos`)
      // Emitir resultado al rival
      sockRef.current?.emit('accion', { 
        tipo: 'resultado_envido', 
        datos: { 
          ptsJ: nuevosPtsJ, 
          ptsM: gc.ptsM,
          tantoJ: ej,
          tantoM: em,
          ganador: 'yo'
        } 
      })
    } else {
      const nuevosPtsM = gc.ptsM + pts
      setPtsM(nuevosPtsM)
      addLog(`❌ +${pts} para rival`)
      sockRef.current?.emit('accion', { 
        tipo: 'resultado_envido', 
        datos: { 
          ptsJ: gc.ptsJ, 
          ptsM: nuevosPtsM,
          tantoJ: ej,
          tantoM: em,
          ganador: 'rival'
        } 
      })
    }
    
    setEnvidoResuelto(true)
    setEnvidoPendiente(false)
  }

  const responderEnvidoNoQuiero = () => {
    const gc = g.current
    addLog('No querés — +1 para rival')
    setPtsM(p => p + 1)
    setEnvidoResuelto(true)
    setEnvidoPendiente(false)
    
    if (gc.rivalTieneFlor) {
      mostrarCartasRivalTemporalmente()
    }
    
    sockRef.current?.emit('accion', { tipo: 'resp_envido', datos: { acepto: false } })
  }

  const declararFlor = () => {
    const gc = g.current
    addLog('🌸 Declarás Flor')
    sockRef.current?.emit('accion', { tipo: 'flor' })
    const pts = 3
    if (!gc.florM) {
      setPtsJ(p => p + pts); addLog(`+${pts} para vos`)
    } else {
      const ej = calcularEnvido(gc.manoJ, gc.muestra)
      const em = calcularEnvido(gc.manoM, gc.muestra)
      addLog(`Flor: vos ${ej} — rival ${em}`)
      if (ej >= em) { setPtsJ(p => p + pts); addLog(`+${pts} para vos`) }
      else          { setPtsM(p => p + pts); addLog(`+${pts} para rival`) }
    }
    setFlorResuelta(true); setEnvidoResuelto(true)
  }

  const handleAccionRival = ({ tipo, datos }) => {
    console.log('🔔 handleAccionRival:', tipo, datos)
    const gc = g.current
  
    if (tipo === 'carta') {
      const { carta } = datos
      const nuevoCjM = [...gc.cjM, carta]
      setCjM(nuevoCjM)
      addLog(`🃏 ${nombreRivalRef.current} jugó ${carta.numero} de ${carta.palo}`)
      if (gc.cjJ.length > gc.manoActual) {
        resolverMano(gc.cjJ[gc.manoActual], carta, gc.cjJ, nuevoCjM, gc.resultados,
          gc.manoActual, gc.muestra, gc.manoJ, gc.manoM, gc.ptsJ, gc.ptsM, gc.esMano)
      } else {
        setTurno('yo')
      }
    }
  
    else if (tipo === 'flor_auto') {
      addLog(`🌸 ${nombreRivalRef.current} tiene Flor — +3 para rival`)
      setPtsM(p => p + 3)
      setFlorResuelta(true)
      setEnvidoResuelto(true)
      revisarGanador(gc.ptsJ, gc.ptsM + 3)
    }
  
    else if (tipo === 'flor_apuesta') {
      const { nivel, pts } = datos
      setNivelFlor(nivel)
      setFlorEnJuego(true)
      setFlorCantadaPor('rival')
      setFlorPendiente(true)
      setEsperandoRespuesta(false)
      
      let nombreNivel = ''
      if (nivel === 'flor') nombreNivel = 'La mía es Flor'
      else if (nivel === 'conFlor') nombreNivel = 'Con Flor Envido'
      else if (nivel === 'contraFlor') nombreNivel = 'Contra Flor al Resto'
      
      addLog(`🌸 ${nombreRivalRef.current} cantó: ${nombreNivel} (vale ${pts} puntos)`)
    }
  
    else if (tipo === 'resultado_flor') {
      const { ptsJ: nuevosPtsJ, ptsM: nuevosPtsM, valorJ, valorM, ganador, pts } = datos
      setPtsJ(nuevosPtsJ)
      setPtsM(nuevosPtsM)
      setFlorResuelta(true)
      setFlorPendiente(false)
      setEnvidoResuelto(true)
      setEsperandoRespuesta(false)
      addLog(`⚘ Flor: vos ${valorJ} — rival ${valorM}`)
      if (ganador === 'yo') {
        addLog(`✅ +${pts} para vos`)
      } else {
        addLog(`❌ +${pts} para rival`)
      }
      revisarGanador(nuevosPtsJ, nuevosPtsM)
    }
  
    else if (tipo === 'resp_flor') {
      setEsperandoRespuesta(false)
      if (datos.acepto) {
        const gc = g.current
        const valorJ = calcularValorFlor(gc.manoJ, gc.muestra)
        const valorM = calcularValorFlor(gc.manoM, gc.muestra)
        let pts = florCantada === 'flor' ? 3 : florCantada === 'conFlor' ? 6 : limite - Math.min(gc.ptsJ, gc.ptsM)
        
        addLog(`⚘ Flor: vos ${valorJ} — rival ${valorM}`)
        if (valorJ >= valorM) {
          setPtsJ(p => p + pts)
          addLog(`✅ +${pts} para vos`)
        } else {
          setPtsM(p => p + pts)
          addLog(`❌ +${pts} para rival`)
        }
      } else {
        const pts = florCantada === 'flor' ? 3 : florCantada === 'conFlor' ? 3 : 5
        addLog(`+${pts} para vos (rival no quiso)`)
        setPtsJ(p => p + pts)
      }
      setFlorResuelta(true)
      setFlorPendiente(false)
      setEnvidoResuelto(true)
    }
  
    else if (tipo === 'truco') {
        const { nivel } = datos
        if (gc.trucoPendiente) {
          setTrucoPendiente(false)
        }
        if (nivel === 'truco') setCantanteOriginalTruco('rival')
        setTrucoCantado(nivel)
        setUltimoEnCantar('rival')
        setEsperandoRespuesta(false)
        setTrucoPendiente(true)
        addLog(`🗣 ${nombreRivalRef.current} cantó ${nivel}`)
      }
  
    else if (tipo === 'resp_truco') {
        setEsperandoRespuesta(false)
        if (datos.acepto) {
            setEsperandoRespuesta(false) 
            addLog(`✅ ${nombreRivalRef.current} quiere ${gc.trucoCantado}`)
            setUltimoEnCantar('rival')
          } else {
          const pts = { truco: 1, retruco: 2, vale4: 3 }[gc.trucoCantado] || 1
          addLog(`❌ ${nombreRivalRef.current} no quiere — +${pts} para vos`)
          setPtsJ(p => p + pts)
          setTrucoResuelto(true)
          if (rivalTieneFlor) setMostrarCartasRival(true)
          setTimeout(() => terminarRonda('jugador', gc.ptsJ + pts, gc.ptsM, gc.esMano), 800)
        }
      }
  
    else if (tipo === 'envido') {
      const { nivel, pts } = datos
      setNivelEnvido(nivel)
      setEnvidoAcumulado(pts)
      setEnvidoPendiente(true)
      setEsperandoRespuesta(false)
      addLog(`${nombreRivalRef.current} cantó: ${nivel === 'real' ? 'Real Envido' : nivel === 'falta' ? 'Falta Envido' : 'Envido'} (vale ${pts})`)
    }
  
    else if (tipo === 'resultado_envido') {
      const { ptsJ: nuevosPtsJ, ptsM: nuevosPtsM, tantoJ, tantoM, ganador } = datos
      setPtsJ(nuevosPtsJ)
      setPtsM(nuevosPtsM)
      setEnvidoResuelto(true)
      setEnvidoPendiente(false)
      setEsperandoRespuesta(false)
      addLog(`Tanto: vos ${tantoJ} — rival ${tantoM}`)
      if (ganador === 'yo') {
        addLog(`✅ +${nuevosPtsJ - gc.ptsJ} para vos`)
      } else {
        addLog(`❌ +${nuevosPtsM - gc.ptsM} para rival`)
      }
      revisarGanador(nuevosPtsJ, nuevosPtsM)
    }
  
    else if (tipo === 'resp_envido') {
      setEsperandoRespuesta(false)
      setEnvidoResuelto(true)
      if (datos.acepto) {
        const ej = calcularEnvido(gc.manoJ, gc.muestra)
        const em = calcularEnvido(gc.manoM, gc.muestra)
        const pts = gc.nivelEnvido === 'falta' ? gc.limite - Math.min(gc.ptsJ, gc.ptsM)
                  : gc.nivelEnvido === 'real'  ? 3
                  : gc.nivelEnvido === 'ee'    ? 4 : 2
        addLog(`Tanto: vos ${ej} — rival ${em}`)
        if (ej >= em) { 
          const nuevosPtsJ = gc.ptsJ + pts
          setPtsJ(nuevosPtsJ)
          addLog(`✅ +${pts} para vos`)
        } else { 
          const nuevosPtsM = gc.ptsM + pts
          setPtsM(nuevosPtsM)
          addLog(`❌ +${pts} para rival`)
        }
      } else {
        const nuevosPtsJ = gc.ptsJ + 1
        addLog('+1 para vos (rival no quiso)')
        setPtsJ(nuevosPtsJ)
      }
    }
  
    else if (tipo === 'flor') {
      addLog(`🌸 ${nombreRivalRef.current} declara Flor`)
      const pts = 3
      if (!gc.florJ) {
        setPtsM(p => p + pts)
        addLog(`+${pts} para rival`)
      } else {
        const valorJ = calcularValorFlor(gc.manoJ, gc.muestra)
        const valorM = calcularValorFlor(gc.manoM, gc.muestra)
        addLog(`⚘ Flor: vos ${valorJ} — rival ${valorM}`)
        if (valorJ >= valorM) {
          setPtsJ(p => p + pts)
          addLog(`✅ +${pts} para vos`)
        } else {
          setPtsM(p => p + pts)
          addLog(`❌ +${pts} para rival`)
        }
      }
      setFlorResuelta(true)
      setEnvidoResuelto(true)
    }
  
    else if (tipo === 'nueva_ronda') {
      const { seed, manoA } = datos
      const sa = gc.soyA
      const esEsMano = sa ? manoA : !manoA
      repartir(seed, esEsMano, sa, gc.ptsJ, gc.ptsM)
    }
  }

  const cantarFlor = (nivel) => {
    // nivel: 'flor', 'conFlor', 'contraFlor'
    if (esperandoRespuesta || florEnJuego) return
    
    setNivelFlor(nivel)
    setFlorEnJuego(true)  // Se empieza a jugar la Flor
    setFlorCantadaPor('yo')
    setEsperandoRespuesta(true)
    
    let pts = 0
    let nombreNivel = ''
    
    if (nivel === 'flor') {
      pts = 3
      nombreNivel = 'La mía es Flor'
    } else if (nivel === 'conFlor') {
      pts = 6
      nombreNivel = 'Con Flor Envido'
    } else if (nivel === 'contraFlor') {
      pts = limite - Math.min(ptsJ, ptsM)
      nombreNivel = 'Contra Flor al Resto'
    }
    
    addLog(`🌸 Cantaste: ${nombreNivel} (vale ${pts} puntos)`)
    
    sockRef.current?.emit('accion', { 
      tipo: 'flor_apuesta', 
      datos: { nivel, pts } 
    })
  }
  
  const responderFlorQuiero = () => {
    const gc = g.current
    let pts = 0
    
    if (nivelFlor === 'flor') {
      pts = 3
    } else if (nivelFlor === 'conFlor') {
      pts = 6
    } else if (nivelFlor === 'contraFlor') {
      pts = limite - Math.min(gc.ptsJ, gc.ptsM)
    }
    
    const valorJ = calcularValorFlor(gc.manoJ, gc.muestra)
    const valorM = calcularValorFlor(gc.manoM, gc.muestra)
    
    addLog(`⚘ Comparando Flor:`)
    addLog(`   Vos: ${valorJ} puntos`)
    addLog(`   ${nombreRival}: ${valorM} puntos`)
    
    if (valorJ >= valorM) {
      const nuevosPtsJ = gc.ptsJ + pts
      setPtsJ(nuevosPtsJ)
      addLog(`✅ ¡Ganaste la Flor! +${pts} puntos`)
    } else {
      const nuevosPtsM = gc.ptsM + pts
      setPtsM(nuevosPtsM)
      addLog(`❌ Perdiste la Flor! +${pts} puntos para ${nombreRival}`)
    }
    
    // Resetear estados de Flor
    setFlorResuelta(true)
    setFlorActiva(false)
    setFlorEnJuego(false)
    setFlorPendiente(false)
    setFlorCantadaPor(null)
    setNivelFlor(null)
    setEnvidoResuelto(true)
    setEsperandoRespuesta(false)
    
    sockRef.current?.emit('accion', { 
      tipo: 'resultado_flor', 
      datos: { 
        ptsJ: gc.ptsJ + (valorJ >= valorM ? pts : 0),
        ptsM: gc.ptsM + (valorM > valorJ ? pts : 0),
        ganador: valorJ >= valorM ? 'yo' : 'rival',
        pts
      } 
    })
  }

  const obtenerNombreFlor = (nivel) => {
    switch(nivel) {
      case 'flor': return 'Flor'
      case 'conFlor': return 'Con Flor Envido'
      case 'contraFlor': return 'Contra Flor al Resto'
      default: return 'Flor'
    }
  }
  
  const responderFlorNoQuiero = () => {
    let pts = 0
    
    if (florCantada === 'flor') {
      pts = 1 
      addLog(`❌ No querés Flor - +${pts} punto para ${nombreRival}`)
    } else if (florCantada === 'conFlor') {
      pts = 3  
      addLog(`❌ No querés Con Flor Envido - +${pts} puntos para ${nombreRival}`)
    } else if (florCantada === 'contraFlor') {
      pts = 5 
      addLog(`❌ No querés Contra Flor al Resto - +${pts} puntos para ${nombreRival}`)
    }
    
    const nuevosPtsM = ptsM + pts
    setPtsM(nuevosPtsM)
    setFlorResuelta(true)
    setFlorPendiente(false)
    setEnvidoResuelto(true)
    setEsperandoRespuesta(false)
    
    sockRef.current?.emit('accion', { 
      tipo: 'resultado_flor', 
      datos: { 
        ptsJ: ptsJ, 
        ptsM: nuevosPtsM,
        valorJ: 0,
        valorM: 0,
        ganador: 'rival',
        pts
      } 
    })
  }

  useEffect(() => {
    const socket = io(SOCKET_URL, { forceNew: true })
    sockRef.current = socket
  
    socket.on('connect', () => {
      setConectado(true)
    })
    
    socket.on('disconnect', () => setConectado(false))
  
    socket.on('sala_creada', ({ salaId }) => {
      setCodigoSala(salaId)
      setPantalla('esperando')
    })
  
    socket.on('error_sala', msg => setError(msg))
  
    socket.on('juego_iniciado', ({ seed, jugadorA, limite: limiteRecibido, jugadorAInfo, jugadorBInfo }) => {
      console.log('🎮 juego_iniciado recibido:', { jugadorAInfo, jugadorBInfo })
      
      const esA = socket.id === jugadorA
      setSoyA(esA)
      if (limiteRecibido) setLimite(limiteRecibido)
      
      const infoRival = esA ? jugadorBInfo : jugadorAInfo
      console.log('👤 Info rival:', infoRival)
      
      if (infoRival) {
        setNombreRival(infoRival.nombre || 'Rival')
        setInicialesRival((infoRival.nombre || 'Rival').slice(0, 2).toUpperCase())
        nombreRivalRef.current = infoRival.nombre || 'Rival'
      }
      
      setPtsJ(0)
      setPtsM(0)
      setGanador(null)
      setLog([])
      repartir(seed, esA, esA, 0, 0)
      setPantalla('juego')
      addLog('🎮 ¡Partida iniciada!')
    })
  
    socket.on('accion_rival', handleAccionRival)
  
    socket.on('rival_desconectado', () => {
      setError('El rival se desconectó')
      setPantalla('lobby')
    })
  
    // ✅ LISTENER PARA CONEXIÓN DUPLICADA
    socket.on('conexion_duplicada', (mensaje) => {
      console.log('⚠️', mensaje)
      alert(mensaje)
      setError(mensaje)
      setPantalla('lobby')
      socket.disconnect()
    })
  
    return () => socket.disconnect()
  }, [])
  
  useEffect(() => {
    if (conectado && miNombre && sockRef.current) {
      const userId = usuario?.uid || usuario?.email || miNombre
      console.log('📤 Enviando nombre y userId al servidor:', miNombre, userId)
      sockRef.current.emit('set_nombre', { nombre: miNombre, userId })
    }
  }, [conectado, miNombre, usuario])

  const resultadoUltimaMano = resultados[resultados.length - 1]
  const bloqueado           = mostrandoMano || esperandoRespuesta || trucoPendiente || envidoPendiente
  const puedeJugar          = turno === 'yo' && !bloqueado && florResuelta
  const puedeEnvido = !envidoResuelto && !florJ && !florM && florResuelta && manoActual === 0 && !primeraJugada && !bloqueado
  const puedeTruco          = !trucoResuelto && florResuelta && !mostrandoMano && !esperandoRespuesta
  const puedeIniciarTruco   = puedeTruco && !trucoCantado && !trucoPendiente
  const puedeRetruco        = puedeTruco && trucoCantado === 'truco'    && cantanteOriginalTruco === 'rival'
  const puedeVale4          = puedeTruco && trucoCantado === 'retruco'  && cantanteOriginalTruco === 'yo'
  const puedeIniciarRetruco = puedeTruco && !trucoPendiente && trucoCantado === 'truco'   && cantanteOriginalTruco === 'rival'
  const puedeIniciarVale4   = puedeTruco && !trucoPendiente && trucoCantado === 'retruco' && cantanteOriginalTruco === 'yo'

// ── LOBBY ──
if (pantalla === 'lobby') return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        
        {/* Modal de crear sala */}
        {modalCrearAbierto ? (
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-10 flex flex-col gap-6">
            <div className="text-center">
              <span className="text-5xl">🎮</span>
              <h2 className="text-2xl font-extrabold mt-3">Crear Sala</h2>
              <p className="text-gray-400 text-sm mt-1">Configurá tu partida</p>
            </div>
  
            {/* Modalidad */}
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center">
                Modalidad
              </p>
              <div className="grid grid-cols-3 gap-3">
                {['1vs1', '2vs2', '3vs3'].map(m => (
                  <button
                    key={m}
                    onClick={() => setModalidad(m)}
                    className={`py-3 rounded-xl border-2 font-bold text-lg transition ${
                      modalidad === m
                        ? 'border-purple-500 bg-purple-950 text-white'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {modalidad !== '1vs1' && (
                <p className="text-yellow-400 text-xs text-center mt-2">
                  ⚠️ Próximamente (solo 1vs1 disponible)
                </p>
              )}
            </div>
  
            {/* Límite de puntos */}
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center">
                ¿Hasta cuántos puntos?
              </p>
              <div className="grid grid-cols-4 gap-3">
                {[10, 20, 30, 40].map(l => (
                  <button
                    key={l}
                    onClick={() => setLimite(l)}
                    className={`py-3 rounded-xl border-2 font-bold text-lg transition ${
                      limite === l
                        ? 'border-purple-500 bg-purple-950 text-white'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
  
            {/* Botones */}
            <button
              onClick={() => {
                setError('')
                setModalCrearAbierto(false)
                sockRef.current?.emit('crear_sala', { limite, modalidad })
              }}
              disabled={!conectado || modalidad !== '1vs1'}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 rounded-2xl text-lg font-bold transition"
            >
              Crear partida
            </button>
            
            <button
              onClick={() => setModalCrearAbierto(false)}
              className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white py-3 rounded-2xl font-semibold transition"
            >
              ← Volver
            </button>
          </div>
        ) : (
          // Pantalla principal del lobby
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-10 flex flex-col gap-6">
            <div className="text-center">
              <span className="text-5xl">🌐</span>
              <h1 className="text-3xl font-extrabold mt-3">Truco Online</h1>
              <p className="text-gray-400 text-sm mt-1">1 vs 1 en tiempo real</p>
            </div>
  
            <div className={`flex items-center justify-center gap-2 text-xs font-semibold ${conectado ? 'text-green-400' : 'text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full ${conectado ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
              {conectado ? 'Servidor conectado' : 'Conectando al servidor...'}
            </div>
  
            {error && (
              <p className="text-red-400 text-sm text-center bg-red-950 border border-red-800 rounded-xl px-4 py-2">{error}</p>
            )}
  
            {/* Botón CREAR SALA grande */}
            <button
              onClick={() => setModalCrearAbierto(true)}
              disabled={!conectado}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-6 rounded-2xl text-xl font-bold transition flex items-center justify-center gap-2"
            >
              <span>🎮</span> CREAR SALA
            </button>
  
            {/* Separador */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-700"></div>
              <span className="text-gray-500 text-xs uppercase">O</span>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>
  
            {/* Unirse a sala */}
            <div className="flex flex-col gap-3">
              <input
                value={inputCodigo}
                onChange={e => setInputCodigo(e.target.value.toUpperCase())}
                placeholder="Código de sala (ej: AB3X)"
                maxLength={4}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-white text-center text-xl font-mono tracking-widest focus:outline-none focus:border-purple-500 placeholder-gray-600"
              />
              <button
                onClick={() => { setError(''); sockRef.current?.emit('unirse_sala', { salaId: inputCodigo }) }}
                disabled={inputCodigo.length < 4 || !conectado}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 rounded-2xl text-lg font-bold transition"
              >
                Unirse a sala
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )

  // ── ESPERANDO ──
  if (pantalla === 'esperando') return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 max-w-sm w-full text-center flex flex-col gap-6">
          <span className="text-5xl animate-pulse">⏳</span>
          <div>
            <p className="text-gray-400 text-sm">Código de sala</p>
            <p className="text-5xl font-mono font-extrabold text-purple-400 tracking-widest mt-1">{codigoSala}</p>
          </div>
          <p className="text-gray-500 text-sm">Compartí el código con tu rival y esperá que se conecte</p>
          <button onClick={() => setPantalla('lobby')} className="text-gray-600 text-sm hover:text-gray-400 transition">
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
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 max-w-md w-full text-center flex flex-col gap-6">
            <span className="text-7xl">{gano ? '🏆' : '😔'}</span>
            <div>
              <h2 className="text-4xl font-extrabold">{gano ? '¡Ganaste!' : 'Perdiste'}</h2>
              <p className="text-gray-400 mt-2">{gano ? '¡Sos un capo del Truco!' : 'El rival te ganó esta vez'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-2xl p-4">
                <p className="text-gray-400 text-xs">Vos</p>
                <p className="text-3xl font-extrabold text-purple-400">{ptsJ}</p>
              </div>
              <div className="bg-gray-800 rounded-2xl p-4">
                <p className="text-gray-400 text-xs">Rival</p>
                <p className="text-3xl font-extrabold text-red-400">{ptsM}</p>
              </div>
            </div>
            <button onClick={() => setPantalla('lobby')} className="border-2 border-gray-700 hover:border-purple-500 text-gray-300 py-3 rounded-2xl font-semibold transition">
              ← Volver al lobby
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

// ── JUEGO ──
return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />
      <MesaTruco
  // DATOS BÁSICOS
  manoJ={manoJ} 
  manoM={manoM} 
  cjJ={cjJ} 
  cjM={cjM}
  muestra={muestra} 
  resultados={resultados} 
  manoActual={manoActual}
  ptsJ={ptsJ} 
  ptsM={ptsM} 
  limite={limite}
  turno={turno}
  cartaSel={cartaSel} 
  setCartaSel={setCartaSel}
  log={log}
  mostrandoMano={mostrandoMano}
  
  // TRUCO
  trucoCantado={trucoCantado} 
  ultimoEnCantar={ultimoEnCantar}
  trucoPendiente={trucoPendiente} 
  envidoPendiente={envidoPendiente}
  trucoResuelto={trucoResuelto}
  
  // ENVIDO
  nivelEnvido={nivelEnvido}
  envidoResuelto={envidoResuelto}
  
  // FLOR - TODAS JUNTAS, CADA UNA UNA SOLA VEZ
  florJ={florJ}
  florM={florM}
  florActiva={florActiva}
  florEnJuego={florEnJuego}
  florPendiente={florPendiente}    // ← UNA SOLA VEZ
  florResuelta={florResuelta}      // ← UNA SOLA VEZ
  florCantada={florCantada}
  nivelFlor={nivelFlor}
  florCantadaPor={florCantadaPor}
  mostrarCartasRival={mostrarCartasRival}
  
  // OTROS ESTADOS
  bloqueado={bloqueado}
  
  // FUNCIONES DE ACCIÓN
  jugarCarta={jugarCarta}
  cantarTruco={cantarTruco}
  responderTrucoQuiero={responderTrucoQuiero}
  responderTrucoNoQuiero={responderTrucoNoQuiero}
  subirTruco={subirTruco}
  cantarEnvido={cantarEnvido}
  responderEnvidoQuiero={responderEnvidoQuiero}
  responderEnvidoNoQuiero={responderEnvidoNoQuiero}
  cantarFlor={cantarFlor}
  responderFlorQuiero={responderFlorQuiero}
  responderFlorNoQuiero={responderFlorNoQuiero}
  
  // BOOLEANOS DE CONTROL
  puedeJugar={puedeJugar}
  puedeEnvido={puedeEnvido}
  puedeIniciarTruco={puedeIniciarTruco}
  puedeRetruco={puedeRetruco}
  puedeVale4={puedeVale4}
  puedeIniciarRetruco={puedeIniciarRetruco}
  puedeIniciarVale4={puedeIniciarVale4}
  puedeSubirEnvido={puedeSubirEnvido}
  puedeSubirRealEnvido={puedeSubirRealEnvido}
  puedeSubirFaltaEnvido={puedeSubirFaltaEnvido}
  
  // NOMBRES
  nombreRival={nombreRival}
  inicialesRival={inicialesRival}
  miNombre={miNombre}
  miPhotoURL={usuario?.photoURL || ''}

  // EXTRAS
  resultadoUltimaMano={resultadoUltimaMano}
  onSubirEnvidoConNivel={(nivel) => { 
    setEnvidoPendiente(false)
    cantarEnvido(nivel)
  }}
/>
      <Footer />
    </div>
  )
}