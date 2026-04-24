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

// ══════════════════════════════════════════════════════════════
// ── BLACKJACK ONLINE ──
// ══════════════════════════════════════════════════════════════

const bjSalas = {}

// ── UTILIDADES BLACKJACK ──
function bjGenerarCodigo() {
  const digits = '0123456789'
  let codigo = 'BJ'
  for (let i = 0; i < 4; i++) {
    codigo += digits[Math.floor(Math.random() * digits.length)]
  }
  return bjSalas[codigo] ? bjGenerarCodigo() : codigo
}

function bjCrearMazo() {
  const palos = ['♠', '♣', '♥', '♦']
  const valores = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const mazo = []
  for (let d = 0; d < 6; d++) {
    for (const palo of palos) {
      for (const valor of valores) {
        mazo.push({ valor, palo })
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = mazo.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mazo[i], mazo[j]] = [mazo[j], mazo[i]]
  }
  return mazo
}

function bjValorMano(mano) {
  let total = 0
  let ases = 0
  for (const carta of mano) {
    if (!carta) continue
    if (carta.valor === 'A') { total += 11; ases++ }
    else if (['J', 'Q', 'K'].includes(carta.valor)) total += 10
    else total += parseInt(carta.valor)
  }
  while (total > 21 && ases > 0) { total -= 10; ases-- }
  return total
}

function bjEmitirEstado(salaId) {
  const sala = bjSalas[salaId]
  if (!sala) return

  // Ocultar la primera carta de la banca si no estamos en resultado
  let bancaEnvio
  if (sala.fase === 'resultado') {
    bancaEnvio = { mano: sala.banca.mano }
  } else {
    const manoOculta = sala.banca.mano.map((carta, idx) => idx === 0 ? null : carta)
    bancaEnvio = { mano: manoOculta }
  }

  const estado = {
    id: sala.id,
    fase: sala.fase,
    host: sala.host,
    banca: bancaEnvio,
    jugadores: sala.jugadores,
    turnoIdx: sala.turnoIdx,
  }

  io.to(salaId).emit('bj_estado', estado)
}

function bjJugarBanca(salaId) {
  const sala = bjSalas[salaId]
  if (!sala) return

  // La banca juega: pide hasta tener >= 17
  while (bjValorMano(sala.banca.mano) <= 16) {
    if (sala.mazo.length === 0) sala.mazo = bjCrearMazo()
    sala.banca.mano.push(sala.mazo.pop())
  }

  const valorBanca = bjValorMano(sala.banca.mano)

  // Resolver resultados para cada jugador
  for (const jugador of sala.jugadores) {
    if (jugador.estado === 'bust') {
      jugador.resultado = 'pierde'
      jugador.ganancia = 0
    } else if (jugador.estado === 'blackjack') {
      jugador.resultado = 'blackjack'
      jugador.ganancia = Math.floor(jugador.apuesta * 1.5)
      jugador.fichas += jugador.apuesta + jugador.ganancia
    } else {
      const valorJ = bjValorMano(jugador.mano)
      const bancaBust = valorBanca > 21

      if (bancaBust || valorJ > valorBanca) {
        jugador.resultado = 'gana'
        jugador.ganancia = jugador.apuesta
        jugador.fichas += jugador.apuesta * 2
      } else if (valorJ === valorBanca) {
        jugador.resultado = 'empate'
        jugador.ganancia = 0
        jugador.fichas += jugador.apuesta
      } else {
        jugador.resultado = 'pierde'
        jugador.ganancia = 0
      }
    }
  }

  sala.fase = 'resultado'
  bjEmitirEstado(salaId)
}

function bjSiguienteTurno(salaId) {
  const sala = bjSalas[salaId]
  if (!sala) return

  // Buscar el siguiente jugador en estado 'jugando'
  const jugadores = sala.jugadores
  let idx = sala.turnoIdx + 1
  while (idx < jugadores.length && jugadores[idx].estado !== 'jugando') {
    idx++
  }

  if (idx >= jugadores.length) {
    // No hay más jugadores, la banca juega
    bjJugarBanca(salaId)
  } else {
    sala.turnoIdx = idx
    bjEmitirEstado(salaId)
  }
}

// ── SOCKET EVENTS BLACKJACK (añadir dentro del bloque de conexión) ──
io.on('connection', (bjSocket) => {
  // bj_crear
  bjSocket.on('bj_crear', ({ nombre, photoURL }) => {
    const salaId = bjGenerarCodigo()
    bjSalas[salaId] = {
      id: salaId,
      fase: 'lobby',
      host: bjSocket.id,
      mazo: bjCrearMazo(),
      banca: { mano: [] },
      jugadores: [{
        id: bjSocket.id,
        nombre: nombre || bjSocket.nombre || 'Jugador',
        photoURL: photoURL || '',
        fichas: 1000,
        apuesta: 0,
        mano: [],
        estado: 'esperando',
        resultado: null,
        ganancia: 0,
      }],
      turnoIdx: 0,
    }

    bjSocket.join(salaId)
    bjSocket.bjSalaId = salaId

    bjSocket.emit('bj_sala_creada', { salaId })
    bjEmitirEstado(salaId)
    console.log(`[BJ] Sala ${salaId} creada por ${nombre}`)
  })

  // bj_unirse
  bjSocket.on('bj_unirse', ({ salaId, nombre, photoURL }) => {
    const sala = bjSalas[salaId]

    if (!sala) {
      bjSocket.emit('bj_error', 'Sala no encontrada')
      return
    }
    if (sala.fase !== 'lobby') {
      bjSocket.emit('bj_error', 'La partida ya comenzó')
      return
    }
    if (sala.jugadores.length >= 4) {
      bjSocket.emit('bj_error', 'La sala está llena (máximo 4 jugadores)')
      return
    }

    sala.jugadores.push({
      id: bjSocket.id,
      nombre: nombre || bjSocket.nombre || 'Jugador',
      photoURL: photoURL || '',
      fichas: 1000,
      apuesta: 0,
      mano: [],
      estado: 'esperando',
      resultado: null,
      ganancia: 0,
    })

    bjSocket.join(salaId)
    bjSocket.bjSalaId = salaId

    bjSocket.emit('bj_sala_unida', { salaId })
    bjEmitirEstado(salaId)
    console.log(`[BJ] ${nombre} se unió a sala ${salaId}`)
  })

  // bj_iniciar
  bjSocket.on('bj_iniciar', () => {
    const salaId = bjSocket.bjSalaId
    const sala = bjSalas[salaId]
    if (!sala) return
    if (sala.host !== bjSocket.id) return

    // Resetear manos y apuestas
    for (const j of sala.jugadores) {
      j.mano = []
      j.apuesta = 0
      j.estado = 'esperando'
      j.resultado = null
      j.ganancia = 0
    }
    sala.banca.mano = []
    sala.turnoIdx = 0
    sala.fase = 'apostando'
    bjEmitirEstado(salaId)
    console.log(`[BJ] Sala ${salaId} iniciada — fase apostando`)
  })

  // bj_apostar
  bjSocket.on('bj_apostar', ({ cantidad }) => {
    const salaId = bjSocket.bjSalaId
    const sala = bjSalas[salaId]
    if (!sala || sala.fase !== 'apostando') return

    const jugador = sala.jugadores.find(j => j.id === bjSocket.id)
    if (!jugador || jugador.estado === 'listo') return

    // Clamp a fichas disponibles
    const apuesta = Math.max(1, Math.min(cantidad, jugador.fichas))
    jugador.apuesta = apuesta
    jugador.fichas -= apuesta
    jugador.estado = 'listo'

    // Verificar si todos apostaron
    const todosListos = sala.jugadores.every(j => j.estado === 'listo')

    if (todosListos) {
      // Repartir cartas
      if (sala.mazo.length < 20) sala.mazo = bjCrearMazo()

      // 2 cartas a cada jugador
      for (const j of sala.jugadores) {
        j.mano = [sala.mazo.pop(), sala.mazo.pop()]
      }
      // 2 cartas a la banca
      sala.banca.mano = [sala.mazo.pop(), sala.mazo.pop()]

      // Evaluar Blackjacks y estados iniciales
      let primerJugandoIdx = -1
      for (let i = 0; i < sala.jugadores.length; i++) {
        const j = sala.jugadores[i]
        if (bjValorMano(j.mano) === 21) {
          j.estado = 'blackjack'
        } else {
          j.estado = 'jugando'
          if (primerJugandoIdx === -1) primerJugandoIdx = i
        }
      }

      sala.fase = 'jugando'

      if (primerJugandoIdx === -1) {
        // Todos tienen blackjack — la banca juega directamente
        bjJugarBanca(salaId)
      } else {
        sala.turnoIdx = primerJugandoIdx
        bjEmitirEstado(salaId)
      }
    } else {
      bjEmitirEstado(salaId)
    }

    console.log(`[BJ] ${jugador.nombre} apostó ${apuesta} en sala ${salaId}`)
  })

  // bj_accion
  bjSocket.on('bj_accion', ({ tipo }) => {
    const salaId = bjSocket.bjSalaId
    const sala = bjSalas[salaId]
    if (!sala || sala.fase !== 'jugando') return

    const jugadorActual = sala.jugadores[sala.turnoIdx]
    if (!jugadorActual || jugadorActual.id !== bjSocket.id) return
    if (jugadorActual.estado !== 'jugando') return

    if (tipo === 'pedir') {
      if (sala.mazo.length === 0) sala.mazo = bjCrearMazo()
      jugadorActual.mano.push(sala.mazo.pop())
      const valor = bjValorMano(jugadorActual.mano)
      if (valor > 21) {
        jugadorActual.estado = 'bust'
        bjSiguienteTurno(salaId)
      } else if (valor === 21) {
        jugadorActual.estado = 'stand'
        bjSiguienteTurno(salaId)
      } else {
        bjEmitirEstado(salaId)
      }
    } else if (tipo === 'plantarse') {
      jugadorActual.estado = 'stand'
      bjSiguienteTurno(salaId)
    } else if (tipo === 'doblar') {
      // Doblar requiere fichas >= apuesta
      if (jugadorActual.fichas < jugadorActual.apuesta) {
        bjSocket.emit('bj_error', 'No tenés fichas suficientes para doblar')
        return
      }
      jugadorActual.fichas -= jugadorActual.apuesta
      jugadorActual.apuesta *= 2
      if (sala.mazo.length === 0) sala.mazo = bjCrearMazo()
      jugadorActual.mano.push(sala.mazo.pop())
      const valor = bjValorMano(jugadorActual.mano)
      if (valor > 21) {
        jugadorActual.estado = 'bust'
      } else {
        jugadorActual.estado = 'stand'
      }
      bjSiguienteTurno(salaId)
    }

    console.log(`[BJ] ${jugadorActual.nombre} → ${tipo} en sala ${salaId}`)
  })

  // bj_nueva_ronda
  bjSocket.on('bj_nueva_ronda', () => {
    const salaId = bjSocket.bjSalaId
    const sala = bjSalas[salaId]
    if (!sala) return
    if (sala.host !== bjSocket.id) return

    // Dar fichas a jugadores con 0
    for (const j of sala.jugadores) {
      if (j.fichas === 0) j.fichas = 500
      j.mano = []
      j.apuesta = 0
      j.estado = 'esperando'
      j.resultado = null
      j.ganancia = 0
    }
    sala.banca.mano = []
    sala.turnoIdx = 0
    sala.fase = 'apostando'
    if (sala.mazo.length < 20) sala.mazo = bjCrearMazo()
    bjEmitirEstado(salaId)
    console.log(`[BJ] Nueva ronda en sala ${salaId}`)
  })

  // Desconexión BJ
  bjSocket.on('disconnect', () => {
    const salaId = bjSocket.bjSalaId
    if (!salaId || !bjSalas[salaId]) return

    const sala = bjSalas[salaId]
    const jugadorIdx = sala.jugadores.findIndex(j => j.id === bjSocket.id)
    if (jugadorIdx === -1) return

    const nombreSaliente = sala.jugadores[jugadorIdx].nombre
    sala.jugadores.splice(jugadorIdx, 1)

    io.to(salaId).emit('bj_jugador_salio', { nombre: nombreSaliente })

    if (sala.jugadores.length === 0) {
      delete bjSalas[salaId]
      console.log(`[BJ] Sala ${salaId} eliminada (vacía)`)
      return
    }

    // Transferir host si es necesario
    if (sala.host === bjSocket.id) {
      sala.host = sala.jugadores[0].id
      console.log(`[BJ] Host transferido a ${sala.jugadores[0].nombre} en sala ${salaId}`)
    }

    // Si era el turno actual y la partida está en curso
    if (sala.fase === 'jugando') {
      // Ajustar turnoIdx si el jugador que se fue era antes o en el turno actual
      if (jugadorIdx <= sala.turnoIdx) {
        sala.turnoIdx = Math.max(0, sala.turnoIdx - 1)
      }
      // Verificar si queda algún jugador jugando
      const hayJugando = sala.jugadores.some(j => j.estado === 'jugando')
      if (!hayJugando) {
        bjJugarBanca(salaId)
        return
      }
      // Si el turnoIdx ahora apunta a un jugador no jugando, avanzar
      if (sala.turnoIdx < sala.jugadores.length) {
        const actual = sala.jugadores[sala.turnoIdx]
        if (actual.estado !== 'jugando') {
          bjSiguienteTurno(salaId)
          return
        }
      }
    }

    bjEmitirEstado(salaId)
    console.log(`[BJ] ${nombreSaliente} salió de sala ${salaId}`)
  })
})

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