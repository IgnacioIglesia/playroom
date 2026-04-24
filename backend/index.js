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
// ── ALMACENAMIENTO ──
const salas = {}
const usuariosConectados = new Map() // userId -> socket.id

// ── UTILIDADES ──
function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let codigo = ''
  for (let i = 0; i < 4; i++) {
    codigo += chars[Math.floor(Math.random() * chars.length)]
  }
  return salas[codigo] ? generarCodigo() : codigo
}

// ── SOCKET.IO ──
io.on('connection', (socket) => {
  console.log(`🟢 Conectado: ${socket.id}`)
  let userId = null

  // ── GUARDAR NOMBRE Y USER ID DEL JUGADOR ──
  socket.on('set_nombre', ({ nombre, userId: uid }) => {
    socket.nombre = nombre || 'Jugador'
    userId = uid || socket.id
    
    // Verificar si el usuario ya tiene otra conexión activa
    const socketAnterior = usuariosConectados.get(userId)
    if (socketAnterior && socketAnterior !== socket.id) {
      console.log(`⚠️ Usuario ${userId} ya tiene conexión activa, desconectando anterior...`)
      const socketAnt = io.sockets.sockets.get(socketAnterior)
      if (socketAnt) {
        socketAnt.emit('conexion_duplicada', 'Te desconectaste porque abriste otra pestaña')
        socketAnt.disconnect(true)
      }
    }
    
    usuariosConectados.set(userId, socket.id)
    socket.userId = userId
    
    console.log(`👤 ${socket.nombre} (${userId}) conectado con socket ${socket.id}`)
  })

  // ── CREAR SALA ──
  socket.on('crear_sala', (data) => {
    console.log(`📦 ${socket.nombre} creando sala:`, data)
    
    const limite = data?.limite || 30
    const modalidad = data?.modalidad || '1vs1'
    
    // Verificar si el jugador ya está en una sala
    if (socket.salaId && salas[socket.salaId]) {
      socket.emit('error_sala', 'Ya estás en una sala. Salí primero.')
      return
    }
    
    const salaId = generarCodigo()
    salas[salaId] = {
      id: salaId,
      jugadores: [{ id: socket.id, nombre: socket.nombre, userId: socket.userId }],
      jugadorA: socket.id,
      limite: limite,
      modalidad: modalidad,
      estado: 'esperando',
      creador: socket.userId,
      createdAt: Date.now()
    }
    
    socket.join(salaId)
    socket.salaId = salaId
    
    socket.emit('sala_creada', { 
      salaId, 
      limite, 
      modalidad 
    })
    
    console.log(`✅ Sala ${salaId} creada por ${socket.nombre} | Modalidad: ${modalidad} | Límite: ${limite}`)
    console.log(`   Jugadores en sala: 1/2`)
  })

  // ── UNIRSE A SALA ──
  socket.on('unirse_sala', ({ salaId }) => {
    console.log(`🔍 ${socket.nombre} intenta unirse a sala ${salaId}`)
    
    const sala = salas[salaId]

    if (!sala) {
      socket.emit('error_sala', '❌ Sala no encontrada')
      console.log(`❌ Sala ${salaId} no encontrada`)
      return
    }
    
    if (sala.estado !== 'esperando') {
      socket.emit('error_sala', '❌ La partida ya comenzó')
      console.log(`❌ Sala ${salaId} ya está en juego`)
      return
    }
    
    if (sala.jugadores.length >= 2) {
      socket.emit('error_sala', '❌ La sala está llena')
      console.log(`❌ Sala ${salaId} está llena`)
      return
    }

    // Verificar que no sea el mismo jugador (mismo userId)
    const jugadorExistente = sala.jugadores.find(j => j.userId === socket.userId)
    if (jugadorExistente) {
      socket.emit('error_sala', '❌ No podés unirte a tu propia sala')
      console.log(`❌ ${socket.nombre} intentó unirse a su propia sala`)
      return
    }

    // Agregar jugador
    const jugador2 = { 
      id: socket.id, 
      nombre: socket.nombre,
      userId: socket.userId
    }
    sala.jugadores.push(jugador2)
    socket.join(salaId)
    socket.salaId = salaId
    sala.estado = 'jugando'

    const seed = Math.floor(Math.random() * 2147483647)
    
    // Obtener información de ambos jugadores
    const jugadorA = sala.jugadores[0]
    const jugadorB = sala.jugadores[1]
    
    console.log(`🎮 ¡Partida iniciada en sala ${salaId}!`)
    console.log(`👥 ${jugadorA.nombre} (A) vs ${jugadorB.nombre} (B)`)
    console.log(`🎲 Seed: ${seed}`)
    
    // Emitir evento de inicio a ambos jugadores
    io.to(salaId).emit('juego_iniciado', {
      seed,
      jugadorA: jugadorA.id,
      jugadorB: jugadorB.id,
      limite: sala.limite,
      modalidad: sala.modalidad,
      jugadorAInfo: { 
        id: jugadorA.id, 
        nombre: jugadorA.nombre,
        userId: jugadorA.userId
      },
      jugadorBInfo: { 
        id: jugadorB.id, 
        nombre: jugadorB.nombre,
        userId: jugadorB.userId
      },
    })
    
    console.log(`✅ Juego iniciado! Ambos jugadores notificados`)
  })

  // ── SALIR DE SALA ──
  socket.on('salir_sala', () => {
    const salaId = socket.salaId
    if (salaId && salas[salaId]) {
      console.log(`🚪 ${socket.nombre} salió de la sala ${salaId}`)
      
      // Avisar al otro jugador
      socket.to(salaId).emit('rival_desconectado', { motivo: 'salió voluntariamente' })
      
      // Eliminar sala
      delete salas[salaId]
      
      socket.leave(salaId)
      socket.salaId = null
      
      socket.emit('sala_cerrada', { mensaje: 'Saliste de la sala' })
    }
  })

  // ── ACCIONES DEL JUEGO ──
  socket.on('accion', ({ tipo, datos }) => {
    const salaId = socket.salaId
    if (!salaId) {
      console.log(`⚠️ ${socket.nombre} intentó enviar acción sin sala`)
      return
    }
    
    const sala = salas[salaId]
    if (!sala) {
      console.log(`⚠️ Sala ${salaId} no encontrada`)
      return
    }
    
    console.log(`🎲 [${salaId}] ${socket.nombre} → ${tipo}`)
    
    // Reenviar al otro jugador
    socket.to(salaId).emit('accion_rival', { tipo, datos })
  })

  // ── NUEVA RONDA (por compatibilidad) ──
  socket.on('nueva_ronda', ({ seed, manoA }) => {
    const salaId = socket.salaId
    if (!salaId) return
    
    console.log(`🔄 Nueva ronda en sala ${salaId}, manoA: ${manoA}`)
    socket.to(salaId).emit('nueva_ronda_rival', { seed, manoA })
  })

  // ── PING PARA MANTENER CONEXIÓN ──
  socket.on('ping', () => {
    socket.emit('pong')
  })

  // ── DESCONEXIÓN ──
  socket.on('disconnect', (reason) => {
    console.log(`🔴 Desconectado: ${socket.nombre || socket.id} (${reason})`)
    
    // Limpiar usuario de la lista de conectados
    if (socket.userId) {
      usuariosConectados.delete(socket.userId)
    }
    
    const salaId = socket.salaId
    if (salaId && salas[salaId]) {
      const sala = salas[salaId]
      const nombreJugador = socket.nombre || 'Jugador'
      
      console.log(`⚠️ ${nombreJugador} se desconectó de la sala ${salaId}`)
      
      // Avisar al otro jugador si existe
      socket.to(salaId).emit('rival_desconectado', { 
        motivo: 'se desconectó',
        nombre: nombreJugador
      })
      
      // Limpiar la sala
      delete salas[salaId]
      console.log(`🧹 Sala ${salaId} eliminada por desconexión`)
    }
  })
})

// ── RUTAS API ──
app.get('/', (req, res) => {
  res.json({
    servidor: 'PlayRoom - Truco Online',
    version: '2.0.0',
    salasActivas: Object.keys(salas).length,
    timestamp: new Date().toISOString()
  })
})

app.get('/salas', (req, res) => {
  const infoSalas = Object.entries(salas).map(([id, sala]) => ({
    id,
    jugadores: sala.jugadores.map(j => j.nombre),
    cantidad: sala.jugadores.length,
    modalidad: sala.modalidad,
    limite: sala.limite,
    estado: sala.estado,
    creador: sala.creador
  }))
  res.json(infoSalas)
})

app.get('/salas/:id', (req, res) => {
  const sala = salas[req.params.id]
  if (!sala) {
    return res.status(404).json({ error: 'Sala no encontrada' })
  }
  res.json({
    id: sala.id,
    jugadores: sala.jugadores.map(j => ({ nombre: j.nombre, userId: j.userId })),
    limite: sala.limite,
    modalidad: sala.modalidad,
    estado: sala.estado
  })
})

// ── LIMPIEZA AUTOMÁTICA DE SALAS VIEJAS ──
setInterval(() => {
  const ahora = Date.now()
  const maxEdad = 10 * 60 * 1000 // 10 minutos
  
  for (const [salaId, sala] of Object.entries(salas)) {
    if (sala.estado === 'esperando' && (ahora - sala.createdAt) > maxEdad) {
      console.log(`🧹 Limpiando sala inactiva ${salaId}`)
      delete salas[salaId]
    }
  }
}, 60 * 1000) // Cada minuto

// ── INICIAR SERVIDOR ──
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════╗')
  console.log('║     🎮 TRUCO ONLINE - PLAYROOM v2.0       ║')
  console.log('╚════════════════════════════════════════════╝')
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
  console.log(`📡 CORS habilitado para: http://localhost:5173`)
  console.log(`🎯 Listo para recibir conexiones...\n`)
})

// ── MANEJO DE ERRORES ──
process.on('uncaughtException', (err) => {
  console.error('❌ Error no capturado:', err)
})

process.on('SIGINT', () => {
  console.log('\n👋 Cerrando servidor...')
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente')
    process.exit(0)
  })
})