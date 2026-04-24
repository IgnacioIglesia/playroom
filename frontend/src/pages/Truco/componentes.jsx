import { esMuestraCarta } from './logica'
import { MUESTRAS_ESPECIALES } from './constantes'

export function SimboloPalo({ palo, size = 28 }) {
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

export function CartaComp({ carta, muestra, onClick, seleccionada, jugada, oculta, enMesa = false }) {
  const esMuestra = muestra && esMuestraCarta(carta, muestra)
  const w = 'w-16 md:w-20'
  const h = 'h-24 md:h-28'

  if (oculta) return (
<div className={`${w} ${h} rounded-xl border-2 border-gray-600 bg-gray-800 flex items-center justify-center`}>
      <div className="w-10 h-14 rounded border border-gray-700 bg-gray-800 flex items-center justify-center">
        <span className="text-gray-600 text-lg font-bold">?</span>
      </div>
    </div>
  )

  return (
    <button onClick={onClick} disabled={!onClick || jugada}
      className={`${w} ${h} relative flex flex-col items-center justify-between rounded-xl border-2 transition-all select-none overflow-hidden px-1 py-1
      ${jugada
        ? enMesa
          ? 'cursor-not-allowed border-gray-500 bg-gray-800'
          : 'opacity-30 cursor-not-allowed border-gray-700 bg-gray-900'
        : seleccionada
          ? 'border-purple-400 bg-purple-950 scale-110 -translate-y-3 shadow-lg shadow-purple-900'
          : onClick
            ? 'border-gray-500 bg-gray-800 hover:border-purple-500 hover:-translate-y-2 cursor-pointer'
            : 'border-gray-500 bg-gray-800'}
        ${esMuestra && !jugada ? 'border-yellow-500' : ''}`}
    >
      {esMuestra && (
        <span className="absolute top-0.5 right-0.5 bg-yellow-500 text-black text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">M</span>
      )}
      <span className="text-white font-bold text-sm self-start leading-none">{carta.numero}</span>
      <SimboloPalo palo={carta.palo} size={24}/>
      <span className="text-white font-bold text-sm self-end leading-none rotate-180">{carta.numero}</span>
    </button>
  )
}

export function CartaMuestra({ carta, muestra }) {
  if (!carta) return null
  const esMuestra = MUESTRAS_ESPECIALES.includes(carta.numero)
  return (
    <div className={`relative flex flex-col items-center justify-between rounded-xl border-2 px-2 py-2 bg-gray-900 shadow-lg shadow-black/50
      ${esMuestra ? 'border-yellow-400 shadow-yellow-900/30' : 'border-yellow-600'}`}
      style={{ width: '64px', height: '96px' }}
    >
      <span className="absolute top-1 right-1 bg-yellow-500 text-black text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">M</span>
      <span className="text-yellow-300 font-bold text-base self-start leading-none">{carta.numero}</span>
      <SimboloPalo palo={carta.palo} size={28}/>
      <span className="text-yellow-300 font-bold text-base self-end leading-none rotate-180">{carta.numero}</span>
    </div>
  )
}

export function BtnCanto({ onClick, disabled, color, children }) {
  const cols = {
    blue: 'bg-blue-900 hover:bg-blue-800 border-blue-700',
    red: 'bg-red-900 hover:bg-red-800 border-red-700',
    yellow: 'bg-yellow-800 hover:bg-yellow-700 border-yellow-600',
    gray: 'bg-gray-800 hover:bg-gray-700 border-gray-600',
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${cols[color]}  disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-semibold transition border w-full text-center`}>
      {children}
    </button>
  )
}

function GrupoCincoPalillos({ cantidad, stroke = '#a855f7', inactive = '#374151' }) {
  const c = (n) => n <= cantidad ? stroke : inactive

  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <line x1="12" y1="6"  x2="52" y2="6"  stroke={c(1)} strokeWidth="4" strokeLinecap="round"/>
      <line x1="58" y1="12" x2="58" y2="52" stroke={c(2)} strokeWidth="4" strokeLinecap="round"/>
      <line x1="12" y1="58" x2="52" y2="58" stroke={c(3)} strokeWidth="4" strokeLinecap="round"/>
      <line x1="6"  y1="12" x2="6"  y2="52" stroke={c(4)} strokeWidth="4" strokeLinecap="round"/>
      <line x1="52" y1="6"  x2="12" y2="58" stroke={c(5)} strokeWidth="4" strokeLinecap="round"/>
    </svg>
  )
}
  
export function TanteadorPalillos({ ptsJ, ptsM, limite }) {
    // Asegurar que sean números
    const puntosJ = Number(ptsJ) || 0
    const puntosM = Number(ptsM) || 0
    const limiteValido = Number(limite) || 30
  
    const palillo = (n, color) => {
      const grupos = []
      const llenos = Math.floor(n / 5)
      const resto = n % 5
  
      for (let i = 0; i < llenos; i++) {
        grupos.push(
          <div key={`g${i}`} className="relative flex gap-0.5 items-center mr-2">
            {[0, 1, 2, 3].map(j => (
              <div key={j} className={`w-0.5 h-5 ${color} rounded-full`} />
            ))}
            <div className={`absolute left-0 right-0 top-1/2 h-0.5 ${color} rounded-full -rotate-12`} />
          </div>
        )
      }
      if (resto > 0) {
        grupos.push(
          <div key="r" className="flex gap-0.5 items-center">
            {Array.from({ length: resto }).map((_, j) => (
              <div key={j} className={`w-0.5 h-5 ${color} rounded-full`} />
            ))}
          </div>
        )
      }
      return grupos
    }
  
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-xs text-gray-500 uppercase tracking-wider text-center">Tanteador</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 text-xs w-6 text-right font-bold">{puntosJ}</span>
            <div className="flex flex-wrap gap-1 flex-1">{palillo(puntosJ, 'bg-purple-400')}</div>
          </div>
          <div className="h-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-xs w-6 text-right font-bold">{puntosM}</span>
            <div className="flex flex-wrap gap-1 flex-1">{palillo(puntosM, 'bg-red-400')}</div>
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>Vos</span>
          <span>Meta: {limiteValido}</span>
          <span>Rival</span>
        </div>
      </div>
    )
  }