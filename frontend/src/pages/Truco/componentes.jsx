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
    <div className="w-14 md:w-16 h-20 md:h-24 rounded-lg overflow-hidden shadow-md border border-gray-600 flex-shrink-0">
      <img src={backImg} alt="?" className="w-full h-full object-cover"/>
    </div>
  )

  return (
    <button
      onClick={onClick}
      disabled={!onClick || jugada}
      className={`w-14 md:w-16 h-20 md:h-24 relative rounded-lg overflow-hidden shadow-md transition-all select-none flex-shrink-0
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

export function CartaMuestra({ carta }) {
  if (!carta) return null
  const esPieza = MUESTRAS_ESPECIALES.includes(carta.numero)
  return (
    <div
      className="relative rounded-lg overflow-hidden shadow-lg flex-shrink-0"
      style={{
        width: '48px', height: '74px',
        outline: esPieza ? '2px solid rgba(234,179,8,0.9)' : '1px solid rgba(234,179,8,0.5)',
        boxShadow: '0 0 12px rgba(234,179,8,0.35)',
      }}
    >
      <img src={cardImg(carta)} alt="muestra" className="w-full h-full object-cover" draggable={false}/>
      <span className="absolute top-0.5 right-0.5 bg-yellow-400 text-black text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-black leading-none z-10">M</span>
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

function GrupoCincoPalillos({ cantidad, stroke, inactive = '#374151' }) {
  const c = (n) => n <= cantidad ? stroke : inactive
  return (
    <svg width="56" height="56" viewBox="0 0 64 64">
      <line x1="12" y1="6"  x2="52" y2="6"  stroke={c(1)} strokeWidth="4" strokeLinecap="round"/>
      <line x1="58" y1="12" x2="58" y2="52" stroke={c(2)} strokeWidth="4" strokeLinecap="round"/>
      <line x1="12" y1="58" x2="52" y2="58" stroke={c(3)} strokeWidth="4" strokeLinecap="round"/>
      <line x1="6"  y1="12" x2="6"  y2="52" stroke={c(4)} strokeWidth="4" strokeLinecap="round"/>
      <line x1="52" y1="6"  x2="12" y2="58" stroke={c(5)} strokeWidth="4" strokeLinecap="round"/>
    </svg>
  )
}

export function TanteadorPalillos({ ptsJ, ptsM, limite, nombreJ = 'Vos', nombreM = 'Rival' }) {
  const puntosJ      = Number(ptsJ)    || 0
  const puntosM      = Number(ptsM)    || 0
  const limiteValido = Number(limite)  || 30
  const mitad        = Math.floor(limiteValido / 2)

  const palillo = (n, stroke) => {
    const grupos = []
    const llenos = Math.floor(n / 5)
    const resto  = n % 5
    for (let i = 0; i < llenos; i++) {
      grupos.push(<GrupoCincoPalillos key={`g${i}`} cantidad={5} stroke={stroke}/>)
    }
    if (resto > 0) {
      grupos.push(<GrupoCincoPalillos key="r" cantidad={resto} stroke={stroke}/>)
    }
    return grupos
  }

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
      <div className="flex flex-wrap gap-0.5 min-h-[20px] items-center">
        {pts === 0
          ? <span className="text-gray-700 text-[10px] italic pl-1">sin puntos</span>
          : palillo(pts, stroke)
        }
      </div>
    </div>
  )

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex flex-col gap-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest text-center font-semibold">
        Tanteador — Meta {limiteValido}
      </p>
      <Fila pts={puntosJ} nombre={nombreJ} stroke="#a855f7" colorLabel="text-purple-400"/>
      <div className="h-px bg-gray-700/60"/>
      <Fila pts={puntosM} nombre={nombreM} stroke="#f87171" colorLabel="text-red-400"/>
    </div>
  )
}
