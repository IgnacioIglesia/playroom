import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import capitalesES from '../data/capitales_es.js'
import paisesES from '../data/paises_es.js'

const TOTAL_PREGUNTAS = 10
const TIEMPO_POR_PREGUNTA = 20

const REGIONES = {
  americas: '🌎 América',
  europe: '🌍 Europa',
  asia: '🌏 Asia',
  africa: '🌍 África',
  all: '🌐 Todos los países',
}

function mezclar(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function generarOpciones(capitalCorrecta, todosLosPaises) {
  const otras = todosLosPaises
    .filter((p) => p.capital !== capitalCorrecta && p.capital)
    .map((p) => p.capital)
  const incorrectas = mezclar(otras).slice(0, 3)
  return mezclar([capitalCorrecta, ...incorrectas])
}

export default function Capitales() {
  const navigate = useNavigate()

  const [pantalla, setPantalla] = useState('menu')
  const [modo, setModo] = useState(null)
  const [regionesSeleccionadas, setRegionesSeleccionadas] = useState([])
  const [todosPaises, setTodosPaises] = useState([])
  const [preguntasList, setPreguntasList] = useState([])
  const [indice, setIndice] = useState(0)
  const [puntaje, setPuntaje] = useState(0)
  const [respondido, setRespondido] = useState(null)
  const [tiempo, setTiempo] = useState(TIEMPO_POR_PREGUNTA)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [confirmarSalida, setConfirmarSalida] = useState(false)

  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,capital,region,translations')
      .then((res) => res.json())
      .then((data) => {
        const paises = data
          .filter((p) => p.capital && p.capital.length > 0)
          .map((p) => ({
            nombre: paisesES[p.name.common] || null,
            capital: capitalesES[p.capital[0]] || p.capital[0],
            region: p.region.toLowerCase(),
          }))
          .filter((p) => p.nombre !== null)
        setTodosPaises(paises)
        setCargando(false)
      })
      .catch(() => {
        setError('No se pudo cargar la lista de países. Revisá tu conexión.')
        setCargando(false)
      })
  }, [])

  useEffect(() => {
    if (pantalla !== 'juego' || respondido !== null) return
    if (tiempo === 0) { handleRespuesta(null); return }
    const timer = setTimeout(() => setTiempo((t) => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [tiempo, pantalla, respondido])

  const toggleRegion = (key) => {
    if (key === 'all') {
      setRegionesSeleccionadas((prev) =>
        prev.includes('all') ? [] : ['all']
      )
    } else {
      setRegionesSeleccionadas((prev) => {
        const sinAll = prev.filter((r) => r !== 'all')
        return sinAll.includes(key)
          ? sinAll.filter((r) => r !== key)
          : [...sinAll, key]
      })
    }
  }

  const getPaisesDisponibles = () => {
    if (regionesSeleccionadas.includes('all')) return todosPaises
    return todosPaises.filter((p) => regionesSeleccionadas.includes(p.region))
  }

  const iniciarJuego = () => {
    const filtrados = getPaisesDisponibles()
    const seleccionados = mezclar(filtrados).slice(0, TOTAL_PREGUNTAS)
    const lista = seleccionados.map((p) => ({
      pais: p.nombre,
      capital: p.capital,
      opciones: generarOpciones(p.capital, todosPaises),
    }))
    setPreguntasList(lista)
    setIndice(0)
    setPuntaje(0)
    setRespondido(null)
    setTiempo(TIEMPO_POR_PREGUNTA)
    setPantalla('juego')
  }

  const handleRespuesta = (opcion) => {
    if (respondido !== null) return
    const correcta = preguntasList[indice].capital
    setRespondido(opcion)
    if (opcion === correcta) setPuntaje((p) => p + 1)
    setTimeout(() => {
      if (indice + 1 >= TOTAL_PREGUNTAS) {
        setPantalla('resultado')
      } else {
        setIndice((i) => i + 1)
        setRespondido(null)
        setTiempo(TIEMPO_POR_PREGUNTA)
      }
    }, 1200)
  }

  const preguntaActual = preguntasList[indice]
  const paisesDisponibles = getPaisesDisponibles().length

  // ── CARGANDO ──
  if (cargando) {
    return (
      <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">Cargando países del mundo...</p>
        </div>
        <Footer />
      </div>
    )
  }

  // ── ERROR ──
  if (error) {
    return (
      <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-red-400">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-xl font-semibold transition">
            Reintentar
          </button>
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
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(109,40,217,0.18),transparent)]" />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

          <div className="relative z-10 w-full max-w-2xl">

            <div className="text-center mb-10">
              <div className="inline-flex w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 items-center justify-center text-3xl mb-5">
                🌍
              </div>
              <h1 className="text-4xl font-extrabold">Adivina la Capital</h1>
              <p className="text-gray-500 mt-2 text-sm">
                {TOTAL_PREGUNTAS} preguntas · {TIEMPO_POR_PREGUNTA} segundos por pregunta
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Modo */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-6 flex flex-col gap-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Modo de juego</h2>
                {[
                  { key: 'solo', label: '🎮 Solo', desc: 'Jugás contra la máquina a tu ritmo.' },
                  { key: 'amigo', label: '👥 Con amigo', desc: 'Turnos alternados, gana el que más acierta.' },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setModo(m.key)}
                    className={`w-full py-4 px-5 rounded-2xl border transition text-left ${
                      modo === m.key
                        ? 'border-purple-500/60 bg-purple-950/40 text-white'
                        : 'border-white/[0.08] bg-white/[0.02] text-gray-400 hover:border-white/[0.15] hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-base">{m.label}</div>
                    <div className="text-xs mt-1 opacity-70">{m.desc}</div>
                  </button>
                ))}
              </div>

              {/* Regiones */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-6 flex flex-col gap-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Regiones</h2>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(REGIONES).filter(([key]) => key !== 'all').map(([key, label]) => {
                    const cantidad = todosPaises.filter((p) => p.region === key).length
                    const activo = regionesSeleccionadas.includes(key)
                    return (
                      <button
                        key={key}
                        onClick={() => toggleRegion(key)}
                        className={`py-3 px-3 rounded-xl border transition text-sm font-semibold flex flex-col items-start gap-1 ${
                          activo
                            ? 'border-purple-500/60 bg-purple-950/40 text-white'
                            : 'border-white/[0.08] bg-white/[0.02] text-gray-400 hover:border-white/[0.15] hover:text-white'
                        }`}
                      >
                        <span>{label}</span>
                        <span className="text-xs opacity-50 font-normal">{cantidad} países</span>
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => toggleRegion('all')}
                  className={`w-full py-3 px-4 rounded-xl border transition text-sm font-semibold flex justify-between items-center ${
                    regionesSeleccionadas.includes('all')
                      ? 'border-purple-500/60 bg-purple-950/40 text-white'
                      : 'border-white/[0.08] bg-white/[0.02] text-gray-400 hover:border-white/[0.15] hover:text-white'
                  }`}
                >
                  <span>🌐 Todos los países</span>
                  <span className="text-xs opacity-50 font-normal">{todosPaises.length} países</span>
                </button>

                {regionesSeleccionadas.length > 0 && (
                  <p className="text-purple-400 text-xs">
                    ✓ {paisesDisponibles} países disponibles
                  </p>
                )}
              </div>

            </div>

            <button
              onClick={iniciarJuego}
              disabled={!modo || regionesSeleccionadas.length === 0 || paisesDisponibles < TOTAL_PREGUNTAS}
              className="w-full mt-6 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-5 rounded-2xl text-xl font-bold transition hover:shadow-[0_0_28px_rgba(139,92,246,0.35)]"
            >
              {!modo
                ? 'Elegí un modo de juego'
                : regionesSeleccionadas.length === 0
                ? 'Elegí al menos una región'
                : paisesDisponibles < TOTAL_PREGUNTAS
                ? `Necesitás al menos ${TOTAL_PREGUNTAS} países`
                : 'Jugar →'}
            </button>

          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── JUEGO ──
  if (pantalla === 'juego' && preguntaActual) {
    const correcta = preguntaActual.capital
    const progreso = (indice / TOTAL_PREGUNTAS) * 100

    return (
      <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
        <Navbar />

        {/* Modal confirmación salida */}
        {confirmarSalida && (
          <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="bg-[#0d0d1a] border border-white/[0.08] rounded-3xl p-8 max-w-sm w-full text-center flex flex-col gap-6">
              <span className="text-5xl">⚠️</span>
              <div>
                <h3 className="text-2xl font-extrabold">¿Salir de la partida?</h3>
                <p className="text-gray-500 mt-2 text-sm">Perdés el progreso actual. Esta acción no se puede deshacer.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmarSalida(false)}
                  className="flex-1 border border-white/[0.08] hover:border-purple-500/50 text-gray-300 hover:text-white py-3 rounded-2xl font-semibold transition"
                >
                  Seguir jugando
                </button>
                <button
                  onClick={() => { setConfirmarSalida(false); setPantalla('menu') }}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-2xl font-bold transition"
                >
                  Salir
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">

          <div className="w-full max-w-2xl mb-6">
            <div className="flex justify-between text-xs text-gray-600 mb-2">
              <span>Pregunta {indice + 1} de {TOTAL_PREGUNTAS}</span>
              <span>{Math.round(progreso)}% completado</span>
            </div>
            <div className="w-full bg-white/[0.06] rounded-full h-1.5">
              <div
                className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>

          <div className="w-full max-w-2xl">

            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirmarSalida(true)}
                  className="flex items-center gap-2 text-gray-500 hover:text-white border border-white/[0.08] hover:border-white/[0.15] px-3 py-2 rounded-xl text-sm transition"
                >
                  ✕ Salir
                </button>
                <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] px-4 py-2 rounded-xl">
                  <span className="text-yellow-400 text-lg">⭐</span>
                  <span className="text-white font-bold text-lg">{puntaje}</span>
                  <span className="text-gray-500 text-sm">pts</span>
                </div>
              </div>

              <div className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-lg border transition-all ${
                tiempo <= 5
                  ? 'bg-red-950/60 border-red-600/60 text-red-400'
                  : tiempo <= 10
                  ? 'bg-yellow-950/60 border-yellow-600/60 text-yellow-400'
                  : 'bg-white/[0.04] border-white/[0.08] text-white'
              }`}>
                <span>⏱</span>
                <span>{tiempo}s</span>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-10 mb-4 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(109,40,217,0.08),transparent)] pointer-events-none" />
              <p className="text-gray-500 text-sm font-medium uppercase tracking-widest mb-4">
                ¿Cuál es la capital de...?
              </p>
              <h2 className="text-5xl font-extrabold text-white">{preguntaActual.pais}</h2>
              <div className="mt-8 w-full bg-white/[0.06] rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all duration-1000 ${
                    tiempo <= 5 ? 'bg-red-500' : tiempo <= 10 ? 'bg-yellow-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${(tiempo / TIEMPO_POR_PREGUNTA) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {preguntaActual.opciones.map((opcion, i) => {
                const letras = ['A', 'B', 'C', 'D']
                let estilo = 'border-white/[0.08] bg-white/[0.03] hover:border-purple-500/50 hover:bg-white/[0.05]'
                let letraEstilo = 'bg-white/[0.06] text-gray-400'

                if (respondido !== null) {
                  if (opcion === correcta) {
                    estilo = 'border-green-500/60 bg-green-950/40'
                    letraEstilo = 'bg-green-600 text-white'
                  } else if (opcion === respondido) {
                    estilo = 'border-red-500/60 bg-red-950/40'
                    letraEstilo = 'bg-red-600 text-white'
                  } else {
                    estilo = 'border-white/[0.05] bg-white/[0.02] opacity-40'
                    letraEstilo = 'bg-white/[0.06] text-gray-600'
                  }
                }

                return (
                  <button
                    key={opcion}
                    onClick={() => handleRespuesta(opcion)}
                    disabled={respondido !== null}
                    className={`flex items-center gap-4 py-4 px-5 rounded-2xl border text-left font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${estilo}`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${letraEstilo}`}>
                      {letras[i]}
                    </span>
                    <span className="text-sm text-white">{opcion}</span>
                  </button>
                )
              })}
            </div>

          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── RESULTADO ──
  if (pantalla === 'resultado') {
    const porcentaje = Math.round((puntaje / TOTAL_PREGUNTAS) * 100)
    let mensaje = '¡Seguí practicando!'
    let submensaje = 'No te rindas, la próxima te va mejor.'
    let emoji = '💪'
    let colorPuntaje = 'text-gray-400'

    if (porcentaje >= 90) {
      mensaje = '¡Excelente!'; submensaje = 'Sos un crack de la geografía.'; emoji = '🏆'; colorPuntaje = 'text-yellow-400'
    } else if (porcentaje >= 70) {
      mensaje = '¡Muy bien!'; submensaje = 'Sabés bastante de geografía.'; emoji = '🌟'; colorPuntaje = 'text-purple-400'
    } else if (porcentaje >= 50) {
      mensaje = '¡Bien!'; submensaje = 'Podés mejorar con más práctica.'; emoji = '😊'; colorPuntaje = 'text-blue-400'
    }

    return (
      <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
        <Navbar />
        <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(109,40,217,0.15),transparent)]" />

          <div className="relative z-10 w-full max-w-lg">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-10 flex flex-col items-center gap-6 text-center">

              <span className="text-7xl">{emoji}</span>

              <div>
                <h2 className="text-4xl font-extrabold">{mensaje}</h2>
                <p className="text-gray-500 mt-2">{submensaje}</p>
              </div>

              <div className="flex flex-col items-center">
                <span className={`text-8xl font-extrabold ${colorPuntaje}`}>{puntaje}</span>
                <span className="text-gray-500 text-lg">de {TOTAL_PREGUNTAS} correctas</span>
              </div>

              <div className="w-full">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Precisión</span>
                  <span className={`font-bold ${colorPuntaje}`}>{porcentaje}%</span>
                </div>
                <div className="w-full bg-white/[0.06] rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-1000 ${
                      porcentaje >= 90 ? 'bg-yellow-500' :
                      porcentaje >= 70 ? 'bg-purple-500' :
                      porcentaje >= 50 ? 'bg-blue-500' : 'bg-white/[0.1]'
                    }`}
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 w-full">
                {[
                  { label: 'Correctas', valor: puntaje, color: 'text-green-400' },
                  { label: 'Incorrectas', valor: TOTAL_PREGUNTAS - puntaje, color: 'text-red-400' },
                  { label: 'Precisión', valor: `${porcentaje}%`, color: colorPuntaje },
                ].map((s) => (
                  <div key={s.label} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 flex flex-col items-center gap-1">
                    <span className={`text-2xl font-extrabold ${s.color}`}>{s.valor}</span>
                    <span className="text-gray-600 text-xs">{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 w-full mt-2">
                <button
                  onClick={() => setPantalla('menu')}
                  className="flex-1 border border-white/[0.08] hover:border-purple-500/50 text-gray-300 hover:text-white py-4 rounded-2xl font-semibold transition"
                >
                  ← Volver al menú
                </button>
                <button
                  onClick={iniciarJuego}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-2xl font-bold transition hover:shadow-[0_0_24px_rgba(139,92,246,0.35)]"
                >
                  Jugar de nuevo →
                </button>
              </div>

            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }
}
