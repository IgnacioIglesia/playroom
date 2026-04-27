const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://playroom-frontend.onrender.com'],
    methods: ['GET', 'POST']
  }
})

const salas = {}
const usuariosConectados = new Map()

function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let codigo = ''
  for (let i = 0; i < 4; i++) codigo += chars[Math.floor(Math.random() * chars.length)]
  return salas[codigo] ? generarCodigo() : codigo
}

io.on('connection', (socket) => {
  console.log(`🟢 Conectado: ${socket.id}`)

  socket.on('set_nombre', ({ nombre, userId: uid }) => {
    socket.nombre = nombre || 'Jugador'
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
    salas[salaId] = {
      id: salaId,
      jugadores: [{ id: socket.id, nombre: socket.nombre, userId: socket.userId }],
      jugadorA: socket.id,
      limite,
      modalidad,
      estado: 'esperando',
      equipoA: modalidad === '2vs2' ? [{ id: socket.id, nombre: socket.nombre, userId: socket.userId }] : [],
      equipoB: [],
      creador: socket.userId,
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
    console.log(`🔍 ${socket.nombre} intenta unirse a sala ${salaId}`)
    const sala = salas[salaId]
    console.log(`📋 modalidad: "${sala?.modalidad}" | estado: ${sala?.estado}`)

    if (!sala) { socket.emit('error_sala', '❌ Sala no encontrada'); return }
    if (sala.estado !== 'esperando') { socket.emit('error_sala', '❌ La partida ya comenzó'); return }

    const jugadorExistente = sala.jugadores.find(j => j.userId === socket.userId)
    if (jugadorExistente) { socket.emit('error_sala', '❌ No podés unirte a tu propia sala'); return }

    socket.join(salaId)
    socket.salaId = salaId

    const jugador = { id: socket.id, nombre: socket.nombre, userId: socket.userId }

    if (sala.modalidad === '1vs1') {
      if (sala.jugadores.length >= 2) { socket.emit('error_sala', '❌ La sala está llena'); return }

      sala.jugadores.push(jugador)
      sala.estado = 'jugando'

      const seed = Math.floor(Math.random() * 2147483647)
      const jugadorA = sala.jugadores[0]
      const jugadorB = sala.jugadores[1]

      console.log(`🎮 1vs1 iniciado: ${jugadorA.nombre} vs ${jugadorB.nombre}`)

      io.to(salaId).emit('juego_iniciado', {
        seed,
        jugadorA: jugadorA.id,
        limite: sala.limite,
        modalidad: sala.modalidad,
        jugadorAInfo: { id: jugadorA.id, nombre: jugadorA.nombre, userId: jugadorA.userId },
        jugadorBInfo: { id: jugadorB.id, nombre: jugadorB.nombre, userId: jugadorB.userId },
      })

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

    const jugador = { id: socket.id, nombre: socket.nombre, userId: socket.userId }

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
      const seed = Math.floor(Math.random() * 2147483647)
      console.log(`🎮 2vs2 iniciado en sala ${salaId}!`)
      io.to(salaId).emit('juego_iniciado_2v2', {
        seed,
        limite: sala.limite,
        equipoA: sala.equipoA,
        equipoB: sala.equipoB,
      })
    }
  })

  socket.on('salir_sala', () => {
    const salaId = socket.salaId
    if (salaId && salas[salaId]) {
      socket.to(salaId).emit('rival_desconectado', { motivo: 'salió voluntariamente' })
      delete salas[salaId]
      socket.leave(salaId)
      socket.salaId = null
      socket.emit('sala_cerrada', { mensaje: 'Saliste de la sala' })
    }
  })

  socket.on('accion', ({ tipo, datos }) => {
    const salaId = socket.salaId
    if (!salaId || !salas[salaId]) return
    console.log(`🎲 [${salaId}] ${socket.nombre} → ${tipo}`)
    socket.to(salaId).emit('accion_rival', { tipo, datos })
  })

  socket.on('ping', () => socket.emit('pong'))

  socket.on('disconnect', (reason) => {
    console.log(`🔴 Desconectado: ${socket.nombre || socket.id} (${reason})`)

    if (socket.userId) usuariosConectados.delete(socket.userId)

    const salaId = socket.salaId
    if (salaId && salas[salaId]) {
      socket.to(salaId).emit('rival_desconectado', {
        motivo: 'se desconectó',
        nombre: socket.nombre || 'Jugador'
      })
      delete salas[salaId]
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