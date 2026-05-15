const {
  crearPartida, repartirNuevaRonda, procesarFlorInicial, procesarAccion, getEstadoParaSocket,
  crearPartida2v2, repartirNuevaRonda2v2, procesarFlorInicial2v2, procesarAccion2v2, getEstadoParaSocket2v2,
} = require('../trucoLogica')

function emitirEstadoTruco(io, salas, partida, salaId, logA, logB) {
  if (!salas[salaId]) return
  const estadoA = getEstadoParaSocket(partida, partida.socketA)
  const estadoB = getEstadoParaSocket(partida, partida.socketB)
  if (logA?.length) estadoA.logMsgs = logA
  if (logB?.length) estadoB.logMsgs = logB
  io.to(partida.socketA).emit('truco_estado', estadoA)
  io.to(partida.socketB).emit('truco_estado', estadoB)
}

function emitirEstado2v2(io, salas, partida, salaId, logs) {
  if (!salas[salaId]) return
  for (const sid of partida.sockets) {
    const estado = getEstadoParaSocket2v2(partida, sid)
    if (logs?.[sid]?.length) estado.logMsgs = logs[sid]
    io.to(sid).emit('truco_estado', estado)
  }
}

function generarCodigo(salas) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  let codigo = ''
  for (let i = 0; i < 4; i++) codigo += chars[Math.floor(Math.random() * chars.length)]
  return salas[codigo] ? generarCodigo(salas) : codigo
}

module.exports = function registerTruco(io, socket, state) {
  const { salas, trucoGames, guardarSalas } = state

  socket.on('crear_sala', (data) => {
    const limite = data?.limite || 30
    const modalidad = data?.modalidad || '1vs1'
    if (socket.salaId && salas[socket.salaId]) { socket.emit('error_sala', 'Ya estás en una sala. Salí primero.'); return }

    const salaId = generarCodigo(salas)
    const hostInfo = { id: socket.id, nombre: socket.nombre || 'Jugador', userId: socket.userId || socket.id, photoURL: socket.photoURL || '' }
    salas[salaId] = {
      id: salaId, jugadores: [hostInfo], jugadorA: socket.id,
      limite, modalidad, estado: 'esperando',
      equipoA: modalidad === '2vs2' ? [hostInfo] : [], equipoB: [],
      creador: hostInfo.userId, createdAt: Date.now(),
    }
    socket.join(salaId); socket.salaId = salaId
    socket.emit('sala_creada', { salaId, limite, modalidad })
    if (modalidad === '2vs2') socket.emit('prelobby', { modalidad, limite, equipoA: salas[salaId].equipoA, equipoB: [], salaId })
    guardarSalas()
    console.log(`Sala ${salaId} creada por ${socket.nombre} | ${modalidad} | ${limite}pts`)
  })

  socket.on('unirse_sala', ({ salaId }) => {
    salaId = String(salaId || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
    const sala = salas[salaId]
    if (!sala) { socket.emit('error_sala', `❌ Sala ${salaId || '----'} no encontrada. Revisá el código o pedí uno nuevo.`); return }
    if (sala.estado !== 'esperando') { socket.emit('error_sala', '❌ La partida ya comenzó'); return }
    const userId = socket.userId || socket.id
    if (userId && sala.jugadores.find(j => j.userId && j.userId === userId)) { socket.emit('error_sala', '❌ No podés unirte a tu propia sala'); return }

    socket.join(salaId); socket.salaId = salaId
    const jugador = { id: socket.id, nombre: socket.nombre || 'Jugador', userId: socket.userId || socket.id, photoURL: socket.photoURL || '' }

    if (sala.modalidad === '1vs1') {
      if (sala.jugadores.length >= 2) { socket.emit('error_sala', '❌ La sala está llena'); return }
      sala.jugadores.push(jugador); sala.estado = 'jugando'
      const [jA, jB] = sala.jugadores
      const partida = crearPartida(jA.id, jB.id, sala.limite, jA.nombre, jB.nombre)
      trucoGames[salaId] = partida
      const { logA, logB } = procesarFlorInicial(partida)
      io.to(salaId).emit('juego_iniciado', {
        jugadorA: jA.id, limite: sala.limite, modalidad: sala.modalidad,
        jugadorAInfo: { id: jA.id, nombre: jA.nombre, userId: jA.userId, photoURL: jA.photoURL || '' },
        jugadorBInfo: { id: jB.id, nombre: jB.nombre, userId: jB.userId, photoURL: jB.photoURL || '' },
      })
      emitirEstadoTruco(io, salas, partida, salaId, logA, logB)
      guardarSalas()
    } else if (sala.modalidad === '2vs2') {
      const total = (sala.equipoA?.length || 0) + (sala.equipoB?.length || 0)
      if (total >= 4) { socket.emit('error_sala', '❌ La sala está llena'); return }
      if (!sala.jugadores.find(j => j.id === socket.id)) sala.jugadores.push(jugador)
      socket.emit('prelobby', { modalidad: sala.modalidad, limite: sala.limite, equipoA: sala.equipoA || [], equipoB: sala.equipoB || [], salaId })
      io.to(salaId).emit('estado_sala', { modalidad: sala.modalidad, limite: sala.limite, equipoA: sala.equipoA || [], equipoB: sala.equipoB || [] })
    }
  })

  socket.on('elegir_equipo', ({ salaId, equipo }) => {
    const sala = salas[salaId]
    if (!sala || sala.modalidad !== '2vs2') return
    const jugador = { id: socket.id, nombre: socket.nombre, userId: socket.userId, photoURL: socket.photoURL || '' }
    sala.equipoA = (sala.equipoA || []).filter(j => j.id !== socket.id)
    sala.equipoB = (sala.equipoB || []).filter(j => j.id !== socket.id)
    if (equipo === 'A') {
      if (sala.equipoA.length >= 2) { socket.emit('error_sala', '❌ Equipo A está lleno'); return }
      sala.equipoA.push(jugador)
    } else {
      if (sala.equipoB.length >= 2) { socket.emit('error_sala', '❌ Equipo B está lleno'); return }
      sala.equipoB.push(jugador)
    }
    io.to(salaId).emit('estado_sala', { modalidad: sala.modalidad, limite: sala.limite, equipoA: sala.equipoA, equipoB: sala.equipoB })
    if (sala.equipoA.length === 2 && sala.equipoB.length === 2) {
      sala.estado = 'jugando'
      const partida = crearPartida2v2(sala.equipoA, sala.equipoB, sala.limite)
      trucoGames[salaId] = partida
      const logs = procesarFlorInicial2v2(partida)
      io.to(salaId).emit('juego_iniciado_2v2', { limite: sala.limite, equipoA: sala.equipoA, equipoB: sala.equipoB })
      emitirEstado2v2(io, salas, partida, salaId, logs)
      guardarSalas()
    }
  })

  socket.on('salir_sala', () => {
    const salaId = socket.salaId
    if (salaId && salas[salaId]) {
      socket.to(salaId).emit('rival_desconectado', { motivo: 'salió voluntariamente' })
      delete salas[salaId]; delete trucoGames[salaId]
      socket.leave(salaId); socket.salaId = null
      socket.emit('sala_cerrada', { mensaje: 'Saliste de la sala' })
      guardarSalas()
    }
  })

  socket.on('truco_accion', ({ tipo, datos = {} }) => {
    const salaId = socket.salaId
    if (!salaId || !salas[salaId]) return
    const partida = trucoGames[salaId]
    if (!partida) return

    if (partida.modalidad === '2v2') {
      const result = procesarAccion2v2(partida, socket.id, tipo, datos)
      if (!result.ok) { socket.emit('truco_error', result.error); return }
      emitirEstado2v2(io, salas, partida, salaId, result.logs)
      if (result.terminoRonda && !result.terminoPartida) {
        setTimeout(() => {
          if (!trucoGames[salaId]) return
          partida.manoIdx = (partida.manoIdx + 1) % 4
          repartirNuevaRonda2v2(partida)
          const logs = procesarFlorInicial2v2(partida)
          emitirEstado2v2(io, salas, partida, salaId, logs)
        }, 1800)
      }
      return
    }

    const result = procesarAccion(partida, socket.id, tipo, datos)
    if (!result.ok) { socket.emit('truco_error', result.error); return }
    emitirEstadoTruco(io, salas, partida, salaId, result.logA, result.logB)
    if (result.terminoRonda && !result.terminoPartida) {
      setTimeout(() => {
        if (!trucoGames[salaId]) return
        partida.esManoA = !partida.esManoA
        repartirNuevaRonda(partida)
        const { logA, logB } = procesarFlorInicial(partida)
        emitirEstadoTruco(io, salas, partida, salaId, logA, logB)
      }, 1800)
    }
  })

  socket.on('chat_mensaje', ({ texto }) => {
    if (!socket.salaId) return
    const msg = texto?.trim()?.slice(0, 80)
    if (!msg) return
    socket.emit('chat_propio', { texto: msg })
    socket.to(socket.salaId).emit('chat_recibido', { nombre: socket.nombre, texto: msg })
  })

  socket.on('ping', () => socket.emit('pong'))

  // Called by disconnect handler with old socket ID info
  return {
    onDisconnect() {
      const salaId = socket.salaId
      if (!salaId || !salas[salaId]) return

      const userId = socket.userId
      if (!userId) {
        // No userId → can't reconnect, destroy immediately
        socket.to(salaId).emit('rival_desconectado', { nombre: socket.nombre || 'Jugador' })
        delete salas[salaId]; delete trucoGames[salaId]
        guardarSalas()
        return
      }

      // Grace period: give 30s for reconnection
      socket.to(salaId).emit('rival_reconectando', { nombre: socket.nombre || 'Jugador' })
      const timeout = setTimeout(() => {
        if (!salas[salaId]) return
        socket.to(salaId).emit('rival_desconectado', { nombre: socket.nombre || 'Jugador' })
        delete salas[salaId]; delete trucoGames[salaId]
        state.pendingDisconnects.delete(userId)
        guardarSalas()
        console.log(`Sala ${salaId} destruida — ${socket.nombre} no reconectó`)
      }, 30_000)

      state.pendingDisconnects.set(userId, { timeout, salaId, oldSocketId: socket.id, nombre: socket.nombre })
      console.log(`${socket.nombre} desconectado de ${salaId} — esperando reconexión 30s`)
    },
    emitirEstadoTruco(salaId, partida, logA, logB) {
      emitirEstadoTruco(io, salas, partida, salaId, logA, logB)
    },
    emitirEstado2v2(salaId, partida, logs) {
      emitirEstado2v2(io, salas, partida, salaId, logs)
    },
  }
}
