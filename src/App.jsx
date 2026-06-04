import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Mesas from './pages/Mesas.jsx'
import Relatorios from './pages/Relatorios.jsx'
import Usuarios from './pages/Usuarios.jsx'
import { initialTables } from './data/mockData.js'
import { initialUsers } from './data/users.js'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [page, setPage] = useState('home')
  const [tables, setTables] = useState(initialTables)
  const [users, setUsers] = useState(initialUsers)

  if (!currentUser) return <Login users={users} onLogin={user => setCurrentUser(user)} />

  return (
    <div className="appShell">
      <Sidebar
        page={page}
        setPage={setPage}
        currentUser={currentUser}
        onLogout={() => setCurrentUser(null)}
      />
      <main className="content">
        {page === 'home' && <Home setPage={setPage} />}
        {page === 'dashboard' && <Dashboard tables={tables} />}
        {page === 'mesas' && <Mesas tables={tables} setTables={setTables} />}
        {page === 'relatorios' && <Relatorios tables={tables} />}
        {page === 'usuarios' && <Usuarios users={users} setUsers={setUsers} currentUser={currentUser} />}
      </main>
    </div>
  )
}
