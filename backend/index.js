const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const fs = require('fs')
const path = require('path')
const Sentry = require('@sentry/node')

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 })
}

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173'

const registerTruco    = require('./routes/truco')
const registerPoker    = require('./routes/poker')
const registerUno      = require('./routes/uno')
const registerPictionary = require('./routes/pictionary')

const { getEstadoParaSocket, getEstadoParaSocket2v2 } = require('./trucoLogica')

// ── Persistence ──────────────────────────────────────────────────────────────

const DATA_FILE = path.join(__dirname, 'data', 'salas.json')

function cargarSalas() {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    const ahora = Date.now()
    const restored = {}
    for (const [id, sala] of Object.entries(saved)) {
      // Only restore lobbies (not mid-game) that are < 30 min old
      if (sala.estado === 'esperando' && ahora - sala.createdAt < 30 * 60 * 1000) {
        restored[id] = sala
      }
    }
    const n = Object.keys(restored).length
    if (n > 0) console.log(`Restauradas ${n} salas de sesión anterior`)
    return restored
  } catch { return {} }
}

function guardarSalas(salas) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
    const toSave = {}
    for (const [id, sala] of Object.entries(salas)) {
      if (sala.estado === 'esperando') toSave[id] = sala
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(toSave))
  } catch { /* disk write failure is non-fatal */ }
}

// ── Shared state ─────────────────────────────────────────────────────────────

const salas        = cargarSalas()
const trucoGames   = {}
const pokerSalas   = {}
const pokerGames   = {}
const unoSalas     = {}
const unoGames     = {}
const pictionarySalas = {}

// userId → { timeout, salaId, oldSocketId, nombre }
const pendingDisconnects = new Map()

// userId → current socket.id (for duplicate-tab detection)
const usuariosConectados = new Map()

const state = {
  salas, trucoGames,
  pokerSalas, pokerGames,
  unoSalas, unoGames,
  pictionarySalas,
  pendingDisconnects,
  guardarSalas: () => guardarSalas(salas),
}

// ── Express ───────────────────────────────────────────────────────────────────

const app = express()
app.use(cors({ origin: ALLOWED_ORIGIN }))
app.use(express.json())

// ── Rate limiting ─────────────────────────────────────────────────────────────

app.use(rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, intentá de nuevo en un minuto.' },
}))

const recaptchaLimiter = rateLimit({ windowMs: 60_000, max: 15 })

app.post('/verify-recaptcha', recaptchaLimiter, async (req, res) => {
  const { token } = req.body
  if (!token) return res.json({ success: false })
  const secret = process.env.RECAPTCHA_SECRET
  try {
    const r = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`, { method: 'POST' })
    res.json({ success: (await r.json()).success })
  } catch { res.json({ success: false }) }
})

app.get('/', (_req, res) => res.json({
  servidor: 'PlayRoom',
  version: '3.0.0',
  salasActivas: Object.keys(salas).length,
  timestamp: new Date().toISOString(),
}))

app.get('/salas', (_req, res) => res.json(
  Object.entries(salas).map(([id, s]) => ({
    id, jugadores: s.jugadores.map(j => j.nombre), modalidad: s.modalidad, estado: s.estado,
  }))
))

// ── Socket.io ────────────────────────────────────────────────────────────────

const server = http.createServer(app)
const io = new Server(server, { cors: { origin: ALLOWED_ORIGIN, methods: ['GET', 'POST'] } })

// Replace all occurrences of oldId with newId inside a Truco game object
function actualizarSocketEnGame(game, oldId, newId) {
  if (!game) return
  if (game.socketA === oldId) game.socketA = newId
  if (game.socketB === oldId) game.socketB = newId
  if (game.sockets)   game.sockets   = game.sockets.map(id => id === oldId ? newId : id)
  if (game.equipoA)   game.equipoA   = game.equipoA.map(id => id === oldId ? newId : id)
  if (game.equipoB)   game.equipoB   = game.equipoB.map(id => id === oldId ? newId : id)
  if (game.turnoSocket  === oldId) game.turnoSocket  = newId
  if (game.trickStart   === oldId) game.trickStart   = newId
  for (const dict of ['nombres', 'manos', 'cartasJugadas', 'flors', 'userIds', 'photoURLs', 'equipoDe']) {
    if (game[dict] && oldId in game[dict]) {
      game[dict][newId] = game[dict][oldId]
      delete game[dict][oldId]
    }
  }
  if (game.jugadasMano) {
    game.jugadasMano = game.jugadasMano.map(j => j.socketId === oldId ? { ...j, socketId: newId } : j)
  }
}

// Send current game state to a (re)connected player
function reenviarEstado(socket, salaId) {
  const partida = trucoGames[salaId]
  if (!partida) return
  if (partida.modalidad === '2v2') {
    const estado = getEstadoParaSocket2v2(partida, socket.id)
    socket.emit('truco_estado', estado)
  } else {
    const estado = getEstadoParaSocket(partida, socket.id)
    socket.emit('truco_estado', estado)
  }
}

io.on('connection', (socket) => {
  console.log(`Conectado: ${socket.id}`)

  // ── Socket rate limiting (60 events/s max per socket) ────────────────────────
  let _rlWindow = Date.now(), _rlCount = 0
  socket.use((_, next) => {
    const now = Date.now()
    if (now - _rlWindow > 1000) { _rlWindow = now; _rlCount = 0 }
    if (++_rlCount > 60) return next(new Error('rate_limit'))
    next()
  })

  // ── Identity ────────────────────────────────────────────────────────────────
  socket.on('set_nombre', ({ nombre, userId: uid, photoURL }) => {
    socket.nombre   = nombre || 'Jugador'
    socket.photoURL = photoURL || ''
    const userId    = uid || socket.id

    // Duplicate tab: kick previous socket for same user
    const prevSocketId = usuariosConectados.get(userId)
    if (prevSocketId && prevSocketId !== socket.id) {
      const prevSocket = io.sockets.sockets.get(prevSocketId)
      if (prevSocket) { prevSocket.emit('conexion_duplicada', 'Te desconectaste porque abriste otra pestaña'); prevSocket.disconnect(true) }
    }
    usuariosConectados.set(userId, socket.id)
    socket.userId = userId

    // ── Reconnection: resume pending game ────────────────────────────────────
    const pending = pendingDisconnects.get(userId)
    if (pending) {
      clearTimeout(pending.timeout)
      pendingDisconnects.delete(userId)

      const { salaId, oldSocketId } = pending
      const sala    = salas[salaId]
      const partida = trucoGames[salaId]

      if (sala) {
        // Update socket.id references everywhere
        for (const j of sala.jugadores)      if (j.id === oldSocketId) j.id = socket.id
        if (sala.equipoA) for (const j of sala.equipoA) if (j.id === oldSocketId) j.id = socket.id
        if (sala.equipoB) for (const j of sala.equipoB) if (j.id === oldSocketId) j.id = socket.id
        if (sala.jugadorA === oldSocketId) sala.jugadorA = socket.id
        actualizarSocketEnGame(partida, oldSocketId, socket.id)

        socket.join(salaId)
        socket.salaId = salaId

        if (sala.estado === 'jugando') {
          socket.to(salaId).emit('rival_reconectado', { nombre: socket.nombre })
          socket.emit('reconectado_a_partida', { salaId, modalidad: sala.modalidad || '1vs1' })
          reenviarEstado(socket, salaId)
        } else {
          // Waiting room reconnect: restore lobby screen
          if (sala.modalidad === '2vs2') {
            socket.emit('prelobby', { modalidad: sala.modalidad, limite: sala.limite, equipoA: sala.equipoA || [], equipoB: sala.equipoB || [], salaId })
          } else {
            socket.emit('sala_creada', { salaId, limite: sala.limite, modalidad: sala.modalidad })
          }
        }
        console.log(`${socket.nombre} reconectó a sala ${salaId}`)
        return
      }
    }

    console.log(`${socket.nombre} (${userId}) conectado`)
  })

  // ── Register game handlers ──────────────────────────────────────────────────
  const trucoCtrls      = registerTruco(io, socket, state)
  const pokerCtrls      = registerPoker(io, socket, state)
  const unoCtrls        = registerUno(io, socket, state)
  const pictionaryCtrls = registerPictionary(io, socket, state)

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`Desconectado: ${socket.nombre || socket.id} (${reason})`)
    if (socket.userId) usuariosConectados.delete(socket.userId)
    trucoCtrls.onDisconnect()
    pokerCtrls.onDisconnect()
    unoCtrls.onDisconnect()
    pictionaryCtrls.onDisconnect()
  })
})

// ── Cleanup: remove stale waiting rooms every minute ─────────────────────────
setInterval(() => {
  const ahora = Date.now()
  let removed = 0
  for (const [salaId, sala] of Object.entries(salas)) {
    if (sala.estado === 'esperando' && ahora - sala.createdAt > 10 * 60 * 1000) {
      delete salas[salaId]
      removed++
    }
  }
  if (removed > 0) { guardarSalas(salas); console.log(`${removed} salas inactivas eliminadas`) }
}, 60_000)

// ── Boot ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`))

process.on('uncaughtException', err => {
  if (process.env.SENTRY_DSN) Sentry.captureException(err)
  console.error('Error no capturado:', err)
})
process.on('SIGINT', () => { guardarSalas(salas); server.close(() => process.exit(0)) })
process.on('SIGTERM', () => { guardarSalas(salas); server.close(() => process.exit(0)) })
