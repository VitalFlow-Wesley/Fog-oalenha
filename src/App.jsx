import { useEffect, useRef, useState } from 'react'
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
import { loadRemoteState, saveRemoteState } from './services/appStateApi.js'

const SESSION_KEY = 'fogao-a-lenha-session'
const USERS_KEY = 'fogao-users-v1'
const TABLES_KEY = 'fogao-tables-v1'
const SETTINGS_KEY = 'fogao-settings-v1'
const PRODUCTS_KEY = 'fogao-products-v1'
const SALES_KEY = 'fogao-sales-history-v1'
const CLOSINGS_KEY = 'fogao-closings-v1'
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
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Mantem o app funcionando mesmo se o navegador bloquear armazenamento.
  }
}

function dateKey(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function tableTotal(table) {
  return (table.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0)
}

function hasTableMovement(table) {
  return table.status !== 'livre' || tableTotal(table) > 0 || Number(table.guests || 0) > 0 || Boolean(table.items?.length)
}

function getTableWaiter(table) {
  return table.waiterName || table.kitchenWaiterName || table.openedByName || table.createdByName || 'Sem garçom'
}

function buildSalesRecord(table, type, closingDate) {
  const now = new Date()
  return {
    id: `${type}-${table.id || table.number}-${now.getTime()}`,
    date: dateKey(closingDate || now),
    closedAt: now.toISOString(),
    closedAtLabel: now.toLocaleString('pt-BR'),
    type,
    tableId: table.id,
    tableNumber: table.number,
    guests: Number(table.guests || 0),
    waiterName: getTableWaiter(table),
    total: tableTotal(table),
    items: (table.items || []).map(item => ({
      id: item.id,
      name: item.name || 'Produto',
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      category: item.category || 'Outros',
      sector: item.sector || item.localSaida || '',
      localSaida: item.localSaida || item.sector || '',
      imprimeCozinha: Boolean(item.imprimeCozinha),
      observation: item.observation || '',
    })),
  }
}

function resetTableForNewCash(table) {
  return {
    ...table,
    status: 'livre',
    guests: 0,
    openedAt: null,
    closedAt: null,
    items: [],
    kitchenSent: false,
    kitchenSentAt: null,
    kitchenWaiterName: null,
    billRequested: false,
    lastKitchenPrinter: null,
    lastCashierPrinter: null,
    mergedTableIds: [],
    mergedTableNumbers: [],
    mergedTo: undefined,
    mergedToNumber: undefined,
    previousMergeState: undefined,
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
  const remoteLoadedRef = useRef(false)
  const saveTimerRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function hydrateFromMongo() {
      try {
        const remote = await loadRemoteState()
        if (cancelled) return

        const localUsers = readStored(USERS_KEY, initialUsers)
        const localTables = readStored(TABLES_KEY, null)
        const localSettings = { ...initialSettings, ...readStored(SETTINGS_KEY, initialSettings) }
        const localProducts = readStored(PRODUCTS_KEY, [])
        const localSalesHistory = readStored(SALES_KEY, [])
        const localClosings = readStored(CLOSINGS_KEY, [])
        const missingRemoteState = {}

        if (Array.isArray(remote.users)) {
          setUsers(remote.users.length ? remote.users : localUsers)
          writeStored(USERS_KEY, remote.users.length ? remote.users : localUsers)
          if (!remote.users.length && Array.isArray(localUsers) && localUsers.length) missingRemoteState.users = localUsers
        } else if (Array.isArray(localUsers) && localUsers.length) {
          missingRemoteState.users = localUsers
        }

        if (Array.isArray(remote.tables)) {
          setTables(remote.tables)
          writeStored(TABLES_KEY, remote.tables)
        } else if (Array.isArray(localTables)) {
          setTables(localTables)
          missingRemoteState.tables = localTables
        }

        if (remote.settings && Object.keys(remote.settings).length) {
          const nextSettings = { ...initialSettings, ...remote.settings }
          setSettings(nextSettings)
          writeStored(SETTINGS_KEY, nextSettings)
        } else {
          missingRemoteState.settings = localSettings
        }

        if (Array.isArray(remote.products)) {
          const products = remote.products.length ? remote.products : localProducts
          writeStored(PRODUCTS_KEY, products)
          writeStored('fogao-a-lenha-products-settings', products)
          window.dispatchEvent(new Event('fogao-products-updated'))
          if (!remote.products.length && Array.isArray(localProducts) && localProducts.length) missingRemoteState.products = localProducts
        } else if (Array.isArray(localProducts) && localProducts.length) {
          missingRemoteState.products = localProducts
        }

        if (Array.isArray(remote.salesHistory)) {
          const salesHistory = remote.salesHistory.length ? remote.salesHistory : localSalesHistory
          writeStored(SALES_KEY, salesHistory)
          if (!remote.salesHistory.length && Array.isArray(localSalesHistory) && localSalesHistory.length) missingRemoteState.salesHistory = localSalesHistory
        } else if (Array.isArray(localSalesHistory) && localSalesHistory.length) {
          missingRemoteState.salesHistory = localSalesHistory
        }

        if (Array.isArray(remote.closings)) {
          const closings = remote.closings.length ? remote.closings : localClosings
          writeStored(CLOSINGS_KEY, closings)
          if (!remote.closings.length && Array.isArray(localClosings) && localClosings.length) missingRemoteState.closings = localClosings
        } else if (Array.isArray(localClosings) && localClosings.length) {
          missingRemoteState.closings = localClosings
        }

        if (Object.keys(missingRemoteState).length) {
          await saveRemoteState(missingRemoteState)
        }
      } catch (error) {
        console.warn('MongoDB indisponivel, usando dados locais:', error.message)
      } finally {
        if (!cancelled) remoteLoadedRef.current = true
      }
    }

    hydrateFromMongo()
    return () => { cancelled = true }
  }, [])

  useEffect(() => writeStored(TABLES_KEY, tables), [tables])
  useEffect(() => writeStored(USERS_KEY, users), [users])
  useEffect(() => writeStored(SETTINGS_KEY, settings), [settings])

  useEffect(() => {
    if (!remoteLoadedRef.current) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const products = readStored(PRODUCTS_KEY, [])
      const salesHistory = readStored(SALES_KEY, [])
      const closings = readStored(CLOSINGS_KEY, [])
      saveRemoteState({ users, tables, settings, products, salesHistory, closings }).catch(error => {
        console.warn('Nao foi possivel salvar no MongoDB:', error.message)
      })
    }, 650)

    return () => clearTimeout(saveTimerRef.current)
  }, [users, tables, settings])

  useEffect(() => {
    if (!remoteLoadedRef.current) return
    const syncProducts = () => {
      const products = readStored(PRODUCTS_KEY, [])
      const salesHistory = readStored(SALES_KEY, [])
      const closings = readStored(CLOSINGS_KEY, [])
      saveRemoteState({ users, tables, settings, products, salesHistory, closings }).catch(error => {
        console.warn('Nao foi possivel salvar produtos no MongoDB:', error.message)
      })
    }

    window.addEventListener('fogao-products-updated', syncProducts)
    window.addEventListener('fogao-sales-history-updated', syncProducts)
    window.addEventListener('fogao-closings-updated', syncProducts)
    return () => {
      window.removeEventListener('fogao-products-updated', syncProducts)
      window.removeEventListener('fogao-sales-history-updated', syncProducts)
      window.removeEventListener('fogao-closings-updated', syncProducts)
    }
  }, [users, tables, settings])

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

  async function handleCloseCash({ date, payments, note }) {
    const closingDate = dateKey(date)
    const activeTables = tables.filter(hasTableMovement)
    const salesRecords = activeTables
      .map(table => buildSalesRecord(table, 'caixa_fechado', closingDate))
      .filter(record => record.items.length && record.total > 0)
    const total = activeTables.reduce((sum, table) => sum + tableTotal(table), 0)
    const informedTotal = Object.values(payments || {}).reduce((sum, value) => sum + Number(value || 0), 0)
    const nextTables = tables.map(resetTableForNewCash)
    const nextSalesHistory = [...salesRecords, ...readStored(SALES_KEY, [])].slice(0, 2000)
    const closingRecord = {
      id: `closing-${Date.now()}`,
      date: closingDate,
      closedAt: new Date().toISOString(),
      closedAtLabel: new Date().toLocaleString('pt-BR'),
      operatorName: currentUser?.name || currentUser?.username || 'Operador',
      total,
      informedTotal,
      difference: informedTotal - total,
      payments: payments || {},
      note: note || '',
      tableCount: activeTables.length,
      itemCount: salesRecords.reduce((sum, record) => sum + record.items.reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0), 0),
      tables: activeTables,
    }
    const nextClosings = [closingRecord, ...readStored(CLOSINGS_KEY, [])].slice(0, 120)

    writeStored(SALES_KEY, nextSalesHistory)
    writeStored(CLOSINGS_KEY, nextClosings)
    writeStored(TABLES_KEY, nextTables)
    setTables(nextTables)
    window.dispatchEvent(new Event('fogao-sales-history-updated'))
    window.dispatchEvent(new Event('fogao-closings-updated'))

    await saveRemoteState({
      users,
      tables: nextTables,
      settings,
      products: readStored(PRODUCTS_KEY, []),
      salesHistory: nextSalesHistory,
      closings: nextClosings,
    })

    return closingRecord
  }

  if (!currentUser) return <Login users={users} onLogin={handleLogin} />

  return (
    <div className="appShell">
      <Sidebar page={page} setPage={setPage} currentUser={currentUser} onLogout={handleLogout} />
      <main className="content">
        {page === 'dashboard' && <Dashboard tables={tables} setPage={setPage} />}
        {page === 'mesas' && <Mesas tables={tables} setTables={setTables} users={users} currentUser={currentUser} settings={settings} />}
        {page === 'pedidos-cozinha' && <PedidosCozinha tables={tables} currentUser={currentUser} />}
        {page === 'relatorios' && <Relatorios tables={tables} />}
        {page === 'fechamento' && <Fechamento tables={tables} currentUser={currentUser} onCloseCash={handleCloseCash} />}
        {page === 'usuarios' && <Usuarios users={users} setUsers={setUsers} tables={tables} setTables={setTables} currentUser={currentUser} settings={settings} setSettings={setSettings} />}
      </main>
    </div>
  )
}
