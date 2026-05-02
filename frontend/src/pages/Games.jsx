import Navbar from '../components/Navbar'
import CatalogoJuegos from '../components/CatalogoJuegos'
import Footer from '../components/Footer'

function Games() {
  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="relative px-6 pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(109,40,217,0.18),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p className="text-purple-400 font-semibold text-xs uppercase tracking-widest mb-3">Catálogo</p>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Elegí tu juego
            </h1>
            <p className="text-gray-400 mt-3 text-base max-w-md">
              Creá una sala y jugá con tus amigos en segundos. Sin descargas.
            </p>
          </div>
          <button className="flex-shrink-0 flex items-center gap-2 border border-white/10 hover:border-purple-500/40 bg-white/[0.04] hover:bg-white/[0.07] text-gray-300 hover:text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Unirse con código
          </button>
        </div>
      </div>

      <CatalogoJuegos />
      <Footer />
    </div>
  )
}

export default Games
