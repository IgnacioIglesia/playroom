import { useState } from 'react'
import { updateProfile } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Avatar from '../components/Avatar'

const AVATARES_PRESET = [
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Felix',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Mia',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Jasper',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Luna',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Nova',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Ranger',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Ghost',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Storm',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Blaze',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Neon',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Shadow',
]

export default function Perfil() {
  const { usuario, refrescarUsuario } = useAuth()

  const [nombre, setNombre]         = useState(usuario?.displayName || '')
  const [avatarSel, setAvatarSel]   = useState(usuario?.photoURL || '')
  const [urlCustom, setUrlCustom]   = useState('')
  const [guardando, setGuardando]   = useState(false)
  const [exito, setExito]           = useState(false)
  const [error, setError]           = useState('')

  const avatarPreview = urlCustom.trim() || avatarSel || null
  const usuarioPreview = { ...usuario, displayName: nombre || usuario?.displayName, photoURL: avatarPreview }

  const handleGuardar = async () => {
    if (!auth.currentUser) return
    setGuardando(true)
    setError('')
    setExito(false)
    try {
      await updateProfile(auth.currentUser, {
        displayName: nombre.trim() || usuario?.displayName,
        photoURL: avatarPreview || usuario?.photoURL || '',
      })
      await refrescarUsuario()
      setExito(true)
      setUrlCustom('')
      setTimeout(() => setExito(false), 3000)
    } catch (e) {
      setError('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-xl flex flex-col gap-6">

          {/* Título */}
          <div>
            <h1 className="text-2xl font-extrabold">Mi perfil</h1>
            <p className="text-gray-500 text-sm mt-1">Personalizá tu cuenta</p>
          </div>

          {/* Preview del avatar actual */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-center gap-5">
            <Avatar usuario={usuarioPreview} size="xl" />
            <div className="min-w-0">
              <p className="text-white font-bold text-lg truncate">
                {nombre || usuario?.displayName || 'Sin nombre'}
              </p>
              <p className="text-gray-500 text-sm truncate">{usuario?.email}</p>
            </div>
          </div>

          {/* Nombre */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-3">
            <p className="text-sm font-semibold text-gray-300">Nombre de usuario</p>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre"
              maxLength={30}
              className="bg-gray-800 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition"
            />
          </div>

          {/* Avatares preset */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-sm font-semibold text-gray-300">Elegí un avatar</p>
            <div className="grid grid-cols-6 gap-3">
              {AVATARES_PRESET.map((url) => {
                const seleccionado = avatarSel === url && !urlCustom.trim()
                return (
                  <button
                    key={url}
                    onClick={() => { setAvatarSel(url); setUrlCustom('') }}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition ${
                      seleccionado
                        ? 'border-purple-500 scale-105 shadow-lg shadow-purple-900/50'
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover bg-gray-800" />
                  </button>
                )
              })}
            </div>

            {/* URL personalizada */}
            <div className="flex flex-col gap-2 pt-1 border-t border-gray-800">
              <p className="text-xs text-gray-500">O pegá la URL de tu foto</p>
              <input
                value={urlCustom}
                onChange={e => setUrlCustom(e.target.value)}
                placeholder="https://..."
                className="bg-gray-800 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition"
              />
            </div>
          </div>

          {/* Mensajes */}
          {error && (
            <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-xl px-4 py-2">
              {error}
            </p>
          )}
          {exito && (
            <p className="text-green-400 text-sm bg-green-950/40 border border-green-800 rounded-xl px-4 py-2">
              ✅ Perfil actualizado correctamente
            </p>
          )}

          {/* Guardar */}
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-bold text-sm transition"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <Footer />
    </div>
  )
}
