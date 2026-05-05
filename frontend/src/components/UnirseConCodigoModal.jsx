import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/*
  Formato de código por juego:
  - Truco Online : 4 letras mayúsculas  (ej: ABCD)
  - Pictionary   : 2 letras + 2 números (ej: AB12)
  - Uno          : letra+número+letra+número (ej: A1B2)
  - Poker        : 4 dígitos numéricos  (ej: 1234)
*/
const JUEGOS = [
  {
    nombre: 'Truco Online',
    icono: 'TR',
    categoria: 'Cartas · 2–4 jugadores',
    pattern: /^[A-Z]{4}$/,
    hint: '4 letras — ej: ABCD',
    ruta: (codigo) => `/unirse/${codigo}`,
    maxLen: 4,
    charType: 'letter',
    transform: (v) => v.toUpperCase().replace(/[^A-Z]/g, ''),
  },
  {
    nombre: 'Pictionary',
    icono: 'PI',
    categoria: 'Social · 3–8 jugadores',
    pattern: /^[A-Z]{2}[0-9]{2}$/,
    hint: '2 letras + 2 números — ej: AB12',
    ruta: (codigo) => `/juegos/pictionary?sala=${codigo}`,
    maxLen: 4,
    charType: 'mixed',
    transform: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ''),
  },
  {
    nombre: 'Poker',
    icono: 'PK',
    categoria: 'Cartas · 2–4 jugadores',
    pattern: /^[0-9]{4}$/,
    hint: '4 dígitos — ej: 1234',
    ruta: (codigo) => `/juegos/poker?sala=${codigo}`,
    maxLen: 4,
    charType: 'digit',
    transform: (v) => v.replace(/[^0-9]/g, ''),
  },
  {
    nombre: 'Uno',
    icono: 'UN',
    categoria: 'Cartas · 2–6 jugadores',
    pattern: /^[A-Z][0-9][A-Z][0-9]$/,
    hint: 'letra+número+letra+número — ej: A1B2',
    ruta: (codigo) => `/juegos/uno?sala=${codigo}`,
    maxLen: 4,
    charType: 'uno',
    transform: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ''),
  },
]

function detectarJuego(codigo) {
  return JUEGOS.find(j => j.pattern.test(codigo))
}

export default function UnirseConCodigoModal({ onClose }) {
  const [codigo, setCodigo]         = useState('')
  const [juego, setJuego]           = useState(JUEGOS[0])
  const [shake, setShake]           = useState(false)
  const inputRef                    = useRef(null)
  const navigate                    = useNavigate()

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleChange = (e) => {
    const raw = e.target.value
    // Detect game type by format.
    const compact = raw.replace(/\s/g, '')
    const firstChar = compact[0] ?? ''
    const normalizedMixed = compact.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
    const candidato = firstChar
      ? (/[0-9]/.test(firstChar) ? JUEGOS.find(j => j.charType === 'digit')
        : /^[A-Z]{2}[0-9]{1,2}$/.test(normalizedMixed) || juego?.charType === 'mixed' ? JUEGOS.find(j => j.charType === 'mixed')
        : /^[A-Z][0-9]/.test(normalizedMixed) || juego?.charType === 'uno' ? JUEGOS.find(j => j.charType === 'uno')
        : JUEGOS[0])
        ?? JUEGOS[0]
      : JUEGOS[0]
    const transformado = candidato.transform(raw).slice(0, candidato.maxLen)
    setCodigo(transformado)
    setJuego(candidato.charType === 'letter' ? candidato : detectarJuego(transformado) || candidato)
  }

  const handleUnirse = () => {
    if (!juego || !juego.pattern.test(codigo)) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    onClose()
    navigate(juego.ruta(codigo))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleUnirse()
  }

  const estadoCodigo =
    codigo.length === 0   ? 'empty'
    : juego?.pattern.test(codigo) ? 'valid'
    :                       'invalid'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 bg-[#0d0d1a] border border-white/[0.09] rounded-3xl p-7 w-full max-w-sm flex flex-col gap-6 shadow-2xl shadow-black/60">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-white">Unirse con código</h2>
            <p className="text-gray-500 text-xs mt-0.5">Ingresá el código que te compartieron</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/[0.07] transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Input */}
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            value={codigo}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Código de sala"
            className={`w-full bg-white/[0.04] border rounded-2xl px-5 py-4 text-white text-center text-3xl font-mono tracking-[0.35em] font-extrabold focus:outline-none transition-all placeholder-gray-700 placeholder:text-lg placeholder:tracking-normal ${
              estadoCodigo === 'valid'   ? 'border-green-500/50 focus:border-green-500/70' :
              estadoCodigo === 'invalid' ? `border-red-500/40 focus:border-red-500/60 ${shake ? 'animate-[shake_0.4s_ease]' : ''}` :
                                          'border-white/[0.08] focus:border-purple-500/50'
            }`}
          />

          {/* Detection feedback */}
          <div className={`flex items-center gap-2 px-1 transition-all duration-200 ${codigo.length === 0 ? 'opacity-0' : 'opacity-100'}`}>
            {estadoCodigo === 'valid' && (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-green-400 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-green-400 text-xs font-semibold">Código de {juego.nombre}</span>
              </>
            )}
            {estadoCodigo === 'invalid' && (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-gray-600 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
                <span className="text-gray-600 text-xs">Formato no reconocido</span>
              </>
            )}
          </div>
        </div>

        {/* Formats reference */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Formatos disponibles</p>
          <div className="flex flex-col gap-1">
            {JUEGOS.map(j => (
              <div key={j.nombre} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-200 text-[10px] font-extrabold flex items-center justify-center">{j.icono}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-300">{j.nombre}</p>
                    <p className="text-[10px] text-gray-600">{j.categoria}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-gray-500 bg-white/[0.04] px-2 py-1 rounded-lg border border-white/[0.06]">{j.hint}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action */}
        <button
          onClick={handleUnirse}
          disabled={estadoCodigo !== 'valid'}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-bold transition-all hover:shadow-[0_0_24px_rgba(139,92,246,0.35)] text-sm"
        >
          {juego ? `Unirse a ${juego.nombre} →` : 'Unirse →'}
        </button>

      </div>
    </div>
  )
}
