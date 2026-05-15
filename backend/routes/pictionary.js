const PICTIONARY_WORDS = [
  'perro','gato','casa','arbol','auto','barco','avion','pizza','pelota','guitarra',
  'reloj','zapato','telefono','computadora','sol','luna','estrella','montana','playa','flor',
  'bicicleta','libro','silla','mesa','corazon','helado','sombrero','camara','llave','puente',
  'tren','robot','castillo','fantasma','dragon','paraguas','escalera','manzana','tortuga','cohete',
]

function generarCodigoPictionary(pictionarySalas) {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ', nums = '23456789'
  const code =
    letters[Math.floor(Math.random() * letters.length)] +
    letters[Math.floor(Math.random() * letters.length)] +
    nums[Math.floor(Math.random() * nums.length)] +
    nums[Math.floor(Math.random() * nums.length)]
  return pictionarySalas[code] ? generarCodigoPictionary(pictionarySalas) : code
}

function normalizarTexto(texto = '') {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
}

module.exports = function registerPictionary(io, socket, state) {
  const { pictionarySalas } = state

  function emitirPictionary(salaId) {
    const sala = pictionarySalas[salaId]
    if (!sala) return
    for (const j of sala.jugadores) {
      io.to(j.id).emit('pictionary_estado', {
        id: sala.id, jugadores: sala.jugadores, host: sala.host, estado: sala.estado,
        maxJugadores: sala.maxJugadores, ronda: sala.ronda, drawerId: sala.drawerId,
        palabra: j.id === sala.drawerId ? sala.palabra : null,
        pista: sala.palabra ? sala.palabra.replace(/[a-záéíóúñ]/gi, '_') : '',
        acertaron: [...sala.acertaron], puntajes: sala.puntajes, chat: sala.chat.slice(-40),
      })
    }
  }

  function nuevaRonda(sala) {
    sala.ronda += 1
    sala.drawerIdx = (sala.drawerIdx + 1) % sala.jugadores.length
    sala.drawerId = sala.jugadores[sala.drawerIdx].id
    sala.palabra = PICTIONARY_WORDS[Math.floor(Math.random() * PICTIONARY_WORDS.length)]
    sala.acertaron = new Set()
    sala.chat = [{ tipo: 'sistema', texto: `${sala.jugadores[sala.drawerIdx].nombre} dibuja ahora.` }]
  }

  socket.on('pictionary_crear_sala', ({ maxJugadores = 8 } = {}) => {
    if (socket.pictionarySalaId && pictionarySalas[socket.pictionarySalaId]) { socket.emit('pictionary_error', 'Ya estás en una sala.'); return }
    const salaId = generarCodigoPictionary(pictionarySalas)
    pictionarySalas[salaId] = {
      id: salaId, jugadores: [{ id: socket.id, nombre: socket.nombre || 'Jugador' }],
      host: socket.id, estado: 'esperando', maxJugadores: Math.max(3, Math.min(8, maxJugadores)),
      ronda: 0, drawerIdx: -1, drawerId: null, palabra: '',
      acertaron: new Set(), puntajes: { [socket.id]: 0 }, chat: [], createdAt: Date.now(),
    }
    socket.join(`pictionary:${salaId}`); socket.pictionarySalaId = salaId
    socket.emit('pictionary_sala_creada', { salaId })
    emitirPictionary(salaId)
  })

  socket.on('pictionary_unirse_sala', ({ salaId }) => {
    const sala = pictionarySalas[salaId]
    if (!sala)                              { socket.emit('pictionary_error', 'Sala no encontrada'); return }
    if (sala.estado !== 'esperando')        { socket.emit('pictionary_error', 'La partida ya comenzó'); return }
    if (sala.jugadores.length >= sala.maxJugadores) { socket.emit('pictionary_error', 'La sala está llena'); return }
    if (sala.jugadores.find(j => j.id === socket.id)) { socket.emit('pictionary_error', 'Ya estás en esta sala'); return }
    sala.jugadores.push({ id: socket.id, nombre: socket.nombre || 'Jugador' })
    sala.puntajes[socket.id] = 0
    socket.join(`pictionary:${salaId}`); socket.pictionarySalaId = salaId
    emitirPictionary(salaId)
  })

  socket.on('pictionary_config_sala', ({ maxJugadores }) => {
    const sala = pictionarySalas[socket.pictionarySalaId]
    if (!sala || sala.host !== socket.id || sala.estado !== 'esperando') return
    sala.maxJugadores = Math.max(3, sala.jugadores.length, Math.min(8, maxJugadores))
    emitirPictionary(socket.pictionarySalaId)
  })

  socket.on('pictionary_iniciar', () => {
    const sala = pictionarySalas[socket.pictionarySalaId]
    if (!sala || sala.host !== socket.id) return
    if (sala.jugadores.length < 3) { socket.emit('pictionary_error', 'Necesitás al menos 3 jugadores'); return }
    sala.estado = 'jugando'; nuevaRonda(sala)
    emitirPictionary(sala.id)
    io.to(`pictionary:${sala.id}`).emit('pictionary_limpiar')
  })

  socket.on('pictionary_siguiente_ronda', () => {
    const sala = pictionarySalas[socket.pictionarySalaId]
    if (!sala || sala.host !== socket.id || sala.estado !== 'jugando') return
    nuevaRonda(sala); emitirPictionary(sala.id)
    io.to(`pictionary:${sala.id}`).emit('pictionary_limpiar')
  })

  socket.on('pictionary_dibujo', (stroke) => {
    const sala = pictionarySalas[socket.pictionarySalaId]
    if (!sala || sala.drawerId !== socket.id || sala.estado !== 'jugando') return
    socket.to(`pictionary:${sala.id}`).emit('pictionary_dibujo', stroke)
  })

  socket.on('pictionary_limpiar', () => {
    const sala = pictionarySalas[socket.pictionarySalaId]
    if (!sala || sala.drawerId !== socket.id) return
    io.to(`pictionary:${sala.id}`).emit('pictionary_limpiar')
  })

  socket.on('pictionary_mensaje', ({ texto }) => {
    const sala = pictionarySalas[socket.pictionarySalaId]
    if (!sala || sala.estado !== 'jugando' || socket.id === sala.drawerId) return
    const msg = String(texto || '').trim().slice(0, 60)
    if (!msg) return
    const jugador = sala.jugadores.find(j => j.id === socket.id)
    if (normalizarTexto(msg) === normalizarTexto(sala.palabra) && !sala.acertaron.has(socket.id)) {
      sala.acertaron.add(socket.id)
      sala.puntajes[socket.id] = (sala.puntajes[socket.id] || 0) + 10
      sala.puntajes[sala.drawerId] = (sala.puntajes[sala.drawerId] || 0) + 5
      sala.chat.push({ tipo: 'acierto', nombre: jugador?.nombre || 'Jugador', texto: 'adivinó la palabra' })
    } else if (!sala.acertaron.has(socket.id)) {
      sala.chat.push({ tipo: 'mensaje', nombre: jugador?.nombre || 'Jugador', texto: msg })
    }
    emitirPictionary(sala.id)
  })

  socket.on('pictionary_salir_sala', () => { cleanupPictionary() })

  function cleanupPictionary() {
    const salaId = socket.pictionarySalaId
    const sala = pictionarySalas[salaId]
    if (!sala) return
    socket.leave(`pictionary:${salaId}`); socket.pictionarySalaId = null
    if (sala.host === socket.id || sala.estado === 'jugando') {
      socket.to(`pictionary:${salaId}`).emit('pictionary_error', 'La sala se cerró.')
      delete pictionarySalas[salaId]
    } else {
      sala.jugadores = sala.jugadores.filter(j => j.id !== socket.id)
      delete sala.puntajes[socket.id]
      emitirPictionary(salaId)
    }
  }

  return { onDisconnect: cleanupPictionary }
}
