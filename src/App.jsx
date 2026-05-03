import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Ventes from './pages/Ventes'
import Stocks from './pages/Stocks'
import Depenses from './pages/Depenses'
import Historique from './pages/Historique'
import Investissements from './pages/Investissements'
import Marges from './pages/Marges'

const PAGES = {
  dashboard:  Dashboard,
  ventes:     Ventes,
  stocks:     Stocks,
  depenses:   Depenses,
  historique: Historique,
  investissements: Investissements,
  marges: Marges,
}

export default function App() {
  const [page, setPage]       = useState('dashboard')
  const [sideOpen, setSideOpen] = useState(false)

  const PageComponent = PAGES[page] || Dashboard

  return (
    <div className="shell">
      <button className="ham" onClick={() => setSideOpen(o => !o)}>☰</button>

      <Sidebar
        page={page}
        setPage={setPage}
        open={sideOpen}
        onClose={() => setSideOpen(false)}
      />

      <main className="main">
        <PageComponent setPage={setPage} />
      </main>
    </div>
  )
}
