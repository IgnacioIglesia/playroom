import { useState } from 'react'
import { CartaComp, CartaMuestra, BtnCanto, TanteadorPalillos } from './componentes'
import Avatar from '../../components/Avatar'

function LogEntry({ msg, reciente }) {
  const isChat      = msg.startsWith('💬')
  const isSeparator = msg.startsWith('───')
  const isWin       = msg.startsWith('✅')
  const isLoss      = msg.startsWith('❌')
  const isFlor      = msg.startsWith('🌸') || msg.startsWith('⚘')
  const isEnvido    = msg.startsWith('🎴')

  const color = isChat      ? 'text-blue-300'
    : isSeparator           ? 'text-gray-600 text-center'
    : isWin && reciente     ? 'text-green-400 font-semibold'
    : isLoss && reciente    ? 'text-red-400 font-semibold'
    : isFlor                ? 'text-yellow-400'
    : isEnvido              ? 'text-blue-300'
    : reciente              ? 'text-white font-semibold'
    : 'text-gray-500'

  return <p className={`text-xs mb-1 ${color}`}>{msg}</p>
}

export default function MesaTruco({
  manoJ, manoM, cjJ, cjM, muestra, resultados, manoActual,
  ptsJ, ptsM, limite,
  turno,
  cartaSel, setCartaSel,
  log,
  mostrandoMano,
  trucoCantado, ultimoEnCantar,
  trucoPendiente, envidoPendiente, florPendiente,
  florResuelta,
  bloqueado,
  jugarCarta,
  cantarTruco, responderTrucoQuiero, responderTrucoNoQuiero,
  cantarEnvido, responderEnvidoQuiero, responderEnvidoNoQuiero,
  cantarFlor, responderFlorQuiero, responderFlorNoQuiero,
  puedeJugar, puedeEnvido,
  puedeIniciarTruco, puedeRetruco, puedeVale4,
  puedeIniciarRetruco, puedeIniciarVale4,
  puedeSubirEnvido, puedeSubirRealEnvido, puedeSubirFaltaEnvido,
  nombreRival, inicialesRival,
  miNombre, miPhotoURL,
  florJ, florM, florCantada,
  mostrarCartasRival,
  nivelEnvido,
  resultadoUltimaMano,
  rondaTerminada,
  timerSeg,
  globoYo,
  globoRival,
  onEnviarMensaje,
  onSubirEnvidoConNivel,
}) {
  const [chatInput, setChatInput] = useState('')

  const enviar = () => {
    const txt = chatInput.trim()
    if (!txt) return
    onEnviarMensaje?.(txt)
    setChatInput('')
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row max-w-[1400px] mx-auto w-full px-2 lg:px-4 py-2 lg:py-4 gap-3 lg:gap-4">

      {/* ── PANEL IZQUIERDO — solo desktop ── */}
      <div className="hidden lg:flex flex-col gap-3 w-52 flex-shrink-0">
        <div className="flex flex-col gap-2">

          {!envidoPendiente && !florPendiente && !florJ && !florM && (
            <>
              <p className="text-xs text-blue-400 font-bold uppercase tracking-wider text-center">Envido</p>
              <BtnCanto onClick={() => cantarEnvido('envido')} disabled={!puedeEnvido} color="blue">Envido</BtnCanto>
              <BtnCanto onClick={() => cantarEnvido('real')} disabled={!puedeEnvido} color="blue">Real Envido</BtnCanto>
              <BtnCanto onClick={() => cantarEnvido('falta')} disabled={!puedeEnvido} color="blue">Falta Envido</BtnCanto>
            </>
          )}

          {envidoPendiente && (
            <>
              <p className="text-xs text-blue-400 font-bold uppercase tracking-wider text-center">
                {nombreRival} cantó {nivelEnvido === 'real' ? 'Real Envido' : nivelEnvido === 'falta' ? 'Falta Envido' : 'Envido'}
              </p>
              {puedeSubirEnvido && <BtnCanto onClick={() => onSubirEnvidoConNivel?.('envido')} color="blue">Envido ↑</BtnCanto>}
              {puedeSubirRealEnvido && <BtnCanto onClick={() => onSubirEnvidoConNivel?.('real')} color="blue">Real Envido ↑</BtnCanto>}
              {puedeSubirFaltaEnvido && <BtnCanto onClick={() => onSubirEnvidoConNivel?.('falta')} color="blue">Falta Envido ↑</BtnCanto>}
            </>
          )}

          {(florJ || florM) && !florResuelta && !florPendiente && (
            <>
              <div className="h-px bg-gray-700 my-1" />
              {florJ && !florM && (
                <p className="text-xs text-yellow-400 font-bold text-center">🌸 Tenés Flor (+3)</p>
              )}
              {!florJ && florM && (
                <p className="text-xs text-yellow-400 font-bold text-center">🌸 {nombreRival} tiene Flor</p>
              )}
              {florJ && florM && (
                <>
                  <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider text-center">Flor</p>
                  <BtnCanto onClick={() => cantarFlor('flor')} color="yellow">🌸 La mía es Flor</BtnCanto>
                  <BtnCanto onClick={() => cantarFlor('conFlor')} color="yellow">Con Flor Envido</BtnCanto>
                  <BtnCanto onClick={() => cantarFlor('contraFlor')} color="yellow">Contra Flor al Resto</BtnCanto>
                </>
              )}
            </>
          )}

          {florPendiente && (
            <>
              <div className="h-px bg-gray-700 my-1" />
              <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider text-center">
                {nombreRival} cantó {florCantada === 'flor' ? 'Flor' : florCantada === 'conFlor' ? 'Con Flor' : 'Contra Flor'}
              </p>
              <BtnCanto onClick={responderFlorQuiero} color="yellow">Quiero ✓</BtnCanto>
              <BtnCanto onClick={responderFlorNoQuiero} color="yellow">No quiero ✗</BtnCanto>
              {florCantada === 'flor' && <BtnCanto onClick={() => cantarFlor('conFlor')} color="yellow">Con Flor ↑</BtnCanto>}
              {florCantada !== 'contraFlor' && <BtnCanto onClick={() => cantarFlor('contraFlor')} color="yellow">Contra Flor ↑</BtnCanto>}
            </>
          )}
        </div>

        <TanteadorPalillos ptsJ={ptsJ} ptsM={ptsM} limite={limite} nombreJ={miNombre} nombreM={nombreRival} />
      </div>

      {/* ── CENTRO ── */}
      <div className="flex-1 flex flex-col items-center gap-2 min-w-0">

        {/* Tanteador — mobile */}
        <div className="lg:hidden w-full max-w-md">
          <TanteadorPalillos ptsJ={ptsJ} ptsM={ptsM} limite={limite} nombreJ={miNombre} nombreM={nombreRival} />
        </div>

        {/* Avatar rival */}
        <div className="flex flex-col items-center gap-1 relative" style={{ zIndex: 20 }}>
          {globoRival && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-700 border border-gray-500 text-white text-xs px-3 py-1.5 rounded-2xl shadow-lg max-w-[180px] text-center z-30 truncate">
              {globoRival}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-700 border-r border-b border-gray-500 rotate-45" />
            </div>
          )}
          <div className="w-12 h-12 rounded-full bg-red-900 border-2 border-red-600 flex items-center justify-center">
            <span className="text-white font-extrabold text-lg">{inicialesRival}</span>
          </div>
          <span className="text-gray-400 text-xs font-semibold">{nombreRival}</span>
        </div>

        {/* Mesa + abanicos */}
        <div className="relative w-full max-w-xl">

          {/* Cartas rival en abanico */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3"
            style={{ width: '280px', height: '150px', zIndex: 10 }}>
            {manoM.map((c, i) => {
              const angulos   = [-15, 0, 15]
              const traslados = [-65, 0, 65]
              return (
                <div key={c.id || i} style={{
                  position: 'absolute', bottom: '0px', left: '50%',
                  transform: `translateX(calc(-50% + ${traslados[i]}px)) rotate(${angulos[i]}deg)`,
                  transformOrigin: 'bottom center',
                  zIndex: i + 1,
                  filter: mostrarCartasRival ? 'brightness(1.3) saturate(1.1)' : 'none',
                  transition: 'filter 0.3s ease',
                }}>
                  <CartaComp carta={c} muestra={muestra} oculta={!mostrarCartasRival || !c.numero} />
                </div>
              )
            })}
          </div>

          <div style={{ height: '70px' }} />

          {/* Mesa */}
          <div className={`w-full rounded-3xl overflow-hidden border-2 shadow-2xl transition-all ${mostrandoMano ? 'border-yellow-500/60' : 'border-white/5'}`}
            style={{ background: 'radial-gradient(ellipse at 50% 30%, #2d1f4e 0%, #1a1130 60%, #0f0a1e 100%)' }}>

            {/* Header */}
            <div className="flex justify-between items-center px-3 lg:px-4 py-2 border-b border-white/5 bg-black/20">
              <div className="flex gap-1 items-center">
                <span className="text-gray-500 text-xs uppercase tracking-widest">Mano</span>
                {[0,1,2].map(i => (
                  <span key={i} className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border ${
                    resultados[i] === 'jugador' ? 'bg-green-800 border-green-600 text-green-200' :
                    resultados[i] === 'maquina' ? 'bg-red-900 border-red-700 text-red-200' :
                    resultados[i] === 'empate'  ? 'bg-gray-700 border-gray-500 text-gray-300' :
                    i === manoActual            ? 'bg-purple-900/60 border-purple-500 text-purple-300' :
                                                  'bg-white/5 border-white/10 text-gray-600'
                  }`}>
                    {resultados[i] === 'jugador' ? '✓' : resultados[i] === 'maquina' ? '✗' : resultados[i] === 'empate' ? '=' : i + 1}
                  </span>
                ))}
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                mostrandoMano
                  ? resultadoUltimaMano === 'jugador' ? 'bg-green-900/60 border-green-700 text-green-300'
                  : resultadoUltimaMano === 'maquina' ? 'bg-red-900/60 border-red-700 text-red-300'
                  : 'bg-gray-700/60 border-gray-600 text-gray-300'
                : bloqueado ? 'bg-black/40 border-white/10 text-gray-500'
                : turno === 'yo' || turno === 'jugador' ? 'bg-purple-900/60 border-purple-700 text-purple-300'
                : 'bg-black/40 border-white/10 text-gray-400'
              }`}>
                {mostrandoMano
                  ? resultadoUltimaMano === 'jugador' ? '✅ Ganaste'
                  : resultadoUltimaMano === 'maquina' ? '❌ Perdiste'
                  : '🤝 Empate'
                : bloqueado && !trucoPendiente && !envidoPendiente && !florPendiente ? '⏳ Esperando...'
                : trucoPendiente  ? '🗣 Respondé truco'
                : envidoPendiente ? '🗣 Respondé envido'
                : florPendiente   ? '🌸 Respondé flor'
                : !florResuelta   ? '🌸 Resolvé Flor'
                : turno === 'yo' || turno === 'jugador' ? '🎯 Tu turno'
                : '⏳ Turno rival'}
              </span>
            </div>

            {/* Cartas en mesa */}
            <div className="relative flex flex-col items-center gap-4 lg:gap-6 py-6 lg:py-8 px-4">
              <div className="absolute top-3 left-4 flex flex-col items-center gap-1">
                <span className="text-yellow-500/80 text-xs font-bold uppercase tracking-widest">Muestra</span>
                {muestra && <CartaMuestra carta={muestra} muestra={muestra} />}
              </div>

              {cjM[manoActual]
                ? <CartaComp carta={cjM[manoActual]} muestra={muestra} jugada enMesa />
                : <div className="w-16 h-24 lg:w-20 lg:h-32 rounded-xl border-2 border-dashed border-white/10 bg-black/20 flex items-center justify-center">
                    <span className="text-white/20 text-2xl">—</span>
                  </div>
              }

              <div className="w-32 h-px bg-white/10" />

              {cjJ[manoActual]
                ? <CartaComp carta={cjJ[manoActual]} muestra={muestra} jugada enMesa />
                : <div className="w-16 h-24 lg:w-20 lg:h-32 rounded-xl border-2 border-dashed border-white/10 bg-black/20 flex items-center justify-center">
                    <span className="text-white/20 text-2xl">—</span>
                  </div>
              }
            </div>

            {/* Banner: flor automática al inicio de ronda */}
            {(florJ || florM) && florResuelta && !rondaTerminada && resultados.length === 0 && (
              <div className="mx-3 mb-1 px-3 py-1.5 bg-yellow-900/40 border border-yellow-700/50 rounded-xl flex items-center justify-center gap-2">
                <span className="text-lg">🌸</span>
                <p className="text-yellow-300 text-xs font-semibold text-center">
                  {florJ && !florM ? 'Tenés Flor — +3 puntos' : `${nombreRival} tiene Flor — +3 puntos`}
                </p>
              </div>
            )}

            {/* Botones: ambos tienen flor → cantar (visible en todos los tamaños) */}
            {florJ && florM && !florResuelta && !florPendiente && (
              <div className="px-4 pb-3 flex flex-col gap-2">
                <p className="text-yellow-400 text-xs font-bold text-center uppercase tracking-wider">⚘ Ambos tienen Flor — Cantá</p>
                <BtnCanto onClick={() => cantarFlor('flor')} color="yellow">🌸 La mía es Flor</BtnCanto>
                <div className="grid grid-cols-2 gap-2">
                  <BtnCanto onClick={() => cantarFlor('conFlor')} color="yellow">Con Flor Envido</BtnCanto>
                  <BtnCanto onClick={() => cantarFlor('contraFlor')} color="yellow">Contra Flor al Resto</BtnCanto>
                </div>
              </div>
            )}

            {/* Botones: responder flor del rival (visible en todos los tamaños) */}
            {florPendiente && (
              <div className="px-4 pb-3 flex flex-col gap-2">
                <p className="text-yellow-400 text-xs font-bold text-center">
                  🌸 {nombreRival} cantó {florCantada === 'flor' ? 'Flor' : florCantada === 'conFlor' ? 'Con Flor Envido' : 'Contra Flor al Resto'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <BtnCanto onClick={responderFlorQuiero} color="yellow">Quiero ✓</BtnCanto>
                  <BtnCanto onClick={responderFlorNoQuiero} color="yellow">No quiero ✗</BtnCanto>
                </div>
                {florCantada === 'flor' && <BtnCanto onClick={() => cantarFlor('conFlor')} color="yellow">Con Flor Envido ↑</BtnCanto>}
                {florCantada !== 'contraFlor' && <BtnCanto onClick={() => cantarFlor('contraFlor')} color="yellow">Contra Flor al Resto ↑</BtnCanto>}
              </div>
            )}

            {/* Truco cantado */}
            {trucoCantado && (
              <div className="px-4 pb-3 flex justify-center">
                <span className="bg-red-950/80 border border-red-700/60 text-red-300 text-xs px-3 py-1.5 rounded-full font-bold">
                  {trucoCantado === 'truco' ? '🗣 Truco' : trucoCantado === 'retruco' ? '🗣 Retruco' : '🗣 Vale Cuatro'}
                  {' · '}{ultimoEnCantar === 'yo' || ultimoEnCantar === 'jugador' ? 'vos' : nombreRival}
                </span>
              </div>
            )}

            {/* Responder truco */}
            {trucoPendiente && (
              <div className="px-4 pb-4 flex flex-col gap-2">
                <p className="text-red-400 text-xs font-bold text-center uppercase tracking-wider">
                  {nombreRival} cantó {trucoCantado === 'truco' ? 'Truco' : trucoCantado === 'retruco' ? 'Retruco' : 'Vale Cuatro'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <BtnCanto onClick={responderTrucoQuiero} color="red">Quiero ✓</BtnCanto>
                  <BtnCanto onClick={responderTrucoNoQuiero} color="red">No quiero ✗</BtnCanto>
                </div>
              </div>
            )}

            {/* Responder envido */}
            {envidoPendiente && (
              <div className="px-4 pb-4 flex flex-col gap-2">
                <p className="text-blue-400 text-xs font-bold text-center uppercase tracking-wider">
                  {nombreRival} cantó {nivelEnvido === 'real' ? 'Real Envido' : nivelEnvido === 'falta' ? 'Falta Envido' : 'Envido'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <BtnCanto onClick={responderEnvidoQuiero} color="blue">Quiero ✓</BtnCanto>
                  <BtnCanto onClick={responderEnvidoNoQuiero} color="blue">No quiero ✗</BtnCanto>
                </div>
              </div>
            )}

            <div style={{ height: '70px' }} />
          </div>

          {/* Cartas jugador en abanico */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3"
            style={{ width: '240px', height: '130px', zIndex: 10 }}>
            {manoJ.map((carta, i) => {
              const angulos   = [-15, 0, 15]
              const traslados = [-65, 0, 65]
              const jugada      = !!cjJ.find(j => j.id === carta.id)
              const seleccionada = cartaSel?.id === carta.id
              const deshabilitada = jugada || !puedeJugar
              return (
                <div key={carta.id} style={{
                  position: 'absolute',
                  bottom: seleccionada ? '24px' : '0px', left: '50%',
                  transform: `translateX(calc(-50% + ${traslados[i]}px)) rotate(${angulos[i]}deg)`,
                  transformOrigin: 'bottom center', transition: 'all 0.2s ease',
                  opacity: jugada ? 0.3 : !puedeJugar ? 0.5 : 1,
                  filter: !puedeJugar && !jugada ? 'grayscale(80%)' : 'none',
                  zIndex: seleccionada ? 10 : i + 1,
                }}>
                  <CartaComp
                    carta={carta} muestra={muestra} jugada={jugada} seleccionada={seleccionada}
                    onClick={!deshabilitada
                      ? () => { if (cartaSel?.id === carta.id) jugarCarta(carta); else setCartaSel(carta) }
                      : null}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ height: '70px' }} />

        {/* Barra de timer cuando es tu turno */}
        {puedeJugar && timerSeg < 30 && (
          <div className="w-full max-w-xs mx-auto px-2">
            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                  timerSeg > 15 ? 'bg-green-500' : timerSeg > 8 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${(timerSeg / 30) * 100}%` }}
              />
            </div>
            {timerSeg <= 10 && (
              <p className="text-center text-red-400 text-xs font-bold mt-0.5 animate-pulse">{timerSeg}s</p>
            )}
          </div>
        )}

        <p className="text-gray-500 text-xs uppercase tracking-wider text-center">
          {mostrandoMano
            ? resultadoUltimaMano === 'jugador' ? '✅ Ganaste la mano'
            : resultadoUltimaMano === 'maquina' ? '❌ Perdiste la mano'
            : '🤝 Mano empatada'
          : rondaTerminada ? '⏳ Nueva ronda...'
          : !florResuelta && !florJ && !florM ? '⚠️ Ambos tienen Flor — cantá'
          : !puedeJugar ? 'Esperá tu turno'
          : 'Elegí una carta — doble click para jugar'}
        </p>

        {cartaSel && <p className="text-purple-400 text-xs animate-pulse">Clickeá de nuevo para jugar</p>}

        {/* Avatar jugador */}
        <div className="flex flex-col items-center gap-1 mt-1 relative">
          {globoYo && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-purple-800 border border-purple-600 text-white text-xs px-3 py-1.5 rounded-2xl shadow-lg max-w-[180px] text-center z-30 truncate">
              {globoYo}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-800 border-r border-b border-purple-600 rotate-45" />
            </div>
          )}
          <Avatar usuario={{ displayName: miNombre, photoURL: miPhotoURL }} size="md" />
          <span className="text-gray-400 text-xs font-semibold">{miNombre}</span>
        </div>

        {/* ── BOTONES DE ACCIÓN — mobile ── */}
        <div className="lg:hidden w-full flex flex-col gap-2 mt-2">

          {/* Flor pendiente */}
          {florPendiente && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-yellow-400 font-bold text-center">
                {nombreRival} cantó {florCantada === 'flor' ? 'Flor' : florCantada === 'conFlor' ? 'Con Flor' : 'Contra Flor'}
              </p>
              <div className="grid grid-cols-2 gap-1">
                <BtnCanto onClick={responderFlorQuiero} color="yellow">Quiero ✓</BtnCanto>
                <BtnCanto onClick={responderFlorNoQuiero} color="yellow">No quiero ✗</BtnCanto>
              </div>
              {florCantada === 'flor' && <BtnCanto onClick={() => cantarFlor('conFlor')} color="yellow">Con Flor ↑</BtnCanto>}
              {florCantada !== 'contraFlor' && <BtnCanto onClick={() => cantarFlor('contraFlor')} color="yellow">Contra Flor ↑</BtnCanto>}
            </div>
          )}

          {/* Flor — ambos tienen, sin apuesta */}
          {florJ && florM && !florResuelta && !florPendiente && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider text-center">Flor</p>
              <BtnCanto onClick={() => cantarFlor('flor')} color="yellow">🌸 La mía es Flor</BtnCanto>
              <BtnCanto onClick={() => cantarFlor('conFlor')} color="yellow">Con Flor Envido</BtnCanto>
              <BtnCanto onClick={() => cantarFlor('contraFlor')} color="yellow">Contra Flor al Resto</BtnCanto>
            </div>
          )}

          {/* Envido */}
          {!envidoPendiente && !florJ && !florM && (
            <div className="flex gap-1">
              <BtnCanto onClick={() => cantarEnvido('envido')} disabled={!puedeEnvido} color="blue">Envido</BtnCanto>
              <BtnCanto onClick={() => cantarEnvido('real')} disabled={!puedeEnvido} color="blue">Real E.</BtnCanto>
              <BtnCanto onClick={() => cantarEnvido('falta')} disabled={!puedeEnvido} color="blue">Falta E.</BtnCanto>
            </div>
          )}

          {/* Envido pendiente — subida */}
          {envidoPendiente && (
            <div className="flex flex-col gap-1">
              {puedeSubirEnvido     && <BtnCanto onClick={() => onSubirEnvidoConNivel?.('envido')} color="blue">Envido ↑</BtnCanto>}
              {puedeSubirRealEnvido && <BtnCanto onClick={() => onSubirEnvidoConNivel?.('real')}   color="blue">Real E. ↑</BtnCanto>}
              {puedeSubirFaltaEnvido && <BtnCanto onClick={() => onSubirEnvidoConNivel?.('falta')} color="blue">Falta E. ↑</BtnCanto>}
            </div>
          )}

          {/* Truco */}
          <div className="flex gap-1">
            <BtnCanto onClick={() => cantarTruco('truco')}   disabled={!puedeIniciarTruco}                       color="red">Truco</BtnCanto>
            <BtnCanto onClick={() => cantarTruco('retruco')} disabled={!(puedeIniciarRetruco || puedeRetruco)}   color="red">Retruco</BtnCanto>
            <BtnCanto onClick={() => cantarTruco('vale4')}   disabled={!(puedeIniciarVale4  || puedeVale4)}      color="red">Vale 4</BtnCanto>
          </div>
        </div>

        {/* Chat — mobile: mensajes recientes + input */}
        <div className="lg:hidden w-full flex flex-col gap-1.5">
          {/* Últimos 3 mensajes de chat */}
          {log.filter(m => m.startsWith('💬')).slice(0, 3).length > 0 && (
            <div className="bg-blue-950/60 border border-blue-800/50 rounded-xl px-3 py-2 flex flex-col gap-0.5">
              {log.filter(m => m.startsWith('💬')).slice(0, 3).map((msg, i) => (
                <p key={i} className={`text-xs ${i === 0 ? 'text-blue-200 font-semibold' : 'text-blue-400/70'}`}>{msg}</p>
              ))}
            </div>
          )}
          {/* Input */}
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && enviar()}
              maxLength={80}
              placeholder="Escribí algo al rival..."
              className="flex-1 bg-gray-900 border border-gray-700 focus:border-blue-500 rounded-xl px-3 py-2 text-white text-xs focus:outline-none placeholder-gray-600"
            />
            <button onClick={enviar} disabled={!chatInput.trim()}
              className="bg-blue-700 hover:bg-blue-600 disabled:opacity-30 text-white px-3 py-2 rounded-xl text-xs font-bold transition">
              →
            </button>
          </div>
        </div>

        {/* Historial — mobile */}
        <div className="lg:hidden w-full">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 max-h-24 overflow-y-auto">
            {log.length === 0
              ? <p className="text-gray-600 text-xs text-center">El historial aparecerá acá</p>
              : log.filter(m => !m.startsWith('💬')).slice(0, 8).map((msg, i) => <LogEntry key={i} msg={msg} reciente={i === 0} />)
            }
          </div>
        </div>
      </div>

      {/* ── PANEL DERECHO — solo desktop ── */}
      <div className="hidden lg:flex flex-col gap-3 w-52 flex-shrink-0">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-red-400 font-bold uppercase tracking-wider text-center">Truco</p>
          <BtnCanto onClick={() => cantarTruco('truco')}   disabled={!puedeIniciarTruco}                     color="red">Truco</BtnCanto>
          <BtnCanto onClick={() => cantarTruco('retruco')} disabled={!(puedeIniciarRetruco || puedeRetruco)} color="red">Retruco</BtnCanto>
          <BtnCanto onClick={() => cantarTruco('vale4')}   disabled={!(puedeIniciarVale4  || puedeVale4)}    color="red">Vale Cuatro</BtnCanto>
        </div>

        <div className="flex flex-col flex-1 min-h-0 gap-2">
          {/* Chat desktop */}
          <div className="flex flex-col gap-1">
            <p className="text-blue-400 text-[10px] font-semibold uppercase tracking-widest text-center">Chat</p>
            <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-2 min-h-[48px] flex flex-col gap-0.5">
              {log.filter(m => m.startsWith('💬')).slice(0, 4).length === 0
                ? <p className="text-blue-800 text-xs text-center italic">Sin mensajes</p>
                : log.filter(m => m.startsWith('💬')).slice(0, 4).map((msg, i) => (
                    <p key={i} className={`text-xs ${i === 0 ? 'text-blue-200 font-semibold' : 'text-blue-400/60'}`}>{msg}</p>
                  ))
              }
            </div>
            <div className="flex gap-1">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && enviar()}
                maxLength={80}
                placeholder="Escribí..."
                className="flex-1 bg-gray-900 border border-gray-700 focus:border-blue-500 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none placeholder-gray-600"
              />
              <button onClick={enviar} disabled={!chatInput.trim()}
                className="bg-blue-700 hover:bg-blue-600 disabled:opacity-30 text-white px-2.5 rounded-lg text-xs font-bold transition">
                →
              </button>
            </div>
          </div>

          {/* Historial de juego */}
          <div className="flex flex-col flex-1 min-h-0">
            <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest mb-1 text-center">Historial</p>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 overflow-y-auto flex-1 max-h-64">
              {log.filter(m => !m.startsWith('💬')).length === 0
                ? <p className="text-gray-600 text-xs text-center">El historial aparecerá acá</p>
                : log.filter(m => !m.startsWith('💬')).map((msg, i) => <LogEntry key={i} msg={msg} reciente={i === 0} />)
              }
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
