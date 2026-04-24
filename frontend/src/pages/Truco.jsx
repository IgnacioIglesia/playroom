import { useState, useCallback } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const PALOS = ['espadas', 'bastos', 'oros', 'copas']
const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]
const LIMITES = [15, 20, 25, 30]
const MUESTRAS_ESPECIALES = [2, 4, 5, 11, 10]

// ── MAZO ──
function crearMazo() {
  return PALOS.flatMap(palo =>
    NUMEROS.map(numero => ({ numero, palo, id: `${numero}-${palo}` }))
  ).sort(() => Math.random() - 0.5)
}

// ── JERARQUÍA ──
function valorMuestra(n) {
  return { 2: 19, 4: 18, 5: 17, 11: 16, 10: 15 }[n] || 0
}

function jerarquia(carta, muestra) {
  const mEsp = MUESTRAS_ESPECIALES.includes(muestra.numero)
  const mismoPalo = carta.palo === muestra.palo
  if (mEsp && mismoPalo) {
    if (MUESTRAS_ESPECIALES.includes(carta.numero)) return valorMuestra(carta.numero)
    if (carta.numero === 12) return valorMuestra(muestra.numero)
  }
  if (carta.numero === 1 && carta.palo === 'espadas') return 14
  if (carta.numero === 1 && carta.palo === 'bastos') return 13
  if (carta.numero === 7 && carta.palo === 'espadas') return 12
  if (carta.numero === 7 && carta.palo === 'oros') return 11
  return { 3: 10, 2: 9, 1: 8, 12: 7, 11: 6, 10: 5, 7: 4, 6: 3, 5: 2, 4: 1 }[carta.numero] || 0
}

function esMuestraCarta(carta, muestra) {
  return carta.palo === muestra.palo &&
    MUESTRAS_ESPECIALES.includes(muestra.numero) &&
    (MUESTRAS_ESPECIALES.includes(carta.numero) || carta.numero === 12)
}

// ── ENVIDO ──
const VALOR_MUESTRA_ENV = { 2: 30, 4: 29, 5: 28, 11: 27, 10: 27 }

function calcularEnvido(cartas, muestra) {
  const mEsp = MUESTRAS_ESPECIALES.includes(muestra.numero)
  const conVal = cartas.map(c => ({
    c,
    val: mEsp && c.palo === muestra.palo && MUESTRAS_ESPECIALES.includes(c.numero)
      ? VALOR_MUESTRA_ENV[c.numero]
      : [1,2,3,4,5,6,7].includes(c.numero) ? c.numero : 0,
    esMuestra: mEsp && c.palo === muestra.palo && MUESTRAS_ESPECIALES.includes(c.numero)
  }))
  const muestras = conVal.filter(x => x.esMuestra).sort((a,b) => b.val - a.val)
  const normales = conVal.filter(x => !x.esMuestra).sort((a,b) => b.val - a.val)
  if (muestras.length >= 2) return muestras[0].val + muestras[1].val + (normales[0]?.val || 0)
  if (muestras.length === 1) return muestras[0].val + (normales[0]?.val || 0)
  const porPalo = {}
  for (const {c, val} of normales) {
    if (!porPalo[c.palo]) porPalo[c.palo] = []
    porPalo[c.palo].push(val)
  }
  return Math.max(...Object.values(porPalo).map(vs =>
    vs.length >= 2 ? 20 + vs[0] + vs[1] : vs[0]
  ), 0)
}

// ── FLOR ──
function detectarFlor(cartas, muestra) {
  const mEsp = MUESTRAS_ESPECIALES.includes(muestra.numero)
  const muestras = mEsp ? cartas.filter(c => esMuestraCarta(c, muestra)) : []
  if (muestras.length >= 2) return true
  if (muestras.length === 1) {
    const resto = cartas.filter(c => !esMuestraCarta(c, muestra))
    if (resto[0]?.palo === resto[1]?.palo) return true
  }
  const pp = {}
  for (const c of cartas) pp[c.palo] = (pp[c.palo] || 0) + 1
  return Object.values(pp).some(v => v === 3)
}

// ── GANADORES ──
function ganadorMano(cA, cB, muestra) {
  const va = jerarquia(cA, muestra), vb = jerarquia(cB, muestra)
  if (va > vb) return 'jugador'
  if (vb > va) return 'maquina'
  return 'empate'
}

function ganadorRonda(rs) {
  const [r1, r2, r3] = rs
  if (!r1) return null
  if (r1 !== 'empate') {
    if (!r2) return null
    if (r2 !== 'empate') return rs.filter(r=>r==='jugador').length >= 2 ? 'jugador' : 'maquina'
    return r1
  }
  if (!r2) return null
  if (r2 !== 'empate') return r2
  return 'empate'
}

// ── SVG PALOS ──
function SimboloPalo({ palo, size = 28 }) {
  if (palo === 'espadas') return (
    <svg width={size} height={size * 1.4} viewBox="0 0 28 40">
      <polygon points="14,2 17,24 11,24" fill="#c0c8d8" stroke="#8899bb" strokeWidth="0.5"/>
      <line x1="14" y1="3" x2="14" y2="22" stroke="#dde8f8" strokeWidth="0.8"/>
      <rect x="6" y="24" width="16" height="4" rx="2" fill="#8899aa"/>
      <ellipse cx="6" cy="26" rx="2.5" ry="2.5" fill="#667788"/>
      <ellipse cx="22" cy="26" rx="2.5" ry="2.5" fill="#667788"/>
      <rect x="12" y="28" width="4" height="9" rx="2" fill="#8B6914"/>
      <ellipse cx="14" cy="38" rx="4" ry="2" fill="#8899aa"/>
    </svg>
  )
  if (palo === 'bastos') return (
    <svg width={size} height={size * 1.4} viewBox="0 0 28 40">
      <g transform="translate(14,20) rotate(-35)">
        <rect x="-3.5" y="-18" width="7" height="36" rx="3" fill="#b8760a"/>
        <rect x="-3.5" y="-18" width="7" height="6" rx="2" fill="#d4920c"/>
        <rect x="-3.5" y="-6" width="7" height="6" rx="2" fill="#d4920c"/>
        <rect x="-3.5" y="6" width="7" height="6" rx="2" fill="#d4920c"/>
        <ellipse cx="-10" cy="-12" rx="7" ry="3" fill="#2d7a1f" transform="rotate(-25,-10,-12)"/>
        <ellipse cx="-10" cy="0" rx="7" ry="3" fill="#38a028" transform="rotate(-15,-10,0)"/>
        <ellipse cx="-10" cy="12" rx="7" ry="3" fill="#2d7a1f" transform="rotate(-25,-10,12)"/>
        <ellipse cx="10" cy="-6" rx="7" ry="3" fill="#38a028" transform="rotate(25,10,-6)"/>
        <ellipse cx="10" cy="6" rx="7" ry="3" fill="#2d7a1f" transform="rotate(15,10,6)"/>
      </g>
    </svg>
  )
  if (palo === 'oros') return (
    <svg width={size} height={size * 1.4} viewBox="0 0 28 40">
      <circle cx="14" cy="20" r="13" fill="#ca8a04" stroke="#fde047" strokeWidth="1"/>
      <circle cx="14" cy="20" r="9" fill="#eab308"/>
      <circle cx="14" cy="20" r="5" fill="#ca8a04" stroke="#f59e0b" strokeWidth="0.5"/>
      <circle cx="14" cy="20" r="2" fill="#fde047"/>
    </svg>
  )
  if (palo === 'copas') return (
    <svg width={size} height={size * 1.4} viewBox="0 0 28 40">
      <ellipse cx="14" cy="37" rx="9" ry="3" fill="#92400e" stroke="#b45309" strokeWidth="0.5"/>
      <rect x="12" y="30" width="4" height="8" rx="1" fill="#a16207"/>
      <ellipse cx="14" cy="31" rx="4" ry="2" fill="#92400e"/>
      <path d="M5,10 Q3,22 7,28 Q10,32 14,32 Q18,32 21,28 Q25,22 23,10 Z" fill="#92400e" stroke="#b45309" strokeWidth="0.8"/>
      <path d="M8,11 Q6,21 9,27 Q12,31 14,31 Q16,31 19,27 Q22,21 20,11 Z" fill="#7c1d6f" opacity="0.4"/>
      <ellipse cx="14" cy="10" rx="9" ry="3" fill="#b45309" stroke="#d97706" strokeWidth="0.8"/>
    </svg>
  )
  return null
}

// ── CARTA VISUAL ──
function CartaComp({ carta, muestra, onClick, seleccionada, jugada, oculta }) {
  const esMuestra = muestra && esMuestraCarta(carta, muestra)
  const base = `relative flex flex-col items-center justify-between rounded-xl border-2 transition-all select-none overflow-hidden`
  const w = 'w-16 md:w-20'
  const h = 'h-24 md:h-28'

  if (oculta) return (
    <div className={`${w} ${h} rounded-xl border-2 border-gray-700 bg-gray-900 flex items-center justify-center ${jugada ? 'opacity-25' : ''}`}>
      <div className="w-10 h-14 rounded border border-gray-700 bg-gray-800 flex items-center justify-center">
        <span className="text-gray-600 text-lg font-bold">?</span>
      </div>
    </div>
  )

  return (
    <button onClick={onClick} disabled={!onClick || jugada}
      className={`${w} ${h} ${base} px-1 py-1
        ${jugada ? 'opacity-30 cursor-not-allowed border-gray-700 bg-gray-900' :
          seleccionada ? 'border-purple-400 bg-purple-950 scale-110 -translate-y-3 shadow-lg shadow-purple-900' :
          onClick ? 'border-gray-600 bg-gray-900 hover:border-purple-500 hover:-translate-y-2 cursor-pointer' :
          'border-gray-700 bg-gray-900'}
        ${esMuestra && !jugada ? 'border-yellow-500' : ''}`}
    >
      {esMuestra && (
        <span className="absolute top-0.5 right-0.5 bg-yellow-500 text-black text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">M</span>
      )}
      <span className="text-white font-bold text-sm self-start leading-none">{carta.numero}</span>
      <SimboloPalo palo={carta.palo} size={24} />
      <span className="text-white font-bold text-sm self-end leading-none rotate-180">{carta.numero}</span>
    </button>
  )
}

// ── BOTÓN CANTO ──
function BtnCanto({ onClick, disabled, color, children }) {
  const cols = {
    blue: 'bg-blue-900 hover:bg-blue-800 border-blue-700',
    red: 'bg-red-900 hover:bg-red-800 border-red-700',
    yellow: 'bg-yellow-800 hover:bg-yellow-700 border-yellow-600',
    gray: 'bg-gray-800 hover:bg-gray-700 border-gray-600',
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${cols[color]} disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 py-2 rounded-xl text-xs font-bold transition border w-full`}>
      {children}
    </button>
  )
}

// ── PRINCIPAL ──
export default function Truco() {
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
  const [florResuelta, setFlorResuelta] = useState(false)
  const [envidoResuelto, setEnvidoResuelto] = useState(false)
  const [trucoCantado, setTrucoCantado] = useState(null)
  const [trucoResuelto, setTrucoResuelto] = useState(false)
  const [primeraJugada, setPrimeraJugada] = useState(false)

  const addLog = (msg) => setLog(p => [msg, ...p].slice(0, 30))

  const repartir = (alternar = false, pjAct = 0, pmAct = 0, eManoAct = true) => {
    const mazo = crearMazo()
    const m = mazo[0]
    const nj = mazo.slice(1, 4)
    const nm = mazo.slice(4, 7)
    const nuevoEsMano = alternar ? !eManoAct : eManoAct
    const fj = detectarFlor(nj, m)
    const fm = detectarFlor(nm, m)

    setMuestra(m); setManoJ(nj); setManoM(nm)
    setCjJ([]); setCjM([]); setResultados([])
    setManoActual(0); setCartaSel(null)
    setTrucoCantado(null); setTrucoResuelto(false)
    setEnvidoResuelto(false); setFlorResuelta(!fj && !fm)
    setEsperando(false); setPrimeraJugada(false)
    setEsMano(nuevoEsMano)
    setTurno(nuevoEsMano ? 'jugador' : 'maquina')
    setFlorJ(fj); setFlorM(fm)

    addLog(`─── ${pjAct > 0 || pmAct > 0 ? 'Nueva ronda' : 'Inicio'} ───`)
    addLog(`📋 Muestra: ${m.numero} de ${m.palo}`)
    if (fj) addLog('🌸 Tenés Flor')
    if (fm) addLog('🌸 Máquina tiene Flor')

    return { m, nj, nm, nuevoEsMano, fj, fm }
  }

  const iniciar = () => {
    setPtsJ(0); setPtsM(0); setGanador(null); setLog([])
    const { nuevoEsMano, nm, m } = repartir(false, 0, 0, true)
    setPantalla('juego')
    if (!nuevoEsMano) {
      setTimeout(() => maquinaJugar([], [], [], 0, m, nm), 1200)
    }
  }

  // ── TERMINAR RONDA ──
  const terminarRonda = useCallback((gan, pjAct, pmAct, eManoAct, muestraAct) => {
    let pj = pjAct, pm = pmAct
    if (!trucoResuelto) {
      const val = { truco: 2, retruco: 3, vale4: 4 }[trucoCantado] || 1
      if (gan === 'jugador') { pj += val; addLog(`✅ Ganaste la ronda +${val}`) }
      else if (gan === 'maquina') { pm += val; addLog(`❌ Máquina ganó la ronda +${val}`) }
      else addLog('🤝 Ronda empatada')
    }
    setPtsJ(pj); setPtsM(pm)
    if (pj >= limite) { setGanador('jugador'); setPantalla('resultado'); return }
    if (pm >= limite) { setGanador('maquina'); setPantalla('resultado'); return }
    setTimeout(() => {
      const { nuevoEsMano, m, nm } = repartir(true, pj, pm, eManoAct)
      if (!nuevoEsMano) {
        setTimeout(() => maquinaJugar([], [], [], 0, m, nm), 1200)
      }
    }, 1500)
  }, [trucoCantado, trucoResuelto, limite])

  // ── RESOLVER MANO ──
  const resolverMano = useCallback((cJ, cM, cjJAct, cjMAct, resAct, idx, muestraAct, mJAct, mMAct, pjAct, pmAct, eManoAct) => {
    const res = ganadorMano(cJ, cM, muestraAct)
    const nuevosRes = [...resAct, res]
    setResultados(nuevosRes)
    if (res === 'jugador') addLog('✅ Ganaste la mano')
    else if (res === 'maquina') addLog('❌ Máquina ganó la mano')
    else addLog('🤝 Empate en la mano')

    const gan = ganadorRonda(nuevosRes)
    if (gan || nuevosRes.length === 3) {
      setTimeout(() => terminarRonda(gan || 'empate', pjAct, pmAct, eManoAct, muestraAct), 800)
      return
    }
    const sig = idx + 1
    setManoActual(sig)
    const quien = res === 'empate' ? (eManoAct ? 'jugador' : 'maquina') : res
    setTurno(quien)
    if (quien === 'maquina') {
      setTimeout(() => maquinaJugar(cjJAct, cjMAct, nuevosRes, sig, muestraAct, mMAct, mJAct, pjAct, pmAct, eManoAct), 1000)
    }
  }, [terminarRonda])

  // ── MAQUINA JUGAR ──
  const maquinaJugar = useCallback((cjJAct, cjMAct, resAct, idx, muestraAct, mMAct, mJAct, pjAct, pmAct, eManoAct) => {
    const disp = (mMAct || manoM).filter(c => !cjMAct.find(j => j.id === c.id))
    if (!disp.length) return
    const carta = [...disp].sort((a,b) => jerarquia(b, muestraAct || muestra) - jerarquia(a, muestraAct || muestra))[0]
    const nuevoCjM = [...cjMAct, carta]
    setCjM(nuevoCjM)
    addLog(`🤖 Máquina jugó ${carta.numero} de ${carta.palo}`)
    if (cjJAct.length > idx) {
      resolverMano(cjJAct[idx], carta, cjJAct, nuevoCjM, resAct, idx, muestraAct || muestra, mJAct || manoJ, mMAct || manoM, pjAct ?? ptsJ, pmAct ?? ptsM, eManoAct ?? esMano)
    } else {
      setTurno('jugador')
    }
  }, [manoM, manoJ, muestra, ptsJ, ptsM, esMano, resolverMano])

  // ── JUGAR CARTA ──
  const jugarCarta = (carta) => {
    if (turno !== 'jugador' || esperando || !florResuelta) return
    const nuevoCjJ = [...cjJ, carta]
    setCjJ(nuevoCjJ)
    setCartaSel(null)
    if (!primeraJugada) setPrimeraJugada(true)
    addLog(`🃏 Jugaste ${carta.numero} de ${carta.palo}`)
    if (cjM.length > manoActual) {
      resolverMano(carta, cjM[manoActual], nuevoCjJ, cjM, resultados, manoActual, muestra, manoJ, manoM, ptsJ, ptsM, esMano)
    } else {
      setTurno('maquina')
      setTimeout(() => maquinaJugar(nuevoCjJ, cjM, resultados, manoActual, muestra, manoM, manoJ, ptsJ, ptsM, esMano), 1000)
    }
  }

  // ── FLOR ──
  const cantarFlor = (tipo) => {
    setEsperando(true)
    addLog(`🌸 ${tipo === 'flor' ? 'La mía es Flor' : tipo === 'conFlor' ? 'Con Flor Envido' : 'Contra Flor al Resto'}`)
    setTimeout(() => {
      if (florM) {
        if (tipo === 'flor') {
          addLog('🤖 La mía también — se compara al final')
          setFlorResuelta(true)
        } else if (tipo === 'conFlor') {
          if (Math.random() > 0.4) {
            const ej = calcularEnvido(manoJ, muestra), em = calcularEnvido(manoM, muestra)
            addLog(`Flor: vos ${ej} - máquina ${em}`)
            if (ej >= em) { setPtsJ(p => p+5); addLog('+5 para vos') }
            else { setPtsM(p => p+5); addLog('+5 para máquina') }
          } else { setPtsJ(p => p+4); addLog('No quiere — +4 para vos') }
          setFlorResuelta(true)
        } else {
          const pts = limite - Math.min(ptsJ, ptsM)
          if (Math.random() > 0.3) {
            const ej = calcularEnvido(manoJ, muestra), em = calcularEnvido(manoM, muestra)
            if (ej >= em) { setPtsJ(p => p+pts); addLog(`+${pts} para vos`) }
            else { setPtsM(p => p+pts); addLog(`+${pts} para máquina`) }
          } else { setPtsJ(p => p+pts-1); addLog(`No quiere — +${pts-1} para vos`) }
          setFlorResuelta(true)
        }
      } else {
        setPtsJ(p => p+3); addLog('+3 por Flor'); setFlorResuelta(true)
      }
      setEnvidoResuelto(true) // si hay flor, no se puede cantar envido
      setEsperando(false)
    }, 1000)
  }

  // ── ENVIDO ──
  const cantarEnvido = (tipo) => {
    setEsperando(true)
    addLog(`Envido: ${tipo}`)
    setTimeout(() => {
      if (Math.random() > 0.4) {
        const ej = calcularEnvido(manoJ, muestra), em = calcularEnvido(manoM, muestra)
        addLog(`Tanto: vos ${ej} - máquina ${em}`)
        const pts = tipo === 'falta' ? limite - Math.min(ptsJ, ptsM) : tipo === 'real' ? 3 : tipo === 'ee' ? 4 : 2
        if (ej >= em) { setPtsJ(p => p+pts); addLog(`✅ +${pts} para vos`) }
        else { setPtsM(p => p+pts); addLog(`❌ +${pts} para máquina`) }
      } else { setPtsJ(p => p+1); addLog('No quiere — +1 para vos') }
      setEnvidoResuelto(true); setEsperando(false)
    }, 1000)
  }

  // ── TRUCO ──
  const cantarTruco = (tipo) => {
    if (esperando) return
    setTrucoCantado(tipo); setEsperando(true)
    addLog(`Truco: ${tipo}`)
    setTimeout(() => {
      if (Math.random() > 0.35) {
        addLog(`🤖 Quiere ${tipo}`)
      } else {
        const pts = { truco: 1, retruco: 2, vale4: 3 }[tipo]
        addLog(`🤖 No quiere — +${pts} para vos`)
        setPtsJ(p => p+pts); setTrucoResuelto(true)
      }
      setEsperando(false)
    }, 1000)
  }

  const puedeJugar = turno === 'jugador' && !esperando && florResuelta
  const puedeEnvido = !envidoResuelto && !florJ && florResuelta && manoActual === 0 && !primeraJugada
  const puedeTruco = !trucoResuelto && !esperando && florResuelta

  // ── MENÚ ──
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
              {LIMITES.map(l => (
                <button key={l} onClick={() => setLimite(l)}
                  className={`py-3 rounded-xl border-2 font-bold text-lg transition ${limite === l ? 'border-purple-500 bg-purple-950 text-white' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <button onClick={iniciar} className="bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-2xl text-xl font-bold transition hover:scale-105">
            Jugar →
          </button>
        </div>
      </div>
      <Footer />
    </div>
  )

  // ── JUEGO ──
  if (pantalla === 'juego') return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />
      <div className="flex-1 flex gap-2 px-2 py-3 max-w-5xl mx-auto w-full">

        {/* Panel izquierdo — Envido */}
        <div className="flex flex-col gap-2 w-32 flex-shrink-0 pt-8">
          <p className="text-xs text-blue-400 font-bold uppercase tracking-wider text-center mb-1">Envido</p>
          <BtnCanto onClick={() => cantarEnvido('envido')} disabled={!puedeEnvido || esperando} color="blue">Envido</BtnCanto>
          <BtnCanto onClick={() => cantarEnvido('ee')} disabled={!puedeEnvido || esperando} color="blue">Env. Envido</BtnCanto>
          <BtnCanto onClick={() => cantarEnvido('real')} disabled={!puedeEnvido || esperando} color="blue">Real Envido</BtnCanto>
          <BtnCanto onClick={() => cantarEnvido('falta')} disabled={!puedeEnvido || esperando} color="blue">Falta Envido</BtnCanto>

          {florJ && !florResuelta && (
            <>
              <div className="h-px bg-gray-700 my-1"/>
              <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider text-center mb-1">Flor</p>
              <BtnCanto onClick={() => cantarFlor('flor')} disabled={esperando} color="yellow">La mía es Flor</BtnCanto>
              <BtnCanto onClick={() => cantarFlor('conFlor')} disabled={esperando} color="yellow">Con Flor Envido</BtnCanto>
              <BtnCanto onClick={() => cantarFlor('contraFlor')} disabled={esperando} color="yellow">Contra Flor Resto</BtnCanto>
            </>
          )}
          {!florJ && florM && !florResuelta && (
            <>
              <div className="h-px bg-gray-700 my-1"/>
              <p className="text-xs text-yellow-400 text-center text-xs">Máquina tiene Flor</p>
              <BtnCanto onClick={() => { setFlorResuelta(true); setEnvidoResuelto(true); addLog('Flor de la máquina') }} disabled={false} color="gray">Continuar →</BtnCanto>
            </>
          )}
        </div>

        {/* Centro */}
        <div className="flex-1 flex flex-col items-center gap-2">

          {/* Puntaje */}
          <div className="flex gap-3 w-full justify-center">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-2 text-center flex-1">
              <p className="text-gray-400 text-xs">Vos</p>
              <p className="text-3xl font-extrabold text-purple-400">{ptsJ}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 flex items-center">
              <p className="text-gray-500 text-xs">/{limite}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-2 text-center flex-1">
              <p className="text-gray-400 text-xs">Máquina</p>
              <p className="text-3xl font-extrabold text-red-400">{ptsM}</p>
            </div>
          </div>

          {/* Muestra */}
          {muestra && (
            <div className="flex items-center gap-2 bg-gray-900 border border-yellow-700 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-yellow-400 font-semibold">Muestra:</span>
              <span className="text-white font-bold">{muestra.numero} de {muestra.palo}</span>
              <SimboloPalo palo={muestra.palo} size={16}/>
              {MUESTRAS_ESPECIALES.includes(muestra.numero) && (
                <span className="bg-yellow-900 text-yellow-300 px-1.5 py-0.5 rounded-full">Activa</span>
              )}
            </div>
          )}

          {/* Cartas máquina */}
          <div className="flex gap-2">
            {manoM.map(c => (
              <CartaComp key={c.id} carta={c} muestra={muestra} jugada={!!cjM.find(j=>j.id===c.id)} oculta/>
            ))}
          </div>

          {/* Mesa */}
          <div className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-500 text-xs">Mano {manoActual+1}</span>
              <div className="flex gap-1">
                {resultados.map((r,i) => (
                  <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-bold ${r==='jugador'?'bg-green-900 text-green-400':r==='maquina'?'bg-red-900 text-red-400':'bg-gray-700 text-gray-400'}`}>
                    {r==='jugador'?'✓':r==='maquina'?'✗':'='}
                  </span>
                ))}
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${turno==='jugador'?'bg-purple-900 text-purple-300':'bg-gray-800 text-gray-400'}`}>
                {esperando ? '⏳' : turno==='jugador' ? 'Tu turno' : 'Máquina...'}
              </span>
            </div>
            <div className="flex justify-around">
              {[{label:'Máquina',cartas:cjM},{label:'Vos',cartas:cjJ}].map(({label,cartas}) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <p className="text-xs text-gray-500">{label}</p>
                  {cartas[manoActual]
                    ? <CartaComp carta={cartas[manoActual]} muestra={muestra} jugada/>
                    : <div className="w-16 h-24 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center"><span className="text-gray-600 text-xs">—</span></div>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Cartas jugador */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-gray-500 text-xs">
              {!florResuelta ? '⚠️ Resolvé la Flor primero' : !puedeJugar ? 'Esperá tu turno' : 'Elegí una carta (click dos veces)'}
            </p>
            <div className="flex gap-2">
              {manoJ.map(carta => (
                <CartaComp key={carta.id} carta={carta} muestra={muestra}
                  jugada={!!cjJ.find(j=>j.id===carta.id)}
                  seleccionada={cartaSel?.id===carta.id}
                  onClick={!cjJ.find(j=>j.id===carta.id) && puedeJugar
                    ? () => { if(cartaSel?.id===carta.id) jugarCarta(carta); else setCartaSel(carta) }
                    : null}
                />
              ))}
            </div>
            {cartaSel && <p className="text-purple-400 text-xs animate-pulse">Clickeá de nuevo para jugar</p>}
          </div>

          {/* Log */}
          <div className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2 max-h-24 overflow-y-auto">
            {log.length === 0
              ? <p className="text-gray-600 text-xs text-center">Historial</p>
              : log.map((msg,i) => <p key={i} className={`text-xs ${i===0?'text-white':'text-gray-500'}`}>{msg}</p>)
            }
          </div>
        </div>

        {/* Panel derecho — Truco */}
        <div className="flex flex-col gap-2 w-32 flex-shrink-0 pt-8">
          <p className="text-xs text-red-400 font-bold uppercase tracking-wider text-center mb-1">Truco</p>
          <BtnCanto onClick={() => cantarTruco('truco')} disabled={!puedeTruco || trucoCantado !== null} color="red">Truco</BtnCanto>
          <BtnCanto onClick={() => cantarTruco('retruco')} disabled={!puedeTruco || trucoCantado !== 'truco'} color="red">Retruco</BtnCanto>
          <BtnCanto onClick={() => cantarTruco('vale4')} disabled={!puedeTruco || trucoCantado !== 'retruco'} color="red">Vale Cuatro</BtnCanto>
          {trucoCantado && (
            <p className="text-xs text-center text-red-400 mt-1 font-semibold">
              {trucoCantado === 'truco' ? 'Truco ✓' : trucoCantado === 'retruco' ? 'Retruco ✓' : 'Vale 4 ✓'}
            </p>
          )}
        </div>

      </div>
      <Footer />
    </div>
  )

  // ── RESULTADO ──
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
              <div className="bg-gray-800 rounded-2xl p-4">
                <p className="text-gray-400 text-xs">Vos</p>
                <p className="text-3xl font-extrabold text-purple-400">{ptsJ}</p>
              </div>
              <div className="bg-gray-800 rounded-2xl p-4">
                <p className="text-gray-400 text-xs">Máquina</p>
                <p className="text-3xl font-extrabold text-red-400">{ptsM}</p>
              </div>
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
}