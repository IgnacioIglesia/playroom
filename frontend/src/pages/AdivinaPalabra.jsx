import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { SOLUCIONES, VALIDAS_EXTRA } from '../data/palabras_es'

const ROWS = 6
const COLS = 5
const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Ñ/g, 'N').replace(/[^A-Z]/g, '').slice(0, COLS)
}

const WORDS = SOLUCIONES.filter(w => normalize(w).length === COLS).map(normalize)
const VALID_WORDS = new Set([...WORDS, ...VALIDAS_EXTRA.map(normalize)])
const WORD_VALIDATION_CACHE = new Map()

function todayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function yesterdayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return todayKey(d)
}

function dailyWord() {
  const start = new Date(2026, 0, 1)
  const now = new Date()
  const days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - start) / 86400000)
  return WORDS[((days % WORDS.length) + WORDS.length) % WORDS.length]
}

function todayStorageKey() {
  return `adivina-palabra:${todayKey()}`
}

async function wordExists(word) {
  if (VALID_WORDS.has(word)) return true
  if (WORD_VALIDATION_CACHE.has(word)) return WORD_VALIDATION_CACHE.get(word)

  try {
    const res = await fetch(`https://api.datamuse.com/words?sp=${word.toLowerCase()}&v=es&max=8`)
    const data = await res.json()
    const exists = Array.isArray(data) && data.some(item => normalize(item.word?.toUpperCase() || '') === word)
    WORD_VALIDATION_CACHE.set(word, exists)
    return exists
  } catch {
    WORD_VALIDATION_CACHE.set(word, false)
    return false
  }
}

function scoreGuess(guess, answer) {
  const result = Array(COLS).fill('absent')
  const remaining = {}
  for (let i = 0; i < COLS; i++) {
    if (guess[i] === answer[i]) result[i] = 'correct'
    else remaining[answer[i]] = (remaining[answer[i]] || 0) + 1
  }
  for (let i = 0; i < COLS; i++) {
    if (result[i] === 'correct') continue
    if (remaining[guess[i]] > 0) {
      result[i] = 'present'
      remaining[guess[i]]--
    }
  }
  return result
}

function nextKeyState(prev, guess, result) {
  const rank = { absent: 1, present: 2, correct: 3 }
  const next = { ...prev }
  guess.split('').forEach((letter, i) => {
    if ((rank[result[i]] || 0) > (rank[next[letter]] || 0)) next[letter] = result[i]
  })
  return next
}

function Cell({ letter, state }) {
  const styles = {
    empty: 'border-white/[0.10] bg-white/[0.025] text-white',
    filled: 'border-purple-500/40 bg-purple-950/20 text-white',
    correct: 'border-green-500/60 bg-green-600 text-white',
    present: 'border-yellow-500/60 bg-yellow-600 text-white',
    absent: 'border-white/[0.08] bg-slate-700 text-slate-200',
  }
  return (
    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg border flex items-center justify-center text-2xl sm:text-[26px] font-black transition ${styles[state || 'empty']}`}>
      {letter}
    </div>
  )
}

export default function AdivinaPalabra() {
  const { usuario } = useAuth()
  const answer = useMemo(() => dailyWord(), [])
  const [guesses, setGuesses] = useState([])
  const [current, setCurrent] = useState('')
  const [message, setMessage] = useState('')
  const [keyStates, setKeyStates] = useState({})
  const [saved, setSaved] = useState(false)
  const [validating, setValidating] = useState(false)
  const [alreadyPlayed, setAlreadyPlayed] = useState(false)
  const won = guesses.includes(answer)
  const finished = alreadyPlayed || won || guesses.length >= ROWS

  useEffect(() => {
    const local = localStorage.getItem(todayStorageKey())
    if (local === 'won') {
      setAlreadyPlayed(true)
      setSaved(true)
    }
  }, [])

  useEffect(() => {
    if (!usuario) return
    const loadDailyStatus = async () => {
      const snap = await getDoc(doc(db, 'ranking_palabras', usuario.uid)).catch(() => null)
      if (snap?.exists() && snap.data()?.lastSolvedDate === todayKey()) {
        localStorage.setItem(todayStorageKey(), 'won')
        setAlreadyPlayed(true)
        setSaved(true)
      }
    }
    loadDailyStatus()
  }, [usuario])

  const saveWin = async () => {
    if (!usuario || saved) return
    const ref = doc(db, 'ranking_palabras', usuario.uid)
    const snap = await getDoc(ref).catch(() => null)
    const previous = snap?.exists() ? snap.data() : null
    const today = todayKey()
    if (previous?.lastSolvedDate === today) {
      localStorage.setItem(todayStorageKey(), 'won')
      setAlreadyPlayed(true)
      setSaved(true)
      return
    }
    const racha = previous?.lastSolvedDate === yesterdayKey() ? (previous.racha || 0) + 1 : 1
    await setDoc(ref, {
      uid: usuario.uid,
      nombre: usuario.displayName || usuario.email?.split('@')[0] || 'Jugador',
      racha,
      mejorRacha: Math.max(racha, previous?.mejorRacha || 0),
      totalAciertos: (previous?.totalAciertos || 0) + 1,
      lastSolvedDate: today,
      updatedAt: serverTimestamp(),
    }, { merge: true })
    localStorage.setItem(todayStorageKey(), 'won')
    setAlreadyPlayed(true)
    setSaved(true)
  }

  useEffect(() => {
    if (won) saveWin()
  }, [won])

  const submit = async () => {
    if (finished || validating) return
    if (current.length !== COLS) {
      setMessage('La palabra tiene 5 letras.')
      return
    }
    setValidating(true)
    setMessage('Validando palabra...')
    const exists = await wordExists(current)
    setValidating(false)
    if (!exists) {
      setMessage('La palabra no existe.')
      return
    }
    const result = scoreGuess(current, answer)
    setGuesses(prev => [...prev, current])
    setKeyStates(prev => nextKeyState(prev, current, result))
    setCurrent('')
    if (current === answer) {
      localStorage.setItem(todayStorageKey(), 'won')
      setAlreadyPlayed(true)
      setMessage(usuario ? 'Correcto. Racha actualizada.' : 'Correcto. Volvé mañana por otra palabra.')
    } else {
      setMessage('')
    }
  }

  const press = (key) => {
    if (finished || validating) return
    if (key === 'ENTER') { submit(); return }
    if (key === 'BACK') { setCurrent(v => v.slice(0, -1)); return }
    if (/^[A-Z]$/.test(key)) setCurrent(v => normalize(v + key))
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') press('ENTER')
      else if (e.key === 'Backspace') press('BACK')
      else press(normalize(e.key.toUpperCase()))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, finished, validating])

  const rows = Array.from({ length: ROWS }, (_, row) => {
    const guess = guesses[row]
    const letters = guess || (row === guesses.length ? current : '')
    const result = guess ? scoreGuess(guess, answer) : []
    return Array.from({ length: COLS }, (_, col) => ({
      letter: letters[col] || '',
      state: guess ? result[col] : letters[col] ? 'filled' : 'empty',
    }))
  })

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <Navbar />
      <main className="relative flex-1 px-4 py-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(109,40,217,0.18),transparent)]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.05) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="relative z-10 mx-auto w-full max-w-md flex flex-col items-center gap-5">
          <div className="text-center">
            <div className="inline-grid grid-cols-3 gap-1 rounded-2xl border border-purple-500/30 bg-purple-600/10 p-3 mb-4">
              {'WORDLE'.slice(0, 6).split('').map((l, i) => (
                <span key={i} className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center text-xs font-black text-purple-200">{l}</span>
              ))}
            </div>
            <h1 className="text-3xl font-extrabold">Adivina la Palabra</h1>
            <p className="text-gray-500 mt-2 text-sm">Una palabra diaria. 6 intentos. Racha si acertás.</p>
          </div>

          <div className="grid grid-rows-6 gap-2">
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-5 gap-2">
                {row.map((cell, j) => <Cell key={j} letter={cell.letter} state={cell.state} />)}
              </div>
            ))}
          </div>

          <div className="min-h-6 text-sm font-semibold text-purple-300">{message}</div>

          {finished && (
            <div className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-center">
              <p className="font-extrabold text-white">
                {alreadyPlayed || won ? 'Ya completaste la palabra de hoy' : `La palabra era ${answer}`}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {alreadyPlayed || won
                  ? 'Volvé mañana para sumar otro día a tu racha.'
                  : usuario ? 'Tu racha aparece en el ranking de palabras.' : 'Iniciá sesión para guardar tu racha.'}
              </p>
            </div>
          )}

          <div className="w-full flex flex-col gap-2">
            {KEYS.map((row, i) => (
              <div key={row} className="flex justify-center gap-1.5">
                {i === 2 && (
                  <button disabled={validating} onClick={() => press('ENTER')} className="px-3 rounded-lg bg-purple-600 text-white text-[10px] font-black disabled:opacity-50">
                    ENTER
                  </button>
                )}
                {row.split('').map(k => (
                  <button
                    key={k}
                    onClick={() => press(k)}
                    disabled={validating}
                    className={`h-10 flex-1 max-w-9 rounded-md text-sm font-black transition disabled:opacity-50 ${
                      keyStates[k] === 'correct' ? 'bg-green-600 text-white'
                      : keyStates[k] === 'present' ? 'bg-yellow-600 text-white'
                      : keyStates[k] === 'absent' ? 'bg-slate-700 text-slate-300'
                      : 'bg-white/[0.08] text-gray-200 hover:bg-white/[0.12]'
                    }`}
                  >
                    {k}
                  </button>
                ))}
                {i === 2 && (
                  <button disabled={validating} onClick={() => press('BACK')} className="px-3 rounded-lg bg-white/[0.08] text-white text-[10px] font-black disabled:opacity-50">
                    BORRAR
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
