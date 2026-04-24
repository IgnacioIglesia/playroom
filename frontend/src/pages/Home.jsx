import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />

      {/* HERO */}
      <section className="relative flex flex-col md:flex-row items-center justify-between px-12 py-32 gap-12 max-w-7xl mx-auto w-full overflow-hidden">

        {/* Círculo decorativo de fondo */}
        <div className="absolute right-0 top-0 w-[600px] h-[600px] rounded-full bg-purple-900 opacity-10 blur-3xl pointer-events-none" />

        {/* Texto izquierda */}
        <div className="flex flex-col items-start gap-8 flex-1 z-10">
          <span className="bg-purple-900 text-purple-300 text-xs font-semibold px-4 py-2 rounded-full uppercase tracking-widest">
            🎮 Tu sala de juegos virtual
          </span>
          <h1 className="text-7xl font-extrabold leading-none tracking-tight">
            Play<span className="text-purple-400">Room</span>
          </h1>
          <p className="text-gray-300 text-xl max-w-lg leading-relaxed">
            Jugá con tus amigos desde cualquier lugar.<br/>
            Sin descargas. Sin complicaciones. Solo diversión.
          </p>
          <div className="flex gap-4 flex-wrap mt-2">
            <button
                onClick={() => navigate('/juegos')}
                className="bg-purple-600 hover:bg-purple-500 text-white px-12 py-5 rounded-2xl text-xl font-bold transition-all hover:scale-105"
            >
                Jugar ahora →
            </button>
            </div>

          {/* Stats */}
          <div className="flex gap-8 mt-4">
            {[
              { valor: '5+', label: 'Juegos' },
              { valor: '10', label: 'Jugadores por sala' },
              { valor: '0', label: 'Descargas necesarias' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col">
                <span className="text-3xl font-extrabold text-purple-400">{s.valor}</span>
                <span className="text-gray-500 text-sm">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ilustración derecha */}
        <div className="flex-1 flex justify-center z-10">
          <img
            src="/hero.svg"
            alt="Elementos de juego"
            className="w-full max-w-xl"
          />
        </div>

      </section>

      {/* QUÉ ES PLAYROOM */}
      <section className="bg-gray-900 py-24 px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-20">
          <div className="flex-1 grid grid-cols-2 gap-5">
            {[
              { emoji: '🃏', label: 'Blackjack', color: 'border-purple-700' },
              { emoji: '🕵️', label: 'Impostor', color: 'border-purple-700' },
              { emoji: '♠️', label: 'Truco', color: 'border-purple-700' },
              { emoji: '🧠', label: 'Trivia', color: 'border-purple-700' },
            ].map((j) => (
              <div key={j.label} className={`bg-gray-800 rounded-2xl p-8 flex flex-col items-center gap-3 border ${j.color} hover:bg-gray-700 transition`}>
                <span className="text-5xl">{j.emoji}</span>
                <span className="text-base font-semibold text-gray-200">{j.label}</span>
              </div>
            ))}
          </div>
          <div className="flex-1 flex flex-col gap-6">
            <h2 className="text-5xl font-bold leading-tight">
              ¿Qué es<br/><span className="text-purple-400">PlayRoom</span>?
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              PlayRoom es una plataforma web donde podés jugar a tus juegos favoritos con amigos, desde cualquier dispositivo y sin necesidad de descargar nada.
            </p>
            <div className="flex flex-col gap-4 mt-2">
              {[
                { icon: '🎮', texto: 'Sin descargas, jugás directo desde el navegador' },
                { icon: '👥', texto: 'Hasta 10 jugadores por sala' },
                { icon: '🔗', texto: 'Compartí el link y listo' },
                { icon: '📱', texto: 'Funciona en celular y computadora' },
              ].map((item) => (
                <div key={item.texto} className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 border border-gray-700">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-gray-300 text-sm font-medium">{item.texto}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* POR QUÉ PLAYROOM */}
      <section className="py-24 px-8 bg-gray-950">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-12">
          <h2 className="text-5xl font-bold text-center">
            ¿Por qué <span className="text-purple-400">PlayRoom</span>?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {[
              { titulo: '⚡ Rápido', desc: 'Entrás, creás una sala y en 30 segundos ya estás jugando con tus amigos.' },
              { titulo: '🌎 Sin fronteras', desc: 'Tu amigo está en otro país. No importa, jueguen igual desde el navegador.' },
              { titulo: '🎲 Variedad', desc: 'Cartas, deducción social, trivia y más. Siempre hay algo para jugar.' },
            ].map((item) => (
              <div key={item.titulo} className="bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-purple-700 transition flex flex-col gap-4">
                <h3 className="font-bold text-white text-2xl">{item.titulo}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/juegos')}
            className="bg-purple-600 hover:bg-purple-500 text-white px-12 py-5 rounded-2xl text-xl font-bold transition-all hover:scale-105 mt-4"
          >
            Ver todos los juegos →
          </button>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Home