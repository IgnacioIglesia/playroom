const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const {
  crearPartida, repartirNuevaRonda, procesarFlorInicial, procesarAccion, getEstadoParaSocket,
  crearPartida2v2, repartirNuevaRonda2v2, procesarFlorInicial2v2, procesarAccion2v2, getEstadoParaSocket2v2,
} = require('./trucoLogica')
const { crearPartidaPoker, dealNuevaRonda, procesarAccionPoker, getEstadoParaJugador, cpuDecide } = require('./pokerLogica')
const { crearPartidaUno, jugarCarta, robarCarta, cantarUno, getEstadoUno } = require('./unoLogica')

const app = express()
app.use(cors())
app.use(express.json())

app.post('/verify-recaptcha', async (req, res) => {
  const { token } = req.body
  if (!token) return res.json({ success: false })
  const secret = process.env.RECAPTCHA_SECRET
  try {
    const r = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`,
      { method: 'POST' }
    )
    const data = await r.json()
    res.json({ success: data.success })
  } catch {
    res.json({ success: false })
  }
})

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  }
})

const salas = {}
const usuariosConectados = new Map()
const trucoGames = {}

// ── Poker ─────────────────────────────────────────────────────────────────────
const pokerSalas = {}
const pokerGames = {}
const pictionarySalas = {}
const unoSalas = {}
const unoGames = {}

const PICTIONARY_WORDS = [
  'perro','gato','casa','arbol','auto','barco','avion','pizza','pelota','guitarra',
  'reloj','zapato','telefono','computadora','sol','luna','estrella','montana','playa','flor',
  'bicicleta','libro','silla','mesa','corazon','helado','sombrero','camara','llave','puente',
  'tren','robot','castillo','fantasma','dragon','paraguas','escalera','manzana','tortuga','cohete'
]

function generarCodigoPoker() {
  const code = String(Math.floor(Math.random() * 9000) + 1000)
  return pokerSalas[code] ? generarCodigoPoker() : code
}

function generarCodigoPictionary() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const nums = '23456789'
  const code =
    letters[Math.floor(Math.random() * letters.length)] +
    letters[Math.floor(Math.random() * letters.length)] +
    nums[Math.floor(Math.random() * nums.length)] +
    nums[Math.floor(Math.random() * nums.length)]
  return pictionarySalas[code] ? generarCodigoPictionary() : code
}

function generarCodigoUno() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const nums = '23456789'
  const code =
    letters[Math.floor(Math.random() * letters.length)] +
    nums[Math.floor(Math.random() * nums.length)] +
    letters[Math.floor(Math.random() * letters.length)] +
    nums[Math.floor(Math.random() * nums.length)]
  return unoSalas[code] ? generarCodigoUno() : code
}

function emitirEstadoUno(salaId) {
  const game = unoGames[salaId]
  const sala = unoSalas[salaId]
  if (!game || !sala) return
  for (const jugador of sala.jugadores) {
    io.to(jugador.id).emit('uno_estado', getEstadoUno(game, jugador.id))
  }
}

function normalizarTexto(texto = '') {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function emitirPictionary(salaId) {
  const sala = pictionarySalas[salaId]
  if (!sala) return
  for (const jugador of sala.jugadores) {
    const esDibujante = jugador.id === sala.drawerId
    io.to(jugador.id).emit('pictionary_estado', {
      id: sala.id,
      jugadores: sala.jugadores,
      host: sala.host,
      estado: sala.estado,
      maxJugadores: sala.maxJugadores,
      ronda: sala.ronda,
      drawerId: sala.drawerId,
      palabra: esDibujante ? sala.palabra : null,
      pista: sala.palabra ? sala.palabra.replace(/[a-záéíóúñ]/gi, '_') : '',
      acertaron: [...sala.acertaron],
      puntajes: sala.puntajes,
      chat: sala.chat.slice(-40),
    })
  }
}

function nuevaRondaPictionary(sala) {
  sala.ronda += 1
  sala.drawerIdx = (sala.drawerIdx + 1) % sala.jugadores.length
  sala.drawerId = sala.jugadores[sala.drawerIdx].id
  sala.palabra = PICTIONARY_WORDS[Math.floor(Math.random() * PICTIONARY_WORDS.length)]
  sala.acertaron = new Set()
  sala.chat = [{ tipo: 'sistema', texto: `${sala.jugadores[sala.drawerIdx].nombre} dibuja ahora.` }]
}

function emitirEstadoPoker(salaId) {
  const game = pokerGames[salaId]
  const sala = pokerSalas[salaId]
  if (!game || !sala) return
  for (const p of sala.jugadores) {
    const estado = getEstadoParaJugador(game, p.id)
    io.to(p.id).emit('poker_estado', estado)
  }
}

function procesarCpuTurns(salaId) {
  const game = pokerGames[salaId]
  if (!game || !['preflop','flop','turn','river'].includes(game.phase)) return
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

function emitirEstadoTruco(salaId, partida, logA, logB) {
  const sala = salas[salaId]
  if (!sala) return
  const estadoA = getEstadoParaSocket(partida, partida.socketA)
  const estadoB = getEstadoParaSocket(partida, partida.socketB)
  if (logA?.length) estadoA.logMsgs = logA
  if (logB?.length) estadoB.logMsgs = logB
  io.to(partida.socketA).emit('truco_estado', estadoA)
  io.to(partida.socketB).emit('truco_estado', estadoB)
}

function emitirEstado2v2(salaId, partida, logs) {
  const sala = salas[salaId]
  if (!sala) return
  for (const sid of partida.sockets) {
    const estado = getEstadoParaSocket2v2(partida, sid)
    if (logs?.[sid]?.length) estado.logMsgs = logs[sid]
    io.to(sid).emit('truco_estado', estado)
  }
}

function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  let codigo = ''
  for (let i = 0; i < 4; i++) codigo += chars[Math.floor(Math.random() * chars.length)]
  return salas[codigo] ? generarCodigo() : codigo
}

io.on('connection', (socket) => {
  console.log(`🟢 Conectado: ${socket.id}`)

  socket.on('set_nombre', ({ nombre, userId: uid, photoURL }) => {
    socket.nombre = nombre || 'Jugador'
    socket.photoURL = photoURL || ''
    const userId = uid || socket.id
    const socketAnterior = usuariosConectados.get(userId)
    if (socketAnterior && socketAnterior !== socket.id) {
      const socketAnt = io.sockets.sockets.get(socketAnterior)
      if (socketAnt) {
        socketAnt.emit('conexion_duplicada', 'Te desconectaste porque abriste otra pestaña')
        socketAnt.disconnect(true)
      }
    }
    usuariosConectados.set(userId, socket.id)
    socket.userId = userId
    console.log(`👤 ${socket.nombre} (${userId}) conectado`)
  })

  socket.on('crear_sala', (data) => {
    console.log(`📦 ${socket.nombre} creando sala:`, data)
    const limite = data?.limite || 30
    const modalidad = data?.modalidad || '1vs1'

    if (socket.salaId && salas[socket.salaId]) {
      socket.emit('error_sala', 'Ya estás en una sala. Salí primero.')
      return
    }

    const salaId = generarCodigo()
    const hostInfo = {
      id: socket.id,
      nombre: socket.nombre || 'Jugador',
      userId: socket.userId || socket.id,
      photoURL: socket.photoURL || '',
    }
    salas[salaId] = {
      id: salaId,
      jugadores: [hostInfo],
      jugadorA: socket.id,
      limite,
      modalidad,
      estado: 'esperando',
      equipoA: modalidad === '2vs2' ? [hostInfo] : [],
      equipoB: [],
      creador: hostInfo.userId,
      createdAt: Date.now()
    }

    socket.join(salaId)
    socket.salaId = salaId

    socket.emit('sala_creada', { salaId, limite, modalidad })

    if (modalidad === '2vs2') {
      socket.emit('prelobby', {
        modalidad,
        limite,
        equipoA: salas[salaId].equipoA,
        equipoB: [],
        salaId,
      })
    }

    console.log(`✅ Sala ${salaId} creada por ${socket.nombre} | ${modalidad} | ${limite}pts`)
  })

  socket.on('unirse_sala', ({ salaId }) => {
    salaId = String(salaId || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
    console.log(`🔍 ${socket.nombre || socket.id} intenta unirse a sala ${salaId}`)
    const sala = salas[salaId]
    console.log(`📋 modalidad: "${sala?.modalidad}" | estado: ${sala?.estado}`)

    if (!sala) { socket.emit('error_sala', `❌ Sala ${salaId || '----'} no encontrada. Revisá el código o pedí uno nuevo.`); return }
    if (sala.estado !== 'esperando') { socket.emit('error_sala', '❌ La partida ya comenzó'); return }

    // Solo bloquear si ambos tienen userId definido y son iguales (misma cuenta)
    const userId = socket.userId || socket.id
    const jugadorExistente = userId && sala.jugadores.find(j => j.userId && j.userId === userId)
    if (jugadorExistente) { socket.emit('error_sala', '❌ No podés unirte a tu propia sala'); return }

    socket.join(salaId)
    socket.salaId = salaId

    const jugador = {
      id: socket.id,
      nombre: socket.nombre || 'Jugador',
      userId: socket.userId || socket.id,
      photoURL: socket.photoURL || '',
    }

    if (sala.modalidad === '1vs1') {
      if (sala.jugadores.length >= 2) { socket.emit('error_sala', '❌ La sala está llena'); return }

      sala.jugadores.push(jugador)
      sala.estado = 'jugando'

      const jugadorA = sala.jugadores[0]
      const jugadorB = sala.jugadores[1]

      console.log(`🎮 1vs1 iniciado: ${jugadorA.nombre} vs ${jugadorB.nombre}`)

      const partida = crearPartida(jugadorA.id, jugadorB.id, sala.limite, jugadorA.nombre, jugadorB.nombre)
      trucoGames[salaId] = partida
      const { logA, logB } = procesarFlorInicial(partida)

      io.to(salaId).emit('juego_iniciado', {
        jugadorA: jugadorA.id,
        limite: sala.limite,
        modalidad: sala.modalidad,
        jugadorAInfo: { id: jugadorA.id, nombre: jugadorA.nombre, userId: jugadorA.userId, photoURL: jugadorA.photoURL || '' },
        jugadorBInfo: { id: jugadorB.id, nombre: jugadorB.nombre, userId: jugadorB.userId, photoURL: jugadorB.photoURL || '' },
      })

      emitirEstadoTruco(salaId, partida, logA, logB)

    } else if (sala.modalidad === '2vs2') {
      const totalJugadores = (sala.equipoA?.length || 0) + (sala.equipoB?.length || 0)
      if (totalJugadores >= 4) { socket.emit('error_sala', '❌ La sala está llena'); return }

      if (!sala.jugadores.find(j => j.id === socket.id)) sala.jugadores.push(jugador)

      socket.emit('prelobby', {
        modalidad: sala.modalidad,
        limite: sala.limite,
        equipoA: sala.equipoA || [],
        equipoB: sala.equipoB || [],
        salaId,
      })

      io.to(salaId).emit('estado_sala', {
        modalidad: sala.modalidad,
        limite: sala.limite,
        equipoA: sala.equipoA || [],
        equipoB: sala.equipoB || [],
      })
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

    io.to(salaId).emit('estado_sala', {
      modalidad: sala.modalidad,
      limite: sala.limite,
      equipoA: sala.equipoA,
      equipoB: sala.equipoB,
    })

    console.log(`👥 ${socket.nombre} → Equipo ${equipo} en sala ${salaId}`)

    if (sala.equipoA.length === 2 && sala.equipoB.length === 2) {
      sala.estado = 'jugando'
      console.log(`🎮 2vs2 iniciado en sala ${salaId}!`)
      const partida = crearPartida2v2(sala.equipoA, sala.equipoB, sala.limite)
      trucoGames[salaId] = partida
      const logs = procesarFlorInicial2v2(partida)
      io.to(salaId).emit('juego_iniciado_2v2', {
        limite: sala.limite,
        equipoA: sala.equipoA,
        equipoB: sala.equipoB,
      })
      emitirEstado2v2(salaId, partida, logs)
    }
  })

  socket.on('salir_sala', () => {
    const salaId = socket.salaId
    if (salaId && salas[salaId]) {
      socket.to(salaId).emit('rival_desconectado', { motivo: 'salió voluntariamente' })
      delete salas[salaId]
      delete trucoGames[salaId]
      socket.leave(salaId)
      socket.salaId = null
      socket.emit('sala_cerrada', { mensaje: 'Saliste de la sala' })
    }
  })

  socket.on('truco_accion', ({ tipo, datos = {} }) => {
    const salaId = socket.salaId
    if (!salaId || !salas[salaId]) return
    const partida = trucoGames[salaId]
    if (!partida) return

    console.log(`🎲 [${salaId}] ${socket.nombre} → ${tipo}`)

    if (partida.modalidad === '2v2') {
      const result = procesarAccion2v2(partida, socket.id, tipo, datos)
      if (!result.ok) {
        socket.emit('truco_error', result.error)
        console.warn(`⚠️ [${salaId}] acción inválida "${tipo}": ${result.error}`)
        return
      }
      emitirEstado2v2(salaId, partida, result.logs)
      if (result.terminoRonda && !result.terminoPartida) {
        setTimeout(() => {
          if (!trucoGames[salaId]) return
          partida.manoIdx = (partida.manoIdx + 1) % 4
          repartirNuevaRonda2v2(partida)
          const logs = procesarFlorInicial2v2(partida)
          emitirEstado2v2(salaId, partida, logs)
        }, 1800)
      }
      return
    }

    const result = procesarAccion(partida, socket.id, tipo, datos)

    if (!result.ok) {
      socket.emit('truco_error', result.error)
      console.warn(`⚠️ [${salaId}] acción inválida "${tipo}": ${result.error}`)
      return
    }

    emitirEstadoTruco(salaId, partida, result.logA, result.logB)

    if (result.terminoRonda && !result.terminoPartida) {
      setTimeout(() => {
        if (!trucoGames[salaId]) return
        partida.esManoA = !partida.esManoA
        repartirNuevaRonda(partida)
        const { logA, logB } = procesarFlorInicial(partida)
        emitirEstadoTruco(salaId, partida, logA, logB)
      }, 1800)
    }
  })

  socket.on('chat_mensaje', ({ texto }) => {
    if (!socket.salaId) return
    const msg = texto?.trim()?.slice(0, 80)
    if (!msg) return
    console.log(`💬 [${socket.salaId}] ${socket.nombre}: ${msg}`)
    socket.emit('chat_propio', { texto: msg })
    socket.to(socket.salaId).emit('chat_recibido', { nombre: socket.nombre, texto: msg })
  })

  socket.on('ping', () => socket.emit('pong'))

  // ── UNO events ────────────────────────────────────────────────────────────

  socket.on('uno_crear_sala', ({ maxJugadores = 6 } = {}) => {
    if (socket.unoSalaId && unoSalas[socket.unoSalaId]) {
      socket.emit('uno_error', 'Ya estás en una sala de UNO.')
      return
    }
    const salaId = generarCodigoUno()
    unoSalas[salaId] = {
      id: salaId,
      jugadores: [{ id: socket.id, nombre: socket.nombre || 'Jugador' }],
      host: socket.id,
      estado: 'esperando',
      maxJugadores: Math.max(2, Math.min(6, maxJugadores)),
      createdAt: Date.now(),
    }
    socket.join(`uno:${salaId}`)
    socket.unoSalaId = salaId
    socket.emit('uno_sala_creada', { salaId })
    io.to(`uno:${salaId}`).emit('uno_prelobby', unoSalas[salaId])
  })

  socket.on('uno_unirse_sala', ({ salaId }) => {
    const sala = unoSalas[salaId]
    if (!sala) { socket.emit('uno_error', 'Sala no encontrada'); return }
    if (sala.estado !== 'esperando') { socket.emit('uno_error', 'La partida ya comenzó'); return }
    if (sala.jugadores.length >= sala.maxJugadores) { socket.emit('uno_error', 'La sala está llena'); return }
    if (sala.jugadores.find(j => j.id === socket.id)) { socket.emit('uno_error', 'Ya estás en esta sala'); return }
    sala.jugadores.push({ id: socket.id, nombre: socket.nombre || 'Jugador' })
    socket.join(`uno:${salaId}`)
    socket.unoSalaId = salaId
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

  socket.on('uno_salir_sala', () => {
    const salaId = socket.unoSalaId
    const sala = unoSalas[salaId]
    if (!sala) return
    socket.leave(`uno:${salaId}`)
    socket.unoSalaId = null
    if (sala.host === socket.id || sala.estado === 'jugando') {
      socket.to(`uno:${salaId}`).emit('uno_error', 'La sala se cerró.')
      delete unoSalas[salaId]
      delete unoGames[salaId]
      return
    }
    sala.jugadores = sala.jugadores.filter(j => j.id !== socket.id)
    io.to(`uno:${salaId}`).emit('uno_prelobby', sala)
  })

  // ── Pictionary events ─────────────────────────────────────────────────────

  socket.on('pictionary_crear_sala', ({ maxJugadores = 8 } = {}) => {
    if (socket.pictionarySalaId && pictionarySalas[socket.pictionarySalaId]) {
      socket.emit('pictionary_error', 'Ya estás en una sala de Pictionary.')
      return
    }
    const salaId = generarCodigoPictionary()
    pictionarySalas[salaId] = {
      id: salaId,
      jugadores: [{ id: socket.id, nombre: socket.nombre || 'Jugador' }],
      host: socket.id,
      estado: 'esperando',
      maxJugadores: Math.max(3, Math.min(8, maxJugadores)),
      ronda: 0,
      drawerIdx: -1,
      drawerId: null,
      palabra: '',
      acertaron: new Set(),
      puntajes: { [socket.id]: 0 },
      chat: [],
      createdAt: Date.now(),
    }
    socket.join(`pictionary:${salaId}`)
    socket.pictionarySalaId = salaId
    socket.emit('pictionary_sala_creada', { salaId })
    emitirPictionary(salaId)
  })

  socket.on('pictionary_unirse_sala', ({ salaId }) => {
    const sala = pictionarySalas[salaId]
    if (!sala) { socket.emit('pictionary_error', 'Sala no encontrada'); return }
    if (sala.estado !== 'esperando') { socket.emit('pictionary_error', 'La partida ya comenzó'); return }
    if (sala.jugadores.length >= sala.maxJugadores) { socket.emit('pictionary_error', 'La sala está llena'); return }
    if (sala.jugadores.find(j => j.id === socket.id)) { socket.emit('pictionary_error', 'Ya estás en esta sala'); return }

    sala.jugadores.push({ id: socket.id, nombre: socket.nombre || 'Jugador' })
    sala.puntajes[socket.id] = 0
    socket.join(`pictionary:${salaId}`)
    socket.pictionarySalaId = salaId
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
    sala.estado = 'jugando'
    nuevaRondaPictionary(sala)
    emitirPictionary(sala.id)
    io.to(`pictionary:${sala.id}`).emit('pictionary_limpiar')
  })

  socket.on('pictionary_siguiente_ronda', () => {
    const sala = pictionarySalas[socket.pictionarySalaId]
    if (!sala || sala.host !== socket.id || sala.estado !== 'jugando') return
    nuevaRondaPictionary(sala)
    emitirPictionary(sala.id)
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
    if (!sala || sala.estado !== 'jugando') return
    const msg = String(texto || '').trim().slice(0, 60)
    if (!msg) return
    if (socket.id === sala.drawerId) return

    const jugador = sala.jugadores.find(j => j.id === socket.id)
    const acerto = normalizarTexto(msg) === normalizarTexto(sala.palabra)
    if (acerto && !sala.acertaron.has(socket.id)) {
      sala.acertaron.add(socket.id)
      sala.puntajes[socket.id] = (sala.puntajes[socket.id] || 0) + 10
      sala.puntajes[sala.drawerId] = (sala.puntajes[sala.drawerId] || 0) + 5
      sala.chat.push({ tipo: 'acierto', nombre: jugador?.nombre || 'Jugador', texto: 'adivinó la palabra' })
    } else if (!sala.acertaron.has(socket.id)) {
      sala.chat.push({ tipo: 'mensaje', nombre: jugador?.nombre || 'Jugador', texto: msg })
    }
    emitirPictionary(sala.id)
  })

  socket.on('pictionary_salir_sala', () => {
    const salaId = socket.pictionarySalaId
    const sala = pictionarySalas[salaId]
    if (!sala) return
    socket.leave(`pictionary:${salaId}`)
    socket.pictionarySalaId = null
    if (sala.host === socket.id || sala.estado === 'jugando') {
      socket.to(`pictionary:${salaId}`).emit('pictionary_error', 'La sala se cerró.')
      delete pictionarySalas[salaId]
      return
    }
    sala.jugadores = sala.jugadores.filter(j => j.id !== socket.id)
    delete sala.puntajes[socket.id]
    emitirPictionary(salaId)
  })

  // ── Poker events ──────────────────────────────────────────────────────────

  socket.on('poker_crear_sala', ({ maxJugadores = 6 } = {}) => {
    if (socket.pokerSalaId && pokerSalas[socket.pokerSalaId]) {
      socket.emit('poker_error', 'Ya estás en una sala de poker.')
      return
    }
    const salaId = generarCodigoPoker()
    pokerSalas[salaId] = {
      id: salaId,
      jugadores: [{ id: socket.id, nombre: socket.nombre || 'Jugador' }],
      host: socket.id,
      maxJugadores: Math.max(3, Math.min(6, maxJugadores)),
      estado: 'esperando',
      createdAt: Date.now(),
    }
    socket.join(`poker:${salaId}`)
    socket.pokerSalaId = salaId
    socket.emit('poker_sala_creada', { salaId })
    io.to(`poker:${salaId}`).emit('poker_prelobby', pokerSalas[salaId])
    console.log(`[Poker] Sala ${salaId} creada por ${socket.nombre}`)
  })

  socket.on('poker_unirse_sala', ({ salaId }) => {
    const sala = pokerSalas[salaId]
    if (!sala)                              { socket.emit('poker_error', 'Sala no encontrada'); return }
    if (sala.estado !== 'esperando')        { socket.emit('poker_error', 'La partida ya comenzó'); return }
    if (sala.jugadores.length >= sala.maxJugadores) { socket.emit('poker_error', 'La sala está llena'); return }
    if (sala.jugadores.find(j => j.id === socket.id)) { socket.emit('poker_error', 'Ya estás en esta sala'); return }

    sala.jugadores.push({ id: socket.id, nombre: socket.nombre || 'Jugador' })
    socket.join(`poker:${salaId}`)
    socket.pokerSalaId = salaId
    io.to(`poker:${salaId}`).emit('poker_prelobby', sala)
    console.log(`[Poker] ${socket.nombre} se unió a sala ${salaId}`)
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
    if (sala.jugadores.length < 3)         { socket.emit('poker_error', 'Necesitás al menos 3 jugadores'); return }

    sala.estado = 'jugando'
    const game = crearPartidaPoker(sala.jugadores)
    dealNuevaRonda(game)
    pokerGames[salaId] = game
    io.to(`poker:${salaId}`).emit('poker_iniciado')
    emitirEstadoPoker(salaId)
    procesarCpuTurns(salaId)
    console.log(`[Poker] Sala ${salaId} iniciada (${game.players.length} jugadores)`)
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
    const sala = pokerSalas[salaId]
    const game = pokerGames[salaId]
    if (!game || !sala || sala.host !== socket.id) return
    dealNuevaRonda(game)
    emitirEstadoPoker(salaId)
    procesarCpuTurns(salaId)
  })

  socket.on('poker_salir_sala', () => {
    const salaId = socket.pokerSalaId
    const sala = pokerSalas[salaId]
    if (!salaId || !sala) return

    const esHost = sala.host === socket.id
    const partidaIniciada = !!pokerGames[salaId]
    socket.leave(`poker:${salaId}`)
    socket.pokerSalaId = null

    if (esHost || partidaIniciada) {
      socket.to(`poker:${salaId}`).emit('poker_jugador_salio', { nombre: socket.nombre })
      delete pokerSalas[salaId]
      delete pokerGames[salaId]
      return
    }

    sala.jugadores = sala.jugadores.filter(j => j.id !== socket.id)
    io.to(`poker:${salaId}`).emit('poker_prelobby', sala)
  })

  function limpiarPokerPorSalida() {
    const salaId = socket.pokerSalaId
    const sala = pokerSalas[salaId]
    if (!salaId || !sala) return

    const esHost = sala.host === socket.id
    const partidaIniciada = !!pokerGames[salaId]
    if (esHost || partidaIniciada) {
      socket.to(`poker:${salaId}`).emit('poker_jugador_salio', { nombre: socket.nombre })
      delete pokerSalas[salaId]
      delete pokerGames[salaId]
      return
    }

    sala.jugadores = sala.jugadores.filter(j => j.id !== socket.id)
    socket.to(`poker:${salaId}`).emit('poker_prelobby', sala)
    socket.pokerSalaId = null
  }

  socket.on('disconnect', (reason) => {
    console.log(`🔴 Desconectado: ${socket.nombre || socket.id} (${reason})`)

    if (socket.userId) usuariosConectados.delete(socket.userId)
    limpiarPokerPorSalida()
    if (socket.unoSalaId && unoSalas[socket.unoSalaId]) {
      const salaIdUno = socket.unoSalaId
      const salaUno = unoSalas[salaIdUno]
      if (salaUno.host === socket.id || salaUno.estado === 'jugando') {
        socket.to(`uno:${salaIdUno}`).emit('uno_error', 'La sala se cerró.')
        delete unoSalas[salaIdUno]
        delete unoGames[salaIdUno]
      } else {
        salaUno.jugadores = salaUno.jugadores.filter(j => j.id !== socket.id)
        io.to(`uno:${salaIdUno}`).emit('uno_prelobby', salaUno)
      }
    }
    if (socket.pictionarySalaId && pictionarySalas[socket.pictionarySalaId]) {
      const salaIdPic = socket.pictionarySalaId
      const salaPic = pictionarySalas[salaIdPic]
      if (salaPic.host === socket.id || salaPic.estado === 'jugando') {
        socket.to(`pictionary:${salaIdPic}`).emit('pictionary_error', 'La sala se cerró.')
        delete pictionarySalas[salaIdPic]
      } else {
        salaPic.jugadores = salaPic.jugadores.filter(j => j.id !== socket.id)
        delete salaPic.puntajes[socket.id]
        emitirPictionary(salaIdPic)
      }
    }

    const salaId = socket.salaId
    if (salaId && salas[salaId]) {
      socket.to(salaId).emit('rival_desconectado', {
        motivo: 'se desconectó',
        nombre: socket.nombre || 'Jugador'
      })
      delete salas[salaId]
      delete trucoGames[salaId]
      console.log(`🧹 Sala ${salaId} eliminada`)
    }
  })
})

app.get('/', (req, res) => res.json({
  servidor: 'PlayRoom - Truco Online',
  version: '2.0.0',
  salasActivas: Object.keys(salas).length,
  timestamp: new Date().toISOString()
}))

app.get('/salas', (req, res) => res.json(
  Object.entries(salas).map(([id, s]) => ({
    id,
    jugadores: s.jugadores.map(j => j.nombre),
    modalidad: s.modalidad,
    limite: s.limite,
    estado: s.estado
  }))
))

setInterval(() => {
  const ahora = Date.now()
  for (const [salaId, sala] of Object.entries(salas)) {
    if (sala.estado === 'esperando' && (ahora - sala.createdAt) > 10 * 60 * 1000) {
      delete salas[salaId]
      console.log(`🧹 Sala inactiva ${salaId} eliminada`)
    }
  }
}, 60 * 1000)

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})

process.on('uncaughtException', err => console.error('❌ Error:', err))
process.on('SIGINT', () => server.close(() => process.exit(0)))
