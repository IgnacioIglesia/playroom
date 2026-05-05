// ── Constants ─────────────────────────────────────────────────────────────────
const SUITS  = [0, 1, 2, 3]  // 0=♠ 1=♥ 2=♦ 3=♣
const START_CHIPS = 1000
const SB = 10, BB = 20

// ── Deck ──────────────────────────────────────────────────────────────────────
function mkDeck() {
  return Array.from({ length: 52 }, (_, i) => ({ suit: Math.floor(i / 13), value: (i % 13) + 2, id: i }))
}
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// ── Hand evaluation ───────────────────────────────────────────────────────────
function eval5(cards) {
  const vals = cards.map(c => c.value).sort((a, b) => b - a)
  const suits = cards.map(c => c.suit)
  const isFlush = new Set(suits).size === 1
  const uniq = [...new Set(vals)].sort((a, b) => b - a)
  const isStraight = uniq.length === 5 && uniq[0] - uniq[4] === 4
  const isWheel = uniq.length === 5 && uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2
  const strHigh = isWheel ? 5 : uniq[0]
  const cnt = {}; vals.forEach(v => { cnt[v] = (cnt[v] || 0) + 1 })
  const grps = Object.entries(cnt).map(([v, c]) => [+v, c]).sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const topCount = grps[0]?.[1] ?? 0, topVal = grps[0]?.[0] ?? 0
  const secCount = grps[1]?.[1] ?? 0, secVal = grps[1]?.[0] ?? 0
  const kickers = grps.filter(g => g[1] === 1).map(g => g[0])
  if (isFlush && (isStraight || isWheel)) return { rank: strHigh === 14 ? 9 : 8, name: strHigh === 14 ? 'Escalera Real' : 'Escalera de Color', tb: [strHigh] }
  if (topCount === 4) return { rank: 7, name: 'Póker', tb: [topVal, secVal] }
  if (topCount === 3 && secCount === 2) return { rank: 6, name: 'Full House', tb: [topVal, secVal] }
  if (isFlush) return { rank: 5, name: 'Color', tb: vals }
  if (isStraight || isWheel) return { rank: 4, name: 'Escalera', tb: [strHigh] }
  if (topCount === 3) return { rank: 3, name: 'Trío', tb: [topVal, ...kickers] }
  if (topCount === 2 && secCount === 2) {
    const pairs = grps.filter(g => g[1] === 2).map(g => g[0]).sort((a, b) => b - a)
    return { rank: 2, name: 'Doble Par', tb: [...pairs, ...kickers] }
  }
  if (topCount === 2) return { rank: 1, name: 'Par', tb: [topVal, ...kickers] }
  return { rank: 0, name: 'Carta Alta', tb: vals }
}
function cmpTb(a, b) { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0 }
function cmpHands(a, b) { return a.rank !== b.rank ? a.rank - b.rank : cmpTb(a.tb, b.tb) }
function bestHand(cards) {
  if (!cards || cards.length < 5) return { rank: -1, name: '', tb: [] }
  if (cards.length === 5) return eval5(cards)
  let best = null
  const n = cards.length
  for (let i = 0; i < n; i++) for (let j = i+1; j < n; j++) for (let k = j+1; k < n; k++) for (let l = k+1; l < n; l++) for (let m = l+1; m < n; m++) {
    const h = eval5([cards[i], cards[j], cards[k], cards[l], cards[m]])
    if (!best || cmpHands(h, best) > 0) best = h
  }
  return best ?? { rank: -1, name: '', tb: [] }
}

// ── CPU AI ────────────────────────────────────────────────────────────────────
function preflopStr(hole) {
  const [a, b] = [...hole].sort((x, y) => y.value - x.value)
  const suited = a.suit === b.suit, pair = a.value === b.value, gap = a.value - b.value
  if (pair) return Math.min(0.5 + (a.value - 2) / 24, 0.98)
  if (a.value === 14) return b.value >= 12 ? 0.85 : b.value >= 10 ? 0.75 : b.value >= 7 ? (suited ? 0.65 : 0.55) : 0.45
  if (a.value === 13 && b.value >= 10) return suited ? 0.72 : 0.65
  if (a.value >= 11 && b.value >= 10) return suited ? 0.65 : 0.58
  if (suited && gap <= 2 && a.value >= 8) return 0.58
  if (a.value >= 10) return 0.45
  return Math.max(0.18, 0.38 - gap * 0.03 + (suited ? 0.05 : 0))
}
function cpuDecide(player, game) {
  const { community, pot, currentBet } = game
  const toCall = currentBet - player.roundBet
  const allCards = [...player.hand, ...community]
  const str = community.length === 0 ? preflopStr(player.hand) : Math.min((bestHand(allCards).rank / 9) * 0.9 + 0.08, 0.99)
  const rand = Math.random(), eff = rand < 0.12 ? Math.min(str + 0.35, 1) : str
  if (toCall === 0) {
    if (eff > 0.72 && rand < 0.55) return { action: 'raise', amount: Math.max(Math.round((pot || BB) * 0.5 / 10) * 10, BB) }
    return { action: 'check' }
  }
  if (eff > 0.82) return rand < 0.4 ? { action: 'raise', amount: Math.max(toCall * 2, BB) } : { action: 'call' }
  if (eff > toCall / ((pot || 1) + toCall) + 0.1 || (eff > 0.45 && rand < 0.5)) return { action: 'call' }
  return { action: 'fold' }
}

// ── Game helpers ──────────────────────────────────────────────────────────────
const activePlayers = ps => ps.filter(p => p.status === 'active')
const notFolded = ps => ps.filter(p => p.status !== 'folded' && p.status !== 'bust')

function nextActive(players, from) {
  const n = players.length
  for (let i = 1; i < n; i++) { const idx = (from + i) % n; if (players[idx].status === 'active') return idx }
  return -1
}
function roundDone(players, bet) {
  const ap = activePlayers(players); if (!ap.length) return true
  return ap.every(p => p.hasActed && (p.roundBet >= bet || p.chips === 0))
}

// ── Create game ───────────────────────────────────────────────────────────────
function crearPartidaPoker(realPlayers) {
  const seats = [...realPlayers]

  const players = seats.map(p => ({
    id: p.id,
    nombre: p.nombre,
    isCpu: !!p.isCpu,
    chips: START_CHIPS,
    hand: [],
    roundBet: 0,
    totalBet: 0,
    hasActed: false,
    status: 'active',
  }))

  return {
    players,
    deck: [],
    community: [],
    pot: 0,
    phase: 'waiting',
    dealerIdx: players.length - 1,
    currentIdx: 0,
    currentBet: 0,
    log: [],
    showdown: null,
  }
}

// ── Deal new hand ─────────────────────────────────────────────────────────────
function dealNuevaRonda(game) {
  const deck = shuffle(mkDeck()); let di = 0
  const n = game.players.length
  const ps = game.players.map(p => ({ ...p, hand: [], roundBet: 0, totalBet: 0, hasActed: false, status: p.chips > 0 ? 'active' : 'bust' }))
  let dealerIdx = game.dealerIdx
  for (let i = 0; i < n; i++) { dealerIdx = (dealerIdx + 1) % n; if (ps[dealerIdx].status === 'active') break }
  const findNext = from => { for (let i = 1; i <= n; i++) { const idx = (from + i) % n; if (ps[idx].status === 'active') return idx } return from }
  ps.forEach(p => { if (p.status === 'active') { p.hand = [deck[di++], deck[di++]] } })
  const sbIdx = findNext(dealerIdx), bbIdx = findNext(sbIdx), firstIdx = findNext(bbIdx)
  const sbBet = Math.min(SB, ps[sbIdx].chips), bbBet = Math.min(BB, ps[bbIdx].chips)
  ps[sbIdx] = { ...ps[sbIdx], chips: ps[sbIdx].chips - sbBet, roundBet: sbBet, totalBet: sbBet, status: ps[sbIdx].chips - sbBet === 0 ? 'allin' : 'active' }
  ps[bbIdx] = { ...ps[bbIdx], chips: ps[bbIdx].chips - bbBet, roundBet: bbBet, totalBet: bbBet, status: ps[bbIdx].chips - bbBet === 0 ? 'allin' : 'active' }
  game.players = ps
  game.deck = deck.slice(di)
  game.community = []
  game.pot = sbBet + bbBet
  game.phase = 'preflop'
  game.dealerIdx = dealerIdx
  game.sbIdx = sbIdx
  game.bbIdx = bbIdx
  game.currentIdx = firstIdx
  game.currentBet = bbBet
  game.showdown = null
  game.log = [`Nueva mano — Ciega ${SB}/${BB}`, ...game.log.slice(0, 10)]
  return game
}

// ── Advance phase ─────────────────────────────────────────────────────────────
function advancePhase(game) {
  const nf = notFolded(game.players)
  if (nf.length === 1) {
    const w = nf[0]
    game.players = game.players.map(p => ({ ...p, chips: p.chips + (p.id === w.id ? game.pot : 0), status: p.status === 'bust' ? 'bust' : 'active' }))
    game.showdown = { winIds: [w.id], withHands: [], uncontested: true }
    game.log = [`${w.nombre} gana $${game.pot}`, ...game.log.slice(0, 10)]
    game.pot = 0
    game.phase = 'showdown'
    return
  }
  const deal = n => Array.from({ length: n }, () => game.deck.shift())
  const reset = () => { game.players = game.players.map(p => ({ ...p, roundBet: 0, hasActed: false })) }
  const firstAfterDealer = () => { const f = nextActive(game.players, game.dealerIdx); return f === -1 ? 0 : f }

  if (game.phase === 'preflop') {
    game.community = deal(3); reset(); game.phase = 'flop'; game.currentBet = 0; game.currentIdx = firstAfterDealer()
    game.log = ['— Flop —', ...game.log.slice(0, 11)]
  } else if (game.phase === 'flop') {
    game.community.push(...deal(1)); reset(); game.phase = 'turn'; game.currentBet = 0; game.currentIdx = firstAfterDealer()
    game.log = ['— Turn —', ...game.log.slice(0, 11)]
  } else if (game.phase === 'turn') {
    game.community.push(...deal(1)); reset(); game.phase = 'river'; game.currentBet = 0; game.currentIdx = firstAfterDealer()
    game.log = ['— River —', ...game.log.slice(0, 11)]
  } else if (game.phase === 'river') {
    doShowdown(game)
  }
}

function doShowdown(game) {
  const nf = notFolded(game.players)
  const withHands = nf.map(p => ({ id: p.id, nombre: p.nombre, hand: p.hand, eval: bestHand([...p.hand, ...game.community]) }))
  withHands.sort((a, b) => cmpHands(b.eval, a.eval))
  const topEval = withHands[0].eval
  const winners = withHands.filter(p => cmpHands(p.eval, topEval) === 0)
  const share = Math.floor(game.pot / winners.length)
  const winIds = new Set(winners.map(w => w.id))
  game.players = game.players.map(p => ({
    ...p,
    chips: p.chips + (winIds.has(p.id) ? share : 0),
    status: p.status === 'bust' ? 'bust' : 'active',
  }))
  const msg = winners.length === 1
    ? `${winners[0].nombre} gana $${game.pot} con ${winners[0].eval.name}`
    : `Empate: ${winners.map(w => w.nombre).join(' y ')} dividen $${game.pot}`
  game.showdown = { winIds: [...winIds], withHands }
  game.log = [msg, ...game.log.slice(0, 10)]
  game.pot = 0
  game.phase = 'showdown'
}

// ── Process action ────────────────────────────────────────────────────────────
function procesarAccionPoker(game, playerId, action, raiseAmt = BB) {
  const pidx = game.players.findIndex(p => p.id === playerId)
  if (pidx === -1) return { ok: false, error: 'Jugador no encontrado' }
  if (game.players[game.currentIdx]?.id !== playerId) return { ok: false, error: 'No es tu turno' }
  const p = game.players[pidx]
  if (p.status !== 'active') return { ok: false, error: 'No es tu turno' }

  p.hasActed = true
  switch (action) {
    case 'fold':
      p.status = 'folded'
      game.log = [`${p.nombre}: Fold`, ...game.log.slice(0, 12)]
      break
    case 'check':
      game.log = [`${p.nombre}: Check`, ...game.log.slice(0, 12)]
      break
    case 'call': {
      const amt = Math.min(game.currentBet - p.roundBet, p.chips)
      if (amt <= 0) { game.log = [`${p.nombre}: Check`, ...game.log.slice(0, 12)]; break }
      p.chips -= amt; p.roundBet += amt; p.totalBet += amt; game.pot += amt
      if (p.chips === 0) p.status = 'allin'
      game.log = [`${p.nombre}: Call $${amt}`, ...game.log.slice(0, 12)]
      break
    }
    case 'raise': {
      const ca = Math.max(0, game.currentBet - p.roundBet), tot = Math.min(ca + raiseAmt, p.chips)
      if (tot <= 0) break
      p.chips -= tot; p.roundBet += tot; p.totalBet += tot; game.pot += tot
      if (p.chips === 0) p.status = 'allin'
      game.currentBet = p.roundBet
      game.players.forEach((pl, i) => { if (i !== pidx && pl.status === 'active') pl.hasActed = false })
      game.log = [`${p.nombre}: Sube a $${game.currentBet}`, ...game.log.slice(0, 12)]
      break
    }
    default: return { ok: false, error: 'Acción inválida' }
  }

  if (roundDone(game.players, game.currentBet)) {
    advancePhase(game)
  } else {
    const nxt = nextActive(game.players, pidx)
    if (nxt === -1) advancePhase(game)
    else game.currentIdx = nxt
  }
  return { ok: true }
}

// ── State per socket ──────────────────────────────────────────────────────────
function getEstadoParaJugador(game, socketId) {
  return {
    players: game.players.map(p => ({
      id: p.id,
      nombre: p.nombre,
      isCpu: p.isCpu,
      chips: p.chips,
      roundBet: p.roundBet,
      status: p.status,
      // Only send hand to owner, everyone at showdown
      hand: (p.id === socketId || game.phase === 'showdown') ? p.hand : p.hand.map(() => null),
      hasCards: p.hand.length > 0,
    })),
    community:   game.community,
    pot:         game.pot,
    phase:       game.phase,
    dealerIdx:   game.dealerIdx,
    currentIdx:  game.currentIdx,
    currentBet:  game.currentBet,
    log:         game.log,
    showdown:    game.phase === 'showdown' ? game.showdown : null,
  }
}

module.exports = { crearPartidaPoker, dealNuevaRonda, procesarAccionPoker, getEstadoParaJugador, cpuDecide }
