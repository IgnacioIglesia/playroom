import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NavigationGuardProvider } from './context/NavigationGuardContext'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import { SOCKET_URL } from './config/socket'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  enabled: import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN,
})

// Keepalive: evita que el servidor duerma en Render free tier (15 min timeout)
setInterval(() => fetch(`${SOCKET_URL}/`).catch(() => {}), 14 * 60 * 1000)

// Prefetch rutas frecuentes cuando el navegador esté idle
const prefetch = () => {
  import('./pages/Truco/TrucoOnlineSelector.jsx')
  import('./pages/Truco/TrucoOnline.jsx')
  import('./pages/Games.jsx')
  import('./pages/Ranking.jsx')
  import('./pages/Perfil.jsx')
}
if (typeof requestIdleCallback !== 'undefined') requestIdleCallback(prefetch)
else setTimeout(prefetch, 2000)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NavigationGuardProvider>
          <App />
        </NavigationGuardProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)