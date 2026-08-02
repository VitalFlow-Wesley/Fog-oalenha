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
import { fetchPendingPrintJobs, updatePrintJobStatus } from './services/printQueueApi.js'
import { ensureQzReady, executeThermalPrint } from './services/qzPrintService.js'
import { repairData, repairText } from './text-normalizer.js'

const SESSION_KEY = 'fogao-a-lenha-session'
const USERS_KEY = 'fogao-users-v1'
const TABLES_KEY = 'fogao-tables-v1'
const SETTINGS_KEY = 'fogao-settings-v1'
const PRODUCTS_KEY = 'fogao-products-v1'
const SALES_KEY = 'fogao-sales-history-v1'
const CLOSINGS_KEY = 'fogao-closings-v1'
const CLOSED_TABLES_KEY = 'fogao-closed-tables-v1'
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000
const REMOTE_POLL_INTERVAL_MS = 4000
const LOCAL_EDIT_GRACE_MS = 2500
const PRINT_QUEUE_POLL_INTERVAL_MS = 2000

const initialSettings = {
  establishmentName: 'Fogão a Lenha',
  printers: [],
  kitchenPrinterId: '',
  cashierPrinterId: '',
  grillPrinterId: '',
  juicePrinterId: '',
  printKitchenItems: true,
  printBarItems: false,
  cancelPassword: '1234',
  cancelUpdatedBy: 'Sistema'
}

function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = repairData(JSON.parse(raw))
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

function waiterOperationalSettings(settings = {}) {
  const allowed = [
    'establishmentName',
    'printers',
    'kitchenPrinterId',
    'cashierPrinterId',
    'grillPrinterId',
    'juicePrinterId',
    'printKitchenItems',
    'printBarItems',
    'printFullReceipt',
    'allowReprint',
    'receiptMessage',
  ]
  return {
    ...Object.fromEntries(allowed.filter(key => key in settings).map(key => [key, settings[key]])),
    cancelPassword: null,
    cancelUpdatedBy: null,
  }
}

function isSameData(current, next) {
  try {
    return JSON.stringify(current) === JSON.stringify(next)
  } catch {
    return false
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

function getPeopleCount(table = {}) {
  return Math.max(1, Number(table.peopleCount ?? table.guests ?? 1) || 1)
}

function hasTableMovement(table) {
  return table.status !== 'livre' || tableTotal(table) > 0 || Number(table.guests || 0) > 0 || Boolean(table.items?.length)
}

function getTableWaiter(table) {
  return repairText(table.waiterName || table.kitchenWaiterName || table.openedByName || table.createdByName || 'Sem garçom')
}

function getConfiguredPrinterName(settings, type) {
  const printers = settings?.printers || []
  const printerId = type === 'kitchen' ? settings?.kitchenPrinterId : settings?.cashierPrinterId
  const selected = printers.find(printer => printer.id === printerId)
  return selected?.name || selected?.label || printers[0]?.name || (type === 'kitchen' ? 'Cozinha' : 'Caixa')
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
    customerName: repairText(table.customerName || ''),
    guests: getPeopleCount(table),
    peopleCount: getPeopleCount(table),
    waiterName: getTableWaiter(table),
    total: tableTotal(table),
    items: (table.items || []).map(item => ({
      id: item.id,
      name: repairText(item.name || 'Produto'),
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      category: repairText(item.category || 'Outros'),
      sector: repairText(item.sector || item.localSaida || ''),
      localSaida: repairText(item.localSaida || item.sector || ''),
      imprimeCozinha: Boolean(item.imprimeCozinha),
      observation: repairText(item.observation || ''),
    })),
  }
}

function buildClosedTableRecord(table, mode, { closingDate, payments, closedBy, observation } = {}) {
  const now = new Date()
  const total = tableTotal(table)
  return {
    id: `closed-table-${table.id || table.number}-${now.getTime()}`,
    date: dateKey(closingDate || now),
    closedAt: now.toISOString(),
    closedAtLabel: now.toLocaleString('pt-BR'),
    tableId: table.id,
    tableNumber: table.number,
    customerName: repairText(table.customerName || ''),
    waiterName: getTableWaiter(table),
    guests: getPeopleCount(table),
    peopleCount: getPeopleCount(table),
    previousStatus: table.status || 'ocupada',
    total,
    items: (table.items || []).map(item => {
      const qty = Number(item.qty || 0)
      const price = Number(item.price || 0)
      return {
        id: item.id,
        name: repairText(item.name || 'Produto'),
        qty,
        price,
        total: qty * price,
        category: repairText(item.category || 'Outros'),
        sector: repairText(item.sector || item.localSaida || ''),
        localSaida: repairText(item.localSaida || item.sector || ''),
        observation: repairText(item.observation || ''),
      }
    }),
    payments: payments || null,
    closedBy: closedBy || 'Operador',
    closedByMode: mode,
    observation: observation || '',
  }
}

function mergeClosedTableHistory(records, history) {
  const seen = new Set()
  return [...records, ...(history || [])]
    .filter(record => {
      if (!record?.id || seen.has(record.id)) return false
      seen.add(record.id)
      return true
    })
    .slice(0, 2000)
}

function closedTableTotal(record) {
  if (Number(record?.total || 0) > 0) return Number(record.total || 0)
  return (record?.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0)
}

function closedTableItemsQty(record) {
  return (record?.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0)
}

function isEmptyFreeTable(table = {}) {
  return (
    table.status === 'livre' &&
    tableTotal(table) === 0 &&
    Number(table.guests || 0) === 0 &&
    Number(table.peopleCount || 0) === 0 &&
    !table.items?.length &&
    !table.kitchenSent &&
    !table.billRequested &&
    !table.mergedTo &&
    !table.mergedTableIds?.length
  )
}

function cleanSalonTables(value) {
  return Array.isArray(value) ? value.filter(table => !isEmptyFreeTable(table)) : []
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
  const [tables, setTables] = useState(() => cleanSalonTables(readStored(TABLES_KEY, initialTables)))
  const [users, setUsers] = useState(() => readStored(USERS_KEY, initialUsers))
  const [settings, setSettings] = useState(() => ({ ...initialSettings, ...readStored(SETTINGS_KEY, initialSettings) }))
  const [currentUser, setCurrentUser] = useState(() => getSavedSession(readStored(USERS_KEY, initialUsers)))
  const remoteLoadedRef = useRef(false)
  const saveTimerRef = useRef(null)
  const applyingRemoteRef = useRef(false)
  const lastLocalChangeRef = useRef(0)
  const pollingInFlightRef = useRef(false)

  useEffect(() => {
    if (!currentUser) return
    let cancelled = false
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(response => {
        if (!response.ok && !cancelled) {
          clearSession()
          setCurrentUser(null)
          setPage('mesas')
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [currentUser?.id])

  function applyRemoteState(remote, { fillMissing = false } = {}) {
    const localUsers = readStored(USERS_KEY, initialUsers)
    const localTables = cleanSalonTables(readStored(TABLES_KEY, []))
    const localSettings = { ...initialSettings, ...readStored(SETTINGS_KEY, initialSettings) }
    const localProducts = readStored(PRODUCTS_KEY, [])
    const localSalesHistory = readStored(SALES_KEY, [])
    const localClosings = readStored(CLOSINGS_KEY, [])
    const localClosedTables = readStored(CLOSED_TABLES_KEY, [])
    const missingRemoteState = {}

    applyingRemoteRef.current = true

    if (Array.isArray(remote.users)) {
      const nextUsers = remote.users.length ? remote.users : localUsers
      if (!isSameData(localUsers, nextUsers)) {
        setUsers(nextUsers)
        writeStored(USERS_KEY, nextUsers)
      }
      if (fillMissing && !remote.users.length && Array.isArray(localUsers) && localUsers.length) missingRemoteState.users = localUsers
    } else if (fillMissing && Array.isArray(localUsers) && localUsers.length) {
      missingRemoteState.users = localUsers
    }

    if (Array.isArray(remote.tables)) {
      const nextTables = cleanSalonTables(remote.tables)
      if (!isSameData(remote.tables, nextTables)) missingRemoteState.tables = nextTables
      if (!isSameData(localTables, nextTables)) {
        setTables(nextTables)
        writeStored(TABLES_KEY, nextTables)
        window.dispatchEvent(new Event('fogao-tables-updated'))
      }
    } else if (fillMissing && localTables.length) {
      setTables(localTables)
      missingRemoteState.tables = localTables
    }

    if (remote.settings && Object.keys(remote.settings).length) {
      const nextSettings = repairData({ ...initialSettings, ...remote.settings })
      if (!isSameData(localSettings, nextSettings)) {
        setSettings(nextSettings)
        writeStored(SETTINGS_KEY, nextSettings)
      }
    } else if (fillMissing) {
      missingRemoteState.settings = localSettings
    }

    if (Array.isArray(remote.products)) {
      const products = repairData(remote.products.length ? remote.products : localProducts)
      if (!isSameData(localProducts, products)) {
        writeStored(PRODUCTS_KEY, products)
        writeStored('fogao-a-lenha-products-settings', products)
        window.dispatchEvent(new Event('fogao-products-updated'))
      }
      if (fillMissing && !remote.products.length && Array.isArray(localProducts) && localProducts.length) missingRemoteState.products = localProducts
    } else if (fillMissing && Array.isArray(localProducts) && localProducts.length) {
      missingRemoteState.products = localProducts
    }

    if (Array.isArray(remote.salesHistory)) {
      const salesHistory = remote.salesHistory.length ? remote.salesHistory : localSalesHistory
      if (!isSameData(localSalesHistory, salesHistory)) writeStored(SALES_KEY, salesHistory)
      if (fillMissing && !remote.salesHistory.length && Array.isArray(localSalesHistory) && localSalesHistory.length) missingRemoteState.salesHistory = localSalesHistory
    } else if (fillMissing && Array.isArray(localSalesHistory) && localSalesHistory.length) {
      missingRemoteState.salesHistory = localSalesHistory
    }

    if (Array.isArray(remote.closings)) {
      const closings = remote.closings.length ? remote.closings : localClosings
      if (!isSameData(localClosings, closings)) writeStored(CLOSINGS_KEY, closings)
      if (fillMissing && !remote.closings.length && Array.isArray(localClosings) && localClosings.length) missingRemoteState.closings = localClosings
    } else if (fillMissing && Array.isArray(localClosings) && localClosings.length) {
      missingRemoteState.closings = localClosings
    }

    if (Array.isArray(remote.closedTablesHistory)) {
      const closedTablesHistory = remote.closedTablesHistory.length ? remote.closedTablesHistory : localClosedTables
      if (!isSameData(localClosedTables, closedTablesHistory)) {
        writeStored(CLOSED_TABLES_KEY, closedTablesHistory)
        window.dispatchEvent(new Event('fogao-closed-tables-updated'))
      }
      if (fillMissing && !remote.closedTablesHistory.length && Array.isArray(localClosedTables) && localClosedTables.length) missingRemoteState.closedTablesHistory = localClosedTables
    } else if (fillMissing && Array.isArray(localClosedTables) && localClosedTables.length) {
      missingRemoteState.closedTablesHistory = localClosedTables
    }

    window.setTimeout(() => {
      applyingRemoteRef.current = false
    }, 150)

    return missingRemoteState
  }

  useEffect(() => {
    if (!currentUser) {
      remoteLoadedRef.current = false
      return
    }
    let cancelled = false

    async function hydrateFromMongo() {
      try {
        const remote = await loadRemoteState()
        if (cancelled) return

        const missingRemoteState = applyRemoteState(remote, { fillMissing: true })

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
  }, [currentUser?.id])

  useEffect(() => writeStored(TABLES_KEY, tables), [tables])
  useEffect(() => writeStored(USERS_KEY, users), [users])
  useEffect(() => writeStored(SETTINGS_KEY, settings), [settings])

  useEffect(() => {
    const syncTablesFromStorage = () => {
      const storedTables = cleanSalonTables(readStored(TABLES_KEY, []))
      if (!Array.isArray(storedTables)) return
      setTables(storedTables)
    }

    window.addEventListener('fogao-tables-updated', syncTablesFromStorage)
    return () => window.removeEventListener('fogao-tables-updated', syncTablesFromStorage)
  }, [])

  useEffect(() => {
    let stopped = false

    async function pollRemoteState() {
      if (stopped || !remoteLoadedRef.current || pollingInFlightRef.current || applyingRemoteRef.current) return
      if (Date.now() - lastLocalChangeRef.current < LOCAL_EDIT_GRACE_MS) return

      pollingInFlightRef.current = true
      const startedAt = Date.now()

      try {
        const remote = await loadRemoteState()
        if (stopped) return
        if (lastLocalChangeRef.current > startedAt) return
        applyRemoteState(remote)
      } catch (error) {
        console.warn('Nao foi possivel atualizar dados em tempo real:', error.message)
      } finally {
        pollingInFlightRef.current = false
      }
    }

    const interval = window.setInterval(pollRemoteState, REMOTE_POLL_INTERVAL_MS)
    window.addEventListener('focus', pollRemoteState)
    document.addEventListener('visibilitychange', pollRemoteState)

    return () => {
      stopped = true
      window.clearInterval(interval)
      window.removeEventListener('focus', pollRemoteState)
      document.removeEventListener('visibilitychange', pollRemoteState)
    }
  }, [])

  useEffect(() => {
    if (!remoteLoadedRef.current) return
    if (applyingRemoteRef.current) return
    lastLocalChangeRef.current = Date.now()
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const products = readStored(PRODUCTS_KEY, [])
      const salesHistory = readStored(SALES_KEY, [])
      const closings = readStored(CLOSINGS_KEY, [])
      const closedTablesHistory = readStored(CLOSED_TABLES_KEY, [])
      saveRemoteState({ users, tables, settings, products, salesHistory, closings, closedTablesHistory }).catch(error => {
        console.warn('Nao foi possivel salvar no MongoDB:', error.message)
      })
    }, 650)

    return () => clearTimeout(saveTimerRef.current)
  }, [users, tables, settings])

  useEffect(() => {
    if (!remoteLoadedRef.current) return
    const syncProducts = () => {
      if (applyingRemoteRef.current) return
      lastLocalChangeRef.current = Date.now()
      const products = readStored(PRODUCTS_KEY, [])
      const salesHistory = readStored(SALES_KEY, [])
      const closings = readStored(CLOSINGS_KEY, [])
      const closedTablesHistory = readStored(CLOSED_TABLES_KEY, [])
      saveRemoteState({ users, tables, settings, products, salesHistory, closings, closedTablesHistory }).catch(error => {
        console.warn('Nao foi possivel salvar produtos no MongoDB:', error.message)
      })
    }

    window.addEventListener('fogao-products-updated', syncProducts)
    window.addEventListener('fogao-sales-history-updated', syncProducts)
    window.addEventListener('fogao-closings-updated', syncProducts)
    window.addEventListener('fogao-closed-tables-updated', syncProducts)
    return () => {
      window.removeEventListener('fogao-products-updated', syncProducts)
      window.removeEventListener('fogao-sales-history-updated', syncProducts)
      window.removeEventListener('fogao-closings-updated', syncProducts)
      window.removeEventListener('fogao-closed-tables-updated', syncProducts)
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
    if (user.role === 'garcom') {
      const waiterUsers = [user]
      const safeSettings = waiterOperationalSettings(settings)
      setUsers(waiterUsers)
      setSettings(safeSettings)
      writeStored(USERS_KEY, waiterUsers)
      writeStored(SETTINGS_KEY, safeSettings)
      writeStored(SALES_KEY, [])
      writeStored(CLOSINGS_KEY, [])
      writeStored(CLOSED_TABLES_KEY, [])
    }
    saveSession(user)
    setCurrentUser(user)
    setPage('mesas')
  }

  function handleLogout() {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    clearSession()
    setCurrentUser(null)
    setPage('mesas')
  }

  async function handleCloseCash({ date, payments, note }) {
    const closingDate = dateKey(date)
    const activeTables = tables.filter(hasTableMovement)
    const closedTablesAlreadyInDay = readStored(CLOSED_TABLES_KEY, [])
      .filter(record => record?.date === closingDate && record.closedByMode !== 'fechamento_caixa')
    const salesRecords = activeTables
      .map(table => buildSalesRecord(table, 'caixa_fechado', closingDate))
      .filter(record => record.items.length && record.total > 0)
    const activeTotal = activeTables.reduce((sum, table) => sum + tableTotal(table), 0)
    const closedTablesTotal = closedTablesAlreadyInDay.reduce((sum, record) => sum + closedTableTotal(record), 0)
    const total = activeTotal + closedTablesTotal
    const informedTotal = Object.values(payments || {}).reduce((sum, value) => sum + Number(value || 0), 0)
    const nextTables = []
    const nextSalesHistory = [...salesRecords, ...readStored(SALES_KEY, [])].slice(0, 2000)
    const closedTableRecords = activeTables
      .map(table => buildClosedTableRecord(table, 'fechamento_caixa', {
        closingDate,
        payments,
        closedBy: currentUser?.name || currentUser?.username || 'Operador',
        observation: note,
      }))
    const nextClosedTablesHistory = mergeClosedTableHistory(closedTableRecords, readStored(CLOSED_TABLES_KEY, []))
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
      tableCount: activeTables.length + closedTablesAlreadyInDay.length,
      itemCount: salesRecords.reduce((sum, record) => sum + record.items.reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0), 0) + closedTablesAlreadyInDay.reduce((sum, record) => sum + closedTableItemsQty(record), 0),
      tables: activeTables,
      closedTables: closedTablesAlreadyInDay,
    }
    const nextClosings = [closingRecord, ...readStored(CLOSINGS_KEY, [])].slice(0, 120)

    writeStored(SALES_KEY, nextSalesHistory)
    writeStored(CLOSINGS_KEY, nextClosings)
    writeStored(CLOSED_TABLES_KEY, nextClosedTablesHistory)
    writeStored(TABLES_KEY, nextTables)
    setTables(nextTables)
    window.dispatchEvent(new Event('fogao-sales-history-updated'))
    window.dispatchEvent(new Event('fogao-closings-updated'))
    window.dispatchEvent(new Event('fogao-closed-tables-updated'))

    await saveRemoteState({
      users,
      tables: nextTables,
      settings,
      products: readStored(PRODUCTS_KEY, []),
      salesHistory: nextSalesHistory,
      closings: nextClosings,
      closedTablesHistory: nextClosedTablesHistory,
    })

    return closingRecord
  }

  async function handleCloseTable(tableId) {
    const table = tables.find(item => item.id === tableId)
    if (!table) return null

    const shouldRecord = table.items?.length && tableTotal(table) > 0
    const salesRecord = shouldRecord ? buildSalesRecord(table, 'mesa_fechada', new Date()) : null
    const closedTableRecord = shouldRecord ? buildClosedTableRecord(table, 'mesa', {
      closedBy: currentUser?.name || currentUser?.username || 'Operador',
    }) : null
    const resetIds = new Set([table.id, ...(table.mergedTableIds || [])])
    const nextTables = tables.filter(item => !resetIds.has(item.id))
    const currentSalesHistory = readStored(SALES_KEY, [])
    const nextSalesHistory = salesRecord ? [salesRecord, ...currentSalesHistory].slice(0, 2000) : currentSalesHistory
    const nextClosedTablesHistory = closedTableRecord ? mergeClosedTableHistory([closedTableRecord], readStored(CLOSED_TABLES_KEY, [])) : readStored(CLOSED_TABLES_KEY, [])

    if (salesRecord) writeStored(SALES_KEY, nextSalesHistory)
    if (closedTableRecord) writeStored(CLOSED_TABLES_KEY, nextClosedTablesHistory)
    writeStored(TABLES_KEY, nextTables)
    setTables(nextTables)
    if (salesRecord) window.dispatchEvent(new Event('fogao-sales-history-updated'))
    if (closedTableRecord) window.dispatchEvent(new Event('fogao-closed-tables-updated'))

    await saveRemoteState({
      users,
      tables: nextTables,
      settings,
      products: readStored(PRODUCTS_KEY, []),
      salesHistory: nextSalesHistory,
      closings: readStored(CLOSINGS_KEY, []),
      closedTablesHistory: nextClosedTablesHistory,
    })

    return salesRecord
  }

  useEffect(() => {
    if (!currentUser || currentUser.role === 'garcom') return

    let stopped = false
    let busy = false
    let qzUnavailableUntil = 0

    async function runPrintQueue() {
      if (stopped || busy) return
      if (document.visibilityState === 'hidden') return
      if (Date.now() < qzUnavailableUntil) return

      busy = true
      try {
        const jobs = await fetchPendingPrintJobs(5)
        if (!jobs?.length) return
        await ensureQzReady()

        for (const job of jobs || []) {
          if (stopped) break

          let claimed = null
          try {
            claimed = await updatePrintJobStatus(job._id, 'printing')
          } catch (error) {
            if (!String(error.message || '').includes('pendente')) {
              console.warn('Nao foi possivel reservar job de impressao:', error.message)
            }
            continue
          }

          const printType = claimed.type === 'kitchen' ? 'kitchen' : 'bill'
          const printJob = {
            ...claimed,
            type: printType,
            table: claimed.table || { number: claimed.tableNumber, peopleCount: claimed.peopleCount, guests: claimed.guests },
            printerName: claimed.printerName || getConfiguredPrinterName(settings, printType),
          }

          try {
            await executeThermalPrint(printJob, { silent: true })
            await updatePrintJobStatus(claimed._id, 'printed', { printer: printJob.printerName })
          } catch (error) {
            await updatePrintJobStatus(claimed._id, 'error', { error: error.message || String(error) }).catch(() => {})
          }
        }
      } catch (error) {
        qzUnavailableUntil = Date.now() + 30000
        console.warn('Agente de impressao aguardando QZ Tray local:', error.message)
      } finally {
        busy = false
      }
    }

    const interval = window.setInterval(runPrintQueue, PRINT_QUEUE_POLL_INTERVAL_MS)
    window.addEventListener('focus', runPrintQueue)
    runPrintQueue()

    return () => {
      stopped = true
      window.clearInterval(interval)
      window.removeEventListener('focus', runPrintQueue)
    }
  }, [currentUser, settings])

  if (!currentUser) return <Login onLogin={handleLogin} />

  return (
    <div className="appShell">
      <Sidebar page={page} setPage={setPage} currentUser={currentUser} onLogout={handleLogout} />
      <main className="content">
        {page === 'dashboard' && <Dashboard tables={tables} setPage={setPage} />}
        {page === 'mesas' && <Mesas tables={tables} setTables={setTables} users={users} currentUser={currentUser} settings={settings} onCloseTable={handleCloseTable} />}
        {page === 'pedidos-cozinha' && <PedidosCozinha tables={tables} currentUser={currentUser} settings={settings} />}
        {page === 'relatorios' && <Relatorios tables={tables} />}
        {page === 'fechamento' && <Fechamento tables={tables} currentUser={currentUser} onCloseCash={handleCloseCash} />}
        {page === 'usuarios' && <Usuarios users={users} setUsers={setUsers} tables={tables} setTables={setTables} currentUser={currentUser} settings={settings} setSettings={setSettings} />}
      </main>
    </div>
  )
}
