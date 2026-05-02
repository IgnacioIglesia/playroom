import { esMuestraCarta } from './logica'
import { MUESTRAS_ESPECIALES } from './constantes'

// Mapa de palo (interno) → nombre del archivo de imagen
const SUIT_FILE = {
  espadas: 'Espada',
  bastos:  'Basto',
  oros:    'Oro',
  copas:   'Copa',
}

const cardImg  = (carta) => `/cartas/${SUIT_FILE[carta.palo]}_${carta.numero}.png`
const backImg  = '/cartas/back_red.png'

export function CartaComp({ carta, muestra, onClick, seleccionada, jugada, oculta, enMesa = false }) {
  const esPieza = muestra && esMuestraCarta(carta, muestra)

  if (oculta) return (
    <div className="w-[68px] md:w-20 h-24 md:h-28 rounded-lg overflow-hidden shadow-md border border-gray-600 flex-shrink-0">
      <img src={backImg} alt="?" className="w-full h-full object-cover"/>
    </div>
  )

  return (
    <button
      onClick={onClick}
      disabled={!onClick || jugada}
      className={`w-[68px] md:w-20 h-24 md:h-28 relative rounded-lg overflow-hidden shadow-md transition-all select-none flex-shrink-0
        ${jugada && !enMesa ? 'opacity-35 cursor-not-allowed' : ''}
        ${jugada && enMesa  ? 'cursor-default' : ''}
        ${seleccionada ? 'scale-110 -translate-y-3 shadow-xl' : ''}
        ${onClick && !jugada ? 'hover:-translate-y-2 cursor-pointer' : ''}`}
      style={{
        outline: esPieza && !jugada
          ? '2.5px solid rgba(234,179,8,0.9)'
          : seleccionada
            ? '2px solid rgba(168,85,247,0.9)'
            : undefined,
        boxShadow: esPieza && !jugada
          ? '0 0 16px 5px rgba(234,179,8,0.5)'
          : seleccionada
            ? '0 8px 20px rgba(168,85,247,0.4)'
            : '0 2px 6px rgba(0,0,0,0.4)',
      }}
    >
      <img
        src={cardImg(carta)}
        alt={`${carta.numero} de ${carta.palo}`}
        className="w-full h-full object-cover"
        draggable={false}
      />
      {esPieza && !jugada && (
        <span className="absolute top-0.5 right-0.5 bg-yellow-400 text-black text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-black leading-none z-10 shadow">P</span>
      )}
    </button>
  )
}

export function CartaMuestra({ carta, size = 'md' }) {
  if (!carta) return null
  const esPieza = MUESTRAS_ESPECIALES.includes(carta.numero)
  const dims    = size === 'sm' ? { width: '36px', height: '56px' } : { width: '70px', height: '108px' }
  const badge   = size === 'sm' ? 'text-[6px] w-3 h-3' : 'text-[9px] w-4 h-4'
  return (
    <div
      className="relative rounded-lg overflow-hidden shadow-lg flex-shrink-0"
      style={{
        ...dims,
        outline: esPieza ? '2px solid rgba(234,179,8,0.9)' : '1px solid rgba(234,179,8,0.5)',
        boxShadow: '0 0 10px rgba(234,179,8,0.35)',
      }}
    >
      <img src={cardImg(carta)} alt="muestra" className="w-full h-full object-cover" draggable={false}/>
      <span className={`absolute top-0.5 right-0.5 bg-yellow-400 text-black rounded-full flex items-center justify-center font-black leading-none z-10 ${badge}`}>M</span>
    </div>
  )
}

export function BtnCanto({ onClick, disabled, color, children }) {
  const cols = {
    blue:   'bg-blue-900 hover:bg-blue-800 border-blue-700',
    red:    'bg-red-900 hover:bg-red-800 border-red-700',
    yellow: 'bg-yellow-800 hover:bg-yellow-700 border-yellow-600',
    gray:   'bg-gray-800 hover:bg-gray-700 border-gray-600',
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${cols[color]} disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-semibold transition border w-full text-center`}>
      {children}
    </button>
  )
}

function GrupoCincoPalillos({ cantidad, stroke, inactive = 'rgba(255,255,255,0.1)' }) {
  const c = (n) => n <= cantidad ? stroke : inactive
  return (
    <svg width="44" height="44" viewBox="0 0 64 64">
      <line x1="12" y1="6"  x2="52" y2="6"  stroke={c(1)} strokeWidth="5" strokeLinecap="round"/>
      <line x1="58" y1="12" x2="58" y2="52" stroke={c(2)} strokeWidth="5" strokeLinecap="round"/>
      <line x1="12" y1="58" x2="52" y2="58" stroke={c(3)} strokeWidth="5" strokeLinecap="round"/>
      <line x1="6"  y1="12" x2="6"  y2="52" stroke={c(4)} strokeWidth="5" strokeLinecap="round"/>
      <line x1="52" y1="6"  x2="12" y2="58" stroke={c(5)} strokeWidth="5" strokeLinecap="round"/>
    </svg>
  )
}

export function TanteadorPalillos({ ptsJ, ptsM, limite, nombreJ = 'Vos', nombreM = 'Rival', className = '' }) {
  const puntosJ      = Number(ptsJ)    || 0
  const puntosM      = Number(ptsM)    || 0
  const limiteValido = Number(limite)  || 30
  const mitad        = Math.floor(limiteValido / 2)
  const totalGrupos  = Math.ceil(limiteValido / 5)

  const renderPalillos = (pts, stroke) =>
    Array.from({ length: totalGrupos }, (_, g) => (
      <GrupoCincoPalillos
        key={g}
        cantidad={Math.max(0, Math.min(5, pts - g * 5))}
        stroke={stroke}
      />
    ))

  const Fila = ({ pts, nombre, stroke, colorLabel }) => (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold truncate max-w-[90px] ${colorLabel}`} title={nombre}>{nombre}</span>
        <div className="flex items-center gap-1.5">
          {pts >= mitad && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-900/70 text-green-300 font-semibold">
              Buenas
            </span>
          )}
          <span className={`${colorLabel} text-sm font-black w-6 text-right tabular-nums`}>{pts}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-0.5 items-center">
        {renderPalillos(pts, stroke)}
      </div>
    </div>
  )

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-2xl p-3 flex flex-col gap-2 ${className}`}>
      <p className="text-[10px] text-gray-500 uppercase tracking-widest text-center font-semibold">
        Tanteador — Meta {limiteValido}
      </p>
      <Fila pts={puntosJ} nombre={nombreJ} stroke="#a855f7" colorLabel="text-purple-400"/>
      <div className="h-px bg-gray-700/60"/>
      <Fila pts={puntosM} nombre={nombreM} stroke="#f87171" colorLabel="text-red-400"/>
    </div>
  )
}
