import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { useNavigationGuard } from '../context/NavigationGuardContext'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore'

const PUNTUACION_BASE  = { facil: 500, medio: 1000, dificil: 2000, experto: 4000, maestro: 7000, extremo: 10000 }
const TIEMPO_MAX       = { facil: 600, medio: 900,  dificil: 1200, experto: 1800, maestro: 2700, extremo: 3600  }

function calcularPuntuacion(dificultad, segundos, errores) {
  const base        = PUNTUACION_BASE[dificultad] || 1000
  const tmax        = TIEMPO_MAX[dificultad]      || 1800
  const tiempoFactor = Math.max(0, 1 - segundos / tmax)
  const errorFactor  = Math.max(0, 1 - errores * 0.15)
  return Math.round(base * tiempoFactor * errorFactor)
}

const DIFICULTADES = {
  facil:   { label: 'Fácil',   desc: 'Ideal para principiantes',  rango: [35, 40], color: 'text-green-400',  border: 'hover:border-green-500/40'  },
  medio:   { label: 'Medio',   desc: 'Un poco más de desafío',    rango: [41, 46], color: 'text-blue-400',   border: 'hover:border-blue-500/40'   },
  dificil: { label: 'Difícil', desc: 'Para mentes entrenadas',    rango: [47, 51], color: 'text-yellow-400', border: 'hover:border-yellow-500/40' },
  experto: { label: 'Experto', desc: 'Solo para valientes',       rango: [52, 55], color: 'text-orange-400', border: 'hover:border-orange-500/40' },
  maestro: { label: 'Maestro', desc: 'Casi imposible',            rango: [56, 58], color: 'text-red-400',    border: 'hover:border-red-500/40'    },
  extremo: { label: 'Extremo', desc: '¿Estás seguro?',            rango: [59, 63], color: 'text-purple-400', border: 'hover:border-purple-500/40' },
}

function crearSudokuVacio() {
  return Array(9).fill(null).map(() => Array(9).fill(0))
}

function copiarTablero(tablero) {
  return tablero.map(fila => [...fila])
}

function esValido(tablero, fila, col, num) {
  for (let c = 0; c < 9; c++) {
    if (tablero[fila][c] === num) return false
  }
  
  for (let f = 0; f < 9; f++) {
    if (tablero[f][col] === num) return false
  }
  
  const inicioFila = Math.floor(fila / 3) * 3
  const inicioCol = Math.floor(col / 3) * 3
  for (let f = inicioFila; f < inicioFila + 3; f++) {
    for (let c = inicioCol; c < inicioCol + 3; c++) {
      if (tablero[f][c] === num) return false
    }
  }
  
  return true
}

function resolverSudoku(tablero) {
  const nuevoTablero = copiarTablero(tablero)
  
  function backtrack() {
    for (let fila = 0; fila < 9; fila++) {
      for (let col = 0; col < 9; col++) {
        if (nuevoTablero[fila][col] === 0) {
          const numeros = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5)
          for (const num of numeros) {
            if (esValido(nuevoTablero, fila, col, num)) {
              nuevoTablero[fila][col] = num
              if (backtrack()) return true
              nuevoTablero[fila][col] = 0
            }
          }
          return false
        }
      }
    }
    return true
  }
  
  return backtrack() ? nuevoTablero : null
}

function generarSudokuCompleto() {
  const tablero = crearSudokuVacio()
  
  for (let bloque = 0; bloque < 9; bloque += 3) {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        tablero[bloque + i][bloque + j] = nums[i * 3 + j]
      }
    }
  }
  
  return resolverSudoku(tablero)
}

function contarSoluciones(tablero, limite = 2) {
  let soluciones = 0
  
  function backtrack() {
    if (soluciones >= limite) return
    
    for (let fila = 0; fila < 9; fila++) {
      for (let col = 0; col < 9; col++) {
        if (tablero[fila][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (esValido(tablero, fila, col, num)) {
              tablero[fila][col] = num
              backtrack()
              tablero[fila][col] = 0
            }
          }
          return
        }
      }
    }
    soluciones++
  }
  
  backtrack()
  return soluciones
}

function generarSudoku(dificultad) {
  const completo = generarSudokuCompleto()
  if (!completo) return generarSudoku(dificultad)
  
  const [minVacios, maxVacios] = DIFICULTADES[dificultad].rango
  const celdasVacias = Math.floor(Math.random() * (maxVacios - minVacios + 1)) + minVacios
  
  const tablero = copiarTablero(completo)
  const solucion = copiarTablero(completo)
  
  const posiciones = []
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      posiciones.push([i, j])
    }
  }
  
  for (let i = posiciones.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[posiciones[i], posiciones[j]] = [posiciones[j], posiciones[i]]
  }
  
  let quitadas = 0
  for (const [fila, col] of posiciones) {
    if (quitadas >= celdasVacias) break
    
    const backup = tablero[fila][col]
    tablero[fila][col] = 0
    
    const soluciones = contarSoluciones(copiarTablero(tablero), 2)
    if (soluciones !== 1) {
      tablero[fila][col] = backup
    } else {
      quitadas++
    }
  }
  
  return { tablero, solucion }
}

function obtenerSubcuadricula(fila, col) {
  return Math.floor(fila / 3) * 3 + Math.floor(col / 3)
}

const CELL_SIZE = 56

// Mapa de posición fija para cada número en las notas (como teclado telefónico)
// 1 2 3
// 4 5 6
// 7 8 9
const POSICION_NOTA = {
  1: { fila: 0, col: 0 },
  2: { fila: 0, col: 1 },
  3: { fila: 0, col: 2 },
  4: { fila: 1, col: 0 },
  5: { fila: 1, col: 1 },
  6: { fila: 1, col: 2 },
  7: { fila: 2, col: 0 },
  8: { fila: 2, col: 1 },
  9: { fila: 2, col: 2 },
}

function NotaCelda({ numero, activo, resaltado }) {
  return (
    <div className="flex items-center justify-center">
      <span className={`text-[10px] leading-none ${
        activo 
          ? resaltado 
            ? 'text-blue-400 font-bold' 
            : 'text-gray-500'
          : 'text-transparent'
      }`}>
        {numero}
      </span>
    </div>
  )
}

export default function Sudoku() {
  const { usuario } = useAuth()
  const { setGuard, clearGuard } = useNavigationGuard()
  const [pantalla, setPantalla] = useState('menu')
  const [dificultad, setDificultad] = useState(null)
  const [tablero, setTablero] = useState(null)
  const [solucion, setSolucion] = useState(null)
  const [tableroInicial, setTableroInicial] = useState(null)
  const [celdaSeleccionada, setCeldaSeleccionada] = useState(null)
  const [notas, setNotas] = useState(null)
  const [modoNotas, setModoNotas] = useState(false)
  const [tiempo, setTiempo] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [errores, setErrores] = useState(0)
  const [completado, setCompletado] = useState(false)
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [celdasRestantes, setCeldasRestantes] = useState(0)
  const [puntuacion, setPuntuacion] = useState(0)
  const [guardadoRanking, setGuardadoRanking] = useState(false)
  const [ranking, setRanking] = useState([])

  const boardRef = useRef(null)

  const MAX_ERRORES = 3

  useEffect(() => {
    if (pantalla === 'juego') setGuard('Si salís ahora perdés tu progreso en el Sudoku.')
    else clearGuard()
    return () => clearGuard()
  }, [pantalla])

  useEffect(() => {
    if (pantalla !== 'juego' || pausado || completado) return
    const timer = setInterval(() => setTiempo(t => t + 1), 1000)
    return () => clearInterval(timer)
  }, [pantalla, pausado, completado])

  useEffect(() => {
    if (pantalla === 'menu') cargarRanking()
  }, [pantalla])

  // Manejar input del teclado físico
  useEffect(() => {
    if (pantalla !== 'juego' || completado) return

    const handleKeyDown = (e) => {
      if (!celdaSeleccionada) return
      
      const { fila, col } = celdaSeleccionada
      
      // Números del 1 al 9
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        ingresarNumero(parseInt(e.key))
        return
      }
      
      // Tecla 0, Delete o Backspace para borrar
      if (e.key === '0' || e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        ingresarNumero(0)
        return
      }
      
      // Flechas para navegar
      if (e.key === 'ArrowUp' && fila > 0) {
        e.preventDefault()
        setCeldaSeleccionada({ fila: fila - 1, col })
      } else if (e.key === 'ArrowDown' && fila < 8) {
        e.preventDefault()
        setCeldaSeleccionada({ fila: fila + 1, col })
      } else if (e.key === 'ArrowLeft' && col > 0) {
        e.preventDefault()
        setCeldaSeleccionada({ fila, col: col - 1 })
      } else if (e.key === 'ArrowRight' && col < 8) {
        e.preventDefault()
        setCeldaSeleccionada({ fila, col: col + 1 })
      }
      
      // Tecla N para alternar modo notas
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setModoNotas(m => !m)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pantalla, completado, celdaSeleccionada, modoNotas, tablero, notas, errores])

  const formatearTiempo = (segundos) => {
    const mins = Math.floor(segundos / 60)
    const secs = segundos % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const contarCeldasVacias = (tab) => {
    let count = 0
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (tab[i][j] === 0) count++
      }
    }
    return count
  }

  const cargarRanking = async () => {
    try {
      const q = query(collection(db, 'ranking_sudoku'), orderBy('puntuacion', 'desc'), limit(10))
      const snap = await getDocs(q)
      setRanking(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch { /* sin conexión o sin permiso */ }
  }

  const iniciarJuego = (diff) => {
    const { tablero: nuevoTablero, solucion: nuevaSolucion } = generarSudoku(diff)
    setTablero(nuevoTablero)
    setSolucion(nuevaSolucion)
    setTableroInicial(copiarTablero(nuevoTablero))
    setNotas(Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set())))
    setCeldaSeleccionada(null)
    setModoNotas(false)
    setTiempo(0)
    setPausado(false)
    setErrores(0)
    setCompletado(false)
    setPuntuacion(0)
    setGuardadoRanking(false)
    setDificultad(diff)
    setCeldasRestantes(contarCeldasVacias(nuevoTablero))
    setPantalla('juego')
  }

  const seleccionarCelda = (fila, col) => {
    if (completado) return
    
    if (celdaSeleccionada?.fila === fila && celdaSeleccionada?.col === col) {
      setCeldaSeleccionada(null)
      return
    }
    
    setCeldaSeleccionada({ fila, col })
  }

  const ingresarNumero = async (num) => {
    if (!celdaSeleccionada || completado) return
    const { fila, col } = celdaSeleccionada
    
    if (tableroInicial[fila][col] !== 0) return

    if (modoNotas) {
      const nuevasNotas = notas.map(f => f.map(c => new Set(c)))
      if (nuevasNotas[fila][col].has(num)) {
        nuevasNotas[fila][col].delete(num)
      } else {
        if (num >= 1 && num <= 9) {
          nuevasNotas[fila][col].add(num)
        }
      }
      setNotas(nuevasNotas)
      return
    }

    if (num === 0) {
      const nuevoTablero = copiarTablero(tablero)
      nuevoTablero[fila][col] = 0
      setTablero(nuevoTablero)
      setCeldasRestantes(contarCeldasVacias(nuevoTablero))
      
      const nuevasNotas = notas.map(f => f.map(c => new Set(c)))
      nuevasNotas[fila][col] = new Set()
      setNotas(nuevasNotas)
      return
    }

    if (num !== solucion[fila][col]) {
      const nuevosErrores = errores + 1
      setErrores(nuevosErrores)
      
      const celda = document.querySelector(`[data-cell="${fila}-${col}"]`)
      if (celda) {
        celda.classList.add('animate-shake')
        setTimeout(() => celda.classList.remove('animate-shake'), 500)
      }
      
      setMensaje({ tipo: 'error', texto: '¡Incorrecto!' })
      setTimeout(() => setMensaje(null), 1000)
      
      if (nuevosErrores >= MAX_ERRORES) {
        setCompletado(true)
        setTimeout(() => setPantalla('resultado'), 600)
        return
      }
      
      setTimeout(() => {
        const nuevoTablero = copiarTablero(tablero)
        nuevoTablero[fila][col] = 0
        setTablero(nuevoTablero)
        setCeldasRestantes(contarCeldasVacias(nuevoTablero))
      }, 300)
      return
    }

    const nuevoTablero = copiarTablero(tablero)
    nuevoTablero[fila][col] = num
    setTablero(nuevoTablero)
    setCeldasRestantes(contarCeldasVacias(nuevoTablero))
    
    const nuevasNotas = notas.map(f => f.map(c => new Set(c)))
    nuevasNotas[fila][col] = new Set()
    
    for (let i = 0; i < 9; i++) {
      nuevasNotas[fila][i].delete(num)
      nuevasNotas[i][col].delete(num)
    }
    const inicioFila = Math.floor(fila / 3) * 3
    const inicioCol = Math.floor(col / 3) * 3
    for (let f = inicioFila; f < inicioFila + 3; f++) {
      for (let c = inicioCol; c < inicioCol + 3; c++) {
        nuevasNotas[f][c].delete(num)
      }
    }
    setNotas(nuevasNotas)
    
    if (contarCeldasVacias(nuevoTablero) > 0) {
      setTimeout(() => {
        for (let i = 0; i < 9; i++) {
          for (let j = 0; j < 9; j++) {
            if (nuevoTablero[i][j] === 0) {
              setCeldaSeleccionada({ fila: i, col: j })
              return
            }
          }
        }
      }, 50)
    }
    
    if (contarCeldasVacias(nuevoTablero) === 0) {
      setCompletado(true)
      setCeldaSeleccionada(null)
      const pts = calcularPuntuacion(dificultad, tiempo, errores)
      setPuntuacion(pts)
      if (usuario && pts > 0) {
        try {
          await addDoc(collection(db, 'ranking_sudoku'), {
            uid: usuario.uid,
            nombre: usuario.displayName || usuario.email?.split('@')[0] || 'Jugador',
            dificultad,
            tiempo,
            errores,
            puntuacion: pts,
            fecha: serverTimestamp(),
          })
          setGuardadoRanking(true)
        } catch { /* sin permisos */ }
      }
      setTimeout(() => setPantalla('resultado'), 600)
    }
  }

  const reiniciarJuego = () => {
    setTablero(copiarTablero(tableroInicial))
    setNotas(Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set())))
    setCeldaSeleccionada(null)
    setTiempo(0)
    setErrores(0)
    setCompletado(false)
    setMensaje(null)
    setCeldasRestantes(contarCeldasVacias(tableroInicial))
  }

  const getCeldaEstilo = (fila, col) => {
    const esInicial = tableroInicial[fila][col] !== 0
    const esSeleccionada = celdaSeleccionada?.fila === fila && celdaSeleccionada?.col === col
    const valorCelda = tablero[fila][col]
    
    const numeroSeleccionado = celdaSeleccionada ? tablero[celdaSeleccionada.fila][celdaSeleccionada.col] : 0
    
    const esMismaFila = celdaSeleccionada && !esSeleccionada && fila === celdaSeleccionada.fila
    const esMismaCol = celdaSeleccionada && !esSeleccionada && col === celdaSeleccionada.col
    const esMismaCaja = celdaSeleccionada && !esSeleccionada && !esMismaFila && !esMismaCol &&
      obtenerSubcuadricula(fila, col) === obtenerSubcuadricula(celdaSeleccionada.fila, celdaSeleccionada.col)
    
    const esMismoNumero = numeroSeleccionado > 0 && valorCelda === numeroSeleccionado && !esSeleccionada
    
    let estilo = 'bg-[#0d0d18]'

    if (esSeleccionada) {
      estilo = 'bg-purple-600/40 ring-2 ring-purple-400/70 z-10'
    } else if (esMismoNumero) {
      estilo = 'bg-purple-900/30'
    } else if (esMismaFila || esMismaCol) {
      estilo = 'bg-white/[0.05]'
    } else if (esMismaCaja) {
      estilo = 'bg-white/[0.03]'
    }
    
    return estilo
  }

  const getBordeCelda = (fila, col) => {
    const bordeDerecho = col % 3 === 2 && col < 8
    const bordeAbajo   = fila % 3 === 2 && fila < 8
    const r = bordeDerecho ? 'border-r-[2px] border-r-purple-500/60' : 'border-r-white/[0.06]'
    const b = bordeAbajo   ? 'border-b-[2px] border-b-purple-500/60' : 'border-b-white/[0.06]'
    return `border-l-white/[0.06] border-t-white/[0.06] ${r} ${b}`
  }

  const tecladoNumerico = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  
  const contarNumeros = (num) => {
    if (!tablero) return 0
    let count = 0
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (tablero[i][j] === num) count++
      }
    }
    return count
  }

  const numerosCompletos = tecladoNumerico.map(num => contarNumeros(num) >= 9)

  // ── RESULTADO ──
  if (pantalla === 'resultado') {
    const gano = errores < MAX_ERRORES
    const diff = DIFICULTADES[dificultad]
    return (
      <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
        <Navbar />
        <div className="relative flex-1 flex items-center justify-center px-4 overflow-hidden">
          <div className={`absolute inset-0 ${gano ? 'bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(109,40,217,0.25),transparent)]' : 'bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(220,38,38,0.15),transparent)]'}`} />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.04) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

          <div className="relative z-10 bg-white/[0.03] border border-white/[0.07] rounded-3xl p-10 max-w-sm w-full flex flex-col gap-6 backdrop-blur-sm">
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

            <div className="text-center">
              <h2 className={`text-4xl font-extrabold ${gano ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500' : 'text-white'}`}>
                {gano ? '¡Completado!' : 'Sin vidas'}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {gano ? `${diff?.label} · ${formatearTiempo(tiempo)} · ${errores} error${errores !== 1 ? 'es' : ''}` : `Llegaste a ${MAX_ERRORES} errores en nivel ${diff?.label}`}
              </p>
            </div>

            {gano && (
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Puntuación</p>
                <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">
                  {puntuacion.toLocaleString()}
                </p>
                <div className="flex justify-center gap-6 mt-3 text-xs text-gray-500">
                  <span>⏱ {formatearTiempo(tiempo)}</span>
                  <span className={`${errores > 0 ? 'text-red-400' : ''}`}>✗ {errores}/{MAX_ERRORES}</span>
                  <span className={diff?.color}>{diff?.label}</span>
                </div>
              </div>
            )}

            {gano && (
              <div className={`rounded-2xl px-4 py-3 text-center text-sm border ${guardadoRanking ? 'bg-green-900/30 border-green-700/30 text-green-400' : usuario ? 'bg-white/[0.03] border-white/[0.06] text-gray-500' : 'bg-purple-950/40 border-purple-700/30 text-purple-300'}`}>
                {guardadoRanking
                  ? '✓ Guardado en el ranking'
                  : usuario
                    ? puntuacion === 0 ? 'Sin puntos (demasiado lento)' : 'Guardando...'
                    : '🔒 Iniciá sesión para guardar en el ranking'}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setPantalla('menu')}
                className="flex-1 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07] text-white text-sm font-semibold transition">
                ← Menú
              </button>
              <button onClick={() => iniciarJuego(dificultad)}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition hover:shadow-[0_0_24px_rgba(139,92,246,0.35)]">
                Jugar de nuevo →
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── MENÚ ──
  if (pantalla === 'menu') {
    return (
      <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
        <Navbar />
        <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(109,40,217,0.18),transparent)]" />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

          <div className="relative z-10 w-full max-w-2xl flex flex-col gap-8">
            <div className="text-center flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-purple-900/40 border border-purple-700/25 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-purple-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125v-6m0 0A1.125 1.125 0 013.375 11.25h.375m0 8.25V11.25m0 0h.375M6 11.25V5.625M6 11.25h1.5M6 5.625A1.125 1.125 0 017.125 4.5h9.75A1.125 1.125 0 0118 5.625v6M6 5.625h12m0 0V11.25m0 0h1.5m-1.5 0h.375m0 8.25V11.25m0 8.25a1.125 1.125 0 01-1.125 1.125H18m1.875-1.125v-6m0 0A1.125 1.125 0 0120.625 13.5M3.375 13.5v5.625"/>
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-extrabold">Sudoku</h1>
                <p className="text-gray-500 mt-1 text-sm">El clásico juego de números · {MAX_ERRORES} errores para perder</p>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">Seleccioná la dificultad</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {Object.entries(DIFICULTADES).map(([key, { label, desc, color, border }]) => (
                  <button
                    key={key}
                    onClick={() => iniciarJuego(key)}
                    className={`w-full py-4 px-5 rounded-2xl border border-white/[0.07] bg-white/[0.03] ${border} hover:bg-white/[0.06] text-left transition-all group`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`font-bold text-sm ${color}`}>{label}</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
                      </svg>
                    </div>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Ranking */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Top 10 Global</p>
                {!usuario && <span className="text-[10px] text-purple-400 border border-purple-700/30 bg-purple-950/40 px-2 py-0.5 rounded-full">Iniciá sesión para aparecer aquí</span>}
              </div>
              {ranking.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">Todavía no hay puntuaciones. ¡Sé el primero!</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {ranking.map((entry, i) => (
                    <div key={entry.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${usuario?.uid === entry.uid ? 'bg-purple-950/40 border border-purple-700/25' : 'bg-white/[0.02]'}`}>
                      <span className={`text-sm font-extrabold w-5 text-center tabular-nums ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>{i + 1}</span>
                      <span className="text-white text-sm font-semibold flex-1 truncate">{entry.nombre}</span>
                      <span className={`text-xs font-semibold ${DIFICULTADES[entry.dificultad]?.color || 'text-gray-400'}`}>{DIFICULTADES[entry.dificultad]?.label || entry.dificultad}</span>
                      <span className="text-purple-400 font-bold text-sm tabular-nums">{Number(entry.puntuacion).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── JUEGO ──
  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>

      {/* Modal confirmación salida */}
      {confirmarSalida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmarSalida(false)} />
          <div className="relative z-10 bg-[#0f0f1a] border border-white/[0.09] rounded-3xl p-8 max-w-sm w-full flex flex-col gap-5 shadow-2xl shadow-black/60">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-900/40 border border-red-700/30 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-red-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-base">¿Salir del Sudoku?</h3>
                <p className="text-gray-400 text-sm mt-1">Perdés todo el progreso de esta partida.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmarSalida(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07] text-white text-sm font-semibold transition">
                Seguir jugando
              </button>
              <button onClick={() => { setConfirmarSalida(false); setPantalla('menu') }}
                className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition">
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje temporal */}
      {mensaje && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className={`px-5 py-2.5 rounded-2xl font-semibold text-sm shadow-2xl border backdrop-blur-sm ${
            mensaje.tipo === 'victoria' ? 'bg-green-900/80 border-green-500/40 text-green-300' :
            mensaje.tipo === 'perdida'  ? 'bg-red-900/80 border-red-500/40 text-red-300' :
                                          'bg-red-900/80 border-red-500/40 text-red-300'
          }`}>
            {mensaje.texto}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 py-4">

        {/* Stats bar — ancho igual al tablero */}
        <div className="flex items-center gap-2" style={{ width: `${CELL_SIZE * 9 + 22}px` }}>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold flex-1 justify-center ${errores >= 2 ? 'bg-red-950/60 border-red-700/40 text-red-400' : errores >= 1 ? 'bg-yellow-950/60 border-yellow-700/40 text-yellow-400' : 'bg-white/[0.04] border-white/[0.07] text-gray-400'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            {errores}/{MAX_ERRORES}
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.07] bg-white/[0.04] text-xs font-mono flex-1 justify-center ${celdasRestantes === 0 ? 'text-green-400' : 'text-gray-400'}`}>
            {celdasRestantes} restantes
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.07] bg-white/[0.04] text-xs font-mono text-purple-400 flex-1 justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {formatearTiempo(tiempo)}
          </div>
          <button onClick={reiniciarJuego} className="p-2 rounded-xl border border-white/[0.07] bg-white/[0.04] hover:bg-white/[0.08] text-gray-500 hover:text-white transition" title="Reiniciar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg>
          </button>
        </div>

        {/* ── TABLERO (elemento central) ── */}
        <div ref={boardRef} className="bg-white/[0.03] border border-purple-500/30 rounded-2xl p-2.5 shadow-2xl shadow-purple-500/10 select-none" style={{ width: `${CELL_SIZE * 9 + 22}px` }}>
          <div className="grid grid-cols-9 border-2 border-purple-500/50 rounded-xl overflow-hidden" style={{ width: `${CELL_SIZE * 9}px`, height: `${CELL_SIZE * 9}px` }}>
            {tablero?.map((fila, i) =>
              fila.map((celda, j) => {
                const esInicial = tableroInicial[i][j] !== 0
                const esSeleccionada = celdaSeleccionada?.fila === i && celdaSeleccionada?.col === j
                const valor = celda !== 0 ? celda : ''
                const notasCelda = notas?.[i]?.[j]
                const tieneNotas = notasCelda && notasCelda.size > 0
                const numeroSeleccionado = celdaSeleccionada && tablero[celdaSeleccionada.fila]?.[celdaSeleccionada.col]
                const esMismoNumero = numeroSeleccionado > 0 && valor === numeroSeleccionado && !esSeleccionada
                const notasGrid = Array(3).fill(null).map(() => Array(3).fill(null))
                if (tieneNotas) { for (const n of notasCelda) { const pos = POSICION_NOTA[n]; if (pos) notasGrid[pos.fila][pos.col] = n } }
                return (
                  <button key={`${i}-${j}`} data-cell={`${i}-${j}`} onClick={() => seleccionarCelda(i, j)}
                    className={`relative border-[0.5px] flex items-center justify-center transition-colors cursor-pointer hover:bg-white/[0.07] ${getCeldaEstilo(i, j)} ${getBordeCelda(i, j)}`}
                    style={{ width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` }}>
                    {valor ? (
                      <span className={`text-2xl font-semibold ${esInicial ? 'text-gray-200' : esMismoNumero ? 'text-purple-300' : 'text-purple-400'}`}>{valor}</span>
                    ) : tieneNotas ? (
                      <div className="grid grid-cols-3 w-full h-full">
                        {notasGrid.map((filaNotas, fi) => filaNotas.map((notaNum, fj) => (
                          <div key={`${fi}-${fj}`} className="flex items-center justify-center">
                            <span className={`text-[10px] leading-none ${notaNum !== null ? notaNum === numeroSeleccionado ? 'text-purple-400 font-bold' : 'text-gray-500' : 'text-transparent'}`}>{notaNum !== null ? notaNum : '0'}</span>
                          </div>
                        )))}
                      </div>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── Controles debajo del tablero ── */}
        <div className="flex flex-col gap-2" style={{ width: `${CELL_SIZE * 9 + 22}px` }}>
          {/* Números 1-9 */}
          <div className="grid grid-cols-9 gap-1.5">
            {tecladoNumerico.map(num => {
              const completo = numerosCompletos[num - 1]
              const numSel = celdaSeleccionada ? tablero[celdaSeleccionada.fila][celdaSeleccionada.col] : 0
              return (
                <button key={num} onClick={() => ingresarNumero(num)} disabled={completado || completo}
                  className={`h-11 rounded-xl text-base font-bold transition-all active:scale-95 flex items-center justify-center ${
                    completo ? 'bg-white/[0.02] text-gray-700 cursor-not-allowed'
                    : numSel === num ? 'bg-purple-900/60 border border-purple-500/60 text-purple-300 shadow-[0_0_10px_rgba(139,92,246,0.2)]'
                    : 'bg-white/[0.04] border border-white/[0.07] hover:border-purple-500/40 hover:bg-white/[0.08] text-white'
                  }`}>
                  {completo ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-gray-600"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg> : num}
                </button>
              )
            })}
          </div>

          {/* Borrar · Notas · Menú */}
          <div className="flex gap-1.5">
            <button onClick={() => ingresarNumero(0)} disabled={completado}
              className="flex-1 h-10 bg-white/[0.03] border border-white/[0.07] hover:border-red-500/40 hover:bg-red-950/20 rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z"/></svg>
              Borrar
            </button>
            <button onClick={() => setModoNotas(!modoNotas)} disabled={completado}
              className={`flex-1 h-10 rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-1.5 text-xs font-semibold ${modoNotas ? 'bg-purple-600/60 border border-purple-500/60 text-purple-200' : 'bg-white/[0.03] border border-white/[0.07] hover:border-purple-500/40 text-gray-400'}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg>
              {modoNotas ? 'Notas ON' : 'Notas'}
            </button>
            <button onClick={() => setConfirmarSalida(true)}
              className="flex-1 h-10 border border-white/[0.07] hover:border-white/[0.14] bg-white/[0.02] hover:bg-white/[0.05] text-gray-500 hover:text-gray-300 rounded-xl transition text-xs font-semibold flex items-center justify-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/></svg>
              Menú
            </button>
          </div>
        </div>

        <p className="text-gray-700 text-[10px]">Flechas para navegar · N para notas · Delete para borrar</p>
      </div>

      <Footer />
    </div>
  )
}