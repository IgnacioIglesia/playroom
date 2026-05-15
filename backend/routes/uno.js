const { crearPartidaUno, jugarCarta, robarCarta, cantarUno, getEstadoUno } = require('../unoLogica')

function generarCodigoUno(unoSalas) {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ', nums = '23456789'
  const code =
    letters[Math.floor(Math.random() * letters.length)] +
    nums[Math.floor(Math.random() * nums.length)] +
    letters[Math.floor(Math.random() * letters.length)] +
    nums[Math.floor(Math.random() * nums.length)]
  return unoSalas[code] ? generarCodigoUno(unoSalas) : code
}

module.exports = function registerUno(io, socket, state) {
  const { unoSalas, unoGames } = state

  function emitirEstadoUno(salaId) {
    const game = unoGames[salaId]; const sala = unoSalas[salaId]
    if (!game || !sala) return
    for (const j of sala.jugadores) io.to(j.id).emit('uno_estado', getEstadoUno(game, j.id))
  }

  socket.on('uno_crear_sala', ({ maxJugadores = 6 } = {}) => {
    if (socket.unoSalaId && unoSalas[socket.unoSalaId]) { socket.emit('uno_error', 'Ya estás en una sala de UNO.'); return }
    const salaId = generarCodigoUno(unoSalas)
    unoSalas[salaId] = {
      id: salaId, jugadores: [{ id: socket.id, nombre: socket.nombre || 'Jugador' }],
      host: socket.id, estado: 'esperando', maxJugadores: Math.max(2, Math.min(6, maxJugadores)), createdAt: Date.now(),
    }
    socket.join(`uno:${salaId}`); socket.unoSalaId = salaId
    socket.emit('uno_sala_creada', { salaId })
    io.to(`uno:${salaId}`).emit('uno_prelobby', unoSalas[salaId])
  })

  socket.on('uno_unirse_sala', ({ salaId }) => {
    const sala = unoSalas[salaId]
    if (!sala)                              { socket.emit('uno_error', 'Sala no encontrada'); return }
    if (sala.estado !== 'esperando')        { socket.emit('uno_error', 'La partida ya comenzó'); return }
    if (sala.jugadores.length >= sala.maxJugadores) { socket.emit('uno_error', 'La sala está llena'); return }
    if (sala.jugadores.find(j => j.id === socket.id)) { socket.emit('uno_error', 'Ya estás en esta sala'); return }
    sala.jugadores.push({ id: socket.id, nombre: socket.nombre || 'Jugador' })
    socket.join(`uno:${salaId}`); socket.unoSalaId = salaId
    io.to(`uno:${salaId}`).emit('uno_prelobby', sala)
  })

  socket.on('uno_config_sala', ({ maxJugadores }) => {
    const sala = unoSalas[socket.unoSalaId]
    if (!sala || sala.host !== socket.id || sala.estado !== 'esperando') return
    sala.maxJugadores = Math.max(2, sala.jugadores.length, Math.min(6, maxJugadores))
    io.to(`uno:${socket.unoSalaId}`).emit('uno_prelobby', sala)
  })

  socket.on('uno_iniciar', () => {
    const sala = unoSalas[socket.unoSalaId]
    if (!sala || sala.host !== socket.id) return
    if (sala.jugadores.length < 2) { socket.emit('uno_error', 'Necesitás al menos 2 jugadores'); return }
    sala.estado = 'jugando'
    unoGames[sala.id] = crearPartidaUno(sala.jugadores)
    io.to(`uno:${sala.id}`).emit('uno_iniciado')
    emitirEstadoUno(sala.id)
  })

  socket.on('uno_jugar', ({ cardId, color }) => {
    const game = unoGames[socket.unoSalaId]
    if (!game) return
    const result = jugarCarta(game, socket.id, cardId, color)
    if (!result.ok) { socket.emit('uno_error', result.error); return }
    emitirEstadoUno(socket.unoSalaId)
  })

  socket.on('uno_robar', () => {
    const game = unoGames[socket.unoSalaId]
    if (!game) return
    const result = robarCarta(game, socket.id)
    if (!result.ok) { socket.emit('uno_error', result.error); return }
    emitirEstadoUno(socket.unoSalaId)
  })

  socket.on('uno_cantar', () => {
    const game = unoGames[socket.unoSalaId]
    if (!game) return
    const result = cantarUno(game, socket.id)
    if (!result.ok) { socket.emit('uno_error', result.error); return }
    emitirEstadoUno(socket.unoSalaId)
  })

  socket.on('uno_salir_sala', () => { cleanupUno() })

  function cleanupUno() {
    const salaId = socket.unoSalaId
    const sala = unoSalas[salaId]
    if (!sala) return
    socket.leave(`uno:${salaId}`); socket.unoSalaId = null
    if (sala.host === socket.id || sala.estado === 'jugando') {
      socket.to(`uno:${salaId}`).emit('uno_error', 'La sala se cerró.')
      delete unoSalas[salaId]; delete unoGames[salaId]
    } else {
      sala.jugadores = sala.jugadores.filter(j => j.id !== socket.id)
      io.to(`uno:${salaId}`).emit('uno_prelobby', sala)
    }
  }

  return { onDisconnect: cleanupUno }
}
