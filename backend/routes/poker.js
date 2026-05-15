const { crearPartidaPoker, dealNuevaRonda, procesarAccionPoker, getEstadoParaJugador, cpuDecide } = require('../pokerLogica')

function generarCodigoPoker(pokerSalas) {
  const code = String(Math.floor(Math.random() * 9000) + 1000)
  return pokerSalas[code] ? generarCodigoPoker(pokerSalas) : code
}

module.exports = function registerPoker(io, socket, state) {
  const { pokerSalas, pokerGames } = state

  function emitirEstadoPoker(salaId) {
    const game = pokerGames[salaId]
    const sala = pokerSalas[salaId]
    if (!game || !sala) return
    for (const p of sala.jugadores) {
      io.to(p.id).emit('poker_estado', getEstadoParaJugador(game, p.id))
    }
  }

  function procesarCpuTurns(salaId) {
    const game = pokerGames[salaId]
    if (!game || !['preflop', 'flop', 'turn', 'river'].includes(game.phase)) return
    const current = game.players[game.currentIdx]
    if (!current || !current.isCpu || current.status !== 'active') return
    setTimeout(() => {
      const g = pokerGames[salaId]
      if (!g) return
      const cp = g.players[g.currentIdx]
      if (!cp || !cp.isCpu || cp.status !== 'active') return
      const d = cpuDecide(cp, g)
      procesarAccionPoker(g, cp.id, d.action, d.amount || 20)
      emitirEstadoPoker(salaId)
      procesarCpuTurns(salaId)
    }, 700 + Math.random() * 600)
  }

  socket.on('poker_crear_sala', ({ maxJugadores = 6 } = {}) => {
    if (socket.pokerSalaId && pokerSalas[socket.pokerSalaId]) { socket.emit('poker_error', 'Ya estás en una sala de poker.'); return }
    const salaId = generarCodigoPoker(pokerSalas)
    pokerSalas[salaId] = {
      id: salaId,
      jugadores: [{ id: socket.id, nombre: socket.nombre || 'Jugador' }],
      host: socket.id,
      maxJugadores: Math.max(3, Math.min(6, maxJugadores)),
      estado: 'esperando',
      createdAt: Date.now(),
    }
    socket.join(`poker:${salaId}`); socket.pokerSalaId = salaId
    socket.emit('poker_sala_creada', { salaId })
    io.to(`poker:${salaId}`).emit('poker_prelobby', pokerSalas[salaId])
  })

  socket.on('poker_unirse_sala', ({ salaId }) => {
    const sala = pokerSalas[salaId]
    if (!sala)                                    { socket.emit('poker_error', 'Sala no encontrada'); return }
    if (sala.estado !== 'esperando')              { socket.emit('poker_error', 'La partida ya comenzó'); return }
    if (sala.jugadores.length >= sala.maxJugadores) { socket.emit('poker_error', 'La sala está llena'); return }
    if (sala.jugadores.find(j => j.id === socket.id)) { socket.emit('poker_error', 'Ya estás en esta sala'); return }
    sala.jugadores.push({ id: socket.id, nombre: socket.nombre || 'Jugador' })
    socket.join(`poker:${salaId}`); socket.pokerSalaId = salaId
    io.to(`poker:${salaId}`).emit('poker_prelobby', sala)
  })

  socket.on('poker_config_sala', ({ maxJugadores }) => {
    const sala = pokerSalas[socket.pokerSalaId]
    if (!sala || sala.host !== socket.id) return
    sala.maxJugadores = Math.max(3, sala.jugadores.length, Math.min(6, maxJugadores))
    io.to(`poker:${socket.pokerSalaId}`).emit('poker_prelobby', sala)
  })

  socket.on('poker_iniciar', () => {
    const salaId = socket.pokerSalaId
    const sala = pokerSalas[salaId]
    if (!sala || sala.host !== socket.id) return
    if (sala.jugadores.length < 3) { socket.emit('poker_error', 'Necesitás al menos 3 jugadores'); return }
    sala.estado = 'jugando'
    const game = crearPartidaPoker(sala.jugadores)
    dealNuevaRonda(game)
    pokerGames[salaId] = game
    io.to(`poker:${salaId}`).emit('poker_iniciado')
    emitirEstadoPoker(salaId)
    procesarCpuTurns(salaId)
  })

  socket.on('poker_accion', ({ action, raiseAmt = 20 }) => {
    const salaId = socket.pokerSalaId
    const game = pokerGames[salaId]
    if (!game) return
    const result = procesarAccionPoker(game, socket.id, action, raiseAmt)
    if (!result.ok) { socket.emit('poker_error', result.error); return }
    emitirEstadoPoker(salaId)
    procesarCpuTurns(salaId)
  })

  socket.on('poker_nueva_mano', () => {
    const salaId = socket.pokerSalaId
    const sala = pokerSalas[salaId]; const game = pokerGames[salaId]
    if (!game || !sala || sala.host !== socket.id) return
    dealNuevaRonda(game); emitirEstadoPoker(salaId); procesarCpuTurns(salaId)
  })

  socket.on('poker_salir_sala', () => {
    cleanupPoker()
  })

  function cleanupPoker() {
    const salaId = socket.pokerSalaId
    const sala = pokerSalas[salaId]
    if (!salaId || !sala) return
    const esHost = sala.host === socket.id
    const iniciada = !!pokerGames[salaId]
    socket.leave(`poker:${salaId}`); socket.pokerSalaId = null
    if (esHost || iniciada) {
      socket.to(`poker:${salaId}`).emit('poker_jugador_salio', { nombre: socket.nombre })
      delete pokerSalas[salaId]; delete pokerGames[salaId]
    } else {
      sala.jugadores = sala.jugadores.filter(j => j.id !== socket.id)
      socket.to(`poker:${salaId}`).emit('poker_prelobby', sala)
    }
  }

  return { onDisconnect: cleanupPoker }
}
