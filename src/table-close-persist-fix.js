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
    // Fallback silencioso.
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

function buildRecord(table, type) {
  const now = new Date()
  return {
    id: `${type}-${table.id || table.number}-${Date.now()}`,
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

function getSelectedTable() {
  const title = document.querySelector('.commandHeader h2')?.textContent || ''
  const match = title.match(/Mesa\s+(\d+)/i)
  if (!match) return null
  const number = match[1].padStart(2, '0')
  return readJson(TABLES_KEY, []).find(table => String(table.number).padStart(2, '0') === number && table.status !== 'livre') || null
}

function getOpenTables() {
  return readJson(TABLES_KEY, []).filter(table => table.status !== 'livre' || tableTotal(table) > 0 || table.items?.length)
}

function saveSalesHistory(records) {
  const valid = records.filter(record => record.items.length && record.total > 0)
  if (!valid.length) return readJson(SALES_KEY, [])
  const history = readJson(SALES_KEY, [])
  const nextHistory = [...valid, ...history].slice(0, 2000)
  writeJson(SALES_KEY, nextHistory)
  window.dispatchEvent(new Event('fogao-sales-history-updated'))
  return nextHistory
}

async function syncCurrentState() {
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
    console.warn('Nao foi possivel salvar mesas no servidor agora:', error.message)
  }
}

function scheduleSync() {
  window.clearTimeout(window.__fogaoTableCloseSyncTimer)
  window.__fogaoTableCloseSyncTimer = window.setTimeout(syncCurrentState, 500)
}

function markSelectedTableAsClosed(table) {
  const tables = readJson(TABLES_KEY, [])
  const nowLabel = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const nextTables = tables.map(item => {
    if (item.id === table.id) {
      return {
        ...item,
        status: 'fechada',
        closedAt: new Date().toISOString(),
        closedAtLabel: nowLabel,
        billRequested: false,
        kitchenSent: false,
      }
    }
    if (table.mergedTableIds?.includes(item.id)) {
      return {
        ...item,
        status: 'fechada',
        closedAt: new Date().toISOString(),
        closedAtLabel: nowLabel,
        billRequested: false,
        kitchenSent: false,
        mergedTo: undefined,
        mergedToNumber: undefined,
        previousMergeState: undefined,
      }
    }
    return item
  })

  writeJson(TABLES_KEY, nextTables)
  window.dispatchEvent(new Event('storage'))
  window.dispatchEvent(new Event('fogao-tables-updated'))
}

if (!window.__fogaoTableClosePersistFixInstalled) {
  window.__fogaoTableClosePersistFixInstalled = true

  fetch('/api/state').then(response => response.ok ? response.json() : {}).then(remote => {
    if (Array.isArray(remote.salesHistory)) writeJson(SALES_KEY, remote.salesHistory)
  }).catch(() => {})

  document.addEventListener('click', event => {
    const button = event.target.closest('button')
    if (!button) return

    const label = button.textContent.trim().toLowerCase()
    const isTableClose = label === 'fechar mesa' || label.includes('fechar mesa')
    const isCashClose = label.includes('sim, fechar caixa') || label.includes('autorizar fechamento')

    if (isTableClose) {
      const table = getSelectedTable()
      if (!table) return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      saveSalesHistory([buildRecord(table, 'mesa_fechada')])
      markSelectedTableAsClosed(table)
      scheduleSync()

      window.setTimeout(() => {
        window.location.reload()
      }, 250)
      return
    }

    if (isCashClose) {
      saveSalesHistory(getOpenTables().map(table => buildRecord(table, 'caixa_fechado')))
      scheduleSync()
    }
  }, true)

  window.addEventListener('beforeunload', () => {
    const payload = JSON.stringify({
      users: readJson(USERS_KEY, []),
      tables: readJson(TABLES_KEY, []),
      settings: readJson(SETTINGS_KEY, {}),
      products: readJson(PRODUCTS_KEY, []),
      salesHistory: readJson(SALES_KEY, []),
    })

    try {
      navigator.sendBeacon('/api/state', new Blob([payload], { type: 'application/json' }))
    } catch {
      // Fallback silencioso.
    }
  })
}
