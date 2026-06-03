import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Mesas from './pages/Mesas.jsx'
import Relatorios from './pages/Relatorios.jsx'
import { initialTables } from './data/mockData.js'

export default function App() {
  const [logged, setLogged] = useState(false)
  const [page, setPage] = useState('home')
  const [tables, setTables] = useState(initialTables)

  if (!logged) return <Login onLogin={() => setLogged(true)} />

  return (
    <div className="appShell">
      <Sidebar page={page} setPage={setPage} onLogout={() => setLogged(false)} />
      <main className="content">
        {page === 'home' && <Home setPage={setPage} />}
        {page === 'dashboard' && <Dashboard tables={tables} />}
        {page === 'mesas' && <Mesas tables={tables} setTables={setTables} />}
        {page === 'relatorios' && <Relatorios tables={tables} />}
      </main>
    </div>
  )
}
