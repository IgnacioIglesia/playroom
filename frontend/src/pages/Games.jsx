import Navbar from '../components/Navbar'
import CatalogoJuegos from '../components/CatalogoJuegos'
import Footer from '../components/Footer'

function Games() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />

      <div className="px-8 pt-12 max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center mb-2">
            <h1 className="text-4xl font-extrabold">Elegí tu juego</h1>
            <button className="border-2 border-gray-700 hover:border-purple-500 text-gray-300 hover:text-white px-6 py-3 rounded-xl text-sm font-semibold transition">
            🔗 Unirse con código
            </button>
        </div>
        <p className="text-gray-400 mb-10">Creá una sala y jugá con tus amigos en segundos.</p>
        </div>

      <CatalogoJuegos />
      <Footer />
    </div>
  )
}

export default Games