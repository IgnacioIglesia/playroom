import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

export default function TrucoOnline2v2() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 max-w-md w-full text-center flex flex-col gap-6">
          <span className="text-6xl">🚧</span>
          <h2 className="text-3xl font-extrabold">Truco 2vs2</h2>
          <p className="text-gray-400">Esta modalidad está en desarrollo. ¡Pronto disponible!</p>
          <button
            onClick={() => navigate('/juegos/truco-online')}
            className="border border-gray-700 hover:border-purple-500 text-gray-300 py-3 rounded-2xl font-semibold transition"
          >
            ← Volver
          </button>
        </div>
      </div>
      <Footer />
    </div>
  )
}