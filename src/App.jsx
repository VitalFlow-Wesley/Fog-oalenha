import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Mesas from './pages/Mesas.jsx'
import Relatorios from './pages/Relatorios.jsx'
import Usuarios from './pages/Usuarios.jsx'
import PedidosCozinha from './pages/PedidosCozinha.jsx'
import Fechamento from './pages/Fechamento.jsx'
import { initialTables } from './data/mockData.js'
import { initialUsers } from './data/users.js'

const SESSION_KEY = 'fogao-a-lenha-session'
const USERS_KEY = 'fogao-users-v1'
const TABLES_KEY = 'fogao-tables-v1'
const SETTINGS_KEY = 'fogao-settings-v1'
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000

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

function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed || fallback
  } catch {
    return fallback
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Mantém o app funcionando mesmo se o navegador bloquear armazenamento.
  }
}

function getSavedSession(users) {
  try {
    const rawSession = localStorage.getItem(SESSION_KEY)
    if (!rawSession) return null

    const session = JSON.parse(rawSession)
    if (!session?.userId || !session?.expiresAt) return null

    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }

    const user = users.find(item => item.id === session.userId && item.active)
    if (!user) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }

    return user
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }))
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export default function App() {
  const [page, setPage] = useState('mesas')
  const [tables, setTables] = useState(() => readStored(TABLES_KEY, initialTables))
  const [users, setUsers] = useState(() => readStored(USERS_KEY, initialUsers))
  const [settings, setSettings] = useState(() => ({ ...initialSettings, ...readStored(SETTINGS_KEY, initialSettings) }))
  const [currentUser, setCurrentUser] = useState(() => getSavedSession(readStored(USERS_KEY, initialUsers)))

  useEffect(() => writeStored(TABLES_KEY, tables), [tables])
  useEffect(() => writeStored(USERS_KEY, users), [users])
  useEffect(() => writeStored(SETTINGS_KEY, settings), [settings])

  useEffect(() => {
    if (!currentUser) return
    const interval = setInterval(() => {
      const savedUser = getSavedSession(users)
      if (!savedUser) {
        setCurrentUser(null)
        setPage('mesas')
      }
    }, 60 * 1000)

    return () => clearInterval(interval)
  }, [currentUser, users])

  function handleLogin(user) {
    saveSession(user)
    setCurrentUser(user)
    setPage('mesas')
  }

  function handleLogout() {
    clearSession()
    setCurrentUser(null)
    setPage('mesas')
  }

  if (!currentUser) return <Login users={users} onLogin={handleLogin} />

  return (
    <div className="appShell">
      <Sidebar page={page} setPage={setPage} currentUser={currentUser} onLogout={handleLogout} />
      <main className="content">
        {page === 'dashboard' && <Dashboard tables={tables} setPage={setPage} />}
        {page === 'mesas' && <Mesas tables={tables} setTables={setTables} users={users} currentUser={currentUser} settings={settings} />}
        {page === 'pedidos-cozinha' && <PedidosCozinha tables={tables} />}
        {page === 'relatorios' && <Relatorios tables={tables} />}
        {page === 'fechamento' && <Fechamento tables={tables} currentUser={currentUser} />}
        {page === 'usuarios' && <Usuarios users={users} setUsers={setUsers} tables={tables} setTables={setTables} currentUser={currentUser} settings={settings} setSettings={setSettings} />}
      </main>
    </div>
  )
}
