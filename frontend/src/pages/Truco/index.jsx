import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import MesaTruco from './MesaTruco'
import {
    crearMazo, jerarquia, calcularEnvido, calcularFlor, detectarFlor,
    ganadorMano, ganadorRonda
  } from './logica'
import { DELAY_MANO } from './constantes'

export default function Truco() {
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-10 flex flex-col gap-8">
          <div className="text-center">
            <span className="text-6xl">♠️</span>
            <h1 className="text-4xl font-extrabold mt-4">Truco Uruguayo</h1>
            <p className="text-gray-400 mt-2 text-sm">Con muestra · Envido · Flor · 1 vs Máquina</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">¿Hasta cuántos puntos?</p>
            <div className="grid grid-cols-4 gap-3">
              {[10, 20, 30, 40].map(l => (
                <button key={l} onClick={() => setLimite(l)}
                  className={`py-3 rounded-xl border-2 font-bold text-lg transition ${limite === l ? 'border-purple-500 bg-purple-950 text-white' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <button onClick={iniciar} className="bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-2xl text-xl font-bold transition hover:scale-105">
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
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 max-w-md w-full text-center flex flex-col gap-6">
            <span className="text-7xl">{gano ? '🏆' : '😔'}</span>
            <div>
              <h2 className="text-4xl font-extrabold">{gano ? '¡Ganaste!' : 'Perdiste'}</h2>
              <p className="text-gray-400 mt-2">{gano ? '¡Sos un capo del Truco!' : 'La máquina te ganó esta vez'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-2xl p-4"><p className="text-gray-400 text-xs">Vos</p><p className="text-3xl font-extrabold text-purple-400">{ptsJ}</p></div>
              <div className="bg-gray-800 rounded-2xl p-4"><p className="text-gray-400 text-xs">Máquina</p><p className="text-3xl font-extrabold text-red-400">{ptsM}</p></div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setPantalla('menu')} className="flex-1 border-2 border-gray-700 hover:border-purple-500 text-gray-300 py-3 rounded-2xl font-semibold transition">← Menú</button>
              <button onClick={iniciar} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-2xl font-bold transition">Revancha →</button>
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