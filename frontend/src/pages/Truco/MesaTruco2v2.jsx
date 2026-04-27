import { useState } from 'react'
import { CartaComp, CartaMuestra, BtnCanto, TanteadorPalillos } from './componentes'

export default function MesaTruco2v2({
  // Cartas
  manoJ, manoCompanero,
  manoRivalA, manoRivalB,
  cjJ, cjCompanero, cjRivalA, cjRivalB,
  manoActual,
  muestra,

  // Jugadores
  miNombre, misIniciales,
  nombreCompanero, inicialesCompanero,
  nombreRivalA, inicialesRivalA,
  nombreRivalB, inicialesRivalB,

  // Juego
  ptsJ, ptsM, limite,
  turno, turnoNombre,
  resultados,
  mostrandoMano, resultadoUltimaMano,
  trucoCantado, ultimoEnCantar,
  trucoPendiente, envidoPendiente, florPendiente,
  florResuelta, florJ, florM, florCantada,
  nivelEnvido, bloqueado,
  cartaSel, setCartaSel,
  log,
  verCartasCompanero, setVerCartasCompanero,

  // Funciones
  jugarCarta,
  cantarTruco, responderTrucoQuiero, responderTrucoNoQuiero, subirTruco,
  cantarEnvido, responderEnvidoQuiero, responderEnvidoNoQuiero,
  cantarFlor, responderFlorQuiero, responderFlorNoQuiero,
  onSubirEnvidoConNivel,

  // Booleanos
  puedeJugar, puedeEnvido,
  puedeIniciarTruco, puedeRetruco, puedeVale4,
  puedeIniciarRetruco, puedeIniciarVale4,
  puedeSubirEnvido, puedeSubirRealEnvido, puedeSubirFaltaEnvido,
}) {

  const AbanicoCarta = ({ cartas, cj, oculta = true, angulos = [-15,0,15], traslados = [-65,0,65] }) => (
    <div className="relative flex justify-center items-end" style={{ width: '200px', height: '120px' }}>
      {cartas.map((carta, i) => {
        const jugada = !!cj?.find(j => j.id === carta.id)
        return (
          <div key={carta.id} style={{
            position: 'absolute', bottom: '0px', left: '50%',
            transform: `translateX(calc(-50% + ${traslados[i]}px)) rotate(${angulos[i]}deg)`,
            transformOrigin: 'bottom center',
            opacity: jugada ? 0.3 : 1,
            zIndex: i + 1,
          }}>
            <CartaComp carta={carta} muestra={muestra} jugada={jugada} oculta={oculta} />
          </div>
        )
      })}
    </div>
  )

  const AvatarJugador = ({ iniciales, nombre, color = 'purple', pts, esActivo }) => (
    <div className={`flex flex-col items-center gap-1 ${esActivo ? 'scale-110' : ''} transition-transform`}>
      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center
        ${color === 'purple' ? 'bg-purple-900 border-purple-500' : 'bg-red-900 border-red-600'}
        ${esActivo ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-gray-950' : ''}
      `}>
        <span className="text-white font-extrabold text-sm">{iniciales}</span>
      </div>
      <span className="text-gray-400 text-xs font-semibold">{nombre}</span>
    </div>
  )

  const SlotCarta = ({ carta }) => carta
    ? <CartaComp carta={carta} muestra={muestra} jugada enMesa />
    : <div className="w-14 h-20 rounded-xl border-2 border-dashed border-white/10 bg-black/20 flex items-center justify-center">
        <span className="text-white/20 text-lg">—</span>
      </div>

  return (
    <div className="flex-1 flex max-w-[1400px] mx-auto w-full px-4 py-4 gap-4">

      {/* Panel izquierdo — Envido/Flor */}
      <div className="hidden lg:flex flex-col gap-3 w-48 flex-shrink-0">

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
            <p className="text-xs text-blue-400 font-bold uppercase tracking-wider text-center">Respondé envido</p>
            <BtnCanto onClick={responderEnvidoQuiero} color="blue">Quiero ✓</BtnCanto>
            <BtnCanto onClick={responderEnvidoNoQuiero} color="red">No quiero ✗</BtnCanto>
            {puedeSubirEnvido && <BtnCanto onClick={() => onSubirEnvidoConNivel?.('envido')} color="blue">Envido ↑</BtnCanto>}
            {puedeSubirRealEnvido && <BtnCanto onClick={() => onSubirEnvidoConNivel?.('real')} color="blue">Real ↑</BtnCanto>}
            {puedeSubirFaltaEnvido && <BtnCanto onClick={() => onSubirEnvidoConNivel?.('falta')} color="blue">Falta ↑</BtnCanto>}
          </>
        )}

        {florJ && florM && !florResuelta && !florPendiente && (
          <>
            <div className="h-px bg-gray-700 my-1" />
            <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider text-center">Flor</p>
            <BtnCanto onClick={() => cantarFlor('flor')} color="yellow">La mía es Flor</BtnCanto>
            <BtnCanto onClick={() => cantarFlor('conFlor')} color="yellow">Con Flor Envido</BtnCanto>
            <BtnCanto onClick={() => cantarFlor('contraFlor')} color="yellow">Contra Flor Resto</BtnCanto>
          </>
        )}

        {florPendiente && (
          <>
            <div className="h-px bg-gray-700 my-1" />
            <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider text-center">Respondé flor</p>
            <BtnCanto onClick={responderFlorQuiero} color="yellow">Quiero ✓</BtnCanto>
            <BtnCanto onClick={responderFlorNoQuiero} color="yellow">No quiero ✗</BtnCanto>
          </>
        )}

        <TanteadorPalillos ptsJ={ptsJ} ptsM={ptsM} limite={limite} />

        {/* Ver cartas compañero */}
        <button
          onClick={() => setVerCartasCompanero(v => !v)}
          className={`mt-2 py-2 rounded-xl text-xs font-bold border transition ${
            verCartasCompanero
              ? 'bg-green-900 border-green-600 text-green-300'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
          }`}
        >
          {verCartasCompanero ? '👁 Ocultando cartas' : '👁 Ver compañero'}
        </button>
      </div>

      {/* Centro — Mesa 2vs2 */}
      <div className="flex-1 flex flex-col items-center gap-2">

        {/* Rival A — arriba */}
        <div className="flex flex-col items-center gap-1">
          <AvatarJugador
            iniciales={inicialesRivalA}
            nombre={nombreRivalA}
            color="red"
            esActivo={turno === 'rivalA'}
          />
          <AbanicoCarta cartas={manoRivalA || []} cj={cjRivalA} oculta />
        </div>

        {/* Fila del medio — Rival B izq, Mesa, Compañero der */}
        <div className="flex items-center gap-3 w-full max-w-2xl">

          {/* Compañero B — izquierda */}
          <div className="flex flex-col items-center gap-2 w-32 flex-shrink-0">
            <AvatarJugador
              iniciales={inicialesRivalB}
              nombre={nombreRivalB}
              color="red"
              esActivo={turno === 'rivalB'}
            />
            <div className="flex flex-col gap-1">
              {(manoRivalB || []).map((c, i) => {
                const jugada = !!cjRivalB?.find(j => j.id === c.id)
                return (
                  <div key={c.id} style={{ opacity: jugada ? 0.3 : 1 }}>
                    <CartaComp carta={c} muestra={muestra} jugada={jugada} oculta />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mesa central */}
          <div className={`flex-1 rounded-3xl overflow-hidden border-2 shadow-2xl transition-all ${mostrandoMano ? 'border-yellow-500/60' : 'border-white/5'}`}
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
                : turno === 'yo' ? 'bg-purple-900/60 border-purple-700 text-purple-300'
                : 'bg-black/40 border-white/10 text-gray-400'
              }`}>
                {mostrandoMano
                  ? resultadoUltimaMano === 'jugador' ? '✅ Ganaste' : resultadoUltimaMano === 'maquina' ? '❌ Perdiste' : '🤝 Empate'
                  : turno === 'yo' ? '🎯 Tu turno'
                  : `⏳ Turno de ${turnoNombre}`}
              </span>
            </div>

            {/* Cartas jugadas en mesa — 4 slots */}
            <div className="relative flex flex-col items-center gap-2 py-4 px-4">

              {/* Muestra */}
              <div className="absolute top-3 left-4 flex flex-col items-center gap-1">
                <span className="text-yellow-500/80 text-xs font-bold uppercase tracking-widest">Muestra</span>
                {muestra && <CartaMuestra carta={muestra} muestra={muestra} />}
              </div>

              {/* Carta Rival A */}
              <SlotCarta carta={cjRivalA?.[manoActual]} />

              <div className="flex gap-4 items-center">
                {/* Carta Rival B */}
                <SlotCarta carta={cjRivalB?.[manoActual]} />
                <div className="w-px h-8 bg-white/10" />
                {/* Carta Compañero */}
                <SlotCarta carta={cjCompanero?.[manoActual]} />
              </div>

              {/* Carta Yo */}
              <SlotCarta carta={cjJ?.[manoActual]} />
            </div>

            {/* Truco cantado */}
            {trucoCantado && (
              <div className="px-4 pb-3 flex justify-center">
                <span className="bg-red-950/80 border border-red-700/60 text-red-300 text-xs px-3 py-1.5 rounded-full font-bold">
                  {trucoCantado === 'truco' ? '🗣 Truco' : trucoCantado === 'retruco' ? '🗣 Retruco' : '🗣 Vale Cuatro'}
                  {' · '}{ultimoEnCantar === 'yo' ? 'vos' : ultimoEnCantar}
                </span>
              </div>
            )}

            {/* Responder truco */}
            {trucoPendiente && (
              <div className="px-4 pb-4 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <BtnCanto onClick={responderTrucoQuiero} color="gray">Quiero ✓</BtnCanto>
                  <BtnCanto onClick={responderTrucoNoQuiero} color="red">No quiero ✗</BtnCanto>
                </div>
                {puedeRetruco && <BtnCanto onClick={() => subirTruco('retruco')} color="red">Retruco ↑</BtnCanto>}
                {puedeVale4 && <BtnCanto onClick={() => subirTruco('vale4')} color="red">Vale 4 ↑</BtnCanto>}
              </div>
            )}

            <div style={{ height: '60px' }} />
          </div>

          {/* Compañero A — derecha */}
          <div className="flex flex-col items-center gap-2 w-32 flex-shrink-0">
            <AvatarJugador
              iniciales={inicialesCompanero}
              nombre={nombreCompanero}
              color="purple"
              esActivo={turno === 'companero'}
            />
            <div className="flex flex-col gap-1">
              {(manoCompanero || []).map((c, i) => {
                const jugada = !!cjCompanero?.find(j => j.id === c.id)
                return (
                  <div key={c.id} style={{ opacity: jugada ? 0.3 : 1 }}>
                    <CartaComp carta={c} muestra={muestra} jugada={jugada} oculta={!verCartasCompanero} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mis cartas — abanico abajo */}
        <div className="relative" style={{ width: '280px', height: '150px' }}>
          {(manoJ || []).map((carta, i) => {
            const angulos = [-15, 0, 15]
            const traslados = [-75, 0, 75]
            const jugada = !!cjJ?.find(j => j.id === carta.id)
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

        <p className="text-gray-500 text-xs uppercase tracking-wider text-center mt-2">
          {!puedeJugar ? 'Esperá tu turno' : 'Elegí una carta'}
        </p>
        {cartaSel && <p className="text-purple-400 text-xs animate-pulse">Clickeá de nuevo para jugar</p>}

        {/* Avatar propio */}
        <div className="flex flex-col items-center gap-1">
          <AvatarJugador iniciales={misIniciales} nombre={miNombre} color="purple" esActivo={turno === 'yo'} />
        </div>

      </div>

      {/* Panel derecho — Truco + Historial */}
      <div className="hidden lg:flex flex-col gap-3 w-48 flex-shrink-0">
        <p className="text-xs text-red-400 font-bold uppercase tracking-wider text-center">Truco</p>
        <BtnCanto onClick={() => cantarTruco('truco')} disabled={!puedeIniciarTruco} color="red">Truco</BtnCanto>
        <BtnCanto onClick={() => cantarTruco('retruco')} disabled={!(puedeIniciarRetruco || puedeRetruco)} color="red">Retruco</BtnCanto>
        <BtnCanto onClick={() => cantarTruco('vale4')} disabled={!(puedeIniciarVale4 || puedeVale4)} color="red">Vale Cuatro</BtnCanto>

        <div className="flex flex-col flex-1 mt-2">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 text-center">Historial</p>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 overflow-y-auto flex-1 max-h-96">
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