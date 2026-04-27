import { PALOS, NUMEROS, MUESTRAS_ESPECIALES, VALOR_MUESTRA_ENV } from './constantes'

export function crearMazo() {
  return PALOS.flatMap(palo =>
    NUMEROS.map(numero => ({ numero, palo, id: `${numero}-${palo}` }))
  ).sort(() => Math.random() - 0.5)
}

export function crearMazoConSeed(seed) {
    const mazo = PALOS.flatMap(palo =>
      NUMEROS.map(numero => ({ numero, palo, id: `${numero}-${palo}` }))
    )
    let s = seed
    const rand = () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff
      return (s >>> 0) / 0xffffffff
    }
    for (let i = mazo.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[mazo[i], mazo[j]] = [mazo[j], mazo[i]]
    }
    return mazo
  }

export function esMuestraCarta(carta, muestra) {
  if (carta.palo !== muestra.palo) return false
  if (MUESTRAS_ESPECIALES.includes(carta.numero)) return true
  if (carta.numero === 12 && MUESTRAS_ESPECIALES.includes(muestra.numero)) return true
  return false
}

function valorMuestra(n) {
  return { 2: 19, 4: 18, 5: 17, 11: 16, 10: 15 }[n] || 0
}

export function jerarquia(carta, muestra) {
  const mismoPalo = carta.palo === muestra.palo

  // 12 del palo de la muestra toma valor de la muestra (solo si muestra es especial)
  if (carta.numero === 12 && mismoPalo && MUESTRAS_ESPECIALES.includes(muestra.numero)) {
    return valorMuestra(muestra.numero)
  }

  // Cartas buenas: 2,4,5,11,10 del palo de la muestra (siempre, sin importar qué número sea la muestra)
  if (mismoPalo && MUESTRAS_ESPECIALES.includes(carta.numero)) {
    return valorMuestra(carta.numero)
  }

  // Matas fijas
  if (carta.numero === 1 && carta.palo === 'espadas') return 14
  if (carta.numero === 1 && carta.palo === 'bastos') return 13
  if (carta.numero === 7 && carta.palo === 'espadas') return 12
  if (carta.numero === 7 && carta.palo === 'oros') return 11

  // Resto
  return { 3: 10, 2: 9, 1: 8, 12: 7, 11: 6, 10: 5, 7: 4, 6: 3, 5: 2, 4: 1 }[carta.numero] || 0
}

export function calcularEnvido(cartas, muestra) {
  const conVal = cartas.map(c => {
    const esBuena = c.palo === muestra.palo && MUESTRAS_ESPECIALES.includes(c.numero)
    // El 12 del palo de la muestra toma valor de pieza si la muestra es especial
    const es12Pieza = c.numero === 12 && c.palo === muestra.palo && MUESTRAS_ESPECIALES.includes(muestra.numero)

    let val
    if (esBuena) {
      val = VALOR_MUESTRA_ENV[c.numero]
    } else if (es12Pieza) {
      val = VALOR_MUESTRA_ENV[muestra.numero] // toma el valor de la muestra
    } else {
      val = [1,2,3,4,5,6,7].includes(c.numero) ? c.numero : 0
    }

    return {
      c,
      val,
      esMuestra: esBuena || es12Pieza
    }
  })

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

export function calcularFlor(cartas, muestra) {
    const valores = cartas.map(c => {
      const esPieza = esMuestraCarta(c, muestra)
      const numeroReal =
        c.numero === 12 && c.palo === muestra.palo && MUESTRAS_ESPECIALES.includes(muestra.numero)
          ? muestra.numero
          : c.numero
  
      const valorNumero = [1, 2, 3, 4, 5, 6, 7].includes(c.numero) ? c.numero : 0
      const valorPieza = esPieza ? VALOR_MUESTRA_ENV[numeroReal] : 0
  
      return {
        ...c,
        esPieza,
        valorNumero,
        valorPieza
      }
    })
  
    const piezas = valores.filter(c => c.esPieza)
  
    // Caso: 2 o 3 piezas
    if (piezas.length >= 2) {
      const ordenadas = [...piezas].sort((a, b) => b.valorPieza - a.valorPieza)
      const mayor = ordenadas[0].valorPieza
      const resto = ordenadas.slice(1).reduce((acc, c) => acc + (c.valorPieza % 10), 0)
      const noPiezas = valores.filter(c => !c.esPieza)
      const extra = piezas.length === 2 ? (noPiezas[0]?.valorNumero || 0) : 0
      return mayor + resto + extra
    }
  
    // Caso: 1 pieza + 2 del mismo palo
    if (piezas.length === 1) {
      const noPiezas = valores.filter(c => !c.esPieza)
      if (noPiezas.length === 2 && noPiezas[0].palo === noPiezas[1].palo) {
        return piezas[0].valorPieza + noPiezas[0].valorNumero + noPiezas[1].valorNumero
      }
    }
  
    // Caso: 3 cartas del mismo palo
    const porPalo = {}
    for (const c of valores) {
      if (!porPalo[c.palo]) porPalo[c.palo] = []
      porPalo[c.palo].push(c.valorNumero)
    }
  
    for (const vals of Object.values(porPalo)) {
      if (vals.length === 3) {
        return 20 + vals[0] + vals[1] + vals[2]
      }
    }
  
    return 0
  }

export function detectarFlor(cartas, muestra) {
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

export function ganadorMano(cA, cB, muestra) {
  const va = jerarquia(cA, muestra), vb = jerarquia(cB, muestra)
  if (va > vb) return 'jugador'
  if (vb > va) return 'maquina'
  return 'empate'
}

export function ganadorRonda(rs, mano = 'jugador') {
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

export function calcularValorFlor(cartas, muestra) {
  let valor = 20  // Base
  
  cartas.forEach(c => {
    if (esPiezaFlor(c, muestra)) {
      // Piezas: 2=10, 4=9, 5=8, 11=7, 10=7
      const valores = { 2: 10, 4: 9, 5: 8, 11: 7, 10: 7 }
      valor += valores[c.numero] || 0
    } else if ([1,2,3,4,5,6,7].includes(c.numero)) {
      valor += c.numero
    }
    // Figuras (10,11,12) no suman
  })
  
  return valor
}

export function esPiezaFlor(carta, muestra) {
  return carta.palo === muestra.palo && [2,4,5,11,10].includes(carta.numero)
}