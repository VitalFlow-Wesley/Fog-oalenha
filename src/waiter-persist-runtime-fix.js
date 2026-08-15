import { saveRemoteState } from './services/appStateApi.js'

const TABLES_KEY = 'fogao-tables-v1'
const USERS_KEY = 'fogao-users-v1'
const SESSION_KEY = 'fogao-a-lenha-session'
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
    // mantem silencioso
  }
}

function getCurrentUserName() {
  const users = readJson(USERS_KEY, [])
  const session = readJson(SESSION_KEY, null)
  const user = users.find(item => item.id === session?.userId) || users.find(item => item.active)
  return user?.name || user?.username || session?.name || session?.username || ''
}

function tableTotal(table) {
  return (table.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0)
}

function tableHasMovement(table) {
  return table.status !== 'livre' || tableTotal(table) > 0 || Number(table.guests || 0) > 0 || Boolean(table.items?.length)
}

function hasWaiter(table) {
  return Boolean(table.waiterName || table.kitchenWaiterName || table.openedByName || table.createdByName || table.closedByName)
}

function normalizeNumber(value) {
  return String(value || '').replace(/[^0-9]/g, '').replace(/^0+/, '') || String(value || '')
}

function getSelectedTableIdFromScreen() {
  const title = document.querySelector('.commandHeader h2, .drawerHeader h2, .commandOverlay h2')?.textContent || ''
  const match = title.match(/Mesa\s+(\d+)/i)
  if (!match) return null
  const screenNumber = normalizeNumber(match[1])
  const tables = readJson(TABLES_KEY, [])
  const table = tables.find(item => normalizeNumber(item.number) === screenNumber || normalizeNumber(item.id) === screenNumber)
  return table?.id || null
}

async function syncRemote(tables) {
  try {
    await saveRemoteState({
      users: readJson(USERS_KEY, []),
      tables,
      settings: readJson(SETTINGS_KEY, {}),
      products: readJson(PRODUCTS_KEY, []),
      salesHistory: readJson(SALES_KEY, []),
    })
  } catch {
    // sem travar o app se a API estiver indisponivel
  }
}

function applyWaiterToTable(table, waiterName) {
  const items = (table.items || []).map(item => ({
    ...item,
    waiterName: item.waiterName || waiterName,
    launchedByName: item.launchedByName || waiterName,
  }))

  return {
    ...table,
    waiterName: table.waiterName || waiterName,
    openedByName: table.openedByName || waiterName,
    createdByName: table.createdByName || waiterName,
    kitchenWaiterName: table.kitchenWaiterName || waiterName,
    items,
  }
}

function ensureWaiterOnTables({ selectedOnly = false, reload = false } = {}) {
  const waiterName = getCurrentUserName()
  if (!waiterName) return false

  const tables = readJson(TABLES_KEY, [])
  if (!Array.isArray(tables) || !tables.length) return false

  const selectedId = selectedOnly ? getSelectedTableIdFromScreen() : null
  let changed = false

  const nextTables = tables.map(table => {
    const shouldFix = selectedOnly ? table.id === selectedId : tableHasMovement(table)
    if (!shouldFix || hasWaiter(table)) return table
    changed = true
    return applyWaiterToTable(table, waiterName)
  })

  if (!changed) return false

  writeJson(TABLES_KEY, nextTables)
  window.dispatchEvent(new Event('storage'))
  window.dispatchEvent(new Event('fogao-tables-updated'))
  syncRemote(nextTables)

  if (reload && !sessionStorage.getItem('fogao-waiter-fix-reloaded')) {
    sessionStorage.setItem('fogao-waiter-fix-reloaded', '1')
    window.setTimeout(() => window.location.reload(), 280)
  }

  return true
}

if (!window.__fogaoWaiterPersistRuntimeFixInstalled) {
  window.__fogaoWaiterPersistRuntimeFixInstalled = true

  window.setTimeout(() => ensureWaiterOnTables({ reload: true }), 700)
  window.setTimeout(() => ensureWaiterOnTables({ reload: false }), 2200)

  document.addEventListener('pointerdown', event => {
    const button = event.target.closest('button')
    if (!button) return
    const label = button.textContent.trim().toLowerCase()
    if (
      label.includes('enviar para cozinha') ||
      label.includes('solicitar conta') ||
      label.includes('fechar mesa') ||
      label.includes('adicionar pedido') ||
      label.includes('adicionar primeira mesa') ||
      label.includes('adicionar mesa')
    ) {
      ensureWaiterOnTables({ selectedOnly: !label.includes('adicionar mesa') && !label.includes('adicionar primeira mesa') })
    }
  }, true)

  document.addEventListener('click', event => {
    const button = event.target.closest('button')
    if (!button) return
    const label = button.textContent.trim().toLowerCase()
    if (label.includes('enviar para cozinha') || label.includes('solicitar conta') || label.includes('fechar mesa')) {
      window.setTimeout(() => ensureWaiterOnTables({ selectedOnly: true }), 60)
      window.setTimeout(() => ensureWaiterOnTables({ selectedOnly: false }), 500)
    }
  }, true)
}
