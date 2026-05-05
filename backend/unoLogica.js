const COLORS = ['red', 'yellow', 'green', 'blue']
const START_HAND = 7

function mkDeck() {
  const deck = []
  let id = 0
  for (const color of COLORS) {
    deck.push({ id: `c${id++}`, color, value: '0', type: 'number' })
    for (let n = 1; n <= 9; n++) {
      deck.push({ id: `c${id++}`, color, value: String(n), type: 'number' })
      deck.push({ id: `c${id++}`, color, value: String(n), type: 'number' })
    }
    for (const value of ['skip', 'reverse', 'draw2']) {
      deck.push({ id: `c${id++}`, color, value, type: 'action' })
      deck.push({ id: `c${id++}`, color, value, type: 'action' })
    }
  }
  for (let i = 0; i < 4; i++) deck.push({ id: `c${id++}`, color: 'wild', value: 'wild', type: 'wild' })
  for (let i = 0; i < 4; i++) deck.push({ id: `c${id++}`, color: 'wild', value: 'wild4', type: 'wild' })
  return deck
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function draw(game) {
  if (game.deck.length === 0) {
    const top = game.discard[game.discard.length - 1]
    game.deck = shuffle(game.discard.slice(0, -1).map(c => ({ ...c, chosenColor: undefined })))
    game.discard = [top]
  }
  return game.deck.pop()
}

function nextIdx(game, steps = 1) {
  const n = game.players.length
  return (game.currentIdx + game.direction * steps + n * 10) % n
}

function isPlayable(card, game) {
  const top = game.discard[game.discard.length - 1]
  const currentColor = game.currentColor || top.chosenColor || top.color
  return card.color === 'wild' || card.color === currentColor || card.value === top.value
}

function crearPartidaUno(jugadores) {
  const game = {
    players: jugadores.map(j => ({ id: j.id, nombre: j.nombre || 'Jugador', hand: [], saidUno: false })),
    deck: shuffle(mkDeck()),
    discard: [],
    currentIdx: 0,
    direction: 1,
    currentColor: null,
    phase: 'playing',
    winnerId: null,
    log: [],
  }
  for (let i = 0; i < START_HAND; i++) {
    for (const p of game.players) p.hand.push(draw(game))
  }
  let first = draw(game)
  while (first.color === 'wild') {
    game.deck.unshift(first)
    game.deck = shuffle(game.deck)
    first = draw(game)
  }
  game.discard.push(first)
  game.currentColor = first.color
  game.log = [`Empieza con ${labelCard(first)}`]
  return game
}

function labelCard(card) {
  const names = { red: 'rojo', yellow: 'amarillo', green: 'verde', blue: 'azul', wild: 'comodin', skip: 'salta', reverse: 'reversa', draw2: '+2', wild4: '+4' }
  return card.color === 'wild' ? names[card.value] : `${names[card.color]} ${names[card.value] || card.value}`
}

function jugarCarta(game, playerId, cardId, chosenColor) {
  if (game.phase !== 'playing') return { ok: false, error: 'La partida terminó' }
  const pidx = game.players.findIndex(p => p.id === playerId)
  if (pidx !== game.currentIdx) return { ok: false, error: 'No es tu turno' }
  const player = game.players[pidx]
  const cidx = player.hand.findIndex(c => c.id === cardId)
  if (cidx === -1) return { ok: false, error: 'Carta no encontrada' }
  const card = player.hand[cidx]
  if (!isPlayable(card, game)) return { ok: false, error: 'No podés jugar esa carta' }
  if (card.color === 'wild' && !COLORS.includes(chosenColor)) return { ok: false, error: 'Elegí un color' }

  player.hand.splice(cidx, 1)
  player.saidUno = false
  if (card.color === 'wild') card.chosenColor = chosenColor
  game.discard.push(card)
  game.currentColor = card.color === 'wild' ? chosenColor : card.color
  game.log = [`${player.nombre} jugó ${labelCard(card)}`, ...game.log.slice(0, 20)]

  if (player.hand.length === 0) {
    game.phase = 'finished'
    game.winnerId = player.id
    game.log = [`${player.nombre} ganó la partida`, ...game.log]
    return { ok: true }
  }

  let advance = 1
  if (card.value === 'reverse') {
    game.direction *= -1
    if (game.players.length === 2) advance = 2
  } else if (card.value === 'skip') {
    advance = 2
  } else if (card.value === 'draw2') {
    const target = game.players[nextIdx(game, 1)]
    for (let i = 0; i < 2; i++) target.hand.push(draw(game))
    target.saidUno = false
    advance = 2
  } else if (card.value === 'wild4') {
    const target = game.players[nextIdx(game, 1)]
    for (let i = 0; i < 4; i++) target.hand.push(draw(game))
    target.saidUno = false
    advance = 2
  }
  game.currentIdx = nextIdx(game, advance)
  return { ok: true }
}

function robarCarta(game, playerId) {
  if (game.phase !== 'playing') return { ok: false, error: 'La partida terminó' }
  const pidx = game.players.findIndex(p => p.id === playerId)
  if (pidx !== game.currentIdx) return { ok: false, error: 'No es tu turno' }
  const player = game.players[pidx]
  player.hand.push(draw(game))
  player.saidUno = false
  game.log = [`${player.nombre} robó una carta`, ...game.log.slice(0, 20)]
  game.currentIdx = nextIdx(game, 1)
  return { ok: true }
}

function cantarUno(game, playerId) {
  const p = game.players.find(p => p.id === playerId)
  if (!p) return { ok: false, error: 'Jugador no encontrado' }
  if (p.hand.length !== 1) return { ok: false, error: 'Solo podés cantar UNO con una carta' }
  p.saidUno = true
  game.log = [`${p.nombre} cantó UNO`, ...game.log.slice(0, 20)]
  return { ok: true }
}

function getEstadoUno(game, socketId) {
  const top = game.discard[game.discard.length - 1]
  return {
    players: game.players.map(p => ({
      id: p.id,
      nombre: p.nombre,
      handCount: p.hand.length,
      hand: p.id === socketId ? p.hand : [],
      saidUno: p.saidUno,
    })),
    topCard: top,
    currentColor: game.currentColor,
    currentIdx: game.currentIdx,
    direction: game.direction,
    phase: game.phase,
    winnerId: game.winnerId,
    log: game.log,
  }
}

module.exports = { crearPartidaUno, jugarCarta, robarCarta, cantarUno, getEstadoUno, COLORS }
