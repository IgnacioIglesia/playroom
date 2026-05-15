import { useState, useEffect, useRef, useCallback } from 'react'
import Navbar from '../components/Navbar'
import { usePageTitle } from '../hooks/usePageTitle'
import Footer from '../components/Footer'

// ── Constants ─────────────────────────────────────────────────────────────────
const SUITS = ['♠', '♥', '♦', '♣']
const VALS  = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']
const isRed = s => s === 1 || s === 2

const SZ = {
  sm: { w: 50, h: 70,  fdOff: 14, fuOff: 20, gap: 5  },
  lg: { w: 70, h: 98,  fdOff: 18, fuOff: 30, gap: 8  },
}
function useCardSize() {
  const get = () => (typeof window !== 'undefined' && window.innerWidth >= 640 ? SZ.lg : SZ.sm)
  const [sz, setSz] = useState(get)
  useEffect(() => {
    const fn = () => setSz(get())
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return sz
}

// ── Deck helpers ──────────────────────────────────────────────────────────────
function mkDeck() {
  return Array.from({ length: 52 }, (_, i) => ({
    suit: Math.floor(i / 13), value: (i % 13) + 1, id: i, faceUp: false,
  }))
}
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function deal() {
  const deck = shuffle(mkDeck())
  const tab = Array.from({ length: 7 }, () => [])
  let idx = 0
  for (let c = 0; c < 7; c++)
    for (let r = 0; r <= c; r++)
      tab[c].push({ ...deck[idx++], faceUp: r === c })
  return { tab, stock: deck.slice(idx).map(c => ({ ...c, faceUp: false })), waste: [], found: [[], [], [], []], moves: 0, score: 0 }
}

// ── Move rules ────────────────────────────────────────────────────────────────
const canToFound = (card, pile) =>
  pile.length === 0 ? card.value === 1
    : pile[pile.length - 1].suit === card.suit && card.value === pile[pile.length - 1].value + 1

const canToTab = (card, col) =>
  col.length === 0 ? card.value === 13
    : col[col.length - 1].faceUp &&
      isRed(card.suit) !== isRed(col[col.length - 1].suit) &&
      card.value === col[col.length - 1].value - 1

function flipTop(col) {
  if (!col.length) return col
  const last = col[col.length - 1]
  return last.faceUp ? col : [...col.slice(0, -1), { ...last, faceUp: true }]
}
const isWon = found => found.every(p => p.length === 13)

function autoStep(state) {
  const { tab, waste, found } = state
  const tryCard = (card, srcFn) => {
    const fi = card.suit
    if (!canToFound(card, found[fi])) return null
    return { ...srcFn(), found: found.map((f, i) => i === fi ? [...f, { ...card, faceUp: true }] : f), moves: state.moves + 1, score: state.score + 10 }
  }
  if (waste.length) { const r = tryCard(waste[waste.length-1], () => ({ ...state, waste: waste.slice(0,-1) })); if (r) return r }
  for (let c = 0; c < 7; c++) {
    if (!tab[c].length) continue
    const card = tab[c][tab[c].length - 1]
    if (!card.faceUp) continue
    const r = tryCard(card, () => ({ ...state, tab: tab.map((col, i) => i === c ? flipTop(col.slice(0, -1)) : col) }))
    if (r) return r
  }
  return null
}

// ── Card visuals ──────────────────────────────────────────────────────────────
function CardBack({ w, h, style, onPointerDown, dimmed }) {
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        width: w, height: h, borderRadius: 8, cursor: 'pointer', userSelect: 'none', touchAction: 'none',
        background: 'repeating-linear-gradient(135deg,#2a1060 0px,#2a1060 4px,#18093a 4px,#18093a 8px)',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        opacity: dimmed ? 0.35 : 1,
        ...style,
      }}
    >
      <div style={{ position: 'absolute', inset: 4, borderRadius: 5, border: '1px solid rgba(255,255,255,0.13)', pointerEvents: 'none' }} />
    </div>
  )
}

function CardFace({ suit, value, w, h, style, selected, onPointerDown, onDoubleClick, dimmed }) {
  const red = isRed(suit)
  const col = red ? '#c8102e' : '#111827'
  const val = VALS[value - 1]
  const sym = SUITS[suit]
  const big = w < 60 ? 10 : 12
  const mid = value === 1 ? (w < 60 ? 28 : 38) : value > 10 ? (w < 60 ? 18 : 26) : (w < 60 ? 20 : 28)

  return (
    <div
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      style={{
        width: w, height: h, borderRadius: 8, background: '#fefefe',
        border: selected ? '2px solid #7c3aed' : '1px solid #d1d5db',
        boxShadow: selected
          ? '0 0 0 3px rgba(124,58,237,0.4), 0 6px 16px rgba(0,0,0,0.4)'
          : '0 2px 6px rgba(0,0,0,0.25)',
        cursor: 'grab', userSelect: 'none', touchAction: 'none',
        transform: selected ? 'translateY(-4px)' : 'none',
        transition: 'transform .12s ease, box-shadow .12s ease',
        opacity: dimmed ? 0.35 : 1,
        ...style,
      }}
    >
      <div style={{ position: 'absolute', top: 3, left: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', color: col, lineHeight: 1.15, pointerEvents: 'none' }}>
        <span style={{ fontSize: big, fontWeight: 700 }}>{val}</span>
        <span style={{ fontSize: big - 1 }}>{sym}</span>
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: col, pointerEvents: 'none', flexDirection: value > 10 ? 'column' : 'row', gap: 2 }}>
        {value > 10
          ? <><span style={{ fontSize: mid, fontWeight: 900, opacity: .85, lineHeight: 1 }}>{val}</span><span style={{ fontSize: mid * .55 }}>{sym}</span></>
          : <span style={{ fontSize: mid }}>{sym}</span>
        }
      </div>
      <div style={{ position: 'absolute', bottom: 3, right: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', color: col, lineHeight: 1.15, transform: 'rotate(180deg)', pointerEvents: 'none' }}>
        <span style={{ fontSize: big, fontWeight: 700 }}>{val}</span>
        <span style={{ fontSize: big - 1 }}>{sym}</span>
      </div>
    </div>
  )
}

function Slot({ w, h, label, style, dataCol, dataFound }) {
  return (
    <div
      data-drop-col={dataCol}
      data-drop-found={dataFound}
      style={{
        width: w, height: h, borderRadius: 8,
        border: '2px dashed rgba(255,255,255,0.13)', background: 'rgba(255,255,255,0.02)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        ...style,
      }}
    >
      {label && <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 18 }}>{label}</span>}
    </div>
  )
}

// ── Ghost (drag preview) ──────────────────────────────────────────────────────
function DragGhost({ cards, sz, x, y, offX, offY }) {
  if (!cards?.length) return null
  return (
    <div style={{
      position: 'fixed', left: x - offX, top: y - offY,
      zIndex: 9999, pointerEvents: 'none',
      opacity: 0.92, transform: 'rotate(3deg) scale(1.04)',
      transition: 'none',
    }}>
      {cards.map((card, i) => (
        <CardFace
          key={card.id}
          suit={card.suit} value={card.value}
          w={sz.w} h={sz.h}
          style={{ position: i === 0 ? 'relative' : 'absolute', top: i === 0 ? 0 : i * sz.fuOff, left: 0, zIndex: i + 1 }}
        />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Solitario() {
  usePageTitle('Solitario')
  const sz = useCardSize()
  const [game, setGame]       = useState(() => deal())
  const [sel, setSel]         = useState(null)
  const [won, setWon]         = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [hist, setHist]       = useState([])

  // Drag state
  const dragRef  = useRef(null)   // { source, col, idx, fi, cards, offX, offY }
  const [ghost, setGhost] = useState(null)  // { x, y } or null

  const timerRef = useRef(null)

  useEffect(() => {
    if (won) { clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => setElapsed(t => t + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [won])

  useEffect(() => { if (isWon(game.found)) setWon(true) }, [game.found])

  const save = g => setHist(h => [...h.slice(-29), g])

  const newGame = () => {
    setGame(deal()); setSel(null); setWon(false)
    setElapsed(0); setHist([]); dragRef.current = null; setGhost(null)
    clearInterval(timerRef.current)
  }
  const undo = () => {
    if (!hist.length) return
    setGame(hist[hist.length - 1]); setHist(h => h.slice(0, -1)); setSel(null)
  }

  // ── Move executors ────────────────────────────────────────────────────────

  const execMoveToTab = useCallback((src, targetCol, g) => {
    const { tab, waste, found } = g
    let movingCards, newState

    if (src.source === 'waste') {
      const card = waste[waste.length - 1]
      if (!canToTab(card, tab[targetCol])) return null
      newState = { ...g, waste: waste.slice(0, -1), tab: tab.map((c, i) => i === targetCol ? [...c, card] : c), moves: g.moves + 1, score: g.score + 5 }
    } else if (src.source === 'tab') {
      movingCards = tab[src.col].slice(src.idx)
      if (!movingCards.length || !canToTab(movingCards[0], tab[targetCol])) return null
      const newSrc = flipTop(tab[src.col].slice(0, src.idx))
      newState = { ...g, tab: tab.map((c, i) => i === src.col ? newSrc : i === targetCol ? [...c, ...movingCards] : c), moves: g.moves + 1, score: g.score + 3 }
    } else if (src.source === 'found') {
      const card = found[src.fi][found[src.fi].length - 1]
      if (!canToTab(card, tab[targetCol])) return null
      newState = { ...g, found: found.map((f, i) => i === src.fi ? f.slice(0, -1) : f), tab: tab.map((c, i) => i === targetCol ? [...c, card] : c), moves: g.moves + 1, score: g.score - 5 }
    }
    return newState || null
  }, [])

  const execMoveToFound = useCallback((src, fi, g) => {
    const { tab, waste, found } = g
    let card, newState

    if (src.source === 'waste') {
      card = waste[waste.length - 1]
      if (!canToFound(card, found[fi])) return null
      newState = { ...g, waste: waste.slice(0, -1), found: found.map((f, i) => i === fi ? [...f, { ...card, faceUp: true }] : f), moves: g.moves + 1, score: g.score + 10 }
    } else if (src.source === 'tab') {
      const col = tab[src.col]
      if (src.idx !== col.length - 1) return null
      card = col[src.idx]
      if (!card?.faceUp || !canToFound(card, found[fi])) return null
      newState = { ...g, tab: tab.map((c, i) => i === src.col ? flipTop(c.slice(0, -1)) : c), found: found.map((f, i) => i === fi ? [...f, { ...card, faceUp: true }] : f), moves: g.moves + 1, score: g.score + 10 }
    }
    return newState || null
  }, [])

  // ── Drag handlers ─────────────────────────────────────────────────────────

  const startDrag = useCallback((e, source, col, idx, fi, cards) => {
    if (e.button !== undefined && e.button !== 0) return
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const offX = e.clientX - rect.left
    const offY = e.clientY - rect.top
    dragRef.current = { source, col, idx, fi, cards, offX, offY, moved: false, startX: e.clientX, startY: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (!dragRef.current.moved && Math.hypot(dx, dy) > 6) {
      dragRef.current.moved = true
      setSel(null)  // clear click selection when drag starts
    }
    if (dragRef.current.moved) {
      setGhost({ x: e.clientX, y: e.clientY })
    }
  }, [])

  const onPointerUp = useCallback((e) => {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    setGhost(null)

    if (!drag.moved) {
      // Treat as click
      const { source, col, idx, fi } = drag
      if (source === 'stock') {
        // handled separately
      } else if (source === 'waste') {
        setSel(prev => prev?.source === 'waste' ? null : { source: 'waste' })
      } else if (source === 'tab') {
        const card = game.tab[col][idx]
        if (!card.faceUp) {
          if (idx === game.tab[col].length - 1) {
            save(game)
            setGame(prev => ({ ...prev, tab: prev.tab.map((c, i) => i === col ? c.map((x, j) => j === idx ? { ...x, faceUp: true } : x) : c), moves: prev.moves + 1 }))
          }
          return
        }
        if (sel) {
          if (sel.source === 'tab' && sel.col === col && sel.idx === idx) { setSel(null); return }
          // Try to move selected onto this column
          if (idx === game.tab[col].length - 1) {
            const next = execMoveToTab(sel, col, game)
            if (next) { save(game); setGame(next); setSel(null); return }
          }
          setSel({ source: 'tab', col, idx })
        } else {
          setSel({ source: 'tab', col, idx })
        }
      } else if (source === 'found') {
        if (sel && sel.source !== 'found') {
          const next = execMoveToFound(sel, fi, game)
          if (next) { save(game); setGame(next); setSel(null); return }
          setSel(null)
        } else {
          setSel(prev => prev?.source === 'found' && prev.fi === fi ? null : (game.found[fi].length ? { source: 'found', fi } : null))
        }
      }
      return
    }

    // Drag drop — find target under pointer
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const tabZone  = el?.closest('[data-drop-col]')
    const foundZone = el?.closest('[data-drop-found]')

    if (tabZone) {
      const targetCol = parseInt(tabZone.dataset.dropCol)
      const next = execMoveToTab(drag, targetCol, game)
      if (next) { save(game); setGame(next) }
    } else if (foundZone) {
      const fi = parseInt(foundZone.dataset.dropFound)
      const next = execMoveToFound(drag, fi, game)
      if (next) { save(game); setGame(next) }
    }
  }, [game, sel, execMoveToTab, execMoveToFound])

  // Click on empty tableau col (for placing Kings)
  const onColClick = useCallback((col) => {
    if (!sel || ghost) return
    const next = execMoveToTab(sel, col, game)
    if (next) { save(game); setGame(next); setSel(null) }
  }, [sel, game, ghost, execMoveToTab])

  // Click stock
  const clickStock = () => {
    if (won) return; setSel(null)
    save(game)
    setGame(prev => {
      if (!prev.stock.length)
        return { ...prev, stock: [...prev.waste].reverse().map(c => ({ ...c, faceUp: false })), waste: [], moves: prev.moves + 1 }
      const card = { ...prev.stock[prev.stock.length - 1], faceUp: true }
      return { ...prev, stock: prev.stock.slice(0, -1), waste: [...prev.waste, card], moves: prev.moves + 1 }
    })
  }

  // Double click to foundation
  const dblToFound = (source, col, idx) => {
    const src = { source, col, idx }
    for (let fi = 0; fi < 4; fi++) {
      const next = execMoveToFound(src, fi, game)
      if (next) { save(game); setGame(next); setSel(null); return }
    }
  }

  // Auto-complete
  const allFaceUp = game.tab.every(c => c.every(x => x.faceUp)) && !game.stock.length
  const autoComplete = () => {
    let s = game
    for (let i = 0; i < 60; i++) { const n = autoStep(s); if (!n) break; s = n }
    setGame(s); setSel(null)
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const { tab, stock, waste, found } = game
  const totalW = 7 * sz.w + 6 * sz.gap
  const isDragging = !!ghost

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />

      {/* Controls */}
      <div className="sticky top-14 z-30 bg-[#07070f]/95 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-2 flex-wrap">
          {[
            { icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>, val: fmt(elapsed) },
            { icon: <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h4.5"/>, val: `${game.moves} mov` },
            { icon: <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>, val: game.score, color: 'text-yellow-400' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`w-3.5 h-3.5 ${s.color || 'text-gray-500'}`}>{s.icon}</svg>
              <span className={`text-sm font-mono font-bold tabular-nums ${s.color || 'text-white'}`}>{s.val}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {allFaceUp && !won && (
              <button onClick={autoComplete} className="flex items-center gap-1.5 bg-green-700/80 hover:bg-green-600 border border-green-600/30 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition">✓ Auto-completar</button>
            )}
            <button onClick={undo} disabled={!hist.length} className="flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] disabled:opacity-30 text-gray-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/></svg>
              Deshacer
            </button>
            <button onClick={newGame} className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition hover:shadow-[0_0_16px_rgba(139,92,246,0.4)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
              Nueva
            </button>
          </div>
        </div>
      </div>

      {/* Game board */}
      <div
        className="flex-1 flex flex-col items-center py-6 px-4 overflow-x-auto"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(88,28,135,0.07) 0%, transparent 70%)' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={() => { if (!isDragging) setSel(null) }}
      >
        <div style={{ width: totalW, flexShrink: 0 }} onClick={e => e.stopPropagation()}>

          {/* Top row */}
          <div className="flex items-end" style={{ gap: sz.gap, marginBottom: sz.gap * 2.5 }}>

            {/* Stock */}
            <div style={{ position: 'relative', width: sz.w, height: sz.h, flexShrink: 0 }}>
              {stock.length > 0
                ? <CardBack w={sz.w} h={sz.h} style={{ position: 'relative' }}
                    onPointerDown={e => { e.stopPropagation(); clickStock() }} />
                : <Slot w={sz.w} h={sz.h} label="↺"
                    style={{ border: '2px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}
                    onClick={clickStock} />
              }
              {stock.length > 1 && (
                <div style={{ position: 'absolute', bottom: -3, left: 3, right: 3, height: 3, background: '#18093a', borderRadius: '0 0 5px 5px' }} />
              )}
            </div>

            {/* Waste */}
            <div style={{ position: 'relative', width: sz.w, height: sz.h, flexShrink: 0 }}>
              {waste.length === 0
                ? <Slot w={sz.w} h={sz.h} />
                : <>
                    {waste.length > 1 && (
                      <CardFace suit={waste[waste.length-2].suit} value={waste[waste.length-2].value}
                        w={sz.w} h={sz.h} style={{ position: 'absolute', top: 0, left: 0, opacity: .45, zIndex: 1 }} />
                    )}
                    <CardFace suit={waste[waste.length-1].suit} value={waste[waste.length-1].value}
                      w={sz.w} h={sz.h} style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}
                      selected={sel?.source === 'waste' && !isDragging}
                      dimmed={isDragging && dragRef.current?.source === 'waste'}
                      onPointerDown={e => startDrag(e, 'waste', null, null, null, [waste[waste.length-1]])}
                      onDoubleClick={e => { e.stopPropagation(); dblToFound('waste') }}
                    />
                  </>
              }
            </div>

            <div style={{ flex: 1 }} />

            {/* Foundations */}
            {found.map((pile, fi) => (
              <div key={fi} style={{ position: 'relative', width: sz.w, height: sz.h, flexShrink: 0 }}>
                <Slot w={sz.w} h={sz.h} label={SUITS[fi]} dataFound={fi}
                  style={{ position: 'absolute', top: 0, left: 0, cursor: 'pointer' }} />
                {pile.length > 0 && (
                  <>
                    {pile.length > 1 && (
                      <div style={{ position: 'absolute', bottom: -3, left: 3, right: 3, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: '0 0 5px 5px' }} />
                    )}
                    <CardFace suit={pile[pile.length-1].suit} value={pile[pile.length-1].value}
                      w={sz.w} h={sz.h}
                      style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}
                      selected={sel?.source === 'found' && sel.fi === fi && !isDragging}
                      dimmed={isDragging && dragRef.current?.source === 'found' && dragRef.current.fi === fi}
                      onPointerDown={e => startDrag(e, 'found', null, null, fi, [pile[pile.length-1]])}
                      data-drop-found={fi}
                    />
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Tableau */}
          <div className="flex items-start" style={{ gap: sz.gap }}>
            {tab.map((col, colIdx) => {
              let y = 0
              col.forEach((card, i) => { if (i < col.length - 1) y += card.faceUp ? sz.fuOff : sz.fdOff })
              const colH = Math.max(y + sz.h, sz.h)
              const isDragSrc = c => isDragging && dragRef.current?.source === 'tab' && dragRef.current.col === colIdx && c >= dragRef.current.idx

              return (
                <div key={colIdx} style={{ position: 'relative', width: sz.w, height: colH, flexShrink: 0 }}
                  onClick={() => onColClick(colIdx)}>
                  <Slot w={sz.w} h={sz.h} style={{ position: 'absolute', top: 0 }} dataCol={colIdx} />

                  {(() => {
                    let ty = 0
                    return col.map((card, i) => {
                      const top = ty
                      if (i < col.length - 1) ty += card.faceUp ? sz.fuOff : sz.fdOff
                      const isSel = sel?.source === 'tab' && sel.col === colIdx && i >= sel.idx && !isDragging

                      return card.faceUp ? (
                        <CardFace key={card.id} suit={card.suit} value={card.value}
                          w={sz.w} h={sz.h}
                          style={{ position: 'absolute', top, zIndex: i + 1 }}
                          selected={isSel}
                          dimmed={isDragSrc(i)}
                          onPointerDown={e => startDrag(e, 'tab', colIdx, i, null, col.slice(i))}
                          onDoubleClick={e => { e.stopPropagation(); if (i === col.length - 1) dblToFound('tab', colIdx, i) }}
                        />
                      ) : (
                        <CardBack key={card.id} w={sz.w} h={sz.h}
                          style={{ position: 'absolute', top, zIndex: i + 1 }}
                          onPointerDown={e => {
                            if (i !== col.length - 1) return
                            e.stopPropagation()
                            save(game)
                            setGame(prev => ({ ...prev, tab: prev.tab.map((c, ci) => ci === colIdx ? c.map((x, j) => j === i ? { ...x, faceUp: true } : x) : c), moves: prev.moves + 1 }))
                          }}
                        />
                      )
                    })
                  })()}

                  {/* Full-column drop zone overlay — invisible but catches drops on entire column */}
                  <div data-drop-col={colIdx} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
                </div>
              )
            })}
          </div>
        </div>

        <p className="text-gray-700 text-xs mt-8 text-center">
          Arrastrá las cartas · Doble click para enviar a fundación
        </p>
      </div>

      {/* Drag ghost */}
      {ghost && dragRef.current && (
        <DragGhost
          cards={dragRef.current.cards}
          sz={sz}
          x={ghost.x} y={ghost.y}
          offX={dragRef.current.offX} offY={dragRef.current.offY}
        />
      )}

      {/* Win modal */}
      {won && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm px-4">
          <div className="bg-[#0d0d1a] border border-white/[0.09] rounded-3xl p-10 max-w-sm w-full text-center flex flex-col gap-6 shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-yellow-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"/>
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400">¡Ganaste!</h2>
              <p className="text-gray-500 mt-1.5">Completaste el solitario</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Tiempo',      val: fmt(elapsed),  color: 'text-purple-400' },
                { label: 'Movimientos', val: game.moves,    color: 'text-blue-400'   },
                { label: 'Puntos',      val: game.score,    color: 'text-yellow-400' },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-3">
                  <p className={`text-xl font-extrabold tabular-nums ${s.color}`}>{s.val}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <button onClick={newGame}
              className="bg-purple-600 hover:bg-purple-500 text-white py-3.5 rounded-2xl font-bold transition hover:shadow-[0_0_24px_rgba(139,92,246,0.35)]">
              Nueva partida →
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
