import { useEffect, useRef } from 'react'

const ORIGINAL_TITLE = 'PlayRoom — Juegos Virtuales'
const BLINK_TITLE    = '⚡ Tu turno — PlayRoom'
const BLINK_INTERVAL = 1100

export function useTurnNotification(esMiTurno) {
  const blinkRef    = useRef(null)
  const notifRef    = useRef(null)
  const wasMyTurn   = useRef(false)

  // Sends a one-shot notification (only when the turn just flipped to mine while hidden)
  function triggerNotification() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    notifRef.current?.close()
    try {
      notifRef.current = new Notification('Tu turno — PlayRoom', {
        body: 'Es tu turno de jugar en Truco Online.',
        icon: '/favicon.svg',
        tag: 'playroom-turno',
        silent: false,
      })
      notifRef.current.onclick = () => { window.focus(); notifRef.current?.close() }
    } catch { /* some browsers block programmatic Notifications */ }
  }

  function startBlinking() {
    if (blinkRef.current) return
    document.title = BLINK_TITLE
    let state = true
    blinkRef.current = setInterval(() => {
      document.title = state ? ORIGINAL_TITLE : BLINK_TITLE
      state = !state
    }, BLINK_INTERVAL)
  }

  function stopBlinking() {
    if (!blinkRef.current) return
    clearInterval(blinkRef.current)
    blinkRef.current = null
    document.title = ORIGINAL_TITLE
  }

  // React to turn state changes
  useEffect(() => {
    const justBecameMyTurn = esMiTurno && !wasMyTurn.current
    wasMyTurn.current = esMiTurno

    if (!esMiTurno) {
      stopBlinking()
      notifRef.current?.close()
      return
    }

    // It's my turn — only act if tab is not visible
    if (document.hidden) {
      if (justBecameMyTurn) triggerNotification()
      startBlinking()
    }
  }, [esMiTurno])

  // React to tab visibility changing while it's already my turn
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        if (wasMyTurn.current) startBlinking()
      } else {
        stopBlinking()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stopBlinking()
    }
  }, [])
}

// Call once (e.g., when the game lobby opens) to request permission.
// Returns a promise resolving to the final permission state.
export async function requestTurnNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}
