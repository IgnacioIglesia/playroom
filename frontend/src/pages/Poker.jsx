import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import Navbar from '../components/Navbar'
import { usePageTitle } from '../hooks/usePageTitle'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { SOCKET_URL } from '../config/socket'

// ── Constants ─────────────────────────────────────────────────────────────────
const VNAMES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
const isRed  = s => s === 1 || s === 2
const SB = 10, BB = 20, START = 1000

// ── Deck ──────────────────────────────────────────────────────────────────────
const mkDeck = () => Array.from({ length: 52 }, (_, i) => ({ suit: Math.floor(i / 13), value: (i % 13) + 2, id: i }))
const shuffle = arr => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// ── Hand evaluation ───────────────────────────────────────────────────────────
function eval5(cards) {
  const vals  = cards.map(c => c.value).sort((a, b) => b - a)
  const suits = cards.map(c => c.suit)
  const isFlush    = new Set(suits).size === 1
  const uniq       = [...new Set(vals)].sort((a, b) => b - a)
  const isStraight = uniq.length === 5 && uniq[0] - uniq[4] === 4
  const isWheel    = uniq.length === 5 && uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2
  const strHigh    = isWheel ? 5 : uniq[0]
  const cnt = {}; vals.forEach(v => { cnt[v] = (cnt[v] || 0) + 1 })
  const grps = Object.entries(cnt).map(([v, c]) => [+v, c]).sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const topCount = grps[0]?.[1] ?? 0, topVal = grps[0]?.[0] ?? 0
  const secCount = grps[1]?.[1] ?? 0, secVal = grps[1]?.[0] ?? 0
  const kickers  = grps.filter(g => g[1] === 1).map(g => g[0])
  if (isFlush && (isStraight || isWheel)) return { rank: strHigh === 14 ? 9 : 8, name: strHigh === 14 ? 'Escalera Real' : 'Escalera de Color', tb: [strHigh] }
  if (topCount === 4) return { rank: 7, name: 'Póker',       tb: [topVal, secVal] }
  if (topCount === 3 && secCount === 2) return { rank: 6, name: 'Full House',  tb: [topVal, secVal] }
  if (isFlush)  return { rank: 5, name: 'Color',    tb: vals }
  if (isStraight || isWheel) return { rank: 4, name: 'Escalera', tb: [strHigh] }
  if (topCount === 3) return { rank: 3, name: 'Trío',       tb: [topVal, ...kickers] }
  if (topCount === 2 && secCount === 2) {
    const pairs = grps.filter(g => g[1] === 2).map(g => g[0]).sort((a, b) => b - a)
    return { rank: 2, name: 'Doble Par', tb: [...pairs, ...kickers] }
  }
  if (topCount === 2) return { rank: 1, name: 'Par',        tb: [topVal, ...kickers] }
  return { rank: 0, name: 'Carta Alta', tb: vals }
}
function cmpTb(a, b) { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0 }
function cmpHands(a, b) { return a.rank !== b.rank ? a.rank - b.rank : cmpTb(a.tb, b.tb) }
function bestHand(cards) {
  if (!cards || cards.length < 5) return { rank: -1, name: '', tb: [] }
  if (cards.length === 5) return eval5(cards)
  let best = null
  const n = cards.length
  for (let i=0;i<n;i++) for(let j=i+1;j<n;j++) for(let k=j+1;k<n;k++) for(let l=k+1;l<n;l++) for(let m=l+1;m<n;m++) {
    const h = eval5([cards[i],cards[j],cards[k],cards[l],cards[m]])
    if (!best || cmpHands(h,best)>0) best=h
  }
  return best ?? { rank:-1, name:'', tb:[] }
}

// ── CPU AI ────────────────────────────────────────────────────────────────────
function preflopStr(hole) {
  const [a,b] = [...hole].sort((x,y)=>y.value-x.value)
  const suited=a.suit===b.suit, pair=a.value===b.value, gap=a.value-b.value
  if (pair) return Math.min(0.5+(a.value-2)/24,0.98)
  if (a.value===14) return b.value>=12?0.85:b.value>=10?0.75:b.value>=7?(suited?0.65:0.55):0.45
  if (a.value===13&&b.value>=10) return suited?0.72:0.65
  if (a.value>=11&&b.value>=10) return suited?0.65:0.58
  if (suited&&gap<=2&&a.value>=8) return 0.58
  if (a.value>=10) return 0.45
  return Math.max(0.18,0.38-gap*0.03+(suited?0.05:0))
}
function cpuDecide(player,{community,pot,currentBet}) {
  const toCall=currentBet-player.roundBet
  const allCards=[...(player.hand||[]),...(community||[])]
  const str=community.length===0?preflopStr(player.hand):Math.min((bestHand(allCards).rank/9)*0.9+0.08,0.99)
  const rand=Math.random(), eff=rand<0.12?Math.min(str+0.35,1):str
  if (toCall===0) { if(eff>0.72&&rand<0.55) return{action:'raise',amount:Math.max(Math.round((pot||BB)*0.5/10)*10,BB)}; return{action:'check'} }
  if (eff>0.82) return rand<0.4?{action:'raise',amount:Math.max(toCall*2,BB)}:{action:'call'}
  if (eff>toCall/((pot||1)+toCall)+0.1||(eff>0.45&&rand<0.5)) return{action:'call'}
  return{action:'fold'}
}

// ── Game helpers ──────────────────────────────────────────────────────────────
const activePlayers = ps => ps.filter(p=>p.status==='active')
const notFolded     = ps => ps.filter(p=>p.status!=='folded'&&p.status!=='bust')
function nextActive(players,from) {
  const n=players.length
  for(let i=1;i<n;i++) { const idx=(from+i)%n; if(players[idx].status==='active') return idx }
  return -1
}
function roundDone(players,bet) {
  const ap=activePlayers(players); if(!ap.length) return true
  return ap.every(p=>p.hasActed&&(p.roundBet>=bet||p.chips===0))
}

// ── Deal new hand ─────────────────────────────────────────────────────────────
function dealHand(prev) {
  const alive=prev.players.filter(p=>p.chips>0)
  if(alive.length<2||!alive.find(p=>p.isHuman)) return{...prev,phase:'gameover',log:['Partida terminada.']}
  const deck=shuffle(mkDeck()); let di=0
  const ps=prev.players.map(p=>({...p,hand:[],roundBet:0,totalBet:0,hasActed:false,status:p.chips>0?'active':'bust'}))
  let dealerIdx=prev.dealerIdx; const n=ps.length
  for(let i=0;i<n;i++) { dealerIdx=(dealerIdx+1)%n; if(ps[dealerIdx].status==='active') break }
  const findNext=from=>{ for(let i=1;i<=n;i++){const idx=(from+i)%n;if(ps[idx].status==='active')return idx}; return from }
  ps.forEach(p=>{ if(p.status==='active'){p.hand=[deck[di++],deck[di++]]} })
  const sbIdx=findNext(dealerIdx), bbIdx=findNext(sbIdx), firstIdx=findNext(bbIdx)
  const sbBet=Math.min(SB,ps[sbIdx].chips), bbBet=Math.min(BB,ps[bbIdx].chips)
  ps[sbIdx]={...ps[sbIdx],chips:ps[sbIdx].chips-sbBet,roundBet:sbBet,totalBet:sbBet,status:ps[sbIdx].chips-sbBet===0?'allin':'active'}
  ps[bbIdx]={...ps[bbIdx],chips:ps[bbIdx].chips-bbBet,roundBet:bbBet,totalBet:bbBet,status:ps[bbIdx].chips-bbBet===0?'allin':'active'}
  return{players:ps,community:[],deck:deck.slice(di),pot:sbBet+bbBet,phase:'preflop',dealerIdx,sbIdx,bbIdx,currentIdx:firstIdx,currentBet:bbBet,log:[`Nueva mano — Ciega ${SB}/${BB}`,...prev.log.slice(0,10)],showdown:null}
}

// ── Advance phase ─────────────────────────────────────────────────────────────
function advancePhase(state) {
  const{phase,players,pot,deck}=state
  const nf=notFolded(players)
  if(nf.length===1) {
    const w=nf[0]; const newPs=players.map(p=>p.id===w.id?{...p,chips:p.chips+pot,status:'active'}:{...p,status:p.status==='bust'?'bust':'active'})
    return{...state,players:newPs,pot:0,phase:'showdown',showdown:{winIds:new Set([w.id]),withHands:[],uncontested:true},log:[`${w.name} gana $${pot}`,...state.log.slice(0,10)]}
  }
  const newDeck=[...deck]; const deal=n=>Array.from({length:n},()=>newDeck.shift())
  const reset=ps=>ps.map(p=>({...p,roundBet:0,hasActed:false}))
  const first=ps=>{ const f=nextActive(ps,state.dealerIdx); return f===-1?0:f }
  if(phase==='preflop'){const c=deal(3);const ps=reset(players);return{...state,players:ps,community:c,deck:newDeck,phase:'flop',currentBet:0,currentIdx:first(ps),log:['— Flop —',...state.log.slice(0,11)]}}
  if(phase==='flop'){const c=[...state.community,...deal(1)];const ps=reset(players);return{...state,players:ps,community:c,deck:newDeck,phase:'turn',currentBet:0,currentIdx:first(ps),log:['— Turn —',...state.log.slice(0,11)]}}
  if(phase==='turn'){const c=[...state.community,...deal(1)];const ps=reset(players);return{...state,players:ps,community:c,deck:newDeck,phase:'river',currentBet:0,currentIdx:first(ps),log:['— River —',...state.log.slice(0,11)]}}
  if(phase==='river') return doShowdown(state)
  return state
}
function doShowdown(state) {
  const nf=notFolded(state.players)
  const wh=nf.map(p=>({...p,eval:bestHand([...p.hand,...state.community])}))
  wh.sort((a,b)=>cmpHands(b.eval,a.eval))
  const top=wh[0].eval, winners=wh.filter(p=>cmpHands(p.eval,top)===0), share=Math.floor(state.pot/winners.length)
  const winSet=new Set(winners.map(w=>w.id))
  const newPs=state.players.map(p=>({...p,chips:p.chips+(winSet.has(p.id)?share:0),status:p.status==='bust'?'bust':'active'}))
  const msg=winners.length===1?`${winners[0].name} gana $${state.pot} con ${winners[0].eval.name}`:`${winners.map(w=>w.name).join(' y ')} empatan — $${share} c/u`
  return{...state,players:newPs,pot:0,phase:'showdown',showdown:{winIds:winSet,withHands:wh},log:[msg,...state.log.slice(0,10)]}
}

// ── Apply action ──────────────────────────────────────────────────────────────
function applyAction(state,pidx,action,raiseAmt=BB) {
  const ps=state.players.map(p=>({...p})); const p=ps[pidx]
  if(!p||p.status!=='active') return state
  let{pot,currentBet,log}=state; p.hasActed=true
  switch(action) {
    case 'fold': p.status='folded'; log=[`${p.name}: Fold`,...log.slice(0,12)]; break
    case 'check': log=[`${p.name}: Check`,...log.slice(0,12)]; break
    case 'call': { const amt=Math.min(currentBet-p.roundBet,p.chips); if(amt<=0){log=[`${p.name}: Check`,...log.slice(0,12)];break}; p.chips-=amt;p.roundBet+=amt;p.totalBet+=amt;pot+=amt; if(p.chips===0)p.status='allin'; log=[`${p.name}: Call $${amt}`,...log.slice(0,12)]; break }
    case 'raise': { const ca=Math.max(0,currentBet-p.roundBet),tot=Math.min(ca+raiseAmt,p.chips); if(tot<=0)break; p.chips-=tot;p.roundBet+=tot;p.totalBet+=tot;pot+=tot; if(p.chips===0)p.status='allin'; currentBet=p.roundBet; ps.forEach((pl,i)=>{if(i!==pidx&&pl.status==='active')pl.hasActed=false}); log=[`${p.name}: Sube a $${currentBet}`,...log.slice(0,12)]; break }
    default: break
  }
  const next={...state,players:ps,pot,currentBet,log}
  if(roundDone(ps,currentBet)) return advancePhase(next)
  const nxt=nextActive(ps,pidx); if(nxt===-1) return advancePhase(next)
  return{...next,currentIdx:nxt}
}

// ── Init ──────────────────────────────────────────────────────────────────────
const CPUS = [
  { id:1, name:'Carlos', avatar:'CA', isHuman:false },
  { id:2, name:'Matías', avatar:'MA', isHuman:false },
  { id:3, name:'Lucía',  avatar:'LU', isHuman:false },
]
function mkPlayers() {
  return [
    { id:0, name:'Vos', avatar:'VO', isHuman:true, chips:START, hand:[], roundBet:0, totalBet:0, hasActed:false, status:'active' },
    ...CPUS.map(c=>({...c,chips:START,hand:[],roundBet:0,totalBet:0,hasActed:false,status:'active'})),
  ]
}
const INIT = { players:mkPlayers(), community:[], deck:[], pot:0, phase:'waiting', dealerIdx:3, sbIdx:0, bbIdx:1, currentIdx:0, currentBet:0, log:['Presioná "Nueva mano" para empezar.'], showdown:null }

// ══════════════════════════════════════════════════════════════════════════════
// ── VISUAL LAYER ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ── Card face ─────────────────────────────────────────────────────────────────
function SuitIcon({ suit, size=16, color='currentColor', style={} }) {
  const common = { fill: color }
  const shapes = [
    <path key="spade" {...common} d="M12 2C8.3 5.2 5 8.5 5 11.6A4.1 4.1 0 0 0 11.1 15c-.2 2-1 3.6-2.2 5h6.2c-1.2-1.4-2-3-2.2-5A4.1 4.1 0 0 0 19 11.6C19 8.5 15.7 5.2 12 2Z" />,
    <path key="heart" {...common} d="M12 20.3 10.7 19C6 14.8 3 12 3 8.6A4.4 4.4 0 0 1 7.5 4c1.8 0 3.4.9 4.5 2.3A5.5 5.5 0 0 1 16.5 4 4.4 4.4 0 0 1 21 8.6c0 3.4-3 6.2-7.7 10.4L12 20.3Z" />,
    <path key="diamond" {...common} d="M12 2 20 12 12 22 4 12 12 2Z" />,
    <path key="club" {...common} d="M9.7 20c1-1.3 1.6-2.7 1.7-4.2A3.9 3.9 0 1 1 8.2 9.4 3.9 3.9 0 1 1 15.8 9.4a3.9 3.9 0 1 1-3.2 6.4c.1 1.5.7 2.9 1.7 4.2H9.7Z" />,
  ]
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ display:'block', ...style }}>{shapes[suit] ?? shapes[0]}</svg>
}

function AvatarBadge({ label }) {
  return (
    <span style={{ width:20, height:20, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#7c3aed,#2563eb)', color:'#fff', fontSize:8, fontWeight:900, letterSpacing:0 }}>
      {label}
    </span>
  )
}

function initials(name = 'Jugador') {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'J'
}

function normalizeOnlineState(estado, socketId) {
  if (!estado) return null
  const showdown = estado.showdown
    ? {
        ...estado.showdown,
        winIds: new Set(estado.showdown.winIds || []),
        withHands: (estado.showdown.withHands || []).map(p => ({
          ...p,
          name: p.nombre || p.name || 'Jugador',
        })),
      }
    : null

  return {
    ...estado,
    players: (estado.players || []).map(p => ({
      ...p,
      name: p.nombre || p.name || 'Jugador',
      avatar: p.isCpu ? initials(p.nombre || 'CPU') : initials(p.nombre || 'Jugador'),
      isHuman: p.id === socketId,
      hand: p.hand || [],
    })),
    showdown,
  }
}

function PokerMark() {
  return (
    <div className="flex gap-1.5 rounded-2xl border border-purple-500/20 bg-purple-950/30 p-2">
      {[0,1,2,3].map(s => <SuitIcon key={s} suit={s} size={15} color={isRed(s) ? '#f87171' : '#c4b5fd'} />)}
    </div>
  )
}

function PokerLobbyScreen({ connected, error, initialCode='', onCreate, onJoin, onCpu, onBack }) {
  const [code, setCode] = useState(initialCode)
  const normalized = code.replace(/\D/g, '').slice(0, 4)
  const canJoin = normalized.length === 4

  useEffect(() => setCode(initialCode), [initialCode])

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <Navbar />
      <div className="relative flex-1 flex items-center justify-center px-4 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(109,40,217,0.18),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage:'radial-gradient(rgba(139,92,246,0.05) 1px, transparent 1px)', backgroundSize:'30px 30px' }} />

        <div className="relative z-10 w-full max-w-3xl flex flex-col gap-8">
          <div className="text-center flex flex-col items-center">
            <PokerMark />
            <h1 className="mt-5 text-4xl font-extrabold">Poker Online</h1>
            <p className="text-gray-500 mt-2 text-sm">Creá una sala, entrá con código o jugá una mesa local.</p>
            <span className={`mt-4 rounded-full border px-3 py-1 text-xs font-semibold ${connected ? 'border-green-700/30 bg-green-950/50 text-green-400' : 'border-yellow-700/30 bg-yellow-950/50 text-yellow-400'}`}>
              {connected ? 'Conectado' : 'Conectando'}
            </span>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/25 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={onCreate}
              disabled={!connected}
              className="group bg-white/[0.03] border border-white/[0.06] hover:border-purple-500/40 hover:bg-white/[0.05] rounded-3xl p-8 flex flex-col items-start gap-5 transition-all text-left disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="w-14 h-14 bg-purple-600/20 border border-purple-500/30 rounded-2xl flex items-center justify-center group-hover:bg-purple-600/30 transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-purple-200">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-extrabold">Crear sala</p>
                <p className="text-gray-500 text-sm mt-1.5">Vas a ser el líder y solo vos podés iniciar la partida.</p>
              </div>
              <span className="bg-white/[0.05] border border-white/[0.08] text-gray-400 text-xs px-3 py-1 rounded-full">3 a 6 jugadores</span>
            </button>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-8 flex flex-col gap-5">
              <div className="w-14 h-14 bg-purple-600/20 border border-purple-500/30 rounded-2xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-purple-200">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7h3a3 3 0 0 1 0 6h-3M9 17H6a3 3 0 0 1 0-6h3M8 12h8" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-extrabold">Unirse</p>
                <p className="text-gray-500 text-sm mt-1.5">Ingresá el código de 4 dígitos que te compartieron.</p>
              </div>
              <input
                value={normalized}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && canJoin) onJoin(normalized) }}
                inputMode="numeric"
                maxLength={4}
                placeholder="1234"
                className="w-full rounded-2xl border border-white/[0.08] bg-black/20 px-5 py-4 text-center font-mono text-3xl font-extrabold tracking-[0.35em] text-white outline-none transition placeholder:text-gray-700 placeholder:tracking-normal focus:border-purple-500/60"
              />
              <button
                onClick={() => onJoin(normalized)}
                disabled={!connected || !canJoin}
                className="w-full rounded-2xl bg-purple-600 py-3.5 text-sm font-bold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Entrar a sala
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button onClick={onCpu} className="text-gray-500 text-sm hover:text-gray-300 transition">Jugar contra CPU</button>
            <button onClick={onBack} className="text-gray-600 text-sm hover:text-gray-400 transition">Volver a los juegos</button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function PokerPreLobbyScreen({ sala, socketId, connected, error, copied, onCopy, onStart, onLeave, onMaxPlayers }) {
  const isHost = sala?.host === socketId
  const jugadores = sala?.jugadores || []
  const ready = jugadores.length >= 3

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <Navbar />
      <div className="relative flex-1 flex items-center justify-center px-4 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(109,40,217,0.18),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage:'radial-gradient(rgba(139,92,246,0.05) 1px, transparent 1px)', backgroundSize:'30px 30px' }} />

        <div className="relative z-10 w-full max-w-2xl flex flex-col gap-6">
          <div className="text-center flex flex-col items-center">
            <PokerMark />
            <h1 className="mt-5 text-3xl font-extrabold">Sala de Poker</h1>
            <p className="text-gray-500 mt-2 text-sm">{isHost ? 'Sos el líder de la sala.' : 'Esperando que el líder inicie la partida.'}</p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/25 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-300">
              {error}
            </div>
          )}

          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">Código de sala</p>
                <p className="mt-1 font-mono text-4xl font-extrabold tracking-[0.25em] text-white">{sala?.id}</p>
              </div>
              <button onClick={onCopy} className="rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm font-bold text-gray-200 transition hover:bg-white/[0.08]">
                {copied ? 'Copiado' : 'Copiar código'}
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">Jugadores</p>
                {isHost ? (
                  <select
                    value={sala?.maxJugadores || 6}
                    onChange={(e) => onMaxPlayers(+e.target.value)}
                    className="rounded-xl border border-white/[0.08] bg-[#121224] px-3 py-2 text-sm font-bold text-white outline-none"
                  >
                    {[3,4,5,6].map(n => <option key={n} value={n}>{n} personas</option>)}
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-gray-500">{jugadores.length}/{sala?.maxJugadores || 6}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Array.from({ length: sala?.maxJugadores || 6 }, (_, i) => {
                  const jugador = jugadores[i]
                  const host = jugador?.id === sala?.host
                  return (
                    <div key={i} className={`rounded-2xl border px-4 py-3 ${jugador ? 'border-white/[0.08] bg-white/[0.04]' : 'border-white/[0.04] bg-white/[0.015]'}`}>
                      {jugador ? (
                        <div className="flex items-center gap-3">
                          <AvatarBadge label={initials(jugador.nombre)} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-white">{jugador.nombre}</p>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-300">{host ? 'Líder' : 'Jugador'}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-gray-700">Lugar disponible</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {isHost ? (
                <button
                  onClick={onStart}
                  disabled={!ready || !connected}
                  className="flex-1 rounded-2xl bg-purple-600 py-3.5 text-sm font-bold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Iniciar partida
                </button>
              ) : (
                <div className="flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.025] py-3.5 text-center text-sm font-semibold text-gray-500">
                  Solo el líder puede iniciar
                </div>
              )}
              <button onClick={onLeave} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-3.5 text-sm font-bold text-gray-300 transition hover:bg-white/[0.08]">
                Salir
              </button>
            </div>
            {!ready && <p className="mt-3 text-center text-xs text-gray-600">Se necesitan al menos 3 jugadores para iniciar.</p>}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function CardFace({ suit, value, w=68, h=96, glow=false, faded=false, style={} }) {
  const red = isRed(suit)
  const col = red ? '#c0102a' : '#0f172a'
  const val = VNAMES[value - 2] ?? '?'
  const fs  = w < 58 ? 9 : 11
  const mid = value===14?(w<58?26:34):value>10?(w<58?16:22):(w<58?19:25)
  return (
    <div style={{
      position:'relative', width:w, height:h, borderRadius:9, background:'#fefefe',
      flexShrink:0, userSelect:'none',
      border: glow ? '2px solid #a855f7' : '1px solid #e2e8f0',
      boxShadow: glow
        ? '0 0 0 3px rgba(168,85,247,0.4), 0 6px 20px rgba(0,0,0,0.5)'
        : '0 3px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.8)',
      opacity: faded ? 0.35 : 1,
      transition: 'opacity .2s, box-shadow .2s',
      ...style,
    }}>
      <div style={{ position:'absolute', top:4, left:5, lineHeight:1.1, color:col, pointerEvents:'none' }}>
        <div style={{ fontSize:fs, fontWeight:800, letterSpacing:'-0.02em' }}>{val}</div>
        <SuitIcon suit={suit} size={fs + 2} color={col} style={{ marginTop:1 }} />
      </div>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:col, pointerEvents:'none', flexDirection:value>10?'column':'row', gap:2 }}>
        {value>10
          ? <><span style={{fontSize:mid,fontWeight:900,lineHeight:1,opacity:.82}}>{val}</span><SuitIcon suit={suit} size={mid*.65} color={col} /></>
          : <SuitIcon suit={suit} size={mid} color={col} />
        }
      </div>
      <div style={{ position:'absolute', bottom:4, right:5, lineHeight:1.1, color:col, transform:'rotate(180deg)', pointerEvents:'none' }}>
        <div style={{ fontSize:fs, fontWeight:800 }}>{val}</div>
        <SuitIcon suit={suit} size={fs + 2} color={col} />
      </div>
    </div>
  )
}

// ── Card back ─────────────────────────────────────────────────────────────────
function CardBack({ w=68, h=96, style={} }) {
  return (
    <div style={{
      position:'relative', width:w, height:h, borderRadius:9, flexShrink:0,
      background:'linear-gradient(145deg, #3b0d6e 0%, #1a0540 50%, #2d0b5a 100%)',
      border:'1px solid rgba(168,85,247,0.25)',
      boxShadow:'0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(168,85,247,0.2)',
      ...style,
    }}>
      <div style={{ position:'absolute', inset:5, borderRadius:5, border:'1px solid rgba(168,85,247,0.2)', backgroundImage:'repeating-linear-gradient(45deg,rgba(168,85,247,0.06) 0,rgba(168,85,247,0.06) 1px,transparent 1px,transparent 6px)' }} />
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', opacity:.3 }}>
        <SuitIcon suit={2} size={18} color="#c4b5fd" />
      </div>
    </div>
  )
}

function CardSlot({ w=68, h=96 }) {
  return <div style={{ width:w, height:h, borderRadius:9, border:'2px dashed rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.015)', flexShrink:0 }} />
}

// ── Chip token ────────────────────────────────────────────────────────────────
function Chip({ value }) {
  const [bg, border] = value >= 100 ? ['#7c3aed','#a855f7'] : value >= 50 ? ['#1d4ed8','#3b82f6'] : value >= 25 ? ['#b45309','#f59e0b'] : value >= 10 ? ['#166534','#22c55e'] : ['#9f1239','#f43f5e']
  return (
    <div style={{ width:28, height:28, borderRadius:'50%', background:bg, border:`2px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'#fff', boxShadow:`0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)`, flexShrink:0, letterSpacing:'-0.03em' }}>
      {value}
    </div>
  )
}

// ── Bet stack (chips on table near player) ────────────────────────────────────
function BetStack({ amount }) {
  if (!amount) return null
  const denom = amount >= 100 ? 100 : amount >= 50 ? 50 : amount >= 25 ? 25 : amount >= 10 ? 10 : 5
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
      <Chip value={denom} />
      <span style={{ fontSize:9, fontWeight:700, color:'#fbbf24', letterSpacing:'0.02em' }}>${amount}</span>
    </div>
  )
}

// ── Dealer button ─────────────────────────────────────────────────────────────
function DealerBtn() {
  return (
    <div style={{ width:18, height:18, borderRadius:'50%', background:'linear-gradient(135deg,#fef3c7,#fde68a)', border:'2px solid #d97706', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:900, color:'#92400e', boxShadow:'0 1px 4px rgba(0,0,0,0.4)', flexShrink:0 }}>D</div>
  )
}

// ── Player seat ───────────────────────────────────────────────────────────────
function Seat({ player, isDealer, isCurrent, isWinner, reveal, compact=false }) {
  const CW = compact ? 46 : 68, CH = compact ? 64 : 96
  const folded = player.status === 'folded'
  const bust   = player.status === 'bust'
  const allin  = player.status === 'allin'
  const show   = reveal || player.isHuman

  const ringColor = isWinner ? '#f59e0b' : isCurrent ? '#a855f7' : folded||bust ? 'transparent' : 'rgba(255,255,255,0.1)'
  const ringGlow  = isWinner ? '0 0 16px rgba(245,158,11,0.6)' : isCurrent ? '0 0 16px rgba(168,85,247,0.7)' : 'none'

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, opacity:folded||bust?0.4:1, transition:'opacity .3s' }}>
      {/* Cards */}
      <div style={{ display:'flex', gap:compact?4:5 }}>
        {player.hand.length === 0
          ? [0,1].map(i => <CardSlot key={i} w={CW} h={CH} />)
          : player.hand.map((c,i) =>
              c && show && !folded
                ? <CardFace key={i} suit={c.suit} value={c.value} w={CW} h={CH} glow={isWinner} />
                : <CardBack key={i} w={CW} h={CH} />
            )
        }
      </div>

      {/* Info plate */}
      <div style={{
        background: isCurrent ? 'rgba(88,28,135,0.7)' : isWinner ? 'rgba(120,53,15,0.7)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${ringColor}`,
        boxShadow: ringGlow,
        borderRadius:12, padding:'6px 12px',
        display:'flex', flexDirection:'column', alignItems:'center', gap:2,
        minWidth:90, transition:'border-color .3s, box-shadow .3s',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <AvatarBadge label={player.avatar} />
          <span style={{ fontSize:11, fontWeight:700, color:'#fff', whiteSpace:'nowrap' }}>{player.name}</span>
          {isDealer && <DealerBtn />}
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:'#c084fc', fontVariantNumeric:'tabular-nums' }}>${player.chips.toLocaleString()}</span>
        {folded  && <span style={{ fontSize:9, color:'#f87171', fontWeight:700, letterSpacing:'0.05em' }}>FOLD</span>}
        {allin   && <span style={{ fontSize:9, color:'#fb923c', fontWeight:700, letterSpacing:'0.05em' }}>ALL-IN</span>}
        {isCurrent && !folded && !bust && (
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'#a855f7', animation:'pulse 1s infinite' }} />
            <span style={{ fontSize:9, color:'#c084fc', fontWeight:600 }}>Turno</span>
          </div>
        )}
        {isWinner && <span style={{ fontSize:9, color:'#fbbf24', fontWeight:700 }}>GANADOR</span>}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Poker() {
  usePageTitle('Poker')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { usuario } = useAuth()
  const roomCode = searchParams.get('sala')?.replace(/\D/g, '').slice(0, 4) || ''
  const mode = searchParams.get('modo')
  const [game, setGame]         = useState(INIT)
  const [raiseAmt, setRaiseAmt] = useState(BB * 2)
  const cpuRef = useRef(null)
  const sockRef = useRef(null)
  const autoJoinedRef = useRef(false)

  const [pantalla, setPantalla] = useState(mode === 'cpu' ? 'cpu' : 'lobby')
  const [conectado, setConectado] = useState(false)
  const [error, setError] = useState('')
  const [prelobby, setPrelobby] = useState(null)
  const [onlineState, setOnlineState] = useState(null)
  const [copied, setCopied] = useState(false)
  const [socketId, setSocketId] = useState('')
  const miNombre = usuario?.displayName || usuario?.email?.split('@')[0] || 'Jugador'

  useEffect(() => {
    if (mode === 'cpu') setPantalla('cpu')
    else if (roomCode && conectado && !autoJoinedRef.current) {
      autoJoinedRef.current = true
      setError('')
      sockRef.current?.emit('poker_unirse_sala', { salaId: roomCode })
    }
  }, [mode, roomCode, conectado])

  useEffect(() => {
    const socket = io(SOCKET_URL, { forceNew: true })
    sockRef.current = socket

    socket.on('connect', () => {
      setConectado(true)
      setSocketId(socket.id)
    })
    socket.on('disconnect', () => setConectado(false))
    socket.on('poker_sala_creada', ({ salaId }) => {
      setError('')
      autoJoinedRef.current = true
      navigate(`/juegos/poker?sala=${salaId}`, { replace: true })
    })
    socket.on('poker_prelobby', (sala) => {
      setPrelobby(sala)
      setPantalla('prelobby')
    })
    socket.on('poker_iniciado', () => {
      setError('')
      setPantalla('juego')
    })
    socket.on('poker_estado', (estado) => {
      setOnlineState(estado)
      setPantalla('juego')
    })
    socket.on('poker_error', (msg) => setError(msg))
    socket.on('poker_jugador_salio', ({ nombre }) => {
      setError(`${nombre || 'Un jugador'} salió de la sala.`)
      setPantalla('lobby')
      setPrelobby(null)
      setOnlineState(null)
    })
    socket.on('conexion_duplicada', (mensaje) => {
      setError(mensaje)
      setPantalla('lobby')
      socket.disconnect()
    })

    return () => socket.disconnect()
  }, [navigate])

  useEffect(() => {
    if (!conectado || !sockRef.current) return
    const userId = usuario?.uid || usuario?.email || miNombre
    sockRef.current.emit('set_nombre', { nombre: miNombre, userId, photoURL: usuario?.photoURL || '' })
  }, [conectado, miNombre, usuario])

  const onlineGame = normalizeOnlineState(onlineState, socketId)
  const tableGame = pantalla === 'juego' && onlineGame ? onlineGame : game

  const { players, community, pot, phase, currentIdx, currentBet, showdown, log } = tableGame
  const human      = pantalla === 'juego' && onlineGame
    ? players.find(p => p.id === socketId) || players.find(p => !p.isCpu) || players[0]
    : players[0]
  const inBetting  = ['preflop','flop','turn','river'].includes(phase)
  const currentPlayer = players[currentIdx]
  const myTurn     = inBetting && currentPlayer?.id === human?.id && human.status === 'active'
  const toCall     = Math.max(0, currentBet - human.roundBet)
  const canCheck   = toCall === 0
  const minRaise   = Math.max(currentBet + BB, BB)
  const maxRaise   = human.chips + human.roundBet
  const isShowdown = phase === 'showdown'
  const winIds     = showdown?.winIds ?? new Set()

  useEffect(() => {
    setRaiseAmt(Math.min(Math.max(minRaise, Math.round((pot||BB)*0.5/10)*10), maxRaise))
  }, [pot, currentBet])

  // CPU turns
  useEffect(() => {
    if (pantalla !== 'cpu') return
    if (!inBetting || currentIdx === 0) return
    const p = players[currentIdx]
    if (!p || p.status !== 'active') return
    clearTimeout(cpuRef.current)
    cpuRef.current = setTimeout(() => {
      setGame(prev => {
        const cp = prev.players[prev.currentIdx]
        if (!cp || cp.status !== 'active') return prev
        const d = cpuDecide(cp, prev)
        return applyAction(prev, prev.currentIdx, d.action, d.amount ?? BB)
      })
    }, 600 + Math.random() * 700)
    return () => clearTimeout(cpuRef.current)
  }, [currentIdx, phase, pantalla])

  const act = (action, amt) => {
    if (!myTurn) return
    if (pantalla === 'juego' && onlineGame) {
      sockRef.current?.emit('poker_accion', { action, raiseAmt: amt })
      return
    }
    setGame(prev => applyAction(prev, 0, action, amt))
  }
  const startHand = () => {
    if (pantalla === 'juego' && onlineGame) nextOnlineHand()
    else setGame(prev => dealHand(prev))
  }
  const newGame   = () => setGame(dealHand({ ...INIT, players: mkPlayers() }))
  const enterCpu = () => {
    setError('')
    sockRef.current?.emit('poker_salir_sala')
    navigate('/juegos/poker?modo=cpu')
    setPantalla('cpu')
  }
  const createRoom = () => {
    setError('')
    sockRef.current?.emit('poker_crear_sala', { maxJugadores: 6 })
  }
  const joinRoom = (code) => {
    setError('')
    autoJoinedRef.current = true
    navigate(`/juegos/poker?sala=${code}`)
    sockRef.current?.emit('poker_unirse_sala', { salaId: code })
  }
  const leaveRoom = () => {
    sockRef.current?.emit('poker_salir_sala')
    setPrelobby(null)
    setOnlineState(null)
    setError('')
    autoJoinedRef.current = false
    navigate('/juegos/poker')
    setPantalla('lobby')
  }
  const startOnline = () => sockRef.current?.emit('poker_iniciar')
  const configMaxPlayers = (maxJugadores) => sockRef.current?.emit('poker_config_sala', { maxJugadores })
  const copyCode = async () => {
    if (!prelobby?.id) return
    try {
      await navigator.clipboard.writeText(prelobby.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }
  const nextOnlineHand = () => sockRef.current?.emit('poker_nueva_mano')

  const phaseLabel = { preflop:'Pre-flop', flop:'Flop', turn:'Turn', river:'River' }[phase]
  const topPlayers = pantalla === 'juego' && onlineGame
    ? players.filter(p => p.id !== human?.id)
    : players.slice(1)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  const CW = isMobile ? 38 : 58, CH = isMobile ? 54 : 82
  const isOnlineTable = pantalla === 'juego' && !!onlineGame
  const topSeatPlayers = isMobile ? topPlayers : (isOnlineTable ? topPlayers.slice(0, 3) : topPlayers)
  const sideSeatPlayers = isMobile ? [] : (isOnlineTable ? topPlayers.slice(3, 5) : [])
  const isOnlineHost = isOnlineTable && prelobby?.host === socketId

  // Quick raise presets
  const presets = [
    { label: '½ Bote', val: Math.max(minRaise, Math.round(pot/2/5)*5) },
    { label: 'Bote',   val: Math.max(minRaise, pot) },
    { label: '2×',     val: Math.max(minRaise, currentBet * 2) },
    { label: 'All-in', val: maxRaise },
  ]

  if (pantalla === 'lobby') {
    return (
      <PokerLobbyScreen
        connected={conectado}
        error={error}
        initialCode={roomCode}
        onCreate={createRoom}
        onJoin={joinRoom}
        onCpu={enterCpu}
        onBack={() => navigate('/juegos')}
      />
    )
  }

  if (pantalla === 'prelobby') {
    return (
      <PokerPreLobbyScreen
        sala={prelobby}
        socketId={socketId}
        connected={conectado}
        error={error}
        copied={copied}
        onCopy={copyCode}
        onStart={startOnline}
        onLeave={leaveRoom}
        onMaxPlayers={configMaxPlayers}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <Navbar />

      {/* ── Top bar ── */}
      <div className="sticky top-14 z-30 bg-[#07070f]/95 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3">
          {/* Pot */}
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-1.5">
            <div className="flex gap-1">
              {pot > 0 && [100, 50, 25].map(v => pot >= v ? <Chip key={v} value={v} /> : null).filter(Boolean).slice(0,2)}
            </div>
            <span className="text-yellow-300 text-sm font-bold tabular-nums">Pozo: ${pot}</span>
          </div>

          {/* Phase */}
          {phaseLabel && (
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-xl border ${
              phase==='preflop'?'bg-blue-950/50 border-blue-700/30 text-blue-300':
              phase==='flop'   ?'bg-emerald-950/50 border-emerald-700/30 text-emerald-300':
              phase==='turn'   ?'bg-amber-950/50 border-amber-700/30 text-amber-300':
                                'bg-rose-950/50 border-rose-700/30 text-rose-300'
            }`}>{phaseLabel}</span>
          )}

          <div className="ml-auto flex gap-2">
            {(phase==='waiting'||isShowdown) && (!isOnlineTable || isOnlineHost) && (
              <button onClick={startHand}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-xl text-sm font-bold transition hover:shadow-[0_0_20px_rgba(139,92,246,0.5)]">
                {phase==='waiting'?'Nueva mano →':'Siguiente mano →'}
              </button>
            )}
            {isShowdown && isOnlineTable && !isOnlineHost && (
              <span className="text-xs font-semibold text-gray-500">Esperando al líder</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Game area ── */}
      <div className="flex-1 flex flex-col xl:flex-row items-start max-w-6xl mx-auto w-full px-3 py-4 gap-4">

        {/* ── Table + players ── */}
        <div className="flex-1 flex flex-col items-center gap-2 min-w-0">

          {/* Opponents top row */}
          <div className="flex justify-around items-end w-full gap-2 px-2" style={{ maxWidth:780 }}>
            {topSeatPlayers.map(p => (
              <Seat key={p.id} player={p}
                isDealer={p.id===players[tableGame.dealerIdx]?.id}
                isCurrent={inBetting&&p.id===players[currentIdx]?.id}
                isWinner={winIds.has(p.id)}
                reveal={isShowdown}
                compact
              />
            ))}
          </div>

          {/* ── Oval table ── */}
          <div style={{ width:'100%', display:'grid', gridTemplateColumns:(isOnlineTable&&!isMobile)?'112px minmax(0, 1fr) 112px':'minmax(0, 1fr)', alignItems:'center', gap:12 }}>
            {isOnlineTable && !isMobile && (
              <div style={{ minHeight:210, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {sideSeatPlayers[0] && (
                  <Seat player={sideSeatPlayers[0]}
                    isDealer={sideSeatPlayers[0].id===players[tableGame.dealerIdx]?.id}
                    isCurrent={inBetting&&sideSeatPlayers[0].id===players[currentIdx]?.id}
                    isWinner={winIds.has(sideSeatPlayers[0].id)}
                    reveal={isShowdown}
                    compact
                  />
                )}
              </div>
            )}

            <div style={{ position:'relative', width:'100%' }}>
              <div style={{
                borderRadius:'50%',
                aspectRatio:'2.15/1',
                position:'relative',
                background:'radial-gradient(ellipse at 35% 35%, #1c0840 0%, #100528 45%, #06021a 100%)',
                boxShadow:'0 0 0 10px #1a0636, 0 0 0 14px rgba(168,85,247,0.3), 0 0 0 18px #0d0220, 0 20px 80px rgba(0,0,0,0.9)',
                overflow:'hidden',
              }}>
                {/* Felt texture */}
                <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(168,85,247,0.04) 1px, transparent 1px)', backgroundSize:'20px 20px', pointerEvents:'none' }} />
                <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)', pointerEvents:'none' }} />

                {/* Inner rail */}
                <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:'1px solid rgba(168,85,247,0.12)', pointerEvents:'none' }} />

                {/* Community area */}
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>

                {/* Bet stacks from each player on the table */}
                {inBetting && (
                  <div style={{ display:'flex', gap:16, alignItems:'flex-end' }}>
                    {players.map(p => p.roundBet > 0 ? (
                      <div key={p.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                        <BetStack amount={p.roundBet} />
                        <span style={{ fontSize:8, color:'rgba(255,255,255,0.4)', fontWeight:600 }}>{p.name.split(' ')[0]}</span>
                      </div>
                    ) : null)}
                  </div>
                )}

                {/* Community cards */}
                {(inBetting || isShowdown) ? (
                  <div style={{ display:'flex', gap:6 }}>
                    {[0,1,2,3,4].map(i =>
                      community[i]
                        ? <CardFace key={i} suit={community[i].suit} value={community[i].value} w={CW} h={CH} />
                        : <CardSlot key={i} w={CW} h={CH} />
                    )}
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                    <div style={{ display:'flex', gap:10, opacity:.12 }}>
                      {[0,1,2,3].map(s => <SuitIcon key={s} suit={s} size={28} color="#fff" />)}
                    </div>
                    <p style={{ color:'rgba(255,255,255,0.12)', fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>
                      {phase==='waiting' ? 'Texas Hold\'em' : ''}
                    </p>
                  </div>
                )}

                {/* Pot display */}
                {pot > 0 && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(0,0,0,0.5)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:20, padding:'5px 14px' }}>
                    <Chip value={25} />
                    <span style={{ fontSize:13, fontWeight:700, color:'#fbbf24', fontVariantNumeric:'tabular-nums' }}>${pot}</span>
                  </div>
                )}

                {/* Showdown hand names */}
                {isShowdown && showdown?.withHands?.length > 0 && (
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center' }}>
                    {showdown.withHands.map(p => (
                      <span key={p.id} style={{
                        fontSize:10, fontWeight:600, padding:'3px 10px', borderRadius:20,
                        background: winIds.has(p.id) ? 'rgba(120,53,15,0.8)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${winIds.has(p.id)?'rgba(245,158,11,0.5)':'rgba(255,255,255,0.1)'}`,
                        color: winIds.has(p.id) ? '#fbbf24' : 'rgba(255,255,255,0.5)',
                      }}>
                        {winIds.has(p.id) && 'Ganador: '}{p.name}: {p.eval?.name}
                      </span>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </div>

            {isOnlineTable && !isMobile && (
              <div style={{ minHeight:210, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {sideSeatPlayers[1] && (
                  <Seat player={sideSeatPlayers[1]}
                    isDealer={sideSeatPlayers[1].id===players[tableGame.dealerIdx]?.id}
                    isCurrent={inBetting&&sideSeatPlayers[1].id===players[currentIdx]?.id}
                    isWinner={winIds.has(sideSeatPlayers[1].id)}
                    reveal={isShowdown}
                    compact
                  />
                )}
              </div>
            )}
          </div>

          {/* Human player */}
          <div className="flex flex-col items-center gap-4 mt-1">
            <Seat player={human}
              isDealer={human.id===players[tableGame.dealerIdx]?.id}
              isCurrent={myTurn}
              isWinner={winIds.has(human.id)}
              reveal
            />

            {/* ── Betting panel ── */}
            {myTurn && (
              <div style={{
                background:'rgba(15,5,35,0.95)', border:'1px solid rgba(168,85,247,0.25)',
                borderRadius:20, padding:'16px 20px',
                boxShadow:'0 -4px 40px rgba(88,28,135,0.2), 0 8px 40px rgba(0,0,0,0.6)',
                width:'100%', maxWidth:420,
              }}>
                {/* Context info */}
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12, fontSize:11, color:'rgba(255,255,255,0.4)' }}>
                  <span>Stack: <strong style={{ color:'#c084fc' }}>${human.chips}</strong></span>
                  {toCall > 0 && <span>Para pagar: <strong style={{ color:'#fbbf24' }}>${toCall}</strong></span>}
                  <span>Pozo: <strong style={{ color:'#fbbf24' }}>${pot}</strong></span>
                </div>

                {/* Raise presets */}
                <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                  {presets.map(p => (
                    <button key={p.label}
                      onClick={() => setRaiseAmt(Math.min(p.val, maxRaise))}
                      disabled={p.val > maxRaise}
                      style={{
                        flex:1, padding:'5px 0', borderRadius:10, fontSize:10, fontWeight:700,
                        background: raiseAmt===Math.min(p.val,maxRaise) ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${raiseAmt===Math.min(p.val,maxRaise) ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.1)'}`,
                        color: raiseAmt===Math.min(p.val,maxRaise) ? '#c084fc' : 'rgba(255,255,255,0.5)',
                        cursor: p.val > maxRaise ? 'not-allowed' : 'pointer',
                        opacity: p.val > maxRaise ? 0.3 : 1,
                        transition:'all .15s',
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Slider */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,0.3)', marginBottom:5 }}>
                    <span>${minRaise}</span>
                    <span style={{ color:'#c084fc', fontWeight:700 }}>${raiseAmt}</span>
                    <span>${maxRaise}</span>
                  </div>
                  <input type="range" min={minRaise} max={maxRaise} step={5}
                    value={Math.min(raiseAmt, maxRaise)}
                    onChange={e => setRaiseAmt(+e.target.value)}
                    style={{ width:'100%', accentColor:'#a855f7', cursor:'pointer' }}
                  />
                </div>

                {/* Action buttons */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr 1.4fr', gap:8 }}>
                  <button onClick={() => act('fold')}
                    style={{ padding:'12px 0', borderRadius:12, background:'rgba(159,18,57,0.4)', border:'1px solid rgba(244,63,94,0.4)', color:'#fca5a5', fontWeight:700, fontSize:13, cursor:'pointer', transition:'all .15s' }}
                    onMouseEnter={e=>e.target.style.background='rgba(159,18,57,0.7)'}
                    onMouseLeave={e=>e.target.style.background='rgba(159,18,57,0.4)'}>
                    Fold
                  </button>
                  <button onClick={() => act(canCheck?'check':'call')}
                    style={{ padding:'12px 0', borderRadius:12, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', transition:'all .15s' }}
                    onMouseEnter={e=>e.target.style.background='rgba(255,255,255,0.12)'}
                    onMouseLeave={e=>e.target.style.background='rgba(255,255,255,0.07)'}>
                    {canCheck ? 'Check' : `Call $${toCall}`}
                  </button>
                  <button onClick={() => act('raise', raiseAmt - currentBet)}
                    disabled={human.chips===0}
                    style={{ padding:'12px 0', borderRadius:12, background:'rgba(88,28,135,0.7)', border:'1px solid rgba(168,85,247,0.5)', color:'#e9d5ff', fontWeight:700, fontSize:13, cursor:human.chips===0?'not-allowed':'pointer', opacity:human.chips===0?0.3:1, boxShadow:'0 0 20px rgba(88,28,135,0.4)', transition:'all .15s' }}
                    onMouseEnter={e=>{if(human.chips>0)e.target.style.background='rgba(109,40,217,0.8)'}}
                    onMouseLeave={e=>e.target.style.background='rgba(88,28,135,0.7)'}>
                    {raiseAmt>=maxRaise?`All-in $${human.chips}`:`Subir $${raiseAmt}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Log panel ── */}
        <div style={{ width:180, flexShrink:0 }} className="hidden lg:flex flex-col gap-2">
          <p style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:2 }}>Historial</p>
          <div style={{
            background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)',
            borderRadius:16, padding:12, display:'flex', flexDirection:'column', gap:4,
            maxHeight:480, overflowY:'auto',
          }}>
            {log.map((msg,i) => (
              <p key={i} style={{ fontSize:11, lineHeight:1.4, color: i===0?'#fff':'rgba(255,255,255,0.3)', fontWeight:i===0?600:400 }}>{msg}</p>
            ))}
          </div>
        </div>
      </div>

      {/* ── Game over ── */}
      {phase==='gameover' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div style={{ background:'#0d0520', border:'1px solid rgba(168,85,247,0.2)', borderRadius:24, padding:40, maxWidth:360, width:'100%', textAlign:'center', boxShadow:'0 0 80px rgba(88,28,135,0.3)', display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
            <div style={{ width:64, height:64, borderRadius:'50%', border:'2px solid rgba(245,158,11,0.5)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fbbf24', fontSize:24, fontWeight:900 }}>
              {human.chips>0 ? '1' : '0'}
            </div>
            <div>
              <h2 style={{ fontSize:28, fontWeight:900, background:human.chips>0?'linear-gradient(135deg,#fde68a,#f59e0b)':'#fff', WebkitBackgroundClip:'text', WebkitTextFillColor:human.chips>0?'transparent':'#fff', marginBottom:6 }}>
                {human.chips>0?'¡Ganaste!':'Sin fichas'}
              </h2>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>{human.chips>0?`Terminaste con $${human.chips.toLocaleString()}`:'Te quedaste sin fichas'}</p>
            </div>
            <button onClick={newGame}
              style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)', border:'1px solid rgba(168,85,247,0.4)', color:'#fff', padding:'14px 32px', borderRadius:14, fontWeight:700, fontSize:14, cursor:'pointer', boxShadow:'0 0 30px rgba(88,28,135,0.5)', width:'100%' }}>
              Nueva partida →
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
