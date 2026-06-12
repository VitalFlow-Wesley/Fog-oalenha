import { saveRemoteState } from './services/appStateApi.js'

const USERS_KEY = 'fogao-users-v1'
const TABLES_KEY = 'fogao-tables-v1'
const SETTINGS_KEY = 'fogao-settings-v1'
const PRODUCTS_KEY = 'fogao-products-v1'
const SALES_KEY = 'fogao-sales-history-v1'
const CLOSINGS_KEY = 'fogao-closings-v1'
const CLOSED_TABLES_KEY = 'fogao-closed-tables-v1'

let finalizingCashCycle = false

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function todayKey() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function finalizeCurrentCashCycle() {
  if (finalizingCashCycle) return
  finalizingCashCycle = true

  try {
    const closings = readJson(CLOSINGS_KEY, [])
    const latestClosing = Array.isArray(closings) ? closings[0] : null
    const closingDate = latestClosing?.date || todayKey()

    const currentClosedTables = readJson(CLOSED_TABLES_KEY, [])
    const remainingClosedTables = Array.isArray(currentClosedTables)
      ? currentClosedTables.filter(record => record?.date !== closingDate)
      : []

    localStorage.setItem(TABLES_KEY, '[]')
    localStorage.setItem(CLOSED_TABLES_KEY, JSON.stringify(remainingClosedTables))

    window.dispatchEvent(new Event('fogao-tables-updated'))
    window.dispatchEvent(new Event('fogao-closed-tables-updated'))

    await saveRemoteState({
      users: readJson(USERS_KEY, []),
      tables: [],
      settings: readJson(SETTINGS_KEY, {}),
      products: readJson(PRODUCTS_KEY, []),
      salesHistory: readJson(SALES_KEY, []),
      closings,
      closedTablesHistory: remainingClosedTables,
    })
  } catch (error) {
    console.warn('Não foi possível concluir a limpeza do caixa:', error.message)
  } finally {
    finalizingCashCycle = false
  }
}

window.addEventListener('fogao-closings-updated', () => {
  window.setTimeout(finalizeCurrentCashCycle, 250)
})
