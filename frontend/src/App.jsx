import { Routes, Route, useParams } from 'react-router-dom'
import Home from './pages/Home'
import Games from './pages/Games'
import Capitales from './pages/Capitales'
import Banderas from './pages/Banderas'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Perfil from './pages/Perfil'
import PerfilPublico from './pages/PerfilPublico'
import Truco from './pages/Truco/index.jsx'
import TrucoOnline from './pages/Truco/TrucoOnline.jsx'
import TrucoOnlineSelector from './pages/Truco/TrucoOnlineSelector.jsx'
import Ranking from './pages/Ranking.jsx'
import Buscaminas from './pages/Buscaminas.jsx'
import Sudoku from './pages/Sudoku.jsx'
import NotFound from './pages/NotFound.jsx'
import Solitario from './pages/Solitario.jsx'

function TrucoOnlineJoin() {
  const { codigo } = useParams()
  return <TrucoOnline codigoAuto={codigo} />
}

function App() {
  return (
    <Routes>
      <Route path="/"                         element={<Home />} />
      <Route path="/juegos"                   element={<Games />} />
      <Route path="/juegos/capitales"         element={<Capitales />} />
      <Route path="/juegos/banderas"          element={<Banderas />} />
      <Route path="/login"                    element={<Login />} />
      <Route path="/registro"                 element={<Registro />} />
      <Route path="/perfil"                   element={<Perfil />} />
      <Route path="/perfil/:uid"              element={<PerfilPublico />} />
      <Route path="/juegos/truco"             element={<Truco />} />
      <Route path="/juegos/truco-online"      element={<TrucoOnlineSelector />} />
      <Route path="/juegos/truco-online/1vs1" element={<TrucoOnline modalidadFijada="1vs1" />} />
      <Route path="/juegos/truco-online/2vs2" element={<TrucoOnline modalidadFijada="2vs2" />} />
      <Route path="/ranking"                  element={<Ranking />} />
      <Route path="/juegos/sudoku"            element={<Sudoku />} />
      <Route path="/juegos/buscaminas"        element={<Buscaminas />} />
      <Route path="/juegos/solitario"         element={<Solitario />} />
      <Route path="/unirse/:codigo"           element={<TrucoOnlineJoin />} />
      <Route path="*"                         element={<NotFound />} />
    </Routes>
  )
}

export default App
