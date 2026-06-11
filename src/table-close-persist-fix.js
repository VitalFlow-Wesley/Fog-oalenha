const TABLES_KEY = 'fogao-tables-v1'
const USERS_KEY = 'fogao-users-v1'
const SETTINGS_KEY = 'fogao-settings-v1'
const PRODUCTS_KEY = 'fogao-products-v1'
const SALES_KEY = 'fogao-sales-history-v1'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // fallback silencioso
  }
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function tableTotal(table) {
  return (table.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0)
}

function getWaiter(table) {
  return table.waiterName || table.kitchenWaiterName || table.openedByName || table.createdByName || 'Sem garçom'
}

function normalizeNumber(value) {
  return String(value || '').replace(/[^0-9]/g, '').replace(/^0+/, '') || String(value || '')
}

function getSelectedTableFromScreen() {
  const title = document.querySelector('.commandHeader h2, .drawerHeader h2, .commandOverlay h2')?.textContent || ''
  const match = title.match(/Mesa\s+(\d+)/i)
  if (!match) return null
  const screenNumber = normalizeNumber(match[1])
  const tables = readJson(TABLES_KEY, [])
  return tables.find(table => normalizeNumber(table.number) === screenNumber || normalizeNumber(table.id) === screenNumber) || null
}

function buildRecord(table, type) {
  const now = new Date()
  return {
    id: `${type}-${table.id || table.number}-${now.getTime()}`,
    date: dateKey(now),
    closedAt: now.toISOString(),
    closedAtLabel: now.toLocaleString('pt-BR'),
    type,
    tableId: table.id,
    tableNumber: table.number,
    guests: Number(table.guests || 0),
    waiterName: getWaiter(table),
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

function saveSalesHistory(record) {
  if (!record || !record.items?.length || !record.total) return
  const history = readJson(SALES_KEY, [])
  const alreadySaved = history.some(item => item.tableId === record.tableId && item.type === record.type && item.total === record.total && item.date === record.date)
  const nextHistory = alreadySaved ? history : [record, ...history].slice(0, 2000)
  writeJson(SALES_KEY, nextHistory)
  window.dispatchEvent(new Event('fogao-sales-history-updated'))
}

async function syncState() {
  try {
    await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        users: readJson(USERS_KEY, []),
        tables: readJson(TABLES_KEY, []),
        settings: readJson(SETTINGS_KEY, {}),
        products: readJson(PRODUCTS_KEY, []),
        salesHistory: readJson(SALES_KEY, []),
      }),
    })
  } catch (error) {
    console.warn('Nao foi possivel sincronizar mesa fechada agora:', error.message)
  }
}

function closeKeepingValue(snapshot) {
  if (!snapshot || !snapshot.items?.length || tableTotal(snapshot) <= 0) return false

  const now = new Date()
  const closedAt = now.toISOString()
  const closedAtLabel = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const closedTable = {
    ...snapshot,
    status: 'fechada',
    closedAt,
    closedAtLabel,
    billRequested: false,
    kitchenSent: false,
  }

  const tables = readJson(TABLES_KEY, [])
  const nextTables = tables.map(table => {
    if (table.id === snapshot.id) return closedTable
    if (snapshot.mergedTableIds?.includes(table.id)) {
      return {
        ...table,
        status: 'fechada',
        closedAt,
        closedAtLabel,
        billRequested: false,
        kitchenSent: false,
        mergedTo: undefined,
        mergedToNumber: undefined,
        previousMergeState: undefined,
      }
    }
    return table
  })

  writeJson(TABLES_KEY, nextTables)
  saveSalesHistory(buildRecord(closedTable, 'mesa_fechada'))
  window.dispatchEvent(new Event('storage'))
  window.dispatchEvent(new Event('fogao-tables-updated'))
  syncState().finally(() => window.setTimeout(() => window.location.reload(), 220))
  return true
}

if (!window.__fogaoTableClosePersistFixInstalled) {
  window.__fogaoTableClosePersistFixInstalled = true
  window.__fogaoCloseTableSnapshot = null

  document.addEventListener('pointerdown', event => {
    const button = event.target.closest('button')
    if (!button) return
    const label = button.textContent.trim().toLowerCase()
    if (label === 'fechar mesa' || label.includes('fechar mesa')) {
      window.__fogaoCloseTableSnapshot = getSelectedTableFromScreen()
    }
  }, true)

  document.addEventListener('click', event => {
    const button = event.target.closest('button')
    if (!button) return

    const label = button.textContent.trim().toLowerCase()
    if (!(label === 'fechar mesa' || label.includes('fechar mesa'))) return

    const snapshot = window.__fogaoCloseTableSnapshot || getSelectedTableFromScreen()
    if (!snapshot || !snapshot.items?.length || tableTotal(snapshot) <= 0) return

    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()

    closeKeepingValue(snapshot)
  }, true)
}
