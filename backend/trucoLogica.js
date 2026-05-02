const PALOS = ['espadas', 'bastos', 'oros', 'copas']
const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]
const MUESTRAS_ESPECIALES = [2, 4, 5, 11, 10]
const VALOR_MUESTRA_ENV = { 2: 30, 4: 29, 5: 28, 11: 27, 10: 27 }

function crearMazo() {
  const mazo = PALOS.flatMap(palo =>
    NUMEROS.map(numero => ({ numero, palo, id: `${numero}-${palo}` }))
  )
  for (let i = mazo.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[mazo[i], mazo[j]] = [mazo[j], mazo[i]]
  }
  return mazo
}

function esMuestraCarta(carta, muestra) {
  if (carta.palo !== muestra.palo) return false
  if (MUESTRAS_ESPECIALES.includes(carta.numero)) return true
  if (carta.numero === 12 && MUESTRAS_ESPECIALES.includes(muestra.numero)) return true
  return false
}

function jerarquia(carta, muestra) {
  const mismoPalo = carta.palo === muestra.palo
  if (carta.numero === 12 && mismoPalo && MUESTRAS_ESPECIALES.includes(muestra.numero)) {
    return { 2: 19, 4: 18, 5: 17, 11: 16, 10: 15 }[muestra.numero] || 0
  }
  if (mismoPalo && MUESTRAS_ESPECIALES.includes(carta.numero)) {
    return { 2: 19, 4: 18, 5: 17, 11: 16, 10: 15 }[carta.numero] || 0
  }
  if (carta.numero === 1 && carta.palo === 'espadas') return 14
  if (carta.numero === 1 && carta.palo === 'bastos') return 13
  if (carta.numero === 7 && carta.palo === 'espadas') return 12
  if (carta.numero === 7 && carta.palo === 'oros') return 11
  return { 3: 10, 2: 9, 1: 8, 12: 7, 11: 6, 10: 5, 7: 4, 6: 3, 5: 2, 4: 1 }[carta.numero] || 0
}

function calcularEnvido(cartas, muestra) {
  const conVal = cartas.map(c => {
    const esBuena = c.palo === muestra.palo && MUESTRAS_ESPECIALES.includes(c.numero)
    const es12Pieza = c.numero === 12 && c.palo === muestra.palo && MUESTRAS_ESPECIALES.includes(muestra.numero)
    let val
    if (esBuena) val = VALOR_MUESTRA_ENV[c.numero]
    else if (es12Pieza) val = VALOR_MUESTRA_ENV[muestra.numero]
    else val = [1, 2, 3, 4, 5, 6, 7].includes(c.numero) ? c.numero : 0
    return { c, val, esMuestra: esBuena || es12Pieza }
  })
  const muestras = conVal.filter(x => x.esMuestra).sort((a, b) => b.val - a.val)
  const normales = conVal.filter(x => !x.esMuestra).sort((a, b) => b.val - a.val)
  if (muestras.length >= 2) return muestras[0].val + muestras[1].val + (normales[0]?.val || 0)
  if (muestras.length === 1) return muestras[0].val + (normales[0]?.val || 0)
  const porPalo = {}
  for (const { c, val } of normales) {
    if (!porPalo[c.palo]) porPalo[c.palo] = []
    porPalo[c.palo].push(val)
  }
  return Math.max(...Object.values(porPalo).map(vs =>
    vs.length >= 2 ? 20 + vs[0] + vs[1] : vs[0]
  ), 0)
}

function detectarFlor(cartas, muestra) {
  const muestras = cartas.filter(c => esMuestraCarta(c, muestra))
  if (muestras.length >= 2) return true
  if (muestras.length === 1) {
    const resto = cartas.filter(c => !esMuestraCarta(c, muestra))
    if (resto[0]?.palo === resto[1]?.palo) return true
  }
  const pp = {}
  for (const c of cartas) pp[c.palo] = (pp[c.palo] || 0) + 1
  return Object.values(pp).some(v => v === 3)
}

function calcularValorFlor(cartas, muestra) {
  const valores = cartas.map(c => {
    const esPieza = esMuestraCarta(c, muestra)
    const numeroReal = c.numero === 12 && c.palo === muestra.palo && MUESTRAS_ESPECIALES.includes(muestra.numero)
      ? muestra.numero : c.numero
    const valorNumero = [1, 2, 3, 4, 5, 6, 7].includes(c.numero) ? c.numero : 0
    const valorPieza = esPieza ? (VALOR_MUESTRA_ENV[numeroReal] || 0) : 0
    return { ...c, esPieza, valorNumero, valorPieza }
  })
  const piezas = valores.filter(c => c.esPieza)
  if (piezas.length >= 2) {
    const ordenadas = [...piezas].sort((a, b) => b.valorPieza - a.valorPieza)
    const mayor = ordenadas[0].valorPieza
    const resto = ordenadas.slice(1).reduce((acc, c) => acc + (c.valorPieza % 10), 0)
    const noPiezas = valores.filter(c => !c.esPieza)
    const extra = piezas.length === 2 ? (noPiezas[0]?.valorNumero || 0) : 0
    return mayor + resto + extra
  }
  if (piezas.length === 1) {
    const noPiezas = valores.filter(c => !c.esPieza)
    if (noPiezas.length === 2 && noPiezas[0].palo === noPiezas[1].palo)
      return piezas[0].valorPieza + noPiezas[0].valorNumero + noPiezas[1].valorNumero
  }
  const porPalo = {}
  for (const c of valores) {
    if (!porPalo[c.palo]) porPalo[c.palo] = []
    porPalo[c.palo].push(c.valorNumero)
  }
  for (const vals of Object.values(porPalo)) {
    if (vals.length === 3) return 20 + vals[0] + vals[1] + vals[2]
  }
  return 0
}

function ganadorMano(cA, cB, muestra) {
  const va = jerarquia(cA, muestra), vb = jerarquia(cB, muestra)
  if (va > vb) return 'A'
  if (vb > va) return 'B'
  return 'empate'
}

function ganadorRonda(rs, mano) {
  const [r1, r2, r3] = rs
  if (!r1) return null
  if (r1 !== 'empate') {
    if (!r2) return null
    if (r2 === r1) return r1
    if (r2 === 'empate') return r1
    if (!r3) return null
    if (r3 === r1 || r3 === 'empate') return r1
    if (r3 === r2) return r2
    return null
  }
  if (!r2) return null
  if (r2 !== 'empate') return r2
  if (!r3) return null
  if (r3 !== 'empate') return r3
  return mano
}

// Deals new cards into an existing partida object (mutates in place)
function repartirNuevaRonda(p) {
  const mazo = crearMazo()
  const muestra = mazo[0]
  const manoA = mazo.slice(1, 4)
  const manoB = mazo.slice(4, 7)
  const florA = detectarFlor(manoA, muestra)
  const florB = detectarFlor(manoB, muestra)

  p.muestra = muestra
  p.manoA = [...manoA]
  p.manoB = [...manoB]
  p.cartasJugadasA = []
  p.cartasJugadasB = []
  p.resultadosManos = []
  p.manoActual = 0
  p.turno = p.esManoA ? 'A' : 'B'
  p.primeraJugada = false
  p.ganador = null
  p.mostrarCartasRival = false
  p.rondaTerminada = false

  p.trucoCantado = null
  p.cantanteOriginalTruco = null
  p.ultimoEnCantar = null
  p.trucoResuelto = false
  p.trucoPendientePara = null

  p.envidoResuelto = false
  p.nivelEnvido = null
  p.envidoAcumulado = 0
  p.envidoPendientePara = null

  p.florA = florA
  p.florB = florB
  p.florActiva = florA && florB
  p.florResuelta = !florA && !florB
  p.florEnJuego = false
  p.florCantadaPor = null
  p.nivelFlor = null
  p.florPendientePara = null
}

// Handles automatic flor (only one player has it): awards +3 and checks game over.
// Returns log messages for A and B.
function procesarFlorInicial(p) {
  const logA = [], logB = []
  logA.push('─── Nueva ronda ───')
  logB.push('─── Nueva ronda ───')
  logA.push(`📋 Muestra: ${p.muestra.numero} de ${p.muestra.palo}`)
  logB.push(`📋 Muestra: ${p.muestra.numero} de ${p.muestra.palo}`)

  if (p.florA && p.florB) {
    logA.push('⚘ ¡Ambos tienen Flor!')
    logB.push('⚘ ¡Ambos tienen Flor!')
  } else if (p.florA && !p.florB) {
    p.ptsA += 3
    p.florResuelta = true
    p.envidoResuelto = true
    logA.push('🌸 Flor automática — +3')
    logB.push(`🌸 ${p.nombreA} tiene Flor — +3`)
    if (p.ptsA >= p.limite) p.ganador = 'A'
  } else if (!p.florA && p.florB) {
    p.ptsB += 3
    p.florResuelta = true
    p.envidoResuelto = true
    logA.push(`🌸 ${p.nombreB} tiene Flor — +3`)
    logB.push('🌸 Flor automática — +3')
    if (p.ptsB >= p.limite) p.ganador = 'B'
  }

  return { logA, logB }
}

function crearPartida(socketA, socketB, limite, nombreA = 'Jugador A', nombreB = 'Jugador B') {
  const p = {
    socketA, socketB, limite,
    nombreA, nombreB,
    ptsA: 0, ptsB: 0,
    esManoA: true,
    muestra: null, manoA: [], manoB: [],
    cartasJugadasA: [], cartasJugadasB: [],
    resultadosManos: [], manoActual: 0,
    turno: 'A', primeraJugada: false,
    ganador: null, mostrarCartasRival: false, rondaTerminada: false,
    trucoCantado: null, cantanteOriginalTruco: null, ultimoEnCantar: null,
    trucoResuelto: false, trucoPendientePara: null,
    envidoResuelto: false, nivelEnvido: null, envidoAcumulado: 0, envidoPendientePara: null,
    florA: false, florB: false, florActiva: false, florResuelta: true,
    florEnJuego: false, florCantadaPor: null, nivelFlor: null, florPendientePara: null,
  }
  repartirNuevaRonda(p)
  return p
}

// Returns the full game state from a specific player's perspective
function getEstadoParaSocket(p, socketId) {
  const esA = socketId === p.socketA
  const yo = esA ? 'A' : 'B'
  const rival = esA ? 'B' : 'A'

  const rel = (jugador) => jugador == null ? null : (jugador === yo ? 'yo' : 'rival')

  const manoRivalRevelada = p.mostrarCartasRival ? (esA ? p.manoB : p.manoA) : null
  const manoRivalRestante = (esA ? p.manoB : p.manoA).length

  const resultados = p.resultadosManos.map(r =>
    r === 'empate' ? 'empate' : r === yo ? 'jugador' : 'maquina'
  )

  const esperandoRespuesta =
    (p.trucoPendientePara === rival) ||
    (p.envidoPendientePara === rival) ||
    (p.florPendientePara === rival)

  return {
    miMano: esA ? p.manoA : p.manoB,
    manoRivalRestante,
    manoRivalRevelada,
    cartasJugadasMias: esA ? p.cartasJugadasA : p.cartasJugadasB,
    cartasJugadasRival: esA ? p.cartasJugadasB : p.cartasJugadasA,
    muestra: p.muestra,
    resultados,
    manoActual: p.manoActual,
    turno: p.turno === yo ? 'yo' : 'rival',
    esMano: esA ? p.esManoA : !p.esManoA,
    ptsYo: esA ? p.ptsA : p.ptsB,
    ptsRival: esA ? p.ptsB : p.ptsA,
    limite: p.limite,
    trucoCantado: p.trucoCantado,
    ultimoEnCantar: rel(p.ultimoEnCantar),
    cantanteOriginalTruco: rel(p.cantanteOriginalTruco),
    trucoResuelto: p.trucoResuelto,
    trucoPendiente: p.trucoPendientePara === yo,
    esperandoRespuesta,
    envidoResuelto: p.envidoResuelto,
    envidoPendiente: p.envidoPendientePara === yo,
    nivelEnvido: p.nivelEnvido,
    envidoAcumulado: p.envidoAcumulado,
    tengoFlor: esA ? p.florA : p.florB,
    rivalTieneFlor: esA ? p.florB : p.florA,
    florResuelta: p.florResuelta,
    florActiva: p.florActiva,
    florEnJuego: p.florEnJuego,
    florPendiente: p.florPendientePara === yo,
    florCantadaPor: rel(p.florCantadaPor),
    nivelFlor: p.nivelFlor,
    primeraJugada: p.primeraJugada,
    ganador: rel(p.ganador),
    rondaTerminada: p.rondaTerminada,
    mostrarCartasRival: p.mostrarCartasRival,
  }
}

// Ends the round: computes truco points if not resolved, updates scores, checks game over.
// ganRonda: 'A' | 'B' | 'empate'
// Returns { terminoPartida, logA, logB }
function _terminarRonda(p, ganRonda, logA, logB) {
  if (!p.trucoResuelto) {
    const val = { truco: 2, retruco: 3, vale4: 4 }[p.trucoCantado] || 1
    let ganadorPts = ganRonda
    if (ganRonda === 'empate') ganadorPts = p.esManoA ? 'A' : 'B'
    if (ganadorPts === 'A') { p.ptsA += val; logA.push(`✅ Ganaste la ronda +${val}`); logB.push(`❌ Perdiste la ronda −${val}`) }
    else { p.ptsB += val; logB.push(`✅ Ganaste la ronda +${val}`); logA.push(`❌ Perdiste la ronda −${val}`) }
  }

  if (p.florA || p.florB) p.mostrarCartasRival = true
  p.rondaTerminada = true

  if (p.ptsA >= p.limite) { p.ganador = 'A'; return true }
  if (p.ptsB >= p.limite) { p.ganador = 'B'; return true }
  return false
}

// Processes a player action. Mutates partida. Returns { ok, error, logA, logB, terminoRonda, terminoPartida }
function procesarAccion(p, socketId, tipo, datos) {
  const esA = socketId === p.socketA
  const yo = esA ? 'A' : 'B'
  const rival = esA ? 'B' : 'A'
  const logA = [], logB = []

  // Nombres del rival desde la perspectiva de cada jugador
  const nRivA = p.nombreB   // A ve a B como rival
  const nRivB = p.nombreA   // B ve a A como rival

  switch (tipo) {
    case 'carta': {
      if (p.turno !== yo) return { ok: false, error: 'No es tu turno' }
      if (p.trucoPendientePara === yo || p.envidoPendientePara === yo || p.florPendientePara === yo)
        return { ok: false, error: 'Tenés algo pendiente de responder' }
      if (p.florActiva && !p.florResuelta)
        return { ok: false, error: 'Deben resolver la Flor primero' }

      const miMano = esA ? p.manoA : p.manoB
      const carta = datos.carta
      const idx = miMano.findIndex(c => c.id === carta.id)
      if (idx === -1) return { ok: false, error: 'Carta no válida' }

      if (esA) { p.manoA = p.manoA.filter((_, i) => i !== idx); p.cartasJugadasA.push(carta) }
      else     { p.manoB = p.manoB.filter((_, i) => i !== idx); p.cartasJugadasB.push(carta) }
      if (!p.primeraJugada) p.primeraJugada = true

      const desc = `${carta.numero} de ${carta.palo}`
      logA.push(esA ? `🃏 Jugaste ${desc}` : `🃏 ${nRivA} jugó ${desc}`)
      logB.push(esA ? `🃏 ${nRivB} jugó ${desc}` : `🃏 Jugaste ${desc}`)

      const cA = p.cartasJugadasA[p.manoActual]
      const cB = p.cartasJugadasB[p.manoActual]

      if (cA && cB) {
        const res = ganadorMano(cA, cB, p.muestra)
        p.resultadosManos.push(res)
        logA.push(res === 'empate' ? '🤝 Empate en la mano' : res === 'A' ? '✅ Ganaste la mano' : '❌ Perdiste la mano')
        logB.push(res === 'empate' ? '🤝 Empate en la mano' : res === 'B' ? '✅ Ganaste la mano' : '❌ Perdiste la mano')

        const ganRonda = ganadorRonda(p.resultadosManos, p.esManoA ? 'A' : 'B')
        if (ganRonda || p.resultadosManos.length === 3) {
          const terminoPartida = _terminarRonda(p, ganRonda || 'empate', logA, logB)
          return { ok: true, logA, logB, terminoRonda: true, terminoPartida }
        }
        p.manoActual++
        p.turno = res === 'empate' ? (p.esManoA ? 'A' : 'B') : res
      } else {
        p.turno = rival
      }
      return { ok: true, logA, logB, terminoRonda: false }
    }

    case 'truco':
    case 'retruco':
    case 'vale4': {
      if (p.trucoResuelto) return { ok: false, error: 'El truco ya fue resuelto' }
      if (!p.florResuelta) return { ok: false, error: 'Resolvé la Flor primero' }
      if (p.trucoPendientePara != null) return { ok: false, error: 'Hay un truco pendiente de respuesta' }
      if (tipo === 'truco' && p.trucoCantado) return { ok: false, error: 'El truco ya fue cantado' }
      if (tipo === 'retruco') {
        if (p.trucoCantado !== 'truco') return { ok: false, error: 'No se puede cantar Retruco ahora' }
        if (p.cantanteOriginalTruco === yo) return { ok: false, error: 'No podés subir tu propio Truco' }
      }
      if (tipo === 'vale4') {
        if (p.trucoCantado !== 'retruco') return { ok: false, error: 'No se puede cantar Vale 4 ahora' }
        if (p.cantanteOriginalTruco !== yo) return { ok: false, error: 'Solo quien cantó Truco puede subir a Vale 4' }
      }
      if (tipo === 'truco') p.cantanteOriginalTruco = yo
      p.trucoCantado = tipo
      p.ultimoEnCantar = yo
      p.trucoPendientePara = rival
      const n = tipo === 'truco' ? 'Truco' : tipo === 'retruco' ? 'Retruco' : 'Vale Cuatro'
      logA.push(esA ? `🗣 Cantaste ${n}` : `🗣 ${nRivA} cantó ${n}`)
      logB.push(esA ? `🗣 ${nRivB} cantó ${n}` : `🗣 Cantaste ${n}`)
      return { ok: true, logA, logB, terminoRonda: false }
    }

    case 'quiero_truco': {
      if (p.trucoPendientePara !== yo) return { ok: false, error: 'No hay truco pendiente para vos' }
      p.trucoPendientePara = null
      p.ultimoEnCantar = yo
      const n = p.trucoCantado === 'truco' ? 'Truco' : p.trucoCantado === 'retruco' ? 'Retruco' : 'Vale Cuatro'
      logA.push(esA ? `✅ Aceptaste el ${n}` : `✅ ${nRivA} quiere el ${n}`)
      logB.push(esA ? `✅ ${nRivB} quiere el ${n}` : `✅ Aceptaste el ${n}`)
      return { ok: true, logA, logB, terminoRonda: false }
    }

    case 'no_quiero_truco': {
      if (p.trucoPendientePara !== yo) return { ok: false, error: 'No hay truco pendiente para vos' }
      const pts = { truco: 1, retruco: 2, vale4: 3 }[p.trucoCantado] || 1
      if (rival === 'A') p.ptsA += pts; else p.ptsB += pts
      p.trucoResuelto = true
      p.trucoPendientePara = null
      logA.push(esA ? `❌ No quisiste — +${pts} para ${nRivA}` : `✅ ${nRivA} no quiso — +${pts} para vos`)
      logB.push(esA ? `✅ ${nRivB} no quiso — +${pts} para vos` : `❌ No quisiste — +${pts} para ${nRivB}`)
      const terminoPartida = _terminarRonda(p, rival, logA, logB)
      return { ok: true, logA, logB, terminoRonda: true, terminoPartida }
    }

    case 'envido':
    case 'real':
    case 'falta': {
      const esSubida = p.envidoPendientePara === yo
      if (!esSubida) {
        if (p.envidoResuelto) return { ok: false, error: 'El envido ya fue resuelto' }
        if (p.envidoPendientePara != null) return { ok: false, error: 'Hay un envido pendiente de respuesta' }
        if (!p.florResuelta) return { ok: false, error: 'Resolvé la Flor primero' }
        if (p.primeraJugada) return { ok: false, error: 'No se puede cantar envido después de jugar una carta' }
        if (p.manoActual !== 0) return { ok: false, error: 'Solo se puede cantar envido en la primera mano' }
        if (p.florA || p.florB) return { ok: false, error: 'No se puede cantar envido con flor en juego' }
      }
      const pts = tipo === 'falta'
        ? p.limite - Math.min(p.ptsA, p.ptsB)
        : tipo === 'real' ? p.envidoAcumulado + 3 : p.envidoAcumulado + 2
      p.nivelEnvido = tipo
      p.envidoAcumulado = pts
      p.envidoPendientePara = rival
      const n = tipo === 'real' ? 'Real Envido' : tipo === 'falta' ? 'Falta Envido' : 'Envido'
      logA.push(esA ? `Cantaste: ${n} (vale ${pts})` : `🎴 ${nRivA} cantó ${n} (vale ${pts})`)
      logB.push(esA ? `🎴 ${nRivB} cantó ${n} (vale ${pts})` : `Cantaste: ${n} (vale ${pts})`)
      return { ok: true, logA, logB, terminoRonda: false }
    }

    case 'quiero_envido': {
      if (p.envidoPendientePara !== yo) return { ok: false, error: 'No hay envido pendiente para vos' }
      const tantoA = calcularEnvido(p.manoA, p.muestra)
      const tantoB = calcularEnvido(p.manoB, p.muestra)
      const pts = p.envidoAcumulado
      const ganadorEnv = tantoA >= tantoB ? 'A' : 'B'
      if (ganadorEnv === 'A') p.ptsA += pts; else p.ptsB += pts
      p.envidoResuelto = true
      p.envidoPendientePara = null
      logA.push(`🎴 Envido — vos ${tantoA} vs rival ${tantoB}`)
      logB.push(`🎴 Envido — vos ${tantoB} vs rival ${tantoA}`)
      logA.push(ganadorEnv === 'A' ? `✅ +${pts} para vos` : `❌ +${pts} para rival`)
      logB.push(ganadorEnv === 'B' ? `✅ +${pts} para vos` : `❌ +${pts} para rival`)
      if (p.ptsA >= p.limite) { p.ganador = 'A'; return { ok: true, logA, logB, terminoRonda: true, terminoPartida: true } }
      if (p.ptsB >= p.limite) { p.ganador = 'B'; return { ok: true, logA, logB, terminoRonda: true, terminoPartida: true } }
      return { ok: true, logA, logB, terminoRonda: false }
    }

    case 'no_quiero_envido': {
      if (p.envidoPendientePara !== yo) return { ok: false, error: 'No hay envido pendiente para vos' }
      if (rival === 'A') p.ptsA += 1; else p.ptsB += 1
      p.envidoResuelto = true
      p.envidoPendientePara = null
      logA.push(esA ? `❌ No quisiste el envido — +1 para ${nRivA}` : `✅ ${nRivA} no quiso — +1 para vos`)
      logB.push(esA ? `✅ ${nRivB} no quiso — +1 para vos` : `❌ No quisiste el envido — +1 para ${nRivB}`)
      if (p.ptsA >= p.limite) { p.ganador = 'A'; return { ok: true, logA, logB, terminoRonda: true, terminoPartida: true } }
      if (p.ptsB >= p.limite) { p.ganador = 'B'; return { ok: true, logA, logB, terminoRonda: true, terminoPartida: true } }
      return { ok: true, logA, logB, terminoRonda: false }
    }

    case 'flor':
    case 'conFlor':
    case 'contraFlor': {
      if (!p.florActiva) return { ok: false, error: 'No hay flor activa' }
      if (p.florResuelta) return { ok: false, error: 'La flor ya fue resuelta' }
      if (p.florPendientePara != null) return { ok: false, error: 'Hay una flor pendiente de respuesta' }
      if (tipo === 'contraFlor' && p.florCantadaPor == null) return { ok: false, error: 'Debés cantar Flor primero' }
      p.nivelFlor = tipo
      p.florEnJuego = true
      p.florCantadaPor = yo
      p.florPendientePara = rival
      const n = tipo === 'flor' ? 'La mía es Flor' : tipo === 'conFlor' ? 'Con Flor Envido' : 'Contra Flor al Resto'
      const pts = tipo === 'flor' ? 3 : tipo === 'conFlor' ? 6 : p.limite - Math.min(p.ptsA, p.ptsB)
      logA.push(esA ? `🌸 Cantaste: ${n} (vale ${pts})` : `🌸 ${nRivA} cantó: ${n} (vale ${pts})`)
      logB.push(esA ? `🌸 ${nRivB} cantó: ${n} (vale ${pts})` : `🌸 Cantaste: ${n} (vale ${pts})`)
      return { ok: true, logA, logB, terminoRonda: false }
    }

    case 'quiero_flor': {
      if (p.florPendientePara !== yo) return { ok: false, error: 'No hay flor pendiente para vos' }
      const valorA = calcularValorFlor(p.manoA, p.muestra)
      const valorB = calcularValorFlor(p.manoB, p.muestra)
      const pts = p.nivelFlor === 'flor' ? 3 : p.nivelFlor === 'conFlor' ? 6 : p.limite - Math.min(p.ptsA, p.ptsB)
      const ganadorFlor = valorA >= valorB ? 'A' : 'B'
      if (ganadorFlor === 'A') p.ptsA += pts; else p.ptsB += pts
      p.florResuelta = true; p.florActiva = false; p.florEnJuego = false
      p.florPendientePara = null; p.envidoResuelto = true
      logA.push(`⚘ Flor: vos ${valorA} vs rival ${valorB}`)
      logB.push(`⚘ Flor: vos ${valorB} vs rival ${valorA}`)
      logA.push(ganadorFlor === 'A' ? `✅ +${pts} para vos` : `❌ +${pts} para rival`)
      logB.push(ganadorFlor === 'B' ? `✅ +${pts} para vos` : `❌ +${pts} para rival`)
      if (p.ptsA >= p.limite) { p.ganador = 'A'; return { ok: true, logA, logB, terminoRonda: true, terminoPartida: true } }
      if (p.ptsB >= p.limite) { p.ganador = 'B'; return { ok: true, logA, logB, terminoRonda: true, terminoPartida: true } }
      return { ok: true, logA, logB, terminoRonda: false }
    }

    case 'no_quiero_flor': {
      if (p.florPendientePara !== yo) return { ok: false, error: 'No hay flor pendiente para vos' }
      const pts = p.nivelFlor === 'flor' ? 1 : p.nivelFlor === 'conFlor' ? 3 : 5
      if (rival === 'A') p.ptsA += pts; else p.ptsB += pts
      p.florResuelta = true; p.florActiva = false; p.florEnJuego = false
      p.florPendientePara = null; p.envidoResuelto = true
      logA.push(esA ? `❌ No quisiste la flor — +${pts} para ${nRivA}` : `✅ ${nRivA} no quiso — +${pts} para vos`)
      logB.push(esA ? `✅ ${nRivB} no quiso — +${pts} para vos` : `❌ No quisiste la flor — +${pts} para ${nRivB}`)
      if (p.ptsA >= p.limite) { p.ganador = 'A'; return { ok: true, logA, logB, terminoRonda: true, terminoPartida: true } }
      if (p.ptsB >= p.limite) { p.ganador = 'B'; return { ok: true, logA, logB, terminoRonda: true, terminoPartida: true } }
      return { ok: true, logA, logB, terminoRonda: false }
    }

    default:
      return { ok: false, error: `Acción desconocida: ${tipo}` }
  }
}

// ─── 2v2 ────────────────────────────────────────────────────────────────────

function crearPartida2v2(equipoA, equipoB, limite) {
  // equipoA: [{id, nombre}], equipoB: [{id, nombre}]
  // orden intercalado: [A1, B1, A2, B2]
  const sockets = [equipoA[0].id, equipoB[0].id, equipoA[1].id, equipoB[1].id]
  const nombres = {}
  const equipoDe = {}
  for (const j of equipoA) { nombres[j.id] = j.nombre; equipoDe[j.id] = 'A' }
  for (const j of equipoB) { nombres[j.id] = j.nombre; equipoDe[j.id] = 'B' }

  const p = {
    modalidad: '2v2',
    sockets,
    nombres,
    equipoDe,
    equipoA: equipoA.map(j => j.id),
    equipoB: equipoB.map(j => j.id),
    limite,
    ptsA: 0,
    ptsB: 0,
    manoIdx: 0,
    turnoSocket: sockets[0],
    muestra: null,
    manos: {},
    cartasJugadas: {},
    flors: {},
    trickStart: sockets[0],
    jugadasMano: [],
    resultadosManos: [],
    manoActual: 0,
    primeraJugada: false,
    ganador: null,
    mostrarCartasRival: false,
    rondaTerminada: false,
    trucoCantado: null,
    cantanteOriginalTruco: null,
    cantanteEquipoTruco: null,
    ultimoEnCantar: null,
    trucoResuelto: false,
    trucoPendientePara: null,
    envidoResuelto: false,
    nivelEnvido: null,
    envidoAcumulado: 0,
    envidoPendientePara: null,
    florActiva: false,
    florResuelta: true,
    florEnJuego: false,
    florCantadaPor: null,
    nivelFlor: null,
    florPendientePara: null,
  }
  repartirNuevaRonda2v2(p)
  return p
}

function repartirNuevaRonda2v2(p) {
  const mazo = crearMazo()
  p.muestra = mazo[0]
  p.manos = {}
  p.cartasJugadas = {}
  p.flors = {}
  let idx = 1
  for (const sid of p.sockets) {
    p.manos[sid] = mazo.slice(idx, idx + 3)
    p.cartasJugadas[sid] = []
    p.flors[sid] = detectarFlor(p.manos[sid], p.muestra)
    idx += 3
  }
  p.trickStart = p.sockets[p.manoIdx]
  p.turnoSocket = p.trickStart
  p.jugadasMano = []
  p.resultadosManos = []
  p.manoActual = 0
  p.primeraJugada = false
  p.ganador = null
  p.mostrarCartasRival = false
  p.rondaTerminada = false
  p.trucoCantado = null
  p.cantanteOriginalTruco = null
  p.cantanteEquipoTruco = null
  p.ultimoEnCantar = null
  p.trucoResuelto = false
  p.trucoPendientePara = null
  p.envidoResuelto = false
  p.nivelEnvido = null
  p.envidoAcumulado = 0
  p.envidoPendientePara = null

  const equipoATieneFlor = p.equipoA.some(sid => p.flors[sid])
  const equipoBTieneFlor = p.equipoB.some(sid => p.flors[sid])
  p.florActiva = equipoATieneFlor && equipoBTieneFlor
  p.florResuelta = !equipoATieneFlor && !equipoBTieneFlor
  p.florEnJuego = false
  p.florCantadaPor = null
  p.nivelFlor = null
  p.florPendientePara = null
}

function procesarFlorInicial2v2(p) {
  const logs = {}
  for (const sid of p.sockets) logs[sid] = []

  const addAll = (msg) => { for (const sid of p.sockets) logs[sid].push(msg) }
  addAll('─── Nueva ronda ───')
  addAll(`Muestra: ${p.muestra.numero} de ${p.muestra.palo}`)

  const equipoATieneFlor = p.equipoA.some(sid => p.flors[sid])
  const equipoBTieneFlor = p.equipoB.some(sid => p.flors[sid])

  if (equipoATieneFlor && equipoBTieneFlor) {
    addAll('Ambos equipos tienen Flor!')
  } else if (equipoATieneFlor && !equipoBTieneFlor) {
    p.ptsA += 3
    p.florResuelta = true
    p.envidoResuelto = true
    for (const sid of p.equipoA) logs[sid].push('Flor automatica — +3')
    for (const sid of p.equipoB) logs[sid].push('Equipo rival tiene Flor — +3 para ellos')
    if (p.ptsA >= p.limite) p.ganador = 'A'
  } else if (!equipoATieneFlor && equipoBTieneFlor) {
    p.ptsB += 3
    p.florResuelta = true
    p.envidoResuelto = true
    for (const sid of p.equipoB) logs[sid].push('Flor automatica — +3')
    for (const sid of p.equipoA) logs[sid].push('Equipo rival tiene Flor — +3 para ellos')
    if (p.ptsB >= p.limite) p.ganador = 'B'
  }

  return logs
}

function getTrickOrder(p) {
  const start = p.sockets.indexOf(p.trickStart)
  return [0, 1, 2, 3].map(i => p.sockets[(start + i) % 4])
}

function ganadorTrick2v2(jugadas, muestra) {
  // jugadas: [{socketId, carta}]
  let mejorJer = -1
  let ganadorSocket = null
  let empate = false
  for (const { socketId, carta } of jugadas) {
    const jer = jerarquia(carta, muestra)
    if (jer > mejorJer) { mejorJer = jer; ganadorSocket = socketId; empate = false }
    else if (jer === mejorJer) { empate = true }
  }
  return { ganadorSocket, empate, mejorJer }
}

function _terminarRonda2v2(p, ganRonda, logs) {
  const addAll = (msg) => { for (const sid of p.sockets) logs[sid].push(msg) }

  if (!p.trucoResuelto) {
    const val = { truco: 2, retruco: 3, vale4: 4 }[p.trucoCantado] || 1
    let ganadorPts = ganRonda
    if (ganRonda === 'empate') ganadorPts = p.equipoDe[p.sockets[p.manoIdx]]
    if (ganadorPts === 'A') {
      p.ptsA += val
      for (const sid of p.equipoA) logs[sid].push(`Ganaron la ronda +${val}`)
      for (const sid of p.equipoB) logs[sid].push(`Perdieron la ronda -${val}`)
    } else {
      p.ptsB += val
      for (const sid of p.equipoB) logs[sid].push(`Ganaron la ronda +${val}`)
      for (const sid of p.equipoA) logs[sid].push(`Perdieron la ronda -${val}`)
    }
  }

  if (p.sockets.some(sid => p.flors[sid])) p.mostrarCartasRival = true
  p.rondaTerminada = true

  if (p.ptsA >= p.limite) { p.ganador = 'A'; return true }
  if (p.ptsB >= p.limite) { p.ganador = 'B'; return true }
  return false
}

function procesarAccion2v2(p, socketId, tipo, datos) {
  const logs = {}
  for (const sid of p.sockets) logs[sid] = []

  const addAll = (msg) => { for (const sid of p.sockets) logs[sid].push(msg) }
  const addTeam = (equipo, msg) => {
    const team = equipo === 'A' ? p.equipoA : p.equipoB
    for (const sid of team) logs[sid].push(msg)
  }
  const addRival = (equipo, msg) => addTeam(equipo === 'A' ? 'B' : 'A', msg)

  const miEquipo = p.equipoDe[socketId]
  const rivalEquipo = miEquipo === 'A' ? 'B' : 'A'
  const miNombre = p.nombres[socketId]

  switch (tipo) {
    case 'carta': {
      if (p.turnoSocket !== socketId) return { ok: false, error: 'No es tu turno' }
      if (p.trucoPendientePara === miEquipo || p.envidoPendientePara === miEquipo || p.florPendientePara === miEquipo)
        return { ok: false, error: 'Tenés algo pendiente de responder' }
      if (p.florActiva && !p.florResuelta)
        return { ok: false, error: 'Deben resolver la Flor primero' }

      const miMano = p.manos[socketId]
      const carta = datos.carta
      const idx = miMano.findIndex(c => c.id === carta.id)
      if (idx === -1) return { ok: false, error: 'Carta no válida' }

      p.manos[socketId] = miMano.filter((_, i) => i !== idx)
      p.cartasJugadas[socketId].push(carta)
      if (!p.primeraJugada) p.primeraJugada = true

      p.jugadasMano.push({ socketId, carta })
      const desc = `${carta.numero} de ${carta.palo}`
      for (const sid of p.sockets) {
        logs[sid].push(sid === socketId ? `Jugaste ${desc}` : `${miNombre} jugo ${desc}`)
      }

      const trickOrder = getTrickOrder(p)
      const currentIdx = trickOrder.indexOf(socketId)
      const nextInTrick = trickOrder[currentIdx + 1]

      if (p.jugadasMano.length < 4) {
        p.turnoSocket = nextInTrick
        return { ok: true, logs, terminoRonda: false, terminoPartida: false }
      }

      // 4 cartas jugadas: evaluar trick
      const { ganadorSocket, empate } = ganadorTrick2v2(p.jugadasMano, p.muestra)
      const equipoGanadorTrick = empate ? null : p.equipoDe[ganadorSocket]

      let nuevoTrickStart
      if (empate) {
        nuevoTrickStart = p.sockets[p.manoIdx]
        addAll('Empate en la mano')
      } else {
        nuevoTrickStart = ganadorSocket
        addTeam(equipoGanadorTrick, 'Ganaron la mano')
        addRival(equipoGanadorTrick, 'Perdieron la mano')
      }

      const resultEquipo = empate ? 'empate' : equipoGanadorTrick
      p.resultadosManos.push(resultEquipo)
      p.jugadasMano = []
      p.trickStart = nuevoTrickStart
      p.turnoSocket = nuevoTrickStart
      p.manoActual++

      const ganRonda = ganadorRonda(p.resultadosManos, p.equipoDe[p.sockets[p.manoIdx]])
      if (ganRonda || p.resultadosManos.length === 3) {
        const terminoPartida = _terminarRonda2v2(p, ganRonda || 'empate', logs)
        return { ok: true, logs, terminoRonda: true, terminoPartida }
      }

      return { ok: true, logs, terminoRonda: false, terminoPartida: false }
    }

    case 'truco':
    case 'retruco':
    case 'vale4': {
      if (p.trucoResuelto) return { ok: false, error: 'El truco ya fue resuelto' }
      if (!p.florResuelta) return { ok: false, error: 'Resolve la Flor primero' }
      if (p.trucoPendientePara != null) return { ok: false, error: 'Hay un truco pendiente de respuesta' }
      if (tipo === 'truco' && p.trucoCantado) return { ok: false, error: 'El truco ya fue cantado' }
      if (tipo === 'retruco') {
        if (p.trucoCantado !== 'truco') return { ok: false, error: 'No se puede cantar Retruco ahora' }
        if (p.cantanteEquipoTruco === miEquipo) return { ok: false, error: 'No podes subir tu propio Truco' }
      }
      if (tipo === 'vale4') {
        if (p.trucoCantado !== 'retruco') return { ok: false, error: 'No se puede cantar Vale 4 ahora' }
        if (p.cantanteEquipoTruco !== miEquipo) return { ok: false, error: 'Solo el equipo que canto Truco puede subir a Vale 4' }
      }
      if (tipo === 'truco') { p.cantanteOriginalTruco = socketId; p.cantanteEquipoTruco = miEquipo }
      p.trucoCantado = tipo
      p.ultimoEnCantar = socketId
      p.trucoPendientePara = rivalEquipo
      const n = tipo === 'truco' ? 'Truco' : tipo === 'retruco' ? 'Retruco' : 'Vale Cuatro'
      addTeam(miEquipo, `Canto: ${n}`)
      addTeam(rivalEquipo, `${miNombre} canto ${n}`)
      return { ok: true, logs, terminoRonda: false, terminoPartida: false }
    }

    case 'quiero_truco': {
      if (p.trucoPendientePara !== miEquipo) return { ok: false, error: 'No hay truco pendiente para tu equipo' }
      p.trucoPendientePara = null
      p.ultimoEnCantar = socketId
      const n = p.trucoCantado === 'truco' ? 'Truco' : p.trucoCantado === 'retruco' ? 'Retruco' : 'Vale Cuatro'
      addTeam(miEquipo, `Aceptaron el ${n}`)
      addTeam(rivalEquipo, `Rival acepto el ${n}`)
      return { ok: true, logs, terminoRonda: false, terminoPartida: false }
    }

    case 'no_quiero_truco': {
      if (p.trucoPendientePara !== miEquipo) return { ok: false, error: 'No hay truco pendiente para tu equipo' }
      const pts = { truco: 1, retruco: 2, vale4: 3 }[p.trucoCantado] || 1
      if (rivalEquipo === 'A') p.ptsA += pts; else p.ptsB += pts
      p.trucoResuelto = true
      p.trucoPendientePara = null
      addTeam(miEquipo, `No quisieron — +${pts} para el equipo rival`)
      addTeam(rivalEquipo, `Rival no quiso — +${pts} para ustedes`)
      const terminoPartida = _terminarRonda2v2(p, rivalEquipo, logs)
      return { ok: true, logs, terminoRonda: true, terminoPartida }
    }

    case 'envido':
    case 'real':
    case 'falta': {
      const esSubida = p.envidoPendientePara === miEquipo
      if (!esSubida) {
        if (p.envidoResuelto) return { ok: false, error: 'El envido ya fue resuelto' }
        if (p.envidoPendientePara != null) return { ok: false, error: 'Hay un envido pendiente de respuesta' }
        if (!p.florResuelta) return { ok: false, error: 'Resolve la Flor primero' }
        if (p.primeraJugada) return { ok: false, error: 'No se puede cantar envido despues de jugar una carta' }
        if (p.manoActual !== 0) return { ok: false, error: 'Solo se puede cantar envido en la primera mano' }
        if (p.sockets.some(sid => p.flors[sid])) return { ok: false, error: 'No se puede cantar envido con flor en juego' }
      }
      const pts = tipo === 'falta'
        ? p.limite - Math.min(p.ptsA, p.ptsB)
        : tipo === 'real' ? p.envidoAcumulado + 3 : p.envidoAcumulado + 2
      p.nivelEnvido = tipo
      p.envidoAcumulado = pts
      p.envidoPendientePara = rivalEquipo
      const n = tipo === 'real' ? 'Real Envido' : tipo === 'falta' ? 'Falta Envido' : 'Envido'
      addTeam(miEquipo, `Canto: ${n} (vale ${pts})`)
      addTeam(rivalEquipo, `${miNombre} canto ${n} (vale ${pts})`)
      return { ok: true, logs, terminoRonda: false, terminoPartida: false }
    }

    case 'quiero_envido': {
      if (p.envidoPendientePara !== miEquipo) return { ok: false, error: 'No hay envido pendiente para tu equipo' }
      const tantoA = Math.max(...p.equipoA.map(sid => calcularEnvido(p.manos[sid], p.muestra)))
      const tantoB = Math.max(...p.equipoB.map(sid => calcularEnvido(p.manos[sid], p.muestra)))
      const pts = p.envidoAcumulado
      const ganadorEnv = tantoA >= tantoB ? 'A' : 'B'
      if (ganadorEnv === 'A') p.ptsA += pts; else p.ptsB += pts
      p.envidoResuelto = true
      p.envidoPendientePara = null
      for (const sid of p.equipoA) logs[sid].push(`Envido — equipo A: ${tantoA} vs equipo B: ${tantoB}`)
      for (const sid of p.equipoB) logs[sid].push(`Envido — equipo B: ${tantoB} vs equipo A: ${tantoA}`)
      addTeam(ganadorEnv, `+${pts} para ustedes`)
      addTeam(ganadorEnv === 'A' ? 'B' : 'A', `+${pts} para el equipo rival`)
      if (p.ptsA >= p.limite) { p.ganador = 'A'; return { ok: true, logs, terminoRonda: true, terminoPartida: true } }
      if (p.ptsB >= p.limite) { p.ganador = 'B'; return { ok: true, logs, terminoRonda: true, terminoPartida: true } }
      return { ok: true, logs, terminoRonda: false, terminoPartida: false }
    }

    case 'no_quiero_envido': {
      if (p.envidoPendientePara !== miEquipo) return { ok: false, error: 'No hay envido pendiente para tu equipo' }
      if (rivalEquipo === 'A') p.ptsA += 1; else p.ptsB += 1
      p.envidoResuelto = true
      p.envidoPendientePara = null
      addTeam(miEquipo, `No quisieron el envido — +1 para el equipo rival`)
      addTeam(rivalEquipo, `Rival no quiso — +1 para ustedes`)
      if (p.ptsA >= p.limite) { p.ganador = 'A'; return { ok: true, logs, terminoRonda: true, terminoPartida: true } }
      if (p.ptsB >= p.limite) { p.ganador = 'B'; return { ok: true, logs, terminoRonda: true, terminoPartida: true } }
      return { ok: true, logs, terminoRonda: false, terminoPartida: false }
    }

    case 'flor':
    case 'conFlor':
    case 'contraFlor': {
      if (!p.florActiva) return { ok: false, error: 'No hay flor activa' }
      if (p.florResuelta) return { ok: false, error: 'La flor ya fue resuelta' }
      if (p.florPendientePara != null) return { ok: false, error: 'Hay una flor pendiente de respuesta' }
      if (tipo === 'contraFlor' && p.florCantadaPor == null) return { ok: false, error: 'Debes cantar Flor primero' }
      p.nivelFlor = tipo
      p.florEnJuego = true
      p.florCantadaPor = miEquipo
      p.florPendientePara = rivalEquipo
      const n = tipo === 'flor' ? 'La mia es Flor' : tipo === 'conFlor' ? 'Con Flor Envido' : 'Contra Flor al Resto'
      const pts = tipo === 'flor' ? 3 : tipo === 'conFlor' ? 6 : p.limite - Math.min(p.ptsA, p.ptsB)
      addTeam(miEquipo, `Canto: ${n} (vale ${pts})`)
      addTeam(rivalEquipo, `${miNombre} canto: ${n} (vale ${pts})`)
      return { ok: true, logs, terminoRonda: false, terminoPartida: false }
    }

    case 'quiero_flor': {
      if (p.florPendientePara !== miEquipo) return { ok: false, error: 'No hay flor pendiente para tu equipo' }
      const valorA = Math.max(...p.equipoA.map(sid => calcularValorFlor(p.manos[sid], p.muestra)))
      const valorB = Math.max(...p.equipoB.map(sid => calcularValorFlor(p.manos[sid], p.muestra)))
      const pts = p.nivelFlor === 'flor' ? 3 : p.nivelFlor === 'conFlor' ? 6 : p.limite - Math.min(p.ptsA, p.ptsB)
      const ganadorFlor = valorA >= valorB ? 'A' : 'B'
      if (ganadorFlor === 'A') p.ptsA += pts; else p.ptsB += pts
      p.florResuelta = true; p.florActiva = false; p.florEnJuego = false
      p.florPendientePara = null; p.envidoResuelto = true
      for (const sid of p.equipoA) logs[sid].push(`Flor: equipo A ${valorA} vs equipo B ${valorB}`)
      for (const sid of p.equipoB) logs[sid].push(`Flor: equipo B ${valorB} vs equipo A ${valorA}`)
      addTeam(ganadorFlor, `+${pts} para ustedes`)
      addTeam(ganadorFlor === 'A' ? 'B' : 'A', `+${pts} para el equipo rival`)
      if (p.ptsA >= p.limite) { p.ganador = 'A'; return { ok: true, logs, terminoRonda: true, terminoPartida: true } }
      if (p.ptsB >= p.limite) { p.ganador = 'B'; return { ok: true, logs, terminoRonda: true, terminoPartida: true } }
      return { ok: true, logs, terminoRonda: false, terminoPartida: false }
    }

    case 'no_quiero_flor': {
      if (p.florPendientePara !== miEquipo) return { ok: false, error: 'No hay flor pendiente para tu equipo' }
      const pts = p.nivelFlor === 'flor' ? 1 : p.nivelFlor === 'conFlor' ? 3 : 5
      if (rivalEquipo === 'A') p.ptsA += pts; else p.ptsB += pts
      p.florResuelta = true; p.florActiva = false; p.florEnJuego = false
      p.florPendientePara = null; p.envidoResuelto = true
      addTeam(miEquipo, `No quisieron la flor — +${pts} para el equipo rival`)
      addTeam(rivalEquipo, `Rival no quiso — +${pts} para ustedes`)
      if (p.ptsA >= p.limite) { p.ganador = 'A'; return { ok: true, logs, terminoRonda: true, terminoPartida: true } }
      if (p.ptsB >= p.limite) { p.ganador = 'B'; return { ok: true, logs, terminoRonda: true, terminoPartida: true } }
      return { ok: true, logs, terminoRonda: false, terminoPartida: false }
    }

    default:
      return { ok: false, error: `Accion desconocida: ${tipo}` }
  }
}

function getEstadoParaSocket2v2(p, socketId) {
  const miEquipo = p.equipoDe[socketId]
  const rivalEquipoId = miEquipo === 'A' ? 'B' : 'A'
  const partnerSid = (miEquipo === 'A' ? p.equipoA : p.equipoB).find(sid => sid !== socketId)
  const rivalSids = miEquipo === 'A' ? p.equipoB : p.equipoA

  const resultados = p.resultadosManos.map(r =>
    r === 'empate' ? 'empate' : r === miEquipo ? 'jugador' : 'maquina'
  )

  let turno
  if (p.turnoSocket === socketId) turno = 'yo'
  else if (p.turnoSocket === partnerSid) turno = 'partner'
  else turno = 'rival'

  const esperandoRespuesta =
    (p.trucoPendientePara === rivalEquipoId) ||
    (p.envidoPendientePara === rivalEquipoId) ||
    (p.florPendientePara === rivalEquipoId)

  const equipoATieneFlor = p.equipoA.some(sid => p.flors[sid])
  const equipoBTieneFlor = p.equipoB.some(sid => p.flors[sid])
  const miEquipoTieneFlor = miEquipo === 'A' ? equipoATieneFlor : equipoBTieneFlor
  const rivalEquipoTieneFlor = miEquipo === 'A' ? equipoBTieneFlor : equipoATieneFlor
  const partnerTieneFlor = p.flors[partnerSid] || false

  const cantanteOriginalRel = p.cantanteEquipoTruco == null
    ? null
    : p.cantanteEquipoTruco === miEquipo ? 'yo_equipo' : 'rival_equipo'

  const florCantadaPorRel = p.florCantadaPor == null
    ? null
    : p.florCantadaPor === miEquipo ? 'yo_equipo' : 'rival_equipo'

  const partnerCartasJugadas = p.cartasJugadas[partnerSid] || []
  const partnerManoRestante = (p.manos[partnerSid] || []).length
  const partnerManoFaceDown = (p.manos[partnerSid] || []).map(() => ({ faceDown: true }))

  const rivals = rivalSids.map(sid => ({
    socket: sid,
    nombre: p.nombres[sid],
    manoRestante: (p.manos[sid] || []).length,
    cartasJugadas: p.cartasJugadas[sid] || [],
    tieneFlorPiece: p.flors[sid] || false,
    manoRevelada: p.mostrarCartasRival ? (p.manos[sid] || []) : null,
  }))

  const ganadorRel = p.ganador == null ? null : p.ganador === miEquipo ? 'yo' : 'rival'

  return {
    modalidad: '2v2',
    miMano: p.manos[socketId] || [],
    miCartasJugadas: p.cartasJugadas[socketId] || [],
    muestra: p.muestra,
    resultados,
    manoActual: p.manoActual,
    turno,
    turnoNombre: p.nombres[p.turnoSocket] || '',
    esMano: p.sockets[p.manoIdx] === socketId,
    ptsYo: miEquipo === 'A' ? p.ptsA : p.ptsB,
    ptsRival: miEquipo === 'A' ? p.ptsB : p.ptsA,
    limite: p.limite,
    partner: {
      socket: partnerSid,
      nombre: p.nombres[partnerSid] || '',
      manoRestante: partnerManoRestante,
      cartasJugadas: partnerCartasJugadas,
      tieneFlorPiece: partnerTieneFlor,
      mano: p.mostrarCartasRival ? (p.manos[partnerSid] || []) : partnerManoFaceDown,
    },
    rivals,
    jugadasMano: p.jugadasMano,
    trucoCantado: p.trucoCantado,
    cantanteOriginalTruco: cantanteOriginalRel,
    trucoResuelto: p.trucoResuelto,
    trucoPendiente: p.trucoPendientePara === miEquipo,
    esperandoRespuesta,
    envidoResuelto: p.envidoResuelto,
    envidoPendiente: p.envidoPendientePara === miEquipo,
    nivelEnvido: p.nivelEnvido,
    envidoAcumulado: p.envidoAcumulado,
    tengoFlor: p.flors[socketId] || false,
    partnerTieneFlor,
    equipoTieneFlor: miEquipoTieneFlor,
    rivalEquipoTieneFlor,
    florResuelta: p.florResuelta,
    florActiva: p.florActiva,
    florEnJuego: p.florEnJuego,
    florPendiente: p.florPendientePara === miEquipo,
    florCantadaPor: florCantadaPorRel,
    nivelFlor: p.nivelFlor,
    primeraJugada: p.primeraJugada,
    ganador: ganadorRel,
    rondaTerminada: p.rondaTerminada,
    mostrarCartasRival: p.mostrarCartasRival,
  }
}

module.exports = {
  crearPartida,
  repartirNuevaRonda,
  procesarFlorInicial,
  procesarAccion,
  getEstadoParaSocket,
  crearPartida2v2,
  repartirNuevaRonda2v2,
  procesarFlorInicial2v2,
  procesarAccion2v2,
  getEstadoParaSocket2v2,
}
