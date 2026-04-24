import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { io } from 'socket.io-client'
import Home from './pages/Home'
import Games from './pages/Games'
import Capitales from './pages/Capitales'
import Banderas from './pages/Banderas'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Truco from './pages/Truco/index.jsx'
import TrucoOnline from './pages/Truco/TrucoOnline.jsx'

const socket = io('http://localhost:3001')

function App() {
  useEffect(() => {
    socket.on('connect', () => console.log('Conectado:', socket.id))
    socket.on('disconnect', () => console.log('Desconectado'))
    return () => {
      socket.off('connect')
      socket.off('disconnect')
    }
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/juegos" element={<Games />} />
      <Route path="/juegos/capitales" element={<Capitales />} />
      <Route path="/juegos/banderas" element={<Banderas />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/juegos/truco" element={<Truco />} />
      <Route path='/juegos/truco-online' element={<TrucoOnline socket={socket} />} />
    </Routes>
  )
}

export default App