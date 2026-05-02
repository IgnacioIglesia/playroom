import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Games from './pages/Games'
import Capitales from './pages/Capitales'
import Banderas from './pages/Banderas'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Perfil from './pages/Perfil'
import Truco from './pages/Truco/index.jsx'
import TrucoOnline from './pages/Truco/TrucoOnline.jsx'
import TrucoOnlineSelector from './pages/Truco/TrucoOnlineSelector.jsx'
import Ranking from './pages/Ranking.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/juegos" element={<Games />} />
      <Route path="/juegos/capitales" element={<Capitales />} />
      <Route path="/juegos/banderas" element={<Banderas />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/perfil" element={<Perfil />} />
      <Route path="/juegos/truco" element={<Truco />} />
      <Route path="/juegos/truco-online" element={<TrucoOnlineSelector />} />
      <Route path="/juegos/truco-online/1vs1" element={<TrucoOnline modalidadFijada="1vs1" />} />
      <Route path="/juegos/truco-online/2vs2" element={<TrucoOnline modalidadFijada="2vs2" />} />
      <Route path="/ranking" element={<Ranking />} />
    </Routes>
  )
}

export default App
