import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import { usePageTitle } from '../../hooks/usePageTitle'
import Footer from '../../components/Footer'
import MesaTruco from './MesaTruco'
import {
    crearMazo, jerarquia, calcularEnvido, calcularFlor, detectarFlor,
    ganadorMano, ganadorRonda
  } from './logica'
import { DELAY_MANO } from './constantes'

export default function Truco() {
  usePageTitle('Truco vs Máquina')
  const { usuario } = useAuth()
  const [pantalla, setPantalla] = useState('menu')
  const [limite, setLimite] = useState(30)
  const [muestra, setMuestra] = useState(null)
  const [manoJ, setManoJ] = useState([])
  const [manoM, setManoM] = useState([])
  const [cjJ, setCjJ] = useState([])
  const [cjM, setCjM] = useState([])
  const [resultados, setResultados] = useState([])
  const [manoActual, setManoActual] = useState(0)
  const [esMano, setEsMano] = useState(true)
  const [turno, setTurno] = useState('jugador')
  const [cartaSel, setCartaSel] = useState(null)
  const [log, setLog] = useState([])
  const [ptsJ, setPtsJ] = useState(0)
  const [ptsM, setPtsM] = useState(0)
  const [ganador, setGanador] = useState(null)
  const [esperando, setEsperando] = useState(false)
  const [florJ, setFlorJ] = useState(false)
  const [florM, setFlorM] = useState(false)
  const [florResuelta, setFlorResuelta] = useState(true)
  const [envidoResuelto, setEnvidoResuelto] = useState(false)
  const [envidoNivel, setEnvidoNivel] = useState(null)
  const [envidoPtsApostados, setEnvidoPtsApostados] = useState(0)
  const [trucoCantado, setTrucoCantado] = useState(null)
  const [ultimoEnCantar, setUltimoEnCantar] = useState(null)
  const [trucoResuelto, setTrucoResuelto] = useState(false)
  const [primeraJugada, setPrimeraJugada] = useState(false)
  const [mostrandoMano, setMostrandoMano] = useState(false)

  const [mostrarCartasRival, setMostrarCartasRival] = useState(false)
  const [rivalTieneFlor, setRivalTieneFlor] = useState(false)
  const [envidoPendiente, setEnvidoPendiente] = useState(false)
  const [trucoPendiente, setTrucoPendiente] = useState(false)
  const [florPendiente, setFlorPendiente] = useState(false)
  const [florCantada, setFlorCantada] = useState(null)

  const addLog = (msg) => setLog(p => [msg, ...p].slice(0, 50))

  const revisarGanador = useCallback((pj, pm) => {
    if (pj >= limite) { setPtsJ(pj); setPtsM(pm); setGanador('jugador'); setPantalla('resultado'); return true }
    if (pm >= limite) { setPtsJ(pj); setPtsM(pm); setGanador('maquina'); setPantalla('resultado'); return true }
    return false
  }, [limite])

  const resetRonda = () => {
    setCjJ([]); setCjM([]); setResultados([]); setManoActual(0); setCartaSel(null)
    setTrucoCantado(null); setTrucoResuelto(false); setUltimoEnCantar(null)
    setEnvidoResuelto(false); setMostrandoMano(false); setPrimeraJugada(false)
    setTrucoPendiente(false); setEnvidoPendiente(false)
    setEsperando(false); setEnvidoNivel(null); setEnvidoPtsApostados(0)
    setFlorPendiente(false); setMostrarCartasRival(false)
  }

  const repartir = (alternar, eManoAct) => {
    const mazo = crearMazo()
    const m = mazo[0], nj = mazo.slice(1, 4), nm = mazo.slice(4, 7)
    const nuevoEsMano = alternar ? !eManoAct : eManoAct
    const fj = detectarFlor(nj, m), fm = detectarFlor(nm, m)

    setMuestra(m); setManoJ(nj); setManoM(nm)
    resetRonda()
    setFlorResuelta(!fj && !fm); setEsMano(nuevoEsMano)
    setTurno(nuevoEsMano ? 'jugador' : 'maquina')
    setFlorJ(fj); setFlorM(fm); setRivalTieneFlor(fm); setFlorCantada(null)

    addLog(`─── Nueva ronda ───`)
    addLog(`📋 Muestra: ${m.numero} de ${m.palo}`)
    if (fj) addLog('🌸 Tenés Flor')
    if (fm) addLog('🌸 Máquina tiene Flor')

    if (fj && fm) { setFlorResuelta(false); setFlorPendiente(true); addLog('⚘ Ambos tienen Flor') }
    if (!fj && fm) setTimeout(() => { setPtsM(p => p + 3); addLog('🤖 +3 máquina'); setFlorResuelta(true); setEnvidoResuelto(true) }, 800)
    if (fj && !fm) setTimeout(() => { setPtsJ(p => p + 3); addLog('🌸 +3 vos'); setFlorResuelta(true); setEnvidoResuelto(true) }, 800)

    return { m, nj, nm, nuevoEsMano, fj, fm }
  }

  const iniciar = () => {
    setPtsJ(0); setPtsM(0); setGanador(null); setLog([]); setPantalla('juego')
    addLog('🎮 ¡Partida iniciada!')
    repartir(false, true)
  }

  const terminarRonda = useCallback((gan, pjAct, pmAct, eManoAct) => {
    let pj = pjAct, pm = pmAct
    if (!trucoResuelto) {
      const val = { truco: 2, retruco: 3, vale4: 4 }[trucoCantado] || 1
      if (gan === 'jugador') { pj += val; addLog(`✅ +${val}`) }
      else if (gan === 'maquina') { pm += val; addLog(`❌ +${val} máquina`) }
    }
    setPtsJ(pj); setPtsM(pm)
    if (pj >= limite) { setGanador('jugador'); setPantalla('resultado'); return }
    if (pm >= limite) { setGanador('maquina'); setPantalla('resultado'); return }
    if (rivalTieneFlor) setMostrarCartasRival(true)
    setTimeout(() => {
      const { nuevoEsMano } = repartir(true, eManoAct)
      if (!nuevoEsMano) setTimeout(() => maquinaJugarFn([], [], [], 0), 700)
    }, 2500)
  }, [trucoCantado, trucoResuelto, limite, rivalTieneFlor])

  const resolverMano = useCallback((cJ, cM, cjJAct, cjMAct, resAct, idx, muestraAct, mJAct, mMAct, pjAct, pmAct, eManoAct) => {
    const res = ganadorMano(cJ, cM, muestraAct)
    const nuevosRes = [...resAct, res]
    setResultados(nuevosRes); setMostrandoMano(true)
    if (res === 'jugador') addLog('✅ Mano')
    else if (res === 'maquina') addLog('❌ Mano máquina')
    else addLog('🤝 Empate')
    setTimeout(() => {
      setMostrandoMano(false)
      const gan = ganadorRonda(nuevosRes, eManoAct ? 'jugador' : 'maquina')
      if (gan || nuevosRes.length === 3) {
        if (rivalTieneFlor) setMostrarCartasRival(true)
        terminarRonda(gan || 'empate', pjAct, pmAct, eManoAct); return
      }
      const sig = idx + 1; setManoActual(sig)
      const quien = res === 'empate' ? (eManoAct ? 'jugador' : 'maquina') : res
      setTurno(quien)
      if (quien === 'maquina') setTimeout(() => maquinaJugarFn(cjJAct, cjMAct, nuevosRes, sig, muestraAct, mMAct, mJAct, pjAct, pmAct, eManoAct), 500)
    }, DELAY_MANO)
  }, [terminarRonda, rivalTieneFlor])

  const maquinaJugarFn = useCallback((cjJAct, cjMAct, resAct, idx, muestraAct, mMAct, mJAct, pjAct, pmAct, eManoAct) => {
    const disp = (mMAct || manoM).filter(c => !(cjMAct || cjM).find(j => j.id === c.id))
    if (!disp.length) return
    const carta = [...disp].sort((a, b) => jerarquia(b, muestraAct || muestra) - jerarquia(a, muestraAct || muestra))[0]
    const nuevoCjM = [...(cjMAct || cjM), carta]
    setCjM(nuevoCjM)
    addLog(`🤖 Jugó ${carta.numero} de ${carta.palo}`)
    if ((cjJAct || cjJ).length > idx) resolverMano((cjJAct || cjJ)[idx], carta, cjJAct || cjJ, nuevoCjM, resAct || resultados, idx, muestraAct || muestra, mJAct || manoJ, mMAct || manoM, pjAct ?? ptsJ, pmAct ?? ptsM, eManoAct ?? esMano)
    else setTurno('jugador')
  }, [manoM, manoJ, muestra, ptsJ, ptsM, esMano, cjJ, cjM, resultados, resolverMano])

  const jugarCarta = (carta) => {
    if (turno !== 'jugador' || esperando || !florResuelta || mostrandoMano) return
    const nuevoCjJ = [...cjJ, carta]; setCjJ(nuevoCjJ); setCartaSel(null)
    if (!primeraJugada) setPrimeraJugada(true)
    addLog(`🃏 Jugaste ${carta.numero} de ${carta.palo}`)
    if (cjM.length > manoActual) resolverMano(carta, cjM[manoActual], nuevoCjJ, cjM, resultados, manoActual, muestra, manoJ, manoM, ptsJ, ptsM, esMano)
    else { setTurno('maquina'); setTimeout(() => maquinaJugarFn(nuevoCjJ, cjM, resultados, manoActual, muestra, manoM, manoJ, ptsJ, ptsM, esMano), 500) }
  }

  // FLOR
  const cantarFlor = (nivel) => {
    setFlorCantada(nivel); setEsperando(true)
    addLog(`🌸 ${nivel === 'flor' ? 'La mía es Flor' : nivel === 'conFlor' ? 'Con Flor' : 'Contra Flor'}`)
    setTimeout(() => {
      if (Math.random() < 0.3) {
        const pts = nivel === 'flor' ? 3 : nivel === 'conFlor' ? 3 : 5
        addLog(`🤖 No quiere — +${pts}`); setPtsJ(p => p + pts)
        setFlorResuelta(true); setFlorPendiente(false); setEnvidoResuelto(true); setEsperando(false); return
      }
      const vj = calcularFlor(manoJ, muestra), vm = calcularFlor(manoM, muestra)
      const pts = nivel === 'flor' ? 3 : nivel === 'conFlor' ? 6 : limite - Math.min(ptsJ, ptsM)
      addLog(`⚘ Flor: vos ${vj} — máquina ${vm}`)
      if (vj >= vm) { setPtsJ(p => p + pts); addLog(`✅ +${pts}`) }
      else { setPtsM(p => p + pts); addLog(`❌ +${pts} máquina`) }
      setFlorResuelta(true); setFlorPendiente(false); setEnvidoResuelto(true); setEsperando(false)
    }, 1000)
  }

  const responderFlorQuiero = () => {
    const vj = calcularFlor(manoJ, muestra), vm = calcularFlor(manoM, muestra)
    const pts = florCantada === 'flor' ? 3 : florCantada === 'conFlor' ? 6 : limite - Math.min(ptsJ, ptsM)
    addLog(`⚘ Flor: vos ${vj} — máquina ${vm}`)
    if (vj >= vm) { setPtsJ(p => p + pts); addLog(`✅ +${pts}`) }
    else { setPtsM(p => p + pts); addLog(`❌ +${pts} máquina`) }
    setFlorResuelta(true); setFlorPendiente(false); setEnvidoResuelto(true)
  }

  const responderFlorNoQuiero = () => {
    const pts = florCantada === 'flor' ? 3 : florCantada === 'conFlor' ? 3 : 5
    addLog(`❌ No querés — +${pts} máquina`); setPtsM(p => p + pts)
    setFlorResuelta(true); setFlorPendiente(false); setEnvidoResuelto(true)
  }

  // ENVIDO
  const cantarEnvido = (nivel) => {
    if (esperando || envidoResuelto) return
    setEsperando(true); setEnvidoNivel(nivel)
    const pts = nivel === 'falta' ? limite - Math.min(ptsJ, ptsM) : nivel === 'real' ? 3 : 2
    setEnvidoPtsApostados(pts)
    addLog(`Cantaste: ${nivel === 'real' ? 'Real Envido' : nivel === 'falta' ? 'Falta Envido' : 'Envido'} (vale ${pts})`)
    setTimeout(() => {
      if (Math.random() < 0.25) { addLog('🤖 No quiere — +1'); setPtsJ(p => p + 1); setEnvidoResuelto(true); setEsperando(false); return }
      if (nivel === 'envido' && Math.random() < 0.5) {
        const subida = Math.random() < 0.5 ? 'real' : 'falta'
        const ptsSub = subida === 'falta' ? limite - Math.min(ptsJ, ptsM) : 3
        addLog(`🤖 ${subida === 'real' ? 'Real Envido' : 'Falta Envido'} (vale ${ptsSub})`)
        setEnvidoNivel(subida); setEnvidoPtsApostados(ptsSub); setEnvidoPendiente(true); setEsperando(false); return
      }
      addLog('🤖 Quiere')
      const ej = calcularEnvido(manoJ, muestra), em = calcularEnvido(manoM, muestra)
      addLog(`Tanto: vos ${ej} — máquina ${em}`)
      if (ej >= em) { setPtsJ(p => p + pts); addLog(`✅ +${pts}`) }
      else { setPtsM(p => p + pts); addLog(`❌ +${pts} máquina`) }
      setEnvidoResuelto(true); setEsperando(false)
    }, 1000)
  }

  const responderEnvidoQuiero = () => {
    const ej = calcularEnvido(manoJ, muestra), em = calcularEnvido(manoM, muestra)
    const pts = envidoNivel === 'falta' ? limite - Math.min(ptsJ, ptsM) : envidoPtsApostados
    addLog(`Tanto: vos ${ej} — máquina ${em}`)
    if (ej >= em) { setPtsJ(p => p + pts); addLog(`✅ +${pts}`) }
    else { setPtsM(p => p + pts); addLog(`❌ +${pts} máquina`) }
    setEnvidoResuelto(true); setEnvidoPendiente(false)
  }

  const responderEnvidoNoQuiero = () => {
    addLog('No querés — +1 máquina'); setPtsM(p => p + 1)
    setEnvidoResuelto(true); setEnvidoPendiente(false)
  }

  // TRUCO
  const cantarTruco = (nivel) => {
    if (esperando || mostrandoMano) return
    setTrucoCantado(nivel); setUltimoEnCantar('jugador'); setEsperando(true)
    addLog(`🗣 Cantaste ${nivel}`)
    setTimeout(() => {
      if (Math.random() < 0.35) {
        const pts = { truco: 1, retruco: 2, vale4: 3 }[nivel]; addLog(`🤖 No quiere — +${pts}`); setPtsJ(p => p + pts)
        setTrucoResuelto(true); setEsperando(false)
        if (revisarGanador(ptsJ + pts, ptsM)) return
        setTimeout(() => { const { nuevoEsMano } = repartir(true, esMano); if (!nuevoEsMano) setTimeout(() => maquinaJugarFn([], [], [], 0), 500) }, 800)
      } else if (Math.random() < 0.65 || nivel === 'vale4') { addLog(`🤖 Quiere ${nivel}`); setEsperando(false); setTrucoPendiente(false) }
      else {
        const subida = nivel === 'truco' ? 'retruco' : nivel === 'retruco' ? 'vale4' : null
        if (subida) { addLog(`🤖 ${subida}`); setTrucoCantado(subida); setUltimoEnCantar('maquina') }
        else addLog(`🤖 Quiere ${nivel}`)
        setEsperando(false)
      }
    }, 1000)
  }

  const responderTrucoQuiero = () => { addLog(`✅ Querés ${trucoCantado}`); setUltimoEnCantar('jugador'); setTrucoPendiente(false) }
  const responderTrucoNoQuiero = () => {
    const pts = { truco: 1, retruco: 2, vale4: 3 }[trucoCantado] || 1
    addLog(`❌ No querés — +${pts} máquina`); setPtsM(p => p + pts); setTrucoResuelto(true); setTrucoPendiente(false)
    if (rivalTieneFlor) setMostrarCartasRival(true)
    setTimeout(() => terminarRonda('maquina', ptsJ, ptsM + pts, esMano), 800)
  }

  const subirTruco = (nivel) => {
    setTrucoCantado(nivel); setUltimoEnCantar('jugador'); setEsperando(true); setTrucoPendiente(false)
    addLog(`🗣 Subís a ${nivel}`)
    setTimeout(() => {
      if (Math.random() < 0.35) {
        const pts = { retruco: 2, vale4: 3 }[nivel] || 1; addLog(`🤖 No quiere — +${pts}`); setPtsJ(p => p + pts)
        setTrucoResuelto(true); setEsperando(false)
        setTimeout(() => terminarRonda('jugador', ptsJ + pts, ptsM, esMano), 800)
      } else { addLog(`🤖 Quiere ${nivel}`); setUltimoEnCantar('maquina'); setEsperando(false) }
    }, 1000)
  }

  const resultadoUltimaMano = resultados[resultados.length - 1]
  const bloqueado = mostrandoMano || esperando || trucoPendiente || envidoPendiente
  const puedeJugar = turno === 'jugador' && !bloqueado && florResuelta
  const puedeEnvido = !envidoResuelto && !florJ && !florM && florResuelta && manoActual === 0 && !primeraJugada && !bloqueado
  const puedeTruco = !trucoResuelto && florResuelta && !mostrandoMano && !esperando
  const puedeIniciarTruco = puedeTruco && !trucoCantado && !trucoPendiente
  const puedeRetruco = puedeTruco && trucoPendiente && trucoCantado === 'truco' && ultimoEnCantar === 'maquina'
  const puedeVale4 = puedeTruco && trucoPendiente && trucoCantado === 'retruco' && ultimoEnCantar === 'maquina'
  const puedeIniciarRetruco = puedeTruco && !trucoPendiente && trucoCantado === 'truco' && ultimoEnCantar === 'maquina'
  const puedeIniciarVale4 = puedeTruco && !trucoPendiente && trucoCantado === 'retruco' && ultimoEnCantar === 'maquina'
  const puedeSubirEnvido = envidoPendiente && envidoNivel !== 'real' && envidoNivel !== 'falta'
  const puedeSubirRealEnvido = envidoPendiente && envidoNivel !== 'falta'
  const puedeSubirFaltaEnvido = envidoPendiente

  // MENÚ
  if (pantalla === 'menu') return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />
      <div className="relative flex-1 flex items-center justify-center px-4 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-5%,rgba(109,40,217,0.2),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="relative z-10 w-full max-w-sm bg-white/[0.03] border border-white/[0.07] rounded-3xl p-10 flex flex-col gap-8 backdrop-blur-sm">
          <div className="text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-900/40 border border-purple-700/25 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-purple-400">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 3c.8 0 1.5.3 2.1.8L7.8 14.1C7.3 13.5 7 12.8 7 12c0-2.8 2.2-5 5-5zm0 14c-.8 0-1.5-.3-2.1-.8l6.3-8.3c.5.6.8 1.3.8 2.1 0 2.8-2.2 5-5 5z"/>
              </svg>
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 bg-purple-950/50 border border-purple-600/30 text-purple-300 text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-widest">
                1 vs Máquina
              </span>
              <h1 className="text-3xl font-extrabold mt-3">Truco Uruguayo</h1>
              <p className="text-gray-500 text-sm mt-1">Con muestra · Envido · Flor</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
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

          <button
            onClick={iniciar}
            className="bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-2xl font-bold transition-all hover:shadow-[0_0_32px_rgba(139,92,246,0.35)] hover:scale-[1.02]"
          >
            Jugar vs Máquina →
          </button>
        </div>
      </div>
      <Footer />
    </div>
  )

  // RESULTADO
  if (pantalla === 'resultado') {
    const gano = ganador === 'jugador'
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
              <p className="text-gray-500 text-sm mt-1">{gano ? '¡Bien jugado!' : 'La máquina te ganó esta vez'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Vos</p>
                <p className="text-3xl font-extrabold text-purple-400">{ptsJ}</p>
              </div>
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Máquina</p>
                <p className="text-3xl font-extrabold text-red-400">{ptsM}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPantalla('menu')}
                className="flex-1 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-gray-300 hover:text-white py-3 rounded-2xl font-semibold transition text-sm"
              >
                ← Menú
              </button>
              <button
                onClick={iniciar}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-2xl font-bold transition hover:shadow-[0_0_24px_rgba(139,92,246,0.35)] text-sm"
              >
                Revancha →
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // JUEGO
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />
      <MesaTruco
        manoJ={manoJ} manoM={manoM} cjJ={cjJ} cjM={cjM}
        muestra={muestra} resultados={resultados} manoActual={manoActual}
        ptsJ={ptsJ} ptsM={ptsM} limite={limite}
        turno={turno}
        cartaSel={cartaSel} setCartaSel={setCartaSel}
        log={log}
        mostrandoMano={mostrandoMano}
        trucoCantado={trucoCantado} ultimoEnCantar={ultimoEnCantar}
        trucoPendiente={trucoPendiente} envidoPendiente={envidoPendiente} florPendiente={florPendiente}
        florResuelta={florResuelta} envidoResuelto={envidoResuelto}
        bloqueado={bloqueado}
        jugarCarta={jugarCarta}
        cantarTruco={cantarTruco} responderTrucoQuiero={responderTrucoQuiero} responderTrucoNoQuiero={responderTrucoNoQuiero} subirTruco={subirTruco}
        cantarEnvido={cantarEnvido} responderEnvidoQuiero={responderEnvidoQuiero} responderEnvidoNoQuiero={responderEnvidoNoQuiero}
        cantarFlor={cantarFlor} responderFlorQuiero={responderFlorQuiero} responderFlorNoQuiero={responderFlorNoQuiero}
        puedeJugar={puedeJugar} puedeEnvido={puedeEnvido}
        puedeIniciarTruco={puedeIniciarTruco} puedeRetruco={puedeRetruco} puedeVale4={puedeVale4}
        puedeIniciarRetruco={puedeIniciarRetruco} puedeIniciarVale4={puedeIniciarVale4}
        puedeSubirEnvido={puedeSubirEnvido} puedeSubirRealEnvido={puedeSubirRealEnvido} puedeSubirFaltaEnvido={puedeSubirFaltaEnvido}
        nombreRival="Máquina" inicialesRival="🤖"
        miNombre={usuario?.displayName || usuario?.email?.split('@')[0] || 'Jugador'}
        miPhotoURL={usuario?.photoURL || ''}
        florJ={florJ} florM={florM} florCantada={florCantada}
        mostrarCartasRival={mostrarCartasRival}
        nivelEnvido={envidoNivel}
        resultadoUltimaMano={resultadoUltimaMano}
        onSubirEnvidoConNivel={(nivel) => { setEnvidoPendiente(false); cantarEnvido(nivel) }}
      />
      <Footer />
    </div>
  )
}