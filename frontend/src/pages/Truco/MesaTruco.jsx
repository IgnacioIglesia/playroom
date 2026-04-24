import { CartaComp, CartaMuestra, BtnCanto, TanteadorPalillos } from './componentes'

export default function MesaTruco({
  // Datos
  manoJ, manoM, cjJ, cjM, muestra, resultados, manoActual,
  ptsJ, ptsM, limite,
  turno,
  cartaSel, setCartaSel,
  log,

  // Estados
  mostrandoMano,
  trucoCantado, ultimoEnCantar,
  trucoPendiente, envidoPendiente, florPendiente,
  florResuelta, envidoResuelto,
  bloqueado,

  // Fn's de acción
  jugarCarta,
  cantarTruco, responderTrucoQuiero, responderTrucoNoQuiero, subirTruco,
  cantarEnvido, responderEnvidoQuiero, responderEnvidoNoQuiero,
  cantarFlor, responderFlorQuiero, responderFlorNoQuiero,

  // Variables
  puedeJugar, puedeEnvido,
  puedeIniciarTruco, puedeRetruco, puedeVale4,
  puedeIniciarRetruco, puedeIniciarVale4,
  puedeSubirEnvido, puedeSubirRealEnvido, puedeSubirFaltaEnvido,

  // Info rival
  nombreRival, inicialesRival,
  miNombre, misIniciales,

  // Flor
  florJ, florM, florCantada,
  mostrarCartasRival,

  // Envido
  nivelEnvido,

  // Extras
  resultadoUltimaMano,
  onSubirEnvidoConNivel,
}) {
  return (
    <div className="flex-1 flex max-w-[1400px] mx-auto w-full px-4 py-4 gap-4">

{/* Panel izquierdo — Envido / Flor */}
<div className="flex flex-col gap-3 w-52 flex-shrink-0">
  <div className="flex flex-col gap-2">

    {/* ENVIDO NORMAL - SOLO si NO hay flor activa y nadie tiene flor */}
    {!florJ && !florM && (
      <>
        <p className="text-xs text-blue-400 font-bold uppercase tracking-wider text-center">Envido</p>
        <BtnCanto onClick={() => cantarEnvido('envido')} disabled={!puedeEnvido} color="blue">Envido</BtnCanto>
        <BtnCanto onClick={() => cantarEnvido('real')} disabled={!puedeEnvido} color="blue">Real Envido</BtnCanto>
        <BtnCanto onClick={() => cantarEnvido('falta')} disabled={!puedeEnvido} color="blue">Falta Envido</BtnCanto>
      </>
    )}

    {/* Si hay Flor de un solo jugador, mostrar mensaje */}
    {(florJ || florM) && !(florJ && florM) && !florResuelta && (
      <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-2 text-center">
        <p className="text-yellow-400 text-xs font-bold">
          {florJ ? '🌸 Tenés Flor' : `🌸 ${nombreRival} tiene Flor`}
        </p>
        <p className="text-gray-400 text-[10px]">
          {florJ ? '+3 puntos automáticos' : '+3 puntos para rival al finalizar'}
        </p>
      </div>
    )}

    {/* FLOR - Ambos tienen Flor - MENÚ PRINCIPAL (sin apuestas aún) */}
    {florJ && florM && !florResuelta && !florEnJuego && (
      <>
        <div className="h-px bg-gray-700 my-1" />
        <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider text-center">⚘ ¡Ambos tienen Flor!</p>
        <p className="text-gray-500 text-[10px] text-center mb-1">Elegí cómo apostar:</p>
        <BtnCanto onClick={() => cantarFlor('flor')} color="yellow">🌸 La mía es Flor (3 pts)</BtnCanto>
        <BtnCanto onClick={() => cantarFlor('conFlor')} color="yellow">🌸 Con Flor Envido (6 pts)</BtnCanto>
        <BtnCanto onClick={() => cantarFlor('contraFlor')} color="yellow">🌸 Contra Flor al Resto</BtnCanto>
      </>
    )}

    {/* FLOR - Respuesta a la apuesta del rival */}
    {florPendiente && (
      <>
        <div className="h-px bg-gray-700 my-1" />
        <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider text-center">
          {nombreRival} cantó: {nivelFlor === 'flor' ? 'La mía es Flor' : nivelFlor === 'conFlor' ? 'Con Flor Envido' : 'Contra Flor al Resto'}
        </p>
        <div className="flex gap-2">
          <BtnCanto onClick={responderFlorQuiero} color="yellow">✅ Quiero</BtnCanto>
          <BtnCanto onClick={responderFlorNoQuiero} color="yellow">❌ No quiero</BtnCanto>
        </div>
        
        {/* Botones para subir la apuesta */}
        {nivelFlor === 'flor' && (
          <BtnCanto onClick={() => cantarFlor('conFlor')} color="yellow">⬆️ Con Flor Envido</BtnCanto>
        )}
        {nivelFlor !== 'contraFlor' && nivelFlor !== null && (
          <BtnCanto onClick={() => cantarFlor('contraFlor')} color="yellow">⬆️ Contra Flor al Resto</BtnCanto>
        )}
      </>
    )}

    {/* Cuando la Flor ya está resuelta */}
    {florResuelta && (florJ || florM) && (
      <div className="bg-gray-800/50 rounded-xl p-2 text-center">
        <p className="text-gray-400 text-xs">✅ Flor resuelta</p>
      </div>
    )}
  </div>

  <TanteadorPalillos ptsJ={ptsJ} ptsM={ptsM} limite={limite} />
</div>

      {/* Centro */}
      <div className="flex-1 flex flex-col items-center gap-2">

        {/* Avatar rival */}
        <div className="flex flex-col items-center gap-1 relative">
          <div className="w-12 h-12 rounded-full bg-red-900 border-2 border-red-600 flex items-center justify-center">
            <span className="text-white font-extrabold text-lg">{inicialesRival}</span>
          </div>
          <span className="text-gray-400 text-xs font-semibold">{nombreRival}</span>
        </div>

        {/* Mesa + abánicos */}
        <div className="relative w-full max-w-xl">

          {/* Cartas rival en abanico */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3"
            style={{ width: '280px', height: '150px', zIndex: 10 }}>
            {manoM.map((c, i) => {
              const angulos = [-15, 0, 15]
              const traslados = [-75, 0, 75]
              const jugada = !!cjM.find(j => j.id === c.id)
              return (
                <div key={c.id} style={{
                  position: 'absolute', bottom: '0px', left: '50%',
                  transform: `translateX(calc(-50% + ${traslados[i]}px)) rotate(${angulos[i]}deg)`,
                  transformOrigin: 'bottom center',
                  opacity: jugada ? 0.3 : 1, zIndex: i + 1,
                  filter: mostrarCartasRival ? 'brightness(1.3) saturate(1.1)' : 'none',
                  transition: 'filter 0.3s ease',
                }}>
                  <CartaComp carta={c} muestra={muestra} jugada={jugada} oculta={!mostrarCartasRival} />
                </div>
              )
            })}
          </div>

          <div style={{ height: '80px' }} />

          {/* Mesa */}
          <div className={`w-full rounded-3xl overflow-hidden border-2 shadow-2xl transition-all ${mostrandoMano ? 'border-yellow-500/60' : 'border-white/5'}`}
            style={{ background: 'radial-gradient(ellipse at 50% 30%, #2d1f4e 0%, #1a1130 60%, #0f0a1e 100%)' }}>

            {/* Header */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-white/5 bg-black/20">
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
                : trucoPendiente     ? '🗣 Respondé truco'
                : envidoPendiente    ? '🗣 Respondé envido'
                : florPendiente      ? '🌸 Respondé flor'
                : !florResuelta      ? '🌸 Resolvé Flor'
                : turno === 'yo' || turno === 'jugador' ? '🎯 Tu turno'
                : '⏳ Turno rival'}
              </span>
            </div>

            {/* Cartas jugadas + muestra */}
            <div className="relative flex flex-col items-center gap-6 py-8 px-4">
              <div className="absolute top-4 left-5 flex flex-col items-center gap-1">
                <span className="text-yellow-500/80 text-xs font-bold uppercase tracking-widest">Muestra</span>
                {muestra && <CartaMuestra carta={muestra} muestra={muestra} />}
              </div>

              {cjM[manoActual]
                ? <CartaComp carta={cjM[manoActual]} muestra={muestra} jugada enMesa />
                : <div className="w-20 h-32 rounded-xl border-2 border-dashed border-white/10 bg-black/20 flex items-center justify-center">
                    <span className="text-white/20 text-2xl">—</span>
                  </div>
              }

              <div className="w-32 h-px bg-white/10" />

              {cjJ[manoActual]
                ? <CartaComp carta={cjJ[manoActual]} muestra={muestra} jugada enMesa />
                : <div className="w-20 h-32 rounded-xl border-2 border-dashed border-white/10 bg-black/20 flex items-center justify-center">
                    <span className="text-white/20 text-2xl">—</span>
                  </div>
              }
            </div>

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

            <div style={{ height: '80px' }} />
          </div>

          {/* Cartas jugador en abanico */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3"
            style={{ width: '280px', height: '150px', zIndex: 10 }}>
            {manoJ.map((carta, i) => {
              const angulos = [-15, 0, 15]
              const traslados = [-75, 0, 75]
              const jugada = !!cjJ.find(j => j.id === carta.id)
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

        <div style={{ height: '80px' }} />
        
        <p className="text-gray-500 text-xs uppercase tracking-wider">
        {mostrandoMano
          ? resultadoUltimaMano === 'jugador' ? '✅ Ganaste la mano'
          : resultadoUltimaMano === 'maquina' ? '❌ Perdiste la mano'
          : '🤝 Mano empatada'
        : !florResuelta ? '⚠️ Resolvé la Flor primero'
        : !puedeJugar ? 'Esperá tu turno'
        : 'Elegí una carta'}
      </p>

        {cartaSel && <p className="text-purple-400 text-xs animate-pulse">Clickeá de nuevo para jugar</p>}

        {/* Avatar jugador */}
        <div className="flex flex-col items-center gap-1 mt-1 relative">
          <div className="w-12 h-12 rounded-full bg-purple-900 border-2 border-purple-600 flex items-center justify-center">
            <span className="text-white font-extrabold text-lg">{misIniciales}</span>
          </div>
          <span className="text-gray-400 text-xs font-semibold">{miNombre}</span>
        </div>
      </div>

      {/* Panel derecho — Truco + Historial */}
      <div className="flex flex-col gap-3 w-52 flex-shrink-0">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-red-400 font-bold uppercase tracking-wider text-center">Truco</p>
          <BtnCanto onClick={() => cantarTruco('truco')} disabled={!puedeIniciarTruco} color="red">Truco</BtnCanto>
          <BtnCanto onClick={() => cantarTruco('retruco')} disabled={!(puedeIniciarRetruco || puedeRetruco)} color="red">Retruco</BtnCanto>
          <BtnCanto onClick={() => cantarTruco('vale4')} disabled={!(puedeIniciarVale4 || puedeVale4)} color="red">Vale Cuatro</BtnCanto>
        </div>

        <div className="flex flex-col flex-1">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 text-center">Historial</p>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 overflow-y-auto flex-1 max-h-[500px]">
            {log.length === 0
              ? <p className="text-gray-600 text-xs text-center">El historial aparecerá acá</p>
              : log.map((msg, i) => (
                <p key={i} className={`text-xs mb-1 ${i === 0 ? 'text-white font-semibold' : i < 3 ? 'text-gray-400' : 'text-gray-600'}`}>
                  {msg}
                </p>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}