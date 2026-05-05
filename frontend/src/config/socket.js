export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.PROD ? 'https://playroom-backend.onrender.com' : 'http://localhost:3001')

