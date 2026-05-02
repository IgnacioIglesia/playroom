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

function CartasFaceDown({ cantidad, label }) {
  const angulos   = [-15, 0, 15]
  const traslados = [-50, 0, 50]
  const cards = Array(Math.max(0, Math.min(3, cantidad))).fill(null)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: '100px', height: '80px' }}>
        {cards.map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            bottom: 0, left: '50%',
            transform: `translateX(calc(-50% + ${traslados[i] ?? 0}px)) rotate(${angulos[i] ?? 0}deg)`,
            transformOrigin: 'bottom center',
            zIndex: i + 1,
          }}>
            <div className="w-10 h-14 rounded-lg overflow-hidden shadow-md border border-gray-600 flex-shrink-0">
              <img src="/cartas/back_red.png" alt="?" className="w-full h-full object-cover" />
            </div>
          </div>
        ))}
        {cards.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gray-600 text-xs">sin cartas</span>
          </div>
        )}
      </div>
      {label && <span className="text-gray-400 text-xs font-semibold truncate max-w-[100px]">{label}</span>}
    </div>
  )
}

function CartasPartner({ partner, muestra }) {
  if (!partner) return null
  const mano = partner.mano || []
  const angulos   = [-15, 0, 15]
  const traslados = [-50, 0, 50]

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: '120px', height: '80px' }}>
        {mano.map((carta, i) => {
          const oculta = !carta.numero
          const jugada = partner.cartasJugadas?.some(j => j.id === carta.id)
          return (
            <div key={carta.id || i} style={{
              position: 'absolute',
              bottom: 0, left: '50%',
              transform: `translateX(calc(-50% + ${traslados[i] ?? 0}px)) rotate(${angulos[i] ?? 0}deg)`,
              transformOrigin: 'bottom center',
              zIndex: i + 1,
              opacity: jugada ? 0.3 : 1,
            }}>
              {oculta
                ? <div className="w-10 h-14 rounded-lg overflow-hidden shadow-md border border-gray-600">
                    <img src="/cartas/back_red.png" alt="?" className="w-full h-full object-cover" />
                  </div>
                : <CartaComp carta={carta} muestra={muestra} jugada={jugada} />
              }
            </div>
          )
        })}
        {mano.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gray-600 text-xs">sin cartas</span>
          </div>
        )}
      </div>
      <span className="text-green-400 text-xs font-semibold truncate max-w-[120px]">
        {partner?.nombre || 'Partner'} {partner?.tieneFlorPiece ? '🌸' : ''}
      </span>
    </div>
  )
}

export default function MesaTruco2v2({
  miMano, miCartasJugadas, muestra,
  partner,
  rivals,
  jugadasMano,
  resultados, manoActual, turno, turnoNombre,
  esMano, ptsYo, ptsRival, limite,
  trucoCantado, trucoPendiente, trucoResuelto, esperandoRespuesta,
  cantanteOriginalTruco,
  puedeIniciarTruco, puedeRetruco, puedeVale4,
  puedeIniciarRetruco, puedeIniciarVale4,
  puedeEnvido, envidoPendiente, nivelEnvido, envidoAcumulado,
  puedeSubirEnvido, puedeSubirRealEnvido, puedeSubirFaltaEnvido,
  tengoFlor, equipoTieneFlor, rivalEquipoTieneFlor,
  florPendiente, florResuelta, florActiva, florCantada, nivelFlor,
  florCantadaPor,
  jugarCarta, cantarTruco, responderTrucoQuiero, responderTrucoNoQuiero,
  cantarEnvido, responderEnvidoQuiero, responderEnvidoNoQuiero,
  cantarFlor, responderFlorQuiero, responderFlorNoQuiero,
  onSubirEnvidoConNivel,
  cartaSel, setCartaSel, puedeJugar, bloqueado,
  miNombre, miPhotoURL,
  log, onEnviarMensaje,
  rondaTerminada, mostrandoMano,
  globoYo, globoRival,
  timerSeg,
}) {
  const [chatInput, setChatInput] = useState('')

  const enviar = () => {
    const txt = chatInput.trim()
    if (!txt) return
    onEnviarMensaje?.(txt)
    setChatInput('')
  }

  const rival1 = rivals?.[0]
  const rival2 = rivals?.[1]

  const esMiTurno = turno === 'yo'

  const turnoLabel = esMiTurno ? '🎯 Tu turno'
    : turno === 'partner' ? `⏳ Turno de ${partner?.nombre || 'Partner'}`
    : turnoNombre ? `⏳ Turno de ${turnoNombre}`
    : '⏳ Turno rival'

  const resultadoUltimaMano = resultados?.[resultados.length - 1]

  const florEquipoActiva = tengoFlor || equipoTieneFlor
  const hayFlor = florEquipoActiva || rivalEquipoTieneFlor

  const angulos   = [-15, 0, 15]
  const traslados = [-65, 0, 65]

  return (
    <div className="flex-1 flex flex-col lg:flex-row max-w-[1400px] mx-auto w-full px-2 lg:px-4 py-2 lg:py-4 gap-3 lg:gap-4">

      {/* ── PANEL IZQUIERDO ── */}
      <div className="hidden lg:flex flex-col gap-3 w-52 flex-shrink-0">

        {/* Envido */}
        {!envidoPendiente && !hayFlor && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-blue-400 font-bold uppercase tracking-wider text-center">Envido</p>
            <BtnCanto onClick={() => cantarEnvido('envido')} disabled={!puedeEnvido} color="blue">Envido</BtnCanto>
            <BtnCanto onClick={() => cantarEnvido('real')} disabled={!puedeEnvido} color="blue">Real Envido</BtnCanto>
            <BtnCanto onClick={() => cantarEnvido('falta')} disabled={!puedeEnvido} color="blue">Falta Envido</BtnCanto>
          </div>
        )}

        {envidoPendiente && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-blue-400 font-bold uppercase tracking-wider text-center">
              Cantaron {nivelEnvido === 'real' ? 'Real Envido' : nivelEnvido === 'falta' ? 'Falta Envido' : 'Envido'}
            </p>
            <BtnCanto onClick={responderEnvidoQuiero} color="blue">Quiero ✓</BtnCanto>
            <BtnCanto onClick={responderEnvidoNoQuiero} color="blue">No quiero ✗</BtnCanto>
            {puedeSubirEnvido && <BtnCanto onClick={() => onSubirEnvidoConNivel?.('envido')} color="blue">Envido ↑</BtnCanto>}
            {puedeSubirRealEnvido && <BtnCanto onClick={() => onSubirEnvidoConNivel?.('real')} color="blue">Real Envido ↑</BtnCanto>}
            {puedeSubirFaltaEnvido && <BtnCanto onClick={() => onSubirEnvidoConNivel?.('falta')} color="blue">Falta Envido ↑</BtnCanto>}
          </div>
        )}

        {/* Flor */}
        {hayFlor && !florResuelta && !florPendiente && (
          <div className="flex flex-col gap-2">
            <div className="h-px bg-gray-700 my-1" />
            {florEquipoActiva && rivalEquipoTieneFlor ? (
              <>
                <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider text-center">Flor</p>
                <BtnCanto onClick={() => cantarFlor('flor')} color="yellow">🌸 La mía es Flor</BtnCanto>
                <BtnCanto onClick={() => cantarFlor('conFlor')} color="yellow">Con Flor Envido</BtnCanto>
                <BtnCanto onClick={() => cantarFlor('contraFlor')} color="yellow">Contra Flor al Resto</BtnCanto>
              </>
            ) : (
              <p className="text-xs text-yellow-400 font-bold text-center">🌸 Hay Flor en juego</p>
            )}
          </div>
        )}

        {florPendiente && (
          <div className="flex flex-col gap-2">
            <div className="h-px bg-gray-700 my-1" />
            <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider text-center">
              Cantaron {florCantada === 'flor' ? 'Flor' : florCantada === 'conFlor' ? 'Con Flor' : 'Contra Flor'}
            </p>
            <BtnCanto onClick={responderFlorQuiero} color="yellow">Quiero ✓</BtnCanto>
            <BtnCanto onClick={responderFlorNoQuiero} color="yellow">No quiero ✗</BtnCanto>
            {florCantada === 'flor' && <BtnCanto onClick={() => cantarFlor('conFlor')} color="yellow">Con Flor ↑</BtnCanto>}
            {florCantada !== 'contraFlor' && <BtnCanto onClick={() => cantarFlor('contraFlor')} color="yellow">Contra Flor ↑</BtnCanto>}
          </div>
        )}

        <TanteadorPalillos
          ptsJ={ptsYo} ptsM={ptsRival} limite={limite}
          nombreJ="Vos/Partner" nombreM="Equipo Rival"
        />

        {/* Chat desktop */}
        <div className="h-52 flex flex-col gap-1">
          <p className="text-blue-400 text-[10px] font-semibold uppercase tracking-widest text-center">Chat</p>
          <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-2 flex-1 min-h-0 overflow-y-auto flex flex-col gap-0.5">
            {log?.filter(m => m.startsWith('💬')).slice(0, 4).length === 0
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
      </div>

      {/* ── CENTRO ── */}
      <div className="flex-1 flex flex-col items-center gap-2 min-w-0">

        {/* Tanteador mobile */}
        <div className="lg:hidden w-full max-w-md">
          <TanteadorPalillos
            ptsJ={ptsYo} ptsM={ptsRival} limite={limite}
            nombreJ="Vos/Partner" nombreM="Equipo Rival"
          />
        </div>

        {/* Partner arriba */}
        <div className="flex flex-col items-center gap-1 relative">
          <CartasPartner partner={partner} muestra={muestra} />
          {globoRival && (
            <div className="absolute top-0 left-full ml-3 bg-gray-700 border border-gray-500 text-white text-xs px-3 py-1.5 rounded-2xl shadow-lg max-w-[200px] z-30 whitespace-nowrap">
              {globoRival}
              <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-700 border-l border-b border-gray-500 rotate-45" />
            </div>
          )}
        </div>

        {/* Rival 1 + Mesa central + Rival 2 */}
        <div className="flex items-center justify-center gap-3 w-full max-w-2xl">

          {/* Rival 1 */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <CartasFaceDown cantidad={rival1?.manoRestante ?? 0} label={rival1?.nombre || 'Rival 1'} />
            {rival1?.tieneFlorPiece && <span className="text-yellow-400 text-xs">🌸</span>}
          </div>

          {/* Mesa central */}
          <div className="flex-1 min-w-0">
            <div className={`w-full rounded-2xl overflow-hidden shadow-2xl transition-all border ${mostrandoMano ? 'border-yellow-500/40' : 'border-white/[0.07]'}`}
              style={{ background: 'linear-gradient(175deg, #1a0f38 0%, #110b24 50%, #0b0718 100%)' }}>

              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-black/30 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-[10px] font-semibold uppercase tracking-widest">Mano</span>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span key={i} className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border transition-all ${
                        resultados?.[i] === 'jugador' ? 'bg-green-800 border-green-600 text-green-200' :
                        resultados?.[i] === 'maquina' ? 'bg-red-900 border-red-700 text-red-200' :
                        resultados?.[i] === 'empate'  ? 'bg-gray-700 border-gray-500 text-gray-300' :
                        i === manoActual              ? 'bg-purple-900/70 border-purple-500/80 text-purple-200' :
                                                        'bg-white/5 border-white/10 text-gray-600'
                      }`}>
                        {resultados?.[i] === 'jugador' ? '✓' : resultados?.[i] === 'maquina' ? '✗' : resultados?.[i] === 'empate' ? '=' : i + 1}
                      </span>
                    ))}
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                  mostrandoMano
                    ? resultadoUltimaMano === 'jugador' ? 'bg-green-900/60 border-green-700 text-green-300'
                    : resultadoUltimaMano === 'maquina' ? 'bg-red-900/60 border-red-700 text-red-300'
                    : 'bg-gray-700/60 border-gray-600 text-gray-300'
                  : bloqueado ? 'bg-black/40 border-white/10 text-gray-500'
                  : esMiTurno ? 'bg-purple-900/60 border-purple-700 text-purple-300'
                  : 'bg-black/40 border-white/10 text-gray-400'
                }`}>
                  {mostrandoMano
                    ? resultadoUltimaMano === 'jugador' ? '✅ Ganaron'
                    : resultadoUltimaMano === 'maquina' ? '❌ Perdieron'
                    : '🤝 Empate'
                  : trucoPendiente  ? '🗣 Respondé truco'
                  : envidoPendiente ? '🗣 Respondé envido'
                  : florPendiente   ? '🌸 Respondé flor'
                  : !florResuelta   ? '🌸 Resolvé Flor'
                  : turnoLabel}
                </span>
              </div>

              {/* Jugadas en mesa — trick actual */}
              <div className="relative flex flex-col items-center gap-2 py-4 px-3">
                <div className="absolute top-2 left-3 flex flex-col items-center gap-0.5">
                  <span className="text-yellow-500/70 text-[10px] font-bold uppercase tracking-widest">Muestra</span>
                  {muestra && <CartaMuestra carta={muestra} size="sm" />}
                </div>

                {jugadasMano && jugadasMano.length > 0 ? (
                  <div className="flex gap-2 flex-wrap justify-center pt-1">
                    {jugadasMano.map((j, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-0.5">
                        <CartaComp carta={j.carta} muestra={muestra} jugada enMesa />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-14 h-20 rounded-xl"
                    style={{ background: 'rgba(0,0,0,0.35)', boxShadow: 'inset 0 2px 16px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.04)' }} />
                )}
              </div>

              {/* Truco cantado */}
              {trucoCantado && (
                <div className="px-3 pb-2 flex justify-center">
                  <span className="bg-red-950/80 border border-red-700/60 text-red-300 text-xs px-3 py-1.5 rounded-full font-bold">
                    {trucoCantado === 'truco' ? '🗣 Truco' : trucoCantado === 'retruco' ? '🗣 Retruco' : '🗣 Vale Cuatro'}
                  </span>
                </div>
              )}

              {/* Responder truco */}
              {trucoPendiente && (
                <div className="px-3 pb-3 flex flex-col gap-2">
                  <p className="text-red-400 text-xs font-bold text-center uppercase tracking-wider">
                    Cantaron {trucoCantado === 'truco' ? 'Truco' : trucoCantado === 'retruco' ? 'Retruco' : 'Vale Cuatro'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <BtnCanto onClick={responderTrucoQuiero} color="red">Quiero ✓</BtnCanto>
                    <BtnCanto onClick={responderTrucoNoQuiero} color="red">No quiero ✗</BtnCanto>
                  </div>
                </div>
              )}

              {/* Responder envido */}
              {envidoPendiente && (
                <div className="px-3 pb-3 flex flex-col gap-2">
                  <p className="text-blue-400 text-xs font-bold text-center uppercase tracking-wider">
                    Cantaron {nivelEnvido === 'real' ? 'Real Envido' : nivelEnvido === 'falta' ? 'Falta Envido' : 'Envido'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <BtnCanto onClick={responderEnvidoQuiero} color="blue">Quiero ✓</BtnCanto>
                    <BtnCanto onClick={responderEnvidoNoQuiero} color="blue">No quiero ✗</BtnCanto>
                  </div>
                </div>
              )}

              {/* Flor — responder */}
              {florPendiente && (
                <div className="px-3 pb-3 flex flex-col gap-2">
                  <p className="text-yellow-400 text-xs font-bold text-center">
                    🌸 Cantaron {florCantada === 'flor' ? 'Flor' : florCantada === 'conFlor' ? 'Con Flor Envido' : 'Contra Flor al Resto'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <BtnCanto onClick={responderFlorQuiero} color="yellow">Quiero ✓</BtnCanto>
                    <BtnCanto onClick={responderFlorNoQuiero} color="yellow">No quiero ✗</BtnCanto>
                  </div>
                </div>
              )}

              <div style={{ height: '10px' }} />
            </div>
          </div>

          {/* Rival 2 */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <CartasFaceDown cantidad={rival2?.manoRestante ?? 0} label={rival2?.nombre || 'Rival 2'} />
            {rival2?.tieneFlorPiece && <span className="text-yellow-400 text-xs">🌸</span>}
          </div>
        </div>

        {/* Timer */}
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
            ? resultadoUltimaMano === 'jugador' ? '✅ Ganaron la mano'
            : resultadoUltimaMano === 'maquina' ? '❌ Perdieron la mano'
            : '🤝 Mano empatada'
          : rondaTerminada ? '⏳ Nueva ronda...'
          : !puedeJugar ? turnoLabel
          : 'Elegí una carta — doble click para jugar'}
        </p>

        {cartaSel && <p className="text-purple-400 text-xs animate-pulse">Clickeá de nuevo para jugar</p>}

        {/* Mis cartas */}
        <div className="relative w-full max-w-xl" style={{ height: '160px' }}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2"
            style={{ width: '290px', height: '160px', zIndex: 10 }}>
            {(miMano || []).map((carta, i) => {
              const jugada      = !!(miCartasJugadas || []).find(j => j.id === carta.id)
              const seleccionada = cartaSel?.id === carta.id
              const deshabilitada = jugada || !puedeJugar
              return (
                <div key={carta.id} style={{
                  position: 'absolute',
                  bottom: seleccionada ? '24px' : '0px', left: '50%',
                  transform: `translateX(calc(-50% + ${traslados[i] ?? 0}px)) rotate(${angulos[i] ?? 0}deg)`,
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

        {/* Avatar jugador */}
        <div className="flex flex-col items-center gap-1 mt-1">
          <div className="relative">
            <Avatar usuario={{ displayName: miNombre, photoURL: miPhotoURL }} size="md" />
            {globoYo && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-purple-800 border border-purple-600 text-white text-xs px-3 py-1.5 rounded-2xl shadow-lg max-w-[200px] z-30 whitespace-nowrap">
                {globoYo}
                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-purple-800 border-l border-b border-purple-600 rotate-45" />
              </div>
            )}
          </div>
          <span className="text-gray-400 text-xs font-semibold">{miNombre} {tengoFlor ? '🌸' : ''}</span>
        </div>

        {/* Botones mobile */}
        <div className="lg:hidden w-full flex flex-col gap-2 mt-2">
          {florPendiente && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-yellow-400 font-bold text-center">
                Cantaron {florCantada === 'flor' ? 'Flor' : florCantada === 'conFlor' ? 'Con Flor' : 'Contra Flor'}
              </p>
              <div className="grid grid-cols-2 gap-1">
                <BtnCanto onClick={responderFlorQuiero} color="yellow">Quiero ✓</BtnCanto>
                <BtnCanto onClick={responderFlorNoQuiero} color="yellow">No quiero ✗</BtnCanto>
              </div>
            </div>
          )}

          {hayFlor && florEquipoActiva && rivalEquipoTieneFlor && !florResuelta && !florPendiente && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider text-center">Flor</p>
              <BtnCanto onClick={() => cantarFlor('flor')} color="yellow">🌸 La mía es Flor</BtnCanto>
              <BtnCanto onClick={() => cantarFlor('conFlor')} color="yellow">Con Flor Envido</BtnCanto>
              <BtnCanto onClick={() => cantarFlor('contraFlor')} color="yellow">Contra Flor al Resto</BtnCanto>
            </div>
          )}

          {!envidoPendiente && !hayFlor && (
            <div className="flex gap-1">
              <BtnCanto onClick={() => cantarEnvido('envido')} disabled={!puedeEnvido} color="blue">Envido</BtnCanto>
              <BtnCanto onClick={() => cantarEnvido('real')} disabled={!puedeEnvido} color="blue">Real E.</BtnCanto>
              <BtnCanto onClick={() => cantarEnvido('falta')} disabled={!puedeEnvido} color="blue">Falta E.</BtnCanto>
            </div>
          )}

          {envidoPendiente && (
            <div className="flex flex-col gap-1">
              <div className="grid grid-cols-2 gap-1">
                <BtnCanto onClick={responderEnvidoQuiero} color="blue">Quiero ✓</BtnCanto>
                <BtnCanto onClick={responderEnvidoNoQuiero} color="blue">No quiero ✗</BtnCanto>
              </div>
              {puedeSubirEnvido && <BtnCanto onClick={() => onSubirEnvidoConNivel?.('envido')} color="blue">Envido ↑</BtnCanto>}
              {puedeSubirRealEnvido && <BtnCanto onClick={() => onSubirEnvidoConNivel?.('real')} color="blue">Real E. ↑</BtnCanto>}
              {puedeSubirFaltaEnvido && <BtnCanto onClick={() => onSubirEnvidoConNivel?.('falta')} color="blue">Falta E. ↑</BtnCanto>}
            </div>
          )}

          <div className="flex gap-1">
            <BtnCanto onClick={() => cantarTruco('truco')}   disabled={!puedeIniciarTruco}                       color="red">Truco</BtnCanto>
            <BtnCanto onClick={() => cantarTruco('retruco')} disabled={!(puedeIniciarRetruco || puedeRetruco)}   color="red">Retruco</BtnCanto>
            <BtnCanto onClick={() => cantarTruco('vale4')}   disabled={!(puedeIniciarVale4  || puedeVale4)}      color="red">Vale 4</BtnCanto>
          </div>
        </div>

        {/* Chat mobile */}
        <div className="lg:hidden w-full flex flex-col gap-1.5">
          {log?.filter(m => m.startsWith('💬')).slice(0, 3).length > 0 && (
            <div className="bg-blue-950/60 border border-blue-800/50 rounded-xl px-3 py-2 flex flex-col gap-0.5">
              {log.filter(m => m.startsWith('💬')).slice(0, 3).map((msg, i) => (
                <p key={i} className={`text-xs ${i === 0 ? 'text-blue-200 font-semibold' : 'text-blue-400/70'}`}>{msg}</p>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && enviar()}
              maxLength={80}
              placeholder="Escribí algo..."
              className="flex-1 bg-gray-900 border border-gray-700 focus:border-blue-500 rounded-xl px-3 py-2 text-white text-xs focus:outline-none placeholder-gray-600"
            />
            <button onClick={enviar} disabled={!chatInput.trim()}
              className="bg-blue-700 hover:bg-blue-600 disabled:opacity-30 text-white px-3 py-2 rounded-xl text-xs font-bold transition">
              →
            </button>
          </div>
        </div>

        {/* Historial mobile */}
        <div className="lg:hidden w-full">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 max-h-24 overflow-y-auto">
            {!log?.length
              ? <p className="text-gray-600 text-xs text-center">El historial aparecerá acá</p>
              : log.filter(m => !m.startsWith('💬')).slice(0, 8).map((msg, i) => <LogEntry key={i} msg={msg} reciente={i === 0} />)
            }
          </div>
        </div>
      </div>

      {/* ── PANEL DERECHO ── */}
      <div className="hidden lg:flex flex-col gap-3 w-52 flex-shrink-0">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-red-400 font-bold uppercase tracking-wider text-center">Truco</p>
          <BtnCanto onClick={() => cantarTruco('truco')}   disabled={!puedeIniciarTruco}                     color="red">Truco</BtnCanto>
          <BtnCanto onClick={() => cantarTruco('retruco')} disabled={!(puedeIniciarRetruco || puedeRetruco)} color="red">Retruco</BtnCanto>
          <BtnCanto onClick={() => cantarTruco('vale4')}   disabled={!(puedeIniciarVale4  || puedeVale4)}    color="red">Vale Cuatro</BtnCanto>
        </div>

        {/* Historial */}
        <div className="h-[525px] flex flex-col gap-2">
          <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest mb-1 text-center flex-shrink-0">Historial</p>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 overflow-y-auto flex-1 min-h-0">
            {!log?.filter(m => !m.startsWith('💬')).length
              ? <p className="text-gray-600 text-xs text-center">El historial aparecerá acá</p>
              : log.filter(m => !m.startsWith('💬')).map((msg, i) => <LogEntry key={i} msg={msg} reciente={i === 0} />)
            }
          </div>
        </div>
      </div>

    </div>
  )
}