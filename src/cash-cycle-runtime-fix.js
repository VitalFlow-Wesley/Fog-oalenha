import { saveRemoteState } from './services/appStateApi.js'
import './closed-tables-scroll-fix.css'
import './movement-peak-chart.css'
import './movement-peak-chart.js'
import './kitchen-details-modal-fix.css'

const USERS_KEY = 'fogao-users-v1'
const TABLES_KEY = 'fogao-tables-v1'
const SETTINGS_KEY = 'fogao-settings-v1'
const PRODUCTS_KEY = 'fogao-products-v1'
const SALES_KEY = 'fogao-sales-history-v1'
const CLOSINGS_KEY = 'fogao-closings-v1'
const CLOSED_TABLES_KEY = 'fogao-closed-tables-v1'
const CASH_CYCLE_STARTED_AT_KEY = 'fogao-cash-cycle-started-at-v1'

const nativeGetItem = Storage.prototype.getItem
let finalizingCashCycle = false

function safeParse(raw, fallback) {
  try {
    const parsed = JSON.parse(raw || 'null')
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function readJson(key, fallback) {
  return safeParse(nativeGetItem.call(localStorage, key), fallback)
}

function todayKey() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isCurrentClosingPage() {
  const page = document.querySelector('.closingPage')
  if (!page) return false
  const selectedDate = page.querySelector('input[type="date"]')?.value
  return !selectedDate || selectedDate === todayKey()
}

function latestClosingTimestamp() {
  const closings = readJson(CLOSINGS_KEY, [])
  if (!Array.isArray(closings) || !closings.length) return 0

  return closings.reduce((latest, closing) => {
    const timestamp = new Date(closing?.closedAt || 0).getTime()
    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest
  }, 0)
}

function ensureCashCycleMarker() {
  const storedMarker = Number(nativeGetItem.call(localStorage, CASH_CYCLE_STARTED_AT_KEY) || 0)
  const latestClosingAt = latestClosingTimestamp()
  const marker = Math.max(storedMarker, latestClosingAt)
  if (marker > storedMarker) localStorage.setItem(CASH_CYCLE_STARTED_AT_KEY, String(marker))
  return marker
}

function currentCashClosedTables(rawValue) {
  const history = safeParse(rawValue, [])
  if (!Array.isArray(history)) return rawValue

  const cycleStartedAt = ensureCashCycleMarker()
  if (!cycleStartedAt) return rawValue

  return JSON.stringify(history.filter(record => {
    const closedAt = new Date(record?.closedAt || 0).getTime()
    return Number.isFinite(closedAt) && closedAt > cycleStartedAt
  }))
}

Storage.prototype.getItem = function patchedGetItem(key) {
  const value = nativeGetItem.call(this, key)
  if (this === localStorage && key === CLOSED_TABLES_KEY && isCurrentClosingPage()) {
    return currentCashClosedTables(value)
  }
  return value
}

async function finalizeCurrentCashCycle() {
  if (finalizingCashCycle) return
  finalizingCashCycle = true

  try {
    const closedTablesHistory = readJson(CLOSED_TABLES_KEY, [])
    const closings = readJson(CLOSINGS_KEY, [])
    const latestClosingAt = latestClosingTimestamp()

    if (latestClosingAt) localStorage.setItem(CASH_CYCLE_STARTED_AT_KEY, String(latestClosingAt))

    localStorage.setItem(TABLES_KEY, '[]')
    window.dispatchEvent(new Event('fogao-tables-updated'))
    window.dispatchEvent(new Event('fogao-closed-tables-updated'))

    await saveRemoteState({
      users: readJson(USERS_KEY, []),
      tables: [],
      settings: readJson(SETTINGS_KEY, {}),
      products: readJson(PRODUCTS_KEY, []),
      salesHistory: readJson(SALES_KEY, []),
      closings,
      closedTablesHistory,
    })
  } catch (error) {
    console.warn('Não foi possível concluir a limpeza do caixa:', error.message)
  } finally {
    finalizingCashCycle = false
  }
}

ensureCashCycleMarker()

window.addEventListener('fogao-closings-updated', () => {
  window.setTimeout(finalizeCurrentCashCycle, 250)
})
