import { lazy, Suspense } from 'react'
import { Routes, Route, useParams } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'

const Home               = lazy(() => import('./pages/Home'))
const Games              = lazy(() => import('./pages/Games'))
const Login              = lazy(() => import('./pages/Login'))
const Registro           = lazy(() => import('./pages/Registro'))
const Perfil             = lazy(() => import('./pages/Perfil'))
const PerfilPublico      = lazy(() => import('./pages/PerfilPublico'))
const Ranking            = lazy(() => import('./pages/Ranking'))
const NotFound           = lazy(() => import('./pages/NotFound'))
const Truco              = lazy(() => import('./pages/Truco/index.jsx'))
const TrucoOnline        = lazy(() => import('./pages/Truco/TrucoOnline.jsx'))
const TrucoOnlineSelector = lazy(() => import('./pages/Truco/TrucoOnlineSelector.jsx'))
const Sudoku             = lazy(() => import('./pages/Sudoku'))
const Buscaminas         = lazy(() => import('./pages/Buscaminas'))
const Solitario          = lazy(() => import('./pages/Solitario'))
const Poker              = lazy(() => import('./pages/Poker'))
const Uno                = lazy(() => import('./pages/Uno'))
const Pictionary         = lazy(() => import('./pages/Pictionary'))
const AdivinaPalabra     = lazy(() => import('./pages/AdivinaPalabra'))
const Capitales          = lazy(() => import('./pages/Capitales'))
const Banderas           = lazy(() => import('./pages/Banderas'))

function TrucoOnlineJoin() {
  const { codigo } = useParams()
  return <TrucoOnline codigoAuto={codigo} />
}

const PageLoader = () => (
  <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
    <div className="w-7 h-7 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/juegos/poker"             element={<Poker />} />
          <Route path="/juegos/palabras"          element={<AdivinaPalabra />} />
          <Route path="/juegos/pictionary"        element={<Pictionary />} />
          <Route path="/juegos/uno"               element={<Uno />} />
          <Route path="/unirse/:codigo"           element={<TrucoOnlineJoin />} />
          <Route path="*"                         element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
