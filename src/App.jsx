import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Mesas from './pages/Mesas.jsx'
import Relatorios from './pages/Relatorios.jsx'
import Usuarios from './pages/Usuarios.jsx'
import PedidosCozinha from './pages/PedidosCozinha.jsx'
import { initialTables } from './data/mockData.js'
import { initialUsers } from './data/users.js'

const initialSettings = {
  establishmentName: 'Fogão a Lenha',
  printers: [
    { id: 'printer1', label: 'Impressora 1', name: 'Caixa' },
    { id: 'printer2', label: 'Impressora 2', name: 'Cozinha' }
  ],
  kitchenPrinterId: 'printer2',
  cashierPrinterId: 'printer1',
  printKitchenItems: true,
  printBarItems: false,
  cancelPassword: '1234',
  cancelUpdatedBy: 'Sistema'
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [page, setPage] = useState('mesas')
  const [tables, setTables] = useState(initialTables)
  const [users, setUsers] = useState(initialUsers)
  const [settings, setSettings] = useState(initialSettings)

  if (!currentUser) return <Login users={users} onLogin={user => {
    setCurrentUser(user)
    setPage('mesas')
  }} />

  return (
    <div className="appShell">
      <Sidebar page={page} setPage={setPage} currentUser={currentUser} onLogout={() => setCurrentUser(null)} />
      <main className="content">
        {page === 'dashboard' && <Dashboard tables={tables} setPage={setPage} />}
        {page === 'mesas' && <Mesas tables={tables} setTables={setTables} users={users} currentUser={currentUser} settings={settings} />}
        {page === 'pedidos-cozinha' && <PedidosCozinha tables={tables} />}
        {page === 'relatorios' && <Relatorios tables={tables} />}
        {page === 'usuarios' && <Usuarios users={users} setUsers={setUsers} tables={tables} setTables={setTables} currentUser={currentUser} settings={settings} setSettings={setSettings} />}
      </main>
    </div>
  )
}
