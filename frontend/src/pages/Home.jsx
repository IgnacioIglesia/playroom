import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

function useInView(threshold = 0.12) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.unobserve(el) } },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return [ref, inView]
}

const GAMES = [
  { name: 'Truco',      img: '/juegos/truco.svg',      desc: 'El clásico truco uruguayo',   tag: 'Estrategia' },
  { name: 'Blackjack',  img: '/juegos/blackjack.svg',   desc: 'Llegá al 21',            tag: 'Cartas'     },
  { name: 'Impostor',   img: '/juegos/impostor.svg',    desc: 'Encontrá al traidor',    tag: 'Social'     },
  { name: 'Trivia',     img: '/juegos/trivia.svg',      desc: 'Poné a prueba tu mente', tag: 'Quiz'       },
  { name: 'Poker',      img: '/juegos/poker.svg',       desc: "Texas Hold'em",          tag: 'Cartas'     },
  { name: 'Buscaminas', img: '/juegos/buscaminas.svg',  desc: 'Clásico de PC',          tag: 'Puzzle'     },
]

const FEATURES = [
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>,
    title: 'Instantáneo',
    desc: 'Sin descargas ni instalaciones. Abrís el link y en segundos ya estás jugando.',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>,
    title: 'Multijugador',
    desc: 'Jugá con amigos desde cualquier parte del mundo. Compartí el código y listo.',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 4.5h3"/></svg>,
    title: 'Todos los dispositivos',
    desc: 'Funciona perfecto en celular, tablet y computadora. Jugá donde quieras.',
  },
  {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"/></svg>,
    title: '100% Gratuito',
    desc: 'Sin suscripciones ni pagos ocultos. PlayRoom es completamente gratis para siempre.',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const [heroVisible, setHeroVisible] = useState(false)
  const [featuresRef, featuresVisible] = useInView()
  const [gamesRef,    gamesVisible]    = useInView()
  const [ctaRef,      ctaVisible]      = useInView()

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(109,40,217,0.22),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.06) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className={`relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center gap-8 transition-all duration-1000 ease-out ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>

          <span className="inline-flex items-center gap-2 bg-purple-950/50 border border-purple-600/30 text-purple-300 text-xs font-semibold px-4 py-2 rounded-full uppercase tracking-widest backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Tu sala de juegos virtual
          </span>

          <h1 className="text-6xl md:text-8xl font-extrabold leading-[0.95] tracking-tight">
            Play<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-300 to-purple-400">Room</span>
          </h1>

          <p className="text-gray-400 text-xl md:text-2xl max-w-xl leading-relaxed">
            Jugá con tus amigos desde cualquier lugar.<br />
            Sin descargas. Sin complicaciones.
          </p>

          <div
            className="flex gap-4 flex-wrap justify-center"
            style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s' }}
          >
            <button
              onClick={() => navigate('/juegos')}
              className="bg-purple-600 hover:bg-purple-500 text-white px-10 py-4 rounded-2xl text-lg font-bold transition-all duration-200 hover:scale-105 hover:shadow-[0_0_48px_rgba(139,92,246,0.45)]"
            >
              Jugar ahora →
            </button>
            <button
              onClick={() => navigate('/registro')}
              className="bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 hover:border-purple-500/40 text-white px-10 py-4 rounded-2xl text-lg font-semibold transition-all duration-200"
            >
              Crear cuenta gratis
            </button>
          </div>

          <div
            className="flex gap-12 pt-8 border-t border-white/[0.06] w-full justify-center"
            style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.8s ease 0.55s, transform 0.8s ease 0.55s' }}
          >
            {[
              { valor: '10+', label: 'Juegos' },
              { valor: '100%', label: 'Gratuito' },
              { valor: '0', label: 'Descargas' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <span className="text-3xl font-extrabold text-white">{s.valor}</span>
                <span className="text-gray-500 text-sm">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#07070f] to-transparent pointer-events-none" />
      </section>

      {/* ── MARQUEE ── */}
      <div className="relative overflow-hidden border-y border-white/[0.05] bg-white/[0.015] py-6">
        <div className="flex gap-6 animate-marquee w-max">
          {[...GAMES, ...GAMES].map((g, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] flex-shrink-0">
              <img src={g.img} alt={g.name} className="w-7 h-7 object-contain opacity-75" />
              <span className="text-gray-300 font-semibold text-sm whitespace-nowrap">{g.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section ref={featuresRef} className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div
            className="text-center mb-20 transition-all duration-700"
            style={{ opacity: featuresVisible ? 1 : 0, transform: featuresVisible ? 'translateY(0)' : 'translateY(32px)' }}
          >
            <p className="text-purple-400 font-semibold text-xs uppercase tracking-widest mb-4">Por qué PlayRoom</p>
            <h2 className="text-4xl md:text-5xl font-bold">Todo lo que necesitás,<br />sin lo que no querés</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="bg-white/[0.03] border border-white/[0.07] hover:border-purple-500/30 rounded-2xl p-7 flex flex-col gap-4 group cursor-default"
                style={{
                  opacity: featuresVisible ? 1 : 0,
                  transform: featuresVisible ? 'translateY(0)' : 'translateY(28px)',
                  transition: `opacity 0.6s ease ${i * 100}ms, transform 0.6s ease ${i * 100}ms, background-color 0.2s, border-color 0.2s`,
                }}
              >
                <div className="w-11 h-11 rounded-xl bg-purple-900/40 border border-purple-700/25 flex items-center justify-center text-purple-400 group-hover:bg-purple-800/50 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-white font-bold text-base">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GAMES GRID ── */}
      <section ref={gamesRef} className="py-32 px-6" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(88,28,135,0.08) 0%, transparent 70%)' }}>
        <div className="max-w-6xl mx-auto">
          <div
            className="text-center mb-20 transition-all duration-700"
            style={{ opacity: gamesVisible ? 1 : 0, transform: gamesVisible ? 'translateY(0)' : 'translateY(32px)' }}
          >
            <p className="text-purple-400 font-semibold text-xs uppercase tracking-widest mb-4">Catálogo</p>
            <h2 className="text-4xl md:text-5xl font-bold">Elegí tu juego</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {GAMES.map((g, i) => (
              <div
                key={g.name}
                onClick={() => navigate('/juegos')}
                className="group cursor-pointer bg-white/[0.03] border border-white/[0.07] hover:border-purple-500/35 rounded-2xl p-8 flex flex-col items-center gap-5 hover:bg-white/[0.055]"
                style={{
                  opacity: gamesVisible ? 1 : 0,
                  transform: gamesVisible ? 'translateY(0)' : 'translateY(24px)',
                  transition: `opacity 0.55s ease ${i * 75}ms, transform 0.55s ease ${i * 75}ms, background-color 0.2s, border-color 0.2s, box-shadow 0.2s`,
                  boxShadow: 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 40px rgba(139,92,246,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <img
                  src={g.img}
                  alt={g.name}
                  className="w-20 h-20 object-contain group-hover:scale-110 transition-transform duration-300"
                />
                <div className="text-center">
                  <p className="text-white font-bold text-base mb-1">{g.name}</p>
                  <p className="text-gray-500 text-sm">{g.desc}</p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/40">
                  {g.tag}
                </span>
              </div>
            ))}
          </div>

          <div
            className="flex justify-center mt-12"
            style={{ opacity: gamesVisible ? 1 : 0, transform: gamesVisible ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.6s ease 0.5s, transform 0.6s ease 0.5s' }}
          >
            <button
              onClick={() => navigate('/juegos')}
              className="border border-white/10 hover:border-purple-500/40 bg-white/[0.03] hover:bg-white/[0.06] text-white px-10 py-4 rounded-2xl text-base font-semibold transition-all"
            >
              Ver todos los juegos →
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section ref={ctaRef} className="py-32 px-6">
        <div
          className="max-w-4xl mx-auto rounded-3xl p-16 text-center relative overflow-hidden border border-purple-700/20"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.28) 0%, rgba(10,8,20,0.95) 65%)',
            opacity: ctaVisible ? 1 : 0,
            transform: ctaVisible ? 'translateY(0)' : 'translateY(32px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.05) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
          <div className="relative z-10 flex flex-col items-center gap-6">
            <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
              Listo para jugar?
            </h2>
            <p className="text-gray-400 text-lg max-w-md">
              Creá tu cuenta gratis y empezá a jugar con tus amigos ahora mismo.
            </p>
            <div className="flex gap-4 flex-wrap justify-center mt-2">
              <button
                onClick={() => navigate('/registro')}
                className="bg-purple-600 hover:bg-purple-500 text-white px-12 py-4 rounded-2xl text-lg font-bold transition-all hover:scale-105 hover:shadow-[0_0_48px_rgba(139,92,246,0.5)]"
              >
                Crear cuenta gratis →
              </button>
              <button
                onClick={() => navigate('/juegos')}
                className="bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-white px-10 py-4 rounded-2xl text-lg font-semibold transition-all"
              >
                Ver juegos
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
