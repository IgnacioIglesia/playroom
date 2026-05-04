import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const juegos = [
  {
    nombre: 'Adivina la Bandera',
    imagen: '/juegos/capitales.svg',
    descripcion: 'Te mostramos la bandera, adiviná el país.',
    estado: 'Disponible',
    jugadores: '1',
    categoria: 'Trivia',
    ruta: '/juegos/banderas',
  },
  {
    nombre: 'Adivina la Capital',
    imagen: '/juegos/capitales.svg',
    descripcion: 'Adiviná capitales del mundo. Solo o contra un amigo.',
    estado: 'Disponible',
    jugadores: '1',
    categoria: 'Trivia',
    ruta: '/juegos/capitales',
  },
  {
    nombre: 'Truco',
    imagen: '/juegos/truco.svg',
    descripcion: 'El clásico rioplatense. Engañá, cantá y ganá.',
    estado: 'Disponible',
    jugadores: '1',
    categoria: 'Cartas',
    ruta: '/juegos/truco',
  },
  {
    nombre: 'Truco Online',
    imagen: '/juegos/truco.svg',
    descripcion: 'Jugá al Truco contra rivales online. Modalidades 1vs1 y 2vs2.',
    estado: 'Disponible',
    jugadores: '2-4',
    categoria: 'Cartas',
    ruta: '/juegos/truco-online',
  },
  {
    nombre: 'Impostor',
    imagen: '/juegos/impostor.svg',
    descripcion: 'Encontrá al impostor antes de que sea tarde.',
    estado: 'Próximamente',
    jugadores: '3-10',
    categoria: 'Social',
    ruta: null,
  },
  {
    nombre: 'Poker',
    imagen: '/juegos/poker.svg',
    descripcion: 'Estrategia, paciencia y mente fría. ¿Tenés lo que se necesita?',
    estado: 'Próximamente',
    jugadores: '6',
    categoria: 'Cartas',
    ruta: null,
  },
  {
    nombre: 'Trivia',
    imagen: '/juegos/trivia.svg',
    descripcion: 'Poné a prueba tu conocimiento contra tus amigos.',
    estado: 'Próximamente',
    jugadores: '2-8',
    categoria: 'Trivia',
    ruta: null,
  },
  {
    nombre: 'Buscaminas',
    imagen: '/juegos/buscaminas.svg',
    descripcion: 'Descubrí las minas sin explotar. ¡Cuidado con los números!',
    estado: 'Disponible',
    jugadores: '1',
    categoria: 'Estrategia',
    ruta: '/juegos/buscaminas',
  },
  {
    nombre: 'Sudoku',
    imagen: '/juegos/sudoku.svg',
    descripcion: 'Completá la cuadrícula con números del 1 al 9 sin repetir.',
    estado: 'Disponible',
    jugadores: '1',
    categoria: 'Lógica',
    ruta: '/juegos/sudoku',
  },
  {
    nombre: 'Solitario',
    imagen: '/juegos/solitario.svg',
    descripcion: 'El clásico juego de cartas. Ordená todas las cartas por palo.',
    estado: 'Próximamente',
    jugadores: '1',
    categoria: 'Cartas',
    ruta: null,
  },
  {
    nombre: 'Crucigrama',
    imagen: '/juegos/crossword.svg',
    descripcion: 'Completá las palabras horizontales y verticales con las pistas.',
    estado: 'Próximamente',
    jugadores: '1',
    categoria: 'Palabras',
    ruta: null,
  },
  {
    nombre: 'Adivina la Palabra',
    imagen: '/juegos/palabras.svg',
    descripcion: 'Una palabra, pocos intentos. ¿Podés adivinarla?',
    estado: 'Próximamente',
    jugadores: '1',
    categoria: 'Palabras',
    ruta: null,
  },
  {
    nombre: 'Uno',
    imagen: '/juegos/uno.svg',
    descripcion: 'Jugá tu última carta',
    estado: 'Próximamente',
    jugadores: '3-6',
    categoria: 'Cartas',
    ruta: null,
  },
  {
    nombre: 'Pictionary',
    imagen: '/juegos/pictionary.svg',
    descripcion: 'Dibujá y hacelos adivinar',
    estado: 'Próximamente',
    jugadores: '3-6',
    categoria: 'Social',
    ruta: null,
  },
  {
    nombre: 'Mayor o Menor',
    imagen: '/juegos/mayormenor.svg',
    descripcion: '¿Cuál gana? Elegí rápido',
    estado: 'Próximamente',
    jugadores: '1',
    categoria: 'Trivia',
    ruta: null,
  },
]

const categorias = ['Todas', 'Cartas', 'Estrategia', 'Lógica', 'Palabras', 'Social', 'Trivia']

const IconPlayers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)

function CatalogoJuegos() {
  const [categoriaActiva, setCategoriaActiva] = useState('Todas')
  const navigate = useNavigate()

  const filtrados = categoriaActiva === 'Todas'
    ? juegos
    : juegos.filter((j) => j.categoria === categoriaActiva)

  const disponibles = filtrados.filter(j => j.estado === 'Disponible')
  const proximamente = filtrados.filter(j => j.estado === 'Próximamente')

  return (
    <section className="px-6 pb-24 flex-1 max-w-5xl mx-auto w-full">

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-10">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              categoriaActiva === cat
                ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                : 'bg-white/[0.04] border border-white/[0.07] text-gray-400 hover:text-white hover:bg-white/[0.07] hover:border-white/[0.12]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Juegos disponibles */}
      {disponibles.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Disponibles</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {disponibles.map((juego) => (
              <div
                key={juego.nombre}
                onClick={() => juego.ruta && navigate(juego.ruta)}
                className="group cursor-pointer bg-white/[0.04] border border-purple-500/20 hover:border-purple-500/50 rounded-2xl overflow-hidden flex flex-col transition-all hover:bg-white/[0.07] hover:shadow-[0_0_32px_rgba(139,92,246,0.12)]"
              >
                <div className="h-40 flex items-center justify-center relative overflow-hidden rounded-t-2xl" style={{ background: 'linear-gradient(135deg, rgba(88,28,135,0.5) 0%, rgba(49,10,90,0.6) 100%)' }}>
                  <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.08) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                  <img src={juego.imagen} alt={juego.nombre} className="relative w-full h-full object-contain p-6 drop-shadow-lg group-hover:scale-105 transition-transform duration-300" />
                  <span className="absolute top-3 left-3 text-[10px] px-2.5 py-1 rounded-full font-semibold bg-purple-950/70 text-purple-300 border border-purple-700/30">
                    {juego.categoria}
                  </span>
                </div>
                <div className="p-5 flex flex-col gap-2 flex-1 border-t border-white/[0.05]">
                  <h3 className="text-white font-bold text-base">{juego.nombre}</h3>
                  <p className="text-gray-400 text-sm flex-1 leading-relaxed">{juego.descripcion}</p>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/[0.06]">
                    <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                      <IconPlayers /> {juego.jugadores} {juego.jugadores === '1' ? 'jugador' : 'jugadores'}
                    </span>
                    <button className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-4 py-2 rounded-lg transition font-semibold">
                      Jugar →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Próximamente */}
      {proximamente.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Próximamente</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {proximamente.map((juego) => (
              <div
                key={juego.nombre}
                className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col opacity-60"
              >
                <div className="h-40 flex items-center justify-center relative overflow-hidden rounded-t-2xl" style={{ background: 'linear-gradient(135deg, rgba(30,30,40,0.8) 0%, rgba(20,20,30,0.9) 100%)' }}>
                  <img src={juego.imagen} alt={juego.nombre} className="w-full h-full object-contain p-6 grayscale opacity-40" />
                  <span className="absolute top-3 left-3 text-[10px] px-2.5 py-1 rounded-full font-semibold bg-gray-800 text-gray-400 border border-gray-700">
                    {juego.categoria}
                  </span>
                  <span className="absolute top-3 right-3 text-[10px] px-2.5 py-1 rounded-full font-semibold bg-gray-800 text-gray-400 border border-gray-700">
                    Próximamente
                  </span>
                </div>
                <div className="p-5 flex flex-col gap-2 flex-1 border-t border-white/[0.04]">
                  <h3 className="text-gray-300 font-bold text-base">{juego.nombre}</h3>
                  <p className="text-gray-500 text-sm flex-1 leading-relaxed">{juego.descripcion}</p>
                  <div className="flex items-center mt-3 pt-3 border-t border-white/[0.04]">
                    <span className="flex items-center gap-1.5 text-gray-600 text-xs">
                      <IconPlayers /> {juego.jugadores} {juego.jugadores === '1' ? 'jugador' : 'jugadores'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </section>
  )
}

export default CatalogoJuegos
