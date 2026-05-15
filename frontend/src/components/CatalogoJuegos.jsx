import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const juegos = [
  {
    nombre: 'Truco Online',
    imagen: '/juegos/truco.svg',
    descripcion: 'El clásico rioplatense contra rivales reales. Modalidades 1vs1 y 2vs2.',
    estado: 'Disponible',
    jugadores: '2-4',
    categoria: 'Cartas',
    modo: 'online',
    ruta: '/juegos/truco-online',
  },
  {
    nombre: 'Poker',
    imagen: '/juegos/poker.svg',
    descripcion: "Texas Hold'em online. Creá una sala o entrá con código.",
    estado: 'Disponible',
    jugadores: '2-6',
    categoria: 'Cartas',
    modo: 'online',
    ruta: '/juegos/poker',
  },
  {
    nombre: 'Uno',
    imagen: '/juegos/uno.svg',
    descripcion: 'Jugá tu última carta antes que todos.',
    estado: 'Disponible',
    jugadores: '2-6',
    categoria: 'Cartas',
    modo: 'online',
    ruta: '/juegos/uno',
  },
  {
    nombre: 'Pictionary',
    imagen: '/juegos/pictionary.svg',
    descripcion: 'Dibujá una palabra y hacé que tus amigos la adivinen.',
    estado: 'Disponible',
    jugadores: '3-8',
    categoria: 'Social',
    modo: 'online',
    ruta: '/juegos/pictionary',
  },
  {
    nombre: 'Truco',
    imagen: '/juegos/truco.svg',
    descripcion: 'El clásico rioplatense contra la máquina.',
    estado: 'Disponible',
    jugadores: '1',
    categoria: 'Cartas',
    modo: 'solo',
    ruta: '/juegos/truco',
  },
  {
    nombre: 'Adivina la Bandera',
    imagen: '/juegos/banderas.svg',
    descripcion: 'Te mostramos la bandera, adiviná el país.',
    estado: 'Disponible',
    jugadores: '1-2',
    categoria: 'Trivia',
    modo: 'local',
    ruta: '/juegos/banderas',
  },
  {
    nombre: 'Adivina la Capital',
    imagen: '/juegos/capitales.svg',
    descripcion: 'Adiviná capitales del mundo. Solo o contra un amigo.',
    estado: 'Disponible',
    jugadores: '1-2',
    categoria: 'Trivia',
    modo: 'local',
    ruta: '/juegos/capitales',
  },
  {
    nombre: 'Adivina la Palabra',
    imagen: '/juegos/palabras.svg',
    descripcion: 'Una palabra diaria, seis intentos y rachas en el ranking.',
    estado: 'Disponible',
    jugadores: '1',
    categoria: 'Palabras',
    modo: 'solo',
    ruta: '/juegos/palabras',
  },
  {
    nombre: 'Buscaminas',
    imagen: '/juegos/buscaminas.svg',
    descripcion: 'Descubrí las minas sin explotar. Cinco niveles de dificultad.',
    estado: 'Disponible',
    jugadores: '1',
    categoria: 'Estrategia',
    modo: 'solo',
    ruta: '/juegos/buscaminas',
  },
  {
    nombre: 'Sudoku',
    imagen: '/juegos/sudoku.svg',
    descripcion: 'Completá la cuadrícula con números del 1 al 9 sin repetir.',
    estado: 'Disponible',
    jugadores: '1',
    categoria: 'Lógica',
    modo: 'solo',
    ruta: '/juegos/sudoku',
  },
  {
    nombre: 'Solitario',
    imagen: '/juegos/solitario.svg',
    descripcion: 'El clásico juego de cartas. Ordená todas las cartas por palo.',
    estado: 'Disponible',
    jugadores: '1',
    categoria: 'Cartas',
    modo: 'solo',
    ruta: '/juegos/solitario',
  },
  {
    nombre: 'Impostor',
    imagen: '/juegos/impostor.svg',
    descripcion: 'Encontrá al impostor antes de que sea tarde.',
    estado: 'Próximamente',
    jugadores: '3-10',
    categoria: 'Social',
    modo: 'online',
    ruta: null,
  },
  {
    nombre: 'Trivia',
    imagen: '/juegos/trivia.svg',
    descripcion: 'Poné a prueba tu conocimiento contra tus amigos.',
    estado: 'Próximamente',
    jugadores: '2-8',
    categoria: 'Trivia',
    modo: 'online',
    ruta: null,
  },
  {
    nombre: 'Crucigrama',
    imagen: '/juegos/crossword.svg',
    descripcion: 'Completá las palabras horizontales y verticales con las pistas.',
    estado: 'Próximamente',
    jugadores: '1',
    categoria: 'Palabras',
    modo: 'solo',
    ruta: null,
  },
  {
    nombre: 'Mayor o Menor',
    imagen: '/juegos/mayormenor.svg',
    descripcion: '¿Cuál gana? Elegí rápido.',
    estado: 'Próximamente',
    jugadores: '1',
    categoria: 'Trivia',
    modo: 'solo',
    ruta: null,
  },
]

const categorias = ['Todas', 'Cartas', 'Estrategia', 'Lógica', 'Palabras', 'Social', 'Trivia']

const MODO_CONFIG = {
  online: {
    label: 'Online',
    dot: 'bg-green-400 animate-pulse',
    text: 'text-green-400',
    bg: 'bg-green-950/70 border-green-700/30',
  },
  local: {
    label: 'Local',
    dot: 'bg-blue-400',
    text: 'text-blue-400',
    bg: 'bg-blue-950/70 border-blue-700/30',
  },
  solo: {
    label: 'Solo',
    dot: 'bg-gray-500',
    text: 'text-gray-400',
    bg: 'bg-white/[0.06] border-white/[0.10]',
  },
}

const IconPlayers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 flex-shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)

function GameCard({ juego }) {
  const navigate = useNavigate()
  const modo = MODO_CONFIG[juego.modo] || MODO_CONFIG.solo

  return (
    <div
      onClick={() => juego.ruta && navigate(juego.ruta)}
      className="group cursor-pointer rounded-2xl overflow-hidden flex flex-col border border-purple-500/15 hover:border-purple-500/45 bg-[#0d0b1a] hover:bg-[#110e22] transition-all duration-200 hover:shadow-[0_0_32px_rgba(139,92,246,0.10)]"
      style={{ minHeight: '280px' }}
    >
      {/* Image area */}
      <div
        className="relative h-32 flex-shrink-0 overflow-hidden"
        style={{ background: 'linear-gradient(145deg, rgba(88,28,135,0.40) 0%, rgba(30,8,60,0.65) 100%)' }}
      >
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.07) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
        <img
          src={juego.imagen}
          alt={juego.nombre}
          className="relative w-full h-full object-contain p-5 group-hover:scale-[1.07] transition-transform duration-300 drop-shadow-lg"
        />

        {/* Category - top left */}
        <span className="absolute top-2.5 left-2.5 text-[9px] px-2 py-0.5 rounded-full font-bold backdrop-blur-sm bg-black/50 text-purple-300 border border-purple-700/25">
          {juego.categoria}
        </span>

        {/* Mode - top right */}
        <span className={`absolute top-2.5 right-2.5 flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold backdrop-blur-sm border ${modo.bg} ${modo.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${modo.dot}`} />
          {modo.label}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="text-white font-bold text-sm leading-snug">{juego.nombre}</h3>
        <p className="text-gray-500 text-xs leading-relaxed flex-1">{juego.descripcion}</p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/[0.05]">
          <span className="flex items-center gap-1.5 text-gray-600 text-[10px]">
            <IconPlayers />
            {juego.jugadores === '1' ? 'Solo' : `${juego.jugadores} jug.`}
          </span>
          <button
            onClick={e => { e.stopPropagation(); juego.ruta && navigate(juego.ruta) }}
            className="bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-lg transition-colors"
          >
            Jugar →
          </button>
        </div>
      </div>
    </div>
  )
}

function ComingSoonCard({ juego }) {
  const modo = MODO_CONFIG[juego.modo] || MODO_CONFIG.solo

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col border border-white/[0.06] bg-[#0a0812]"
      style={{ minHeight: '280px' }}
    >
      {/* Image area */}
      <div
        className="relative h-32 flex-shrink-0 overflow-hidden"
        style={{ background: 'linear-gradient(145deg, rgba(20,15,35,0.9) 0%, rgba(10,8,18,0.95) 100%)' }}
      >
        <img
          src={juego.imagen}
          alt={juego.nombre}
          className="w-full h-full object-contain p-5 grayscale opacity-25"
        />
        <span className="absolute top-2.5 left-2.5 text-[9px] px-2 py-0.5 rounded-full font-bold bg-white/[0.05] text-gray-600 border border-white/[0.07]">
          {juego.categoria}
        </span>
        <span className={`absolute top-2.5 right-2.5 flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold border bg-white/[0.04] border-white/[0.08] text-gray-600`}>
          <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
          {modo.label}
        </span>

        {/* Center lock */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/[0.08] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="text-gray-500 font-bold text-sm leading-snug">{juego.nombre}</h3>
        <p className="text-gray-700 text-xs leading-relaxed flex-1">{juego.descripcion}</p>

        <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/[0.04]">
          <span className="flex items-center gap-1.5 text-gray-700 text-[10px]">
            <IconPlayers />
            {juego.jugadores === '1' ? 'Solo' : `${juego.jugadores} jug.`}
          </span>
          <span className="text-[10px] font-semibold text-gray-700 bg-white/[0.04] border border-white/[0.07] px-3 py-1 rounded-lg">
            Próximamente
          </span>
        </div>
      </div>
    </div>
  )
}

export default function CatalogoJuegos() {
  const [categoriaActiva, setCategoriaActiva] = useState('Todas')

  const filtrados = categoriaActiva === 'Todas'
    ? juegos
    : juegos.filter(j => j.categoria === categoriaActiva)

  const disponibles   = filtrados.filter(j => j.estado === 'Disponible')
  const proximamente  = filtrados.filter(j => j.estado === 'Próximamente')

  const onlineCount = disponibles.filter(j => j.modo === 'online').length

  return (
    <section className="px-4 sm:px-6 pb-24 flex-1 max-w-6xl mx-auto w-full">

      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-8 pb-8 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-gray-400 text-xs">{disponibles.length} juegos disponibles</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-gray-400 text-xs">{onlineCount} con multijugador online</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-gray-700 text-xs">{proximamente.length} en desarrollo</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-8">
        {categorias.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              categoriaActiva === cat
                ? 'bg-purple-600 text-white shadow-[0_0_18px_rgba(139,92,246,0.28)]'
                : 'bg-white/[0.04] border border-white/[0.07] text-gray-400 hover:text-white hover:bg-white/[0.07] hover:border-white/[0.12]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-8">
        {[
          { dot: 'bg-green-400 animate-pulse', label: 'Online — jugás contra otros', color: 'text-gray-500' },
          { dot: 'bg-blue-400', label: 'Local — mismo dispositivo', color: 'text-gray-500' },
          { dot: 'bg-gray-500', label: 'Solo — un jugador', color: 'text-gray-500' },
        ].map(item => (
          <span key={item.label} className={`flex items-center gap-1.5 text-[10px] ${item.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
            {item.label}
          </span>
        ))}
      </div>

      {/* Disponibles */}
      {disponibles.length > 0 && (
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Disponibles</p>
            <span className="text-gray-700 text-xs">{disponibles.length}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {disponibles.map(juego => (
              <GameCard key={juego.nombre} juego={juego} />
            ))}
          </div>
        </div>
      )}

      {/* Próximamente */}
      {proximamente.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-700" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">En desarrollo</p>
            <span className="text-gray-700 text-xs">{proximamente.length}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {proximamente.map(juego => (
              <ComingSoonCard key={juego.nombre} juego={juego} />
            ))}
          </div>
        </div>
      )}

    </section>
  )
}
