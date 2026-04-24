export default function Avatar({ usuario, size = 'md' }) {
  const sizes = {
    sm:  'w-7 h-7 text-xs',
    md:  'w-9 h-9 text-sm',
    lg:  'w-16 h-16 text-xl',
    xl:  'w-24 h-24 text-3xl',
  }
  const cls = sizes[size] ?? sizes.md

  if (usuario?.photoURL) {
    return (
      <img
        src={usuario.photoURL}
        alt=""
        className={`${cls} rounded-full object-cover border-2 border-purple-500/40 flex-shrink-0`}
        onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }}
      />
    )
  }

  const iniciales = (usuario?.displayName || usuario?.email || '?').slice(0, 2).toUpperCase()
  return (
    <div className={`${cls} rounded-full bg-purple-700 border-2 border-purple-500/40 flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {iniciales}
    </div>
  )
}
