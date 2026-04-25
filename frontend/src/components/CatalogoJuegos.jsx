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
    nombre: 'Adivina la Palabra',
    imagen: '/juegos/palabras.svg',
    descripcion: 'Una palabra, pocos intentos. ¿Podés adivinarla?',
    estado: 'Próximamente',
    jugadores: '1',
    categoria: 'Palabras',
    ruta: null,
  },
  {
    nombre: 'Buscaminas',
    imagen: '/juegos/buscaminas.svg',
    descripcion: 'Descubrí las minas sin explotar. ¡Cuidado con los números!',
    estado: 'Próximamente',
    jugadores: '1',
    categoria: 'Estrategia',
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
    nombre: 'Impostor',
    imagen: '/juegos/impostor.svg',
    descripcion: 'Encontrá al impostor antes de que sea tarde.',
    estado: 'Próximamente',
    jugadores: '4-10',
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
    nombre: 'Solitario',
    imagen: '/juegos/solitario.svg',
    descripcion: 'El clásico juego de cartas. Ordená todas las cartas por palo.',
    estado: 'Próximamente',
    jugadores: '1',
    categoria: 'Cartas',
    ruta: null,
  },
  {
    nombre: 'Sopa de Letras',
    imagen: '/juegos/sopa-letras.svg',
    descripcion: 'Encontrá las palabras ocultas en la cuadrícula de letras.',
    estado: 'Próximamente',
    jugadores: '1',
    categoria: 'Palabras',
    ruta: null,
  },
  {
    nombre: 'Sudoku',
    imagen: '/juegos/sudoku.svg',
    descripcion: 'Completá la cuadrícula con números del 1 al 9 sin repetir.',
    estado: 'Próximamente',
    jugadores: '1',
    categoria: 'Lógica',
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
    descripcion: 'Jugá al Truco contra un amigo online en tiempo real.',
    estado: 'Disponible',
    jugadores: '2-6',
    categoria: 'Cartas',
    ruta: '/juegos/truco-online',
  },
]

const categorias = ['Todas', 'Cartas', 'Estrategia', 'Lógica', 'Palabras', 'Social', 'Trivia']

function CatalogoJuegos() {
  const [categoriaActiva, setCategoriaActiva] = useState('Todas')
  const navigate = useNavigate()

  const filtrados = categoriaActiva === 'Todas'
    ? juegos
    : juegos.filter((j) => j.categoria === categoriaActiva)

  return (
    <section className="px-8 py-16 bg-gray-950 flex-1">

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap mb-10 max-w-5xl mx-auto">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
              categoriaActiva === cat
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid de juegos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {filtrados.map((juego) => (
          <div
            key={juego.nombre}
            className={`bg-gray-900 border rounded-2xl overflow-hidden flex flex-col transition
              ${juego.estado === 'Disponible'
                ? 'border-purple-600 hover:border-purple-400 hover:scale-105 cursor-pointer'
                : 'border-gray-800 opacity-70'
              }`}
            onClick={() => juego.ruta && navigate(juego.ruta)}
          >
            {/* Imagen SVG */}
            <div className="relative h-40 overflow-hidden bg-gray-800">
              <img
                src={juego.imagen}
                alt={juego.nombre}
                className="w-full h-full object-cover"
              />
              <span className={`absolute top-3 right-3 text-xs px-3 py-1 rounded-full font-semibold ${
                juego.estado === 'Disponible'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}>
                {juego.estado}
              </span>
              <span className="absolute top-3 left-3 text-xs px-3 py-1 rounded-full font-semibold bg-purple-900 text-purple-300">
                {juego.categoria}
              </span>
            </div>

            {/* Info */}
            <div className="p-5 flex flex-col gap-2 flex-1">
              <h3 className="text-lg font-bold text-white">{juego.nombre}</h3>
              <p className="text-gray-400 text-sm flex-1">{juego.descripcion}</p>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-800">
                <span className="text-gray-500 text-xs">👥 {juego.jugadores} jugadores</span>
                {juego.estado === 'Disponible' && (
                  <button className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-4 py-2 rounded-lg transition font-semibold">
                    Jugar →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

    </section>
  )
}

export default CatalogoJuegos